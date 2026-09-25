#!/usr/bin/env python3
"""Read-only production preflight for the Rugatha Firestore migration."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path
from typing import Any

import firebase_admin
import google.auth
from firebase_admin import auth, firestore
from google.auth.transport.requests import AuthorizedSession

from firestore_migration import DATABASE_ID, PROJECT_ID, build_plan, load_source


class PreflightError(RuntimeError):
    """Raised when production is not safe to migrate."""


def _request_json(session: AuthorizedSession, method: str, url: str, **kwargs: Any) -> Any:
    response = session.request(method, url, timeout=30, **kwargs)
    if not response.ok:
        raise PreflightError(f"API request failed: status={response.status_code}, endpoint={url.split('?')[0]}")
    return response.json()


def _safe_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", value).strip("_") or "rules"


def _backup_rules(session: AuthorizedSession, backup_dir: Path) -> dict[str, int]:
    backup_dir.mkdir(parents=True, exist_ok=True)
    release_url = f"https://firebaserules.googleapis.com/v1/projects/{PROJECT_ID}/releases"
    releases = _request_json(session, "GET", release_url).get("releases", [])
    saved = 0
    for release in releases:
        ruleset_name = release.get("rulesetName")
        release_name = release.get("name")
        if not ruleset_name or not release_name:
            continue
        ruleset = _request_json(
            session,
            "GET",
            f"https://firebaserules.googleapis.com/v1/{ruleset_name}",
        )
        target = backup_dir / f"{_safe_name(release_name)}.json"
        target.write_text(
            json.dumps(ruleset, ensure_ascii=False, indent=2, sort_keys=True),
            encoding="utf-8",
        )
        saved += 1

    rtdb_url = (
        "https://rugatha-87e15-default-rtdb.firebaseio.com/"
        ".settings/rules.json"
    )
    rtdb_rules = _request_json(session, "GET", rtdb_url)
    (backup_dir / "realtime-database-rules.json").write_text(
        json.dumps(rtdb_rules, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    return {"firebaseRuleReleases": saved, "rtdbRules": 1}


def run_preflight(source_path: Path, backup_root: Path) -> dict[str, Any]:
    source, source_hash = load_source(source_path)
    plan = build_plan(source, source_hash, "preflight")

    try:
        app = firebase_admin.get_app()
    except ValueError:
        app = firebase_admin.initialize_app(options={"projectId": PROJECT_ID})
    client = firestore.client(app=app, database_id=DATABASE_ID)

    member_uids = [
        document.path.split("/", 2)[1]
        for document in plan.documents
        if document.path.count("/") == 1 and document.path.startswith("members/")
    ]
    lookup = auth.get_users([auth.UidIdentifier(uid) for uid in member_uids], app=app)
    if lookup.not_found or len(lookup.users) != len(member_uids):
        raise PreflightError(
            f"Authentication UID check failed: found={len(lookup.users)}, expected={len(member_uids)}"
        )

    collection_ids = sorted(reference.id for reference in client.collections())
    credentials, _ = google.auth.default(
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
        quota_project_id=PROJECT_ID,
    )
    session = AuthorizedSession(credentials)

    billing: dict[str, Any] | None = None
    billing_accessible = True
    try:
        billing = _request_json(
            session,
            "GET",
            f"https://cloudbilling.googleapis.com/v1/projects/{PROJECT_ID}/billingInfo",
        )
    except PreflightError:
        billing_accessible = False
    bucket: dict[str, Any] | None = None
    try:
        bucket = _request_json(
            session,
            "GET",
            "https://storage.googleapis.com/storage/v1/b/"
            "rugatha-87e15.firebasestorage.app",
        )
    except PreflightError:
        pass

    timestamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_dir = backup_root / timestamp
    backups = _backup_rules(session, backup_dir)

    return {
        "projectId": PROJECT_ID,
        "databaseId": DATABASE_ID,
        "sourceSha256": source_hash,
        "authUsersExpected": len(member_uids),
        "authUsersVerified": len(lookup.users),
        "firestoreCollectionCount": len(collection_ids),
        "firestoreCollectionIds": collection_ids,
        "firestoreEmpty": len(collection_ids) == 0,
        "billingAccessible": billing_accessible,
        "billingEnabled": bool(billing.get("billingEnabled")) if billing is not None else None,
        "storageBucketExists": bool(
            bucket and bucket.get("name") == "rugatha-87e15.firebasestorage.app"
        ),
        "storageLocation": bucket.get("location") if bucket else None,
        "rulesBackupDirectory": str(backup_dir),
        **backups,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--backup-root", type=Path, default=Path("migration-private/rules"))
    args = parser.parse_args()
    try:
        summary = run_preflight(args.source, args.backup_root)
        print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True))
        if not summary["firestoreEmpty"]:
            raise PreflightError("Firestore is not empty; inspect before applying migration")
        if not summary["storageBucketExists"]:
            raise PreflightError("configured Storage bucket does not exist")
        return 0
    except (PreflightError, OSError) as exc:
        print(f"preflight error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
