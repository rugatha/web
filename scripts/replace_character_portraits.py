#!/usr/bin/env python3
"""Replace existing character portraits with optimized WebP files."""

from __future__ import annotations

import argparse
import base64
import json
import sys
import time
import urllib.parse
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Sequence


PROJECT_ID = "rugatha-87e15"
DATABASE_ID = "(default)"
STORAGE_BUCKET = "rugatha-87e15.firebasestorage.app"
MAX_OPTIMIZED_BYTES = 1024 * 1024


class MigrationError(RuntimeError):
    """Raised when a portrait replacement cannot proceed safely."""


@dataclass(frozen=True)
class PortraitTarget:
    email: str
    uid: str
    character_name: str
    document_path: str
    source_path: Path
    destination_path: str
    old_path: str
    data: bytes


def _character_key(name: str) -> str:
    return urllib.parse.quote(name, safe="-_.!~*'()")


def _storage_key(name: str) -> str:
    return base64.urlsafe_b64encode(name.encode("utf-8")).decode("ascii").rstrip("=")


def load_admin(project_id: str):
    try:
        import firebase_admin
        from firebase_admin import auth, firestore, storage
    except ImportError as exc:
        raise MigrationError("firebase-admin is required") from exc
    if project_id != PROJECT_ID:
        raise MigrationError("refusing to use an unexpected Firebase project")
    try:
        app = firebase_admin.get_app()
    except ValueError:
        app = firebase_admin.initialize_app(options={
            "projectId": project_id,
            "storageBucket": STORAGE_BUCKET,
        })
    return auth, firestore, firestore.client(app=app, database_id=DATABASE_ID), storage.bucket(app=app)


def resolve_targets(entries: list[list[str]], auth_module: Any, client: Any) -> list[PortraitTarget]:
    targets = []
    version = time.time_ns() // 1_000_000
    for index, (email, character_name, source_name) in enumerate(entries):
        normalized_email = email.strip().lower()
        normalized_name = " ".join(character_name.split()).strip()
        source_path = Path(source_name)
        data = source_path.read_bytes()
        if source_path.suffix.lower() != ".webp" or not data.startswith(b"RIFF") or b"WEBP" not in data[:16]:
            raise MigrationError(f"{source_path} is not a WebP image")
        if not data or len(data) > MAX_OPTIMIZED_BYTES:
            raise MigrationError(f"{source_path} must be between 1 byte and 1 MiB")

        user = auth_module.get_user_by_email(normalized_email)
        member = client.document(f"members/{user.uid}").get()
        if not member.exists or str((member.to_dict() or {}).get("email") or "").lower() != normalized_email:
            raise MigrationError(f"member record mismatch for {normalized_email}")

        document_path = f"members/{user.uid}/characters/{_character_key(normalized_name)}"
        character = client.document(document_path).get()
        if not character.exists:
            raise MigrationError(f"character is missing: {normalized_name}")
        character_data = character.to_dict() or {}
        if character_data.get("characterName") != normalized_name:
            raise MigrationError(f"character name mismatch: {normalized_name}")
        old_path = str((character_data.get("portrait") or {}).get("path") or "")
        destination_path = (
            f"character-portraits/{user.uid}/{_storage_key(normalized_name)}/"
            f"portrait-{version + index}.webp"
        )
        targets.append(PortraitTarget(
            normalized_email,
            user.uid,
            normalized_name,
            document_path,
            source_path,
            destination_path,
            old_path,
            data,
        ))
    return targets


def print_plan(targets: list[PortraitTarget], status: str) -> None:
    print(json.dumps({
        "status": status,
        "projectId": PROJECT_ID,
        "portraits": [{
            "email": target.email,
            "characterName": target.character_name,
            "documentPath": target.document_path,
            "oldPath": target.old_path,
            "newPath": target.destination_path,
            "bytes": len(target.data),
        } for target in targets],
    }, ensure_ascii=False, indent=2, sort_keys=True))


def apply_targets(targets: list[PortraitTarget], firestore_module: Any, client: Any, bucket: Any) -> None:
    uploaded = []
    try:
        for target in targets:
            blob = bucket.blob(target.destination_path)
            blob.cache_control = "private,max-age=31536000,immutable"
            blob.upload_from_string(target.data, content_type="image/webp", if_generation_match=0)
            uploaded.append(blob)

        batch = client.batch()
        for target in targets:
            batch.update(client.document(target.document_path), {
                "portrait": {
                    "path": target.destination_path,
                    "contentType": "image/webp",
                    "size": len(target.data),
                    "updatedAt": firestore_module.SERVER_TIMESTAMP,
                },
                "updatedAt": firestore_module.SERVER_TIMESTAMP,
            })
        batch.commit()
    except Exception:
        for blob in uploaded:
            try:
                blob.delete()
            except Exception:
                pass
        raise

    for target in targets:
        if target.old_path and target.old_path != target.destination_path:
            try:
                bucket.blob(target.old_path).delete()
            except Exception as exc:
                print(f"warning: could not remove {target.old_path}: {exc}", file=sys.stderr)


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--entry",
        nargs=3,
        action="append",
        metavar=("EMAIL", "CHARACTER_NAME", "WEBP_PATH"),
        required=True,
    )
    parser.add_argument("--project", default=PROJECT_ID)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--confirm-project")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = make_parser().parse_args(argv)
    try:
        auth_module, firestore_module, client, bucket = load_admin(args.project)
        targets = resolve_targets(args.entry, auth_module, client)
        if not args.apply:
            print_plan(targets, "ready")
            return 0
        if args.confirm_project != PROJECT_ID:
            raise MigrationError("--confirm-project must match the configured project")
        apply_targets(targets, firestore_module, client, bucket)
        print_plan(targets, "replaced")
        return 0
    except Exception as exc:
        print(json.dumps({"status": "error", "message": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
