#!/usr/bin/env python3
"""Analyze, migrate, and verify Rugatha RTDB exports without logging PII.

The analyze and dry-run commands use only the Python standard library. Commands
that contact Firebase require firebase-admin and Application Default Credentials.
The existing oversized profile photo is deliberately excluded from migration.
"""

from __future__ import annotations

import argparse
import base64
import datetime as dt
import hashlib
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence


PROJECT_ID = "rugatha-87e15"
DATABASE_ID = "(default)"
STORAGE_BUCKET = "rugatha-87e15.firebasestorage.app"
SCHEMA_VERSION = 1
MAX_SAFE_DOCUMENT_BYTES = 900 * 1024
EXPECTED_TOP_LEVEL_KEYS = {"members", "members_meta", "qa_choices"}
BADGE_FIELDS = ("STR", "DEX", "CON", "INT", "WIS", "CHA")
PROFILE_FIELDS = ("title", "religion", "species", "className", "kingdom")


class MigrationError(RuntimeError):
    """Raised when source data or a requested migration action is unsafe."""


@dataclass(frozen=True)
class PlannedDocument:
    path: str
    data: dict[str, Any]


@dataclass(frozen=True)
class MigrationPlan:
    source_sha256: str
    run_id: str
    documents: tuple[PlannedDocument, ...]
    summary: dict[str, Any]


def _json_default(value: Any) -> Any:
    if isinstance(value, dt.datetime):
        return value.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")
    raise TypeError(f"Unsupported value type: {type(value).__name__}")


def _canonical_json(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        default=_json_default,
    )


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _sha256_json(value: Any) -> str:
    return _sha256_bytes(_canonical_json(value).encode("utf-8"))


def _parse_timestamp(value: Any, field_name: str) -> dt.datetime | None:
    if value in (None, ""):
        return None
    if not isinstance(value, str):
        raise MigrationError(f"{field_name} must be an ISO timestamp or null")
    try:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise MigrationError(f"{field_name} contains an invalid ISO timestamp") from exc
    if parsed.tzinfo is None:
        raise MigrationError(f"{field_name} must include a timezone")
    return parsed.astimezone(dt.timezone.utc)


def _parse_member_number(value: Any) -> int:
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{4}", value):
        raise MigrationError("memberNo must use ####-#### format")
    return int(value.replace("-", ""))


def encode_key(value: str) -> str:
    return value.replace("%", "%25").replace("/", "%2F").replace(".", "%2E")


def encode_bookmark_key(value: str) -> str:
    return base64.urlsafe_b64encode(value.encode("utf-8")).decode("ascii").rstrip("=")


def _contains_data_url(value: Any) -> bool:
    if isinstance(value, str):
        return value.startswith("data:")
    if isinstance(value, Mapping):
        return any(_contains_data_url(child) for child in value.values())
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return any(_contains_data_url(child) for child in value)
    return False


def _safe_document_size(data: Mapping[str, Any]) -> int:
    # This is a conservative preflight check, not Firestore's exact protobuf size.
    return len(_canonical_json(data).encode("utf-8"))


def load_source(path: Path) -> tuple[dict[str, Any], str]:
    raw = path.read_bytes()
    try:
        source = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise MigrationError("source is not valid JSON") from exc
    if not isinstance(source, dict):
        raise MigrationError("source root must be an object")
    actual_keys = set(source)
    if actual_keys != EXPECTED_TOP_LEVEL_KEYS:
        raise MigrationError(
            "unexpected top-level keys: "
            f"missing={sorted(EXPECTED_TOP_LEVEL_KEYS - actual_keys)}, "
            f"extra={sorted(actual_keys - EXPECTED_TOP_LEVEL_KEYS)}"
        )
    return source, _sha256_bytes(raw)


def _member_lookup(members: Mapping[str, Any]) -> dict[str, str]:
    lookup: dict[str, str] = {}
    seen_emails: set[str] = set()
    seen_numbers: set[str] = set()
    for uid, member in members.items():
        if not isinstance(uid, str) or not uid or "/" in uid:
            raise MigrationError("member document IDs must be non-empty and contain no slash")
        if not isinstance(member, dict):
            raise MigrationError("each member must be an object")
        if member.get("memberId") != uid:
            raise MigrationError("a member key does not match its memberId")
        member_no = member.get("memberNo")
        _parse_member_number(member_no)
        if member_no in seen_numbers:
            raise MigrationError("duplicate memberNo detected")
        seen_numbers.add(member_no)
        email = member.get("email")
        if not isinstance(email, str) or not email:
            raise MigrationError("every member must have a non-empty email")
        normalized_email = email.casefold()
        if normalized_email in seen_emails:
            raise MigrationError("duplicate email detected")
        seen_emails.add(normalized_email)
        lookup[uid] = uid
        lookup[member_no] = uid
    return lookup


def _collect_choices(
    qa_choices: Mapping[str, Any], lookup: Mapping[str, str]
) -> tuple[list[tuple[str, str, dict[str, Any], str]], dict[str, int]]:
    choices: list[tuple[str, str, dict[str, Any], str]] = []
    counts_by_uid: dict[str, int] = {}
    seen_paths: set[tuple[str, str]] = set()
    for source_member_key, entries in qa_choices.items():
        uid = lookup.get(source_member_key)
        if not uid:
            raise MigrationError("a QA owner cannot be resolved to a member")
        source_key_type = "uid" if source_member_key == uid else "memberNo"
        if not isinstance(entries, dict):
            raise MigrationError("each QA member node must be an object")
        for page_key, payload in entries.items():
            if not isinstance(payload, dict):
                raise MigrationError("each QA entry must be an object")
            page = payload.get("questionPage")
            choice = payload.get("choice")
            if not isinstance(page, str) or not page:
                raise MigrationError("each QA entry must have questionPage")
            if page_key != encode_key(page):
                raise MigrationError("a QA page key does not match questionPage")
            if choice not in ("C1", "C2"):
                raise MigrationError("QA choice must be C1 or C2")
            identity = (uid, page_key)
            if identity in seen_paths:
                raise MigrationError("duplicate QA choice for a member and page")
            seen_paths.add(identity)
            choices.append((uid, page_key, payload, source_key_type))
            counts_by_uid[uid] = counts_by_uid.get(uid, 0) + 1
    return choices, counts_by_uid


def build_plan(source: Mapping[str, Any], source_sha256: str, run_id: str) -> MigrationPlan:
    members = source.get("members")
    members_meta = source.get("members_meta")
    qa_choices = source.get("qa_choices")
    if not isinstance(members, dict) or not isinstance(members_meta, dict):
        raise MigrationError("members and members_meta must be objects")
    if not isinstance(qa_choices, dict):
        raise MigrationError("qa_choices must be an object")
    if not re.fullmatch(r"[A-Za-z0-9._-]{1,100}", run_id):
        raise MigrationError("run_id must contain only letters, digits, dot, underscore, or dash")

    lookup = _member_lookup(members)
    choices, qa_counts = _collect_choices(qa_choices, lookup)
    counter = members_meta.get("memberNoCounter")
    if not isinstance(counter, int) or isinstance(counter, bool) or counter < 0:
        raise MigrationError("members_meta.memberNoCounter must be a non-negative integer")
    max_non_admin = max(
        (_parse_member_number(member["memberNo"]) for member in members.values()
         if _parse_member_number(member["memberNo"]) > 0),
        default=0,
    )
    if counter != max_non_admin:
        raise MigrationError("memberNoCounter does not match the highest non-admin memberNo")

    documents: list[PlannedDocument] = []
    skipped_photo_count = 0
    skipped_photo_bytes = 0
    bookmark_count = 0

    for uid, member in members.items():
        photo_url = member.get("photoUrl")
        if isinstance(photo_url, str) and photo_url.startswith("data:"):
            skipped_photo_count += 1
            skipped_photo_bytes += len(photo_url.encode("utf-8"))

        profile = {field: member[field] for field in PROFILE_FIELDS if field in member}
        profile["photo"] = None
        badges = {
            short_name: member[f"Badge{short_name}"]
            for short_name in BADGE_FIELDS
            if f"Badge{short_name}" in member
        }
        for name, value in badges.items():
            if not isinstance(value, int) or isinstance(value, bool) or not 0 <= value <= 20:
                raise MigrationError(f"Badge{name} must be an integer from 0 through 20")

        sanitized_source = {key: value for key, value in member.items() if key != "photoUrl"}
        member_doc: dict[str, Any] = {
            "schemaVersion": SCHEMA_VERSION,
            "memberId": uid,
            "memberNo": member["memberNo"],
            "memberNoNumber": _parse_member_number(member["memberNo"]),
            "displayName": member.get("displayName", ""),
            "email": member["email"],
            "profile": profile,
            "badges": badges,
            "achievements": dict(member.get("achievements") or {}),
            "rewardedAchievements": dict(member.get("rewardedAchievements") or {}),
            "qaChoiceCount": qa_counts.get(uid, 0),
            "totalTimeSeconds": int(member.get("totalTimeSeconds") or 0),
            "campaign": member.get("Campaign", ""),
            "character": member.get("Character", ""),
            "createdAt": _parse_timestamp(member.get("createdAt"), "createdAt"),
            "lastLoginAt": _parse_timestamp(member.get("lastLoginAt"), "lastLoginAt"),
            "migration": {
                "source": "rtdb",
                "runId": run_id,
                "sourceHash": _sha256_json(sanitized_source),
            },
        }
        if member_doc["totalTimeSeconds"] < 0:
            raise MigrationError("totalTimeSeconds must not be negative")
        if not isinstance(member_doc["displayName"], str):
            raise MigrationError("displayName must be a string")
        documents.append(PlannedDocument(f"members/{uid}", member_doc))

        bookmarks = member.get("bookmarks") or {}
        if not isinstance(bookmarks, dict):
            raise MigrationError("bookmarks must be an object")
        for page_key, bookmark in bookmarks.items():
            if not isinstance(bookmark, dict):
                raise MigrationError("each bookmark must be an object")
            path = bookmark.get("path")
            if not isinstance(path, str) or page_key != encode_bookmark_key(path):
                raise MigrationError("a bookmark key does not match its path")
            bookmark_doc = {
                "path": path,
                "title": bookmark.get("title", ""),
                "savedAt": _parse_timestamp(bookmark.get("savedAt"), "bookmark.savedAt"),
            }
            documents.append(
                PlannedDocument(f"members/{uid}/bookmarks/{page_key}", bookmark_doc)
            )
            bookmark_count += 1

    qa_stats: dict[str, dict[str, Any]] = {}
    for uid, page_key, payload, source_key_type in choices:
        choice_doc = {
            "questionPage": payload["questionPage"],
            "choice": payload["choice"],
            "createdAt": None,
            "migrationSourceKeyType": source_key_type,
        }
        documents.append(
            PlannedDocument(f"members/{uid}/qaChoices/{page_key}", choice_doc)
        )
        stats = qa_stats.setdefault(
            page_key,
            {"questionPage": payload["questionPage"], "c1": 0, "c2": 0, "total": 0},
        )
        if stats["questionPage"] != payload["questionPage"]:
            raise MigrationError("a QA page key maps to more than one questionPage")
        stats[payload["choice"].lower()] += 1
        stats["total"] += 1

    for page_key, stats in qa_stats.items():
        documents.append(PlannedDocument(f"qaStats/{page_key}", stats))

    documents.append(
        PlannedDocument("system/memberNumbers", {"lastAllocated": counter})
    )

    for document in documents:
        if _contains_data_url(document.data):
            raise MigrationError(f"data URL found in planned document {document.path}")
        size = _safe_document_size(document.data)
        if size >= MAX_SAFE_DOCUMENT_BYTES:
            raise MigrationError(f"planned document is too large: {document.path} ({size} bytes)")

    type_counts = {
        "memberDocuments": len(members),
        "bookmarkDocuments": bookmark_count,
        "qaChoiceDocuments": len(choices),
        "qaStatsDocuments": len(qa_stats),
        "systemDocuments": 1,
    }
    summary = {
        "projectId": PROJECT_ID,
        "databaseId": DATABASE_ID,
        "sourceSha256": source_sha256,
        "runId": run_id,
        **type_counts,
        "plannedDocumentWrites": len(documents) + 1,
        "skippedPhotoCount": skipped_photo_count,
        "skippedPhotoBytes": skipped_photo_bytes,
        "maxPlannedDocumentBytes": max(_safe_document_size(doc.data) for doc in documents),
        "containsDataUrls": False,
    }
    return MigrationPlan(source_sha256, run_id, tuple(documents), summary)


def _print_summary(summary: Mapping[str, Any]) -> None:
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True, indent=2))


def _load_admin(project_id: str):
    try:
        import firebase_admin
        from firebase_admin import auth, firestore
    except ImportError as exc:
        raise MigrationError(
            "firebase-admin is required; install requirements-migration.txt in a local venv"
        ) from exc
    if project_id != PROJECT_ID:
        raise MigrationError("refusing to initialize an unexpected Firebase project")
    try:
        app = firebase_admin.get_app()
    except ValueError:
        app = firebase_admin.initialize_app(options={"projectId": project_id})
    return auth, firestore, firestore.client(app=app, database_id=DATABASE_ID)


def _verify_auth_users(auth_module: Any, uids: Iterable[str]) -> None:
    identifiers = [auth_module.UidIdentifier(uid) for uid in uids]
    result = auth_module.get_users(identifiers)
    if result.not_found:
        raise MigrationError(
            f"Authentication UID check failed: {len(result.not_found)} missing of {len(identifiers)}"
        )
    if len(result.users) != len(identifiers):
        raise MigrationError("Authentication UID count did not match the source")


def apply_plan(plan: MigrationPlan, project_id: str, confirm_project: str) -> None:
    if confirm_project != PROJECT_ID or project_id != PROJECT_ID:
        raise MigrationError("--confirm-project must exactly match the configured project")
    auth_module, firestore_module, client = _load_admin(project_id)
    member_uids = [doc.path.split("/", 2)[1] for doc in plan.documents
                   if doc.path.count("/") == 1 and doc.path.startswith("members/")]
    _verify_auth_users(auth_module, member_uids)
    run_ref = client.document(f"migrationRuns/{plan.run_id}")
    existing_run = run_ref.get()
    if existing_run.exists:
        existing_data = existing_run.to_dict() or {}
        if existing_data.get("sourceSha256") != plan.source_sha256:
            raise MigrationError("runId already exists with a different source hash")
        if existing_data.get("status") == "completed":
            _print_summary({**plan.summary, "status": "already-applied"})
            return
        if existing_data.get("status") != "running":
            raise MigrationError("runId exists in an unexpected state")
    else:
        if list(client.collection("members").limit(1).stream()):
            raise MigrationError(
                "members collection is not empty and no matching migration run exists"
            )
        run_ref.set({
            **plan.summary,
            "schemaVersion": SCHEMA_VERSION,
            "startedAt": dt.datetime.now(dt.timezone.utc),
            "status": "running",
        })

    writes = 0
    batch = client.batch()
    for document in plan.documents:
        batch.set(client.document(document.path), document.data)
        writes += 1
        if writes % 400 == 0:
            batch.commit()
            batch = client.batch()
    if writes % 400:
        batch.commit()

    now = dt.datetime.now(dt.timezone.utc)
    run_data = {
        "completedAt": now,
        "status": "completed",
    }
    run_ref.set(run_data, merge=True)
    _print_summary({**plan.summary, "status": "applied", "authUsersVerified": len(member_uids)})


def verify_plan(plan: MigrationPlan, project_id: str) -> None:
    _, _, client = _load_admin(project_id)
    failures: dict[str, int] = {"missing": 0, "mismatched": 0}
    for planned in plan.documents:
        snapshot = client.document(planned.path).get()
        if not snapshot.exists:
            failures["missing"] += 1
            continue
        actual = snapshot.to_dict() or {}
        for ignored in ("updatedAt",):
            actual.pop(ignored, None)
        expected = dict(planned.data)
        expected.pop("updatedAt", None)
        if _canonical_json(actual) != _canonical_json(expected):
            failures["mismatched"] += 1
    if failures["missing"] or failures["mismatched"]:
        raise MigrationError(
            "verification failed: "
            f"missing={failures['missing']}, mismatched={failures['mismatched']}"
        )
    _print_summary({**plan.summary, "status": "verified"})


def _timestamp_to_iso(value: Any) -> str | None:
    if value is None:
        return None
    if not isinstance(value, dt.datetime):
        raise MigrationError("Firestore timestamp has an unexpected type")
    if value.tzinfo is None:
        value = value.replace(tzinfo=dt.timezone.utc)
    return value.astimezone(dt.timezone.utc).isoformat(timespec="milliseconds").replace(
        "+00:00", "Z"
    )


def _member_document_to_rtdb(uid: str, data: Mapping[str, Any]) -> dict[str, Any]:
    profile = data.get("profile") if isinstance(data.get("profile"), Mapping) else {}
    badges = data.get("badges") if isinstance(data.get("badges"), Mapping) else {}
    legacy: dict[str, Any] = {
        "memberId": uid,
        "memberNo": data.get("memberNo", ""),
        "displayName": data.get("displayName", ""),
        "email": data.get("email", ""),
        "photoUrl": "",
    }
    for source, target in (("createdAt", "createdAt"), ("lastLoginAt", "lastLoginAt")):
        converted = _timestamp_to_iso(data.get(source))
        if converted is not None:
            legacy[target] = converted
    for field in PROFILE_FIELDS:
        if field in profile:
            legacy[field] = profile[field]
    for field in BADGE_FIELDS:
        if field in badges:
            legacy[f"Badge{field}"] = badges[field]
    for field in ("achievements", "rewardedAchievements", "totalTimeSeconds"):
        if field in data:
            legacy[field] = data[field]
    if "campaign" in data:
        legacy["Campaign"] = data["campaign"]
    if "character" in data:
        legacy["Character"] = data["character"]
    return legacy


def export_rollback(
    project_id: str,
    confirm_project: str,
    output_path: Path,
    include_profile_photos: bool,
    overwrite: bool,
) -> None:
    """Export Firestore back to the legacy RTDB tree without modifying production."""
    if confirm_project != PROJECT_ID or project_id != PROJECT_ID:
        raise MigrationError("--confirm-project must exactly match the configured project")
    if output_path.exists() and not overwrite:
        raise MigrationError("rollback export already exists; pass --overwrite to replace it")

    _, _, client = _load_admin(project_id)
    bucket = None
    if include_profile_photos:
        from firebase_admin import storage

        bucket = storage.bucket(STORAGE_BUCKET)

    members: dict[str, Any] = {}
    qa_choices: dict[str, Any] = {}
    bookmark_count = 0
    qa_choice_count = 0
    photo_count = 0

    for member_snapshot in client.collection("members").stream():
        uid = member_snapshot.id
        data = member_snapshot.to_dict() or {}
        legacy = _member_document_to_rtdb(uid, data)

        bookmarks: dict[str, Any] = {}
        for bookmark_snapshot in member_snapshot.reference.collection("bookmarks").stream():
            bookmark = bookmark_snapshot.to_dict() or {}
            saved_at = _timestamp_to_iso(bookmark.get("savedAt"))
            bookmarks[bookmark_snapshot.id] = {
                "path": bookmark.get("path", ""),
                "title": bookmark.get("title", ""),
                **({"savedAt": saved_at} if saved_at is not None else {}),
            }
            bookmark_count += 1
        if bookmarks:
            legacy["bookmarks"] = bookmarks

        photo = data.get("profile", {}).get("photo") if isinstance(data.get("profile"), Mapping) else None
        if include_profile_photos and isinstance(photo, Mapping) and photo.get("path"):
            assert bucket is not None
            photo_bytes = bucket.blob(str(photo["path"])).download_as_bytes()
            content_type = str(photo.get("contentType") or "image/webp")
            legacy["photoUrl"] = (
                f"data:{content_type};base64,"
                + base64.b64encode(photo_bytes).decode("ascii")
            )
            photo_count += 1

        member_key = str(data.get("memberNo") or uid)
        member_choices: dict[str, Any] = {}
        for choice_snapshot in member_snapshot.reference.collection("qaChoices").stream():
            choice = choice_snapshot.to_dict() or {}
            member_choices[choice_snapshot.id] = {
                "memberNo": data.get("memberNo", ""),
                "questionPage": choice.get("questionPage", ""),
                "choice": choice.get("choice", ""),
            }
            qa_choice_count += 1
        if member_choices:
            qa_choices[member_key] = member_choices

        members[uid] = legacy

    counter_snapshot = client.document("system/memberNumbers").get()
    if not counter_snapshot.exists:
        raise MigrationError("member number counter is missing from Firestore")
    counter = (counter_snapshot.to_dict() or {}).get("lastAllocated")
    if not isinstance(counter, int) or isinstance(counter, bool) or counter < 0:
        raise MigrationError("member number counter is invalid")

    export = {
        "members": members,
        "members_meta": {"memberNoCounter": counter},
        "qa_choices": qa_choices,
    }
    raw = (json.dumps(export, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(raw)
    _print_summary({
        "status": "rollback-exported",
        "projectId": project_id,
        "memberDocuments": len(members),
        "bookmarkDocuments": bookmark_count,
        "qaChoiceDocuments": qa_choice_count,
        "profilePhotosEmbedded": photo_count,
        "outputBytes": len(raw),
        "outputSha256": _sha256_bytes(raw),
    })


def set_admin_claim(project_id: str, confirm_project: str, email: str) -> None:
    if confirm_project != PROJECT_ID or project_id != PROJECT_ID:
        raise MigrationError("--confirm-project must exactly match the configured project")
    auth_module, _, _ = _load_admin(project_id)
    user = auth_module.get_user_by_email(email)
    claims = dict(user.custom_claims or {})
    claims["admin"] = True
    auth_module.set_custom_user_claims(user.uid, claims)
    print(json.dumps({"status": "admin-claim-set", "projectId": project_id}, indent=2))


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    for name in ("analyze", "dry-run", "apply", "verify"):
        sub = subparsers.add_parser(name)
        sub.add_argument("source", type=Path)
        sub.add_argument("--run-id", default="rtdb-2026-09-25")
        if name in ("apply", "verify"):
            sub.add_argument("--project", default=PROJECT_ID)
        if name == "apply":
            sub.add_argument("--confirm-project", required=True)
    claim = subparsers.add_parser("set-admin-claim")
    claim.add_argument("--project", default=PROJECT_ID)
    claim.add_argument("--confirm-project", required=True)
    claim.add_argument("--email", required=True)
    rollback = subparsers.add_parser("export-rollback")
    rollback.add_argument("output", type=Path)
    rollback.add_argument("--project", default=PROJECT_ID)
    rollback.add_argument("--confirm-project", required=True)
    rollback.add_argument("--omit-profile-photos", action="store_true")
    rollback.add_argument("--overwrite", action="store_true")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = make_parser().parse_args(argv)
    try:
        if args.command == "set-admin-claim":
            set_admin_claim(args.project, args.confirm_project, args.email)
            return 0
        if args.command == "export-rollback":
            export_rollback(
                args.project,
                args.confirm_project,
                args.output,
                not args.omit_profile_photos,
                args.overwrite,
            )
            return 0
        source, source_sha256 = load_source(args.source)
        plan = build_plan(source, source_sha256, args.run_id)
        if args.command in ("analyze", "dry-run"):
            _print_summary({**plan.summary, "status": args.command})
        elif args.command == "apply":
            apply_plan(plan, args.project, args.confirm_project)
        elif args.command == "verify":
            verify_plan(plan, args.project)
        return 0
    except (MigrationError, OSError) as exc:
        print(f"migration error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
