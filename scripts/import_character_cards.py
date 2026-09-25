#!/usr/bin/env python3
"""Import exported Rugatha character sheets into Firestore and Cloud Storage."""

from __future__ import annotations

import argparse
import base64
import binascii
import json
import sys
import urllib.parse
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Sequence


PROJECT_ID = "rugatha-87e15"
DATABASE_ID = "(default)"
STORAGE_BUCKET = "rugatha-87e15.firebasestorage.app"
MAX_DOCUMENT_BYTES = 900 * 1024
MAX_PORTRAIT_BYTES = 5 * 1024 * 1024
ALLOWED_PORTRAIT_TYPES = {
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
}


class ImportError(RuntimeError):
    """Raised when an import cannot proceed safely."""


@dataclass(frozen=True)
class CharacterSource:
    email: str
    path: Path
    character_name: str
    character_key: str
    storage_key: str
    content_type: str
    extension: str
    portrait_bytes: bytes
    sheet_data: dict[str, Any]


@dataclass(frozen=True)
class CharacterTarget:
    source: CharacterSource
    uid: str
    document_path: str
    storage_path: str


def _parse_data_url(value: Any) -> tuple[str, bytes]:
    if not isinstance(value, str) or not value.startswith("data:"):
        raise ImportError("portraitSrc must be an embedded data URL")
    try:
        header, payload = value.split(",", 1)
    except ValueError as exc:
        raise ImportError("portraitSrc data URL is malformed") from exc
    if not header.endswith(";base64"):
        raise ImportError("portraitSrc must use base64 encoding")
    content_type = header[5:-7].lower()
    if content_type not in ALLOWED_PORTRAIT_TYPES:
        raise ImportError("portraitSrc must be PNG, JPEG, or WebP")
    try:
        raw = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ImportError("portraitSrc contains invalid base64 data") from exc
    if not raw or len(raw) > MAX_PORTRAIT_BYTES:
        raise ImportError("portraitSrc must be between 1 byte and 5 MB")
    return content_type, raw


def _character_key(name: str) -> str:
    return urllib.parse.quote(name, safe="-_.!~*'()")


def _storage_key(name: str) -> str:
    return base64.urlsafe_b64encode(name.encode("utf-8")).decode("ascii").rstrip("=")


def load_source(email: str, path: Path) -> CharacterSource:
    try:
        envelope = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ImportError(f"could not read {path.name}") from exc
    if not isinstance(envelope, dict) or envelope.get("format") != "rugatha-character-sheet":
        raise ImportError(f"{path.name} is not a Rugatha character sheet export")
    if envelope.get("version") != 1 or not isinstance(envelope.get("data"), dict):
        raise ImportError(f"{path.name} uses an unsupported format version")

    data = dict(envelope["data"])
    character_name = " ".join(str(data.get("characterName") or "").split()).strip()
    if not character_name or len(character_name) > 120:
        raise ImportError(f"{path.name} has an invalid character name")
    content_type, portrait_bytes = _parse_data_url(data.pop("portraitSrc", ""))
    document_bytes = len(json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
    if document_bytes > MAX_DOCUMENT_BYTES:
        raise ImportError(f"{path.name} character data is too large for Firestore")

    return CharacterSource(
        email=email.strip().lower(),
        path=path,
        character_name=character_name,
        character_key=_character_key(character_name),
        storage_key=_storage_key(character_name),
        content_type=content_type,
        extension=ALLOWED_PORTRAIT_TYPES[content_type],
        portrait_bytes=portrait_bytes,
        sheet_data=data,
    )


def load_admin(project_id: str):
    try:
        import firebase_admin
        from firebase_admin import auth, firestore, storage
    except ImportError as exc:
        raise ImportError("firebase-admin is required") from exc
    if project_id != PROJECT_ID:
        raise ImportError("refusing to use an unexpected Firebase project")
    try:
        app = firebase_admin.get_app()
    except ValueError:
        app = firebase_admin.initialize_app(options={
            "projectId": project_id,
            "storageBucket": STORAGE_BUCKET,
        })
    return (
        auth,
        firestore,
        firestore.client(app=app, database_id=DATABASE_ID),
        storage.bucket(app=app),
    )


def resolve_targets(sources: list[CharacterSource], auth_module: Any, client: Any, bucket: Any) -> list[CharacterTarget]:
    targets = []
    for source in sources:
        user = auth_module.get_user_by_email(source.email)
        member_ref = client.document(f"members/{user.uid}")
        member_snapshot = member_ref.get()
        if not member_snapshot.exists:
            raise ImportError(f"member document is missing for {source.email}")
        member_email = str((member_snapshot.to_dict() or {}).get("email") or "").lower()
        if member_email != source.email:
            raise ImportError(f"member email mismatch for {source.email}")

        document_path = f"members/{user.uid}/characters/{source.character_key}"
        storage_path = (
            f"character-portraits/{user.uid}/{source.storage_key}/portrait.{source.extension}"
        )
        if client.document(document_path).get().exists:
            raise ImportError(f"character already exists: {source.character_name}")
        if bucket.blob(storage_path).exists():
            raise ImportError(f"portrait already exists: {source.character_name}")
        targets.append(CharacterTarget(source, user.uid, document_path, storage_path))
    return targets


def print_plan(targets: list[CharacterTarget], status: str) -> None:
    summary = {
        "status": status,
        "projectId": PROJECT_ID,
        "characters": [
            {
                "email": target.source.email,
                "characterName": target.source.character_name,
                "documentPath": target.document_path,
                "storagePath": target.storage_path,
                "portraitBytes": len(target.source.portrait_bytes),
            }
            for target in targets
        ],
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True))


def apply_targets(targets: list[CharacterTarget], firestore_module: Any, client: Any, bucket: Any) -> None:
    uploaded = []
    try:
        for target in targets:
            blob = bucket.blob(target.storage_path)
            blob.cache_control = "private,max-age=3600"
            blob.upload_from_string(
                target.source.portrait_bytes,
                content_type=target.source.content_type,
                if_generation_match=0,
            )
            uploaded.append(blob)

        batch = client.batch()
        for target in targets:
            source = target.source
            data = source.sheet_data
            batch.create(client.document(target.document_path), {
                "schemaVersion": 1,
                "memberId": target.uid,
                "characterName": source.character_name,
                "className": str(data.get("class1Other") or data.get("class1") or "")[:120],
                "race": str(data.get("raceOther") or data.get("race") or "")[:120],
                "data": data,
                "portrait": {
                    "path": target.storage_path,
                    "contentType": source.content_type,
                    "size": len(source.portrait_bytes),
                    "updatedAt": firestore_module.SERVER_TIMESTAMP,
                },
                "createdAt": firestore_module.SERVER_TIMESTAMP,
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


def verify_targets(sources: list[CharacterSource], auth_module: Any, client: Any, bucket: Any) -> list[CharacterTarget]:
    targets = []
    for source in sources:
        user = auth_module.get_user_by_email(source.email)
        document_path = f"members/{user.uid}/characters/{source.character_key}"
        storage_path = (
            f"character-portraits/{user.uid}/{source.storage_key}/portrait.{source.extension}"
        )
        snapshot = client.document(document_path).get()
        if not snapshot.exists:
            raise ImportError(f"character is missing: {source.character_name}")
        stored = snapshot.to_dict() or {}
        if stored.get("memberId") != user.uid or stored.get("characterName") != source.character_name:
            raise ImportError(f"character metadata mismatch: {source.character_name}")
        if stored.get("data") != source.sheet_data:
            raise ImportError(f"character data mismatch: {source.character_name}")
        portrait = stored.get("portrait") or {}
        if portrait.get("path") != storage_path or portrait.get("size") != len(source.portrait_bytes):
            raise ImportError(f"portrait metadata mismatch: {source.character_name}")
        blob = bucket.blob(storage_path)
        blob.reload()
        if blob.size != len(source.portrait_bytes) or blob.content_type != source.content_type:
            raise ImportError(f"portrait object mismatch: {source.character_name}")
        targets.append(CharacterTarget(source, user.uid, document_path, storage_path))
    return targets


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--entry", nargs=2, action="append", metavar=("EMAIL", "JSON_PATH"), required=True)
    parser.add_argument("--project", default=PROJECT_ID)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--confirm-project")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = make_parser().parse_args(argv)
    try:
        sources = [load_source(email, Path(path)) for email, path in args.entry]
        if len({source.email for source in sources}) != len(sources):
            raise ImportError("each import must target a different member")
        if args.apply and args.verify:
            raise ImportError("--apply and --verify cannot be used together")
        auth_module, firestore_module, client, bucket = load_admin(args.project)
        if args.verify:
            targets = verify_targets(sources, auth_module, client, bucket)
            print_plan(targets, "verified")
            return 0
        targets = resolve_targets(sources, auth_module, client, bucket)
        if not args.apply:
            print_plan(targets, "ready")
            return 0
        if args.confirm_project != PROJECT_ID:
            raise ImportError("--confirm-project must match the configured project")
        apply_targets(targets, firestore_module, client, bucket)
        print_plan(targets, "imported")
        return 0
    except Exception as exc:
        print(json.dumps({"status": "error", "message": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
