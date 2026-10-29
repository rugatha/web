#!/usr/bin/env python3
"""Provision chapter credentials and authoritative choice settings in Firestore."""
import argparse
import getpass
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NAMES = {'midori': 'Midori', 'samael': 'Samael', 'siri': 'Siri', 'yhwh': 'YHWH', 'beau': 'Beau', 'ron': 'Ron'}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Write to Firestore using Application Default Credentials')
    parser.add_argument('--password-suffix', help='Shared suffix, e.g. 1234 or MMDD; omit to preserve existing passwords')
    parser.add_argument('--passwords-stdin', action='store_true', help='Read an object of character IDs and exact passwords from stdin; never print or save passwords')
    args = parser.parse_args()
    config = json.loads((ROOT / 'campaigns/data/plus-08-multiple-choices.json').read_text())
    arc, chapter = config['chapterKey'].split('/')
    chapters = json.loads((ROOT / 'campaigns/data/chapter-content.json').read_text())
    chapter_settings = next(entry for entry in chapters.values() if entry.get('source') == f'campaigns/pages/rugatha-plus/{arc}/{chapter}.html')
    lock = chapter_settings['lock']
    if type(lock) is not int or lock not in (0, 1):
        raise SystemExit('Chapter lock must be 0 or 1')
    path = f'chapterAccess/{arc}/pages/{chapter}'
    payload = {'chapterKey': config['chapterKey'], 'lock': lock, 'questions': {
        q['id']: {'allowedCharacters': [p['id'] for p in config['groups'][q['group']]]}
        for q in config['questions']
    }}
    if args.passwords_stdin:
        if args.password_suffix is not None:
            raise SystemExit('Use either --passwords-stdin or --password-suffix')
        passwords = json.load(sys.stdin)
        if set(passwords) != set(NAMES) or any(not isinstance(value, str) or not value for value in passwords.values()):
            raise SystemExit('Provide one nonempty password for each of the six character IDs')
        payload['passwordHashes'] = {key: hashlib.sha256(value.encode()).hexdigest() for key, value in passwords.items()}
        del passwords
    if args.password_suffix is not None:
        payload['passwordHashes'] = {key: hashlib.sha256(f'{name}_{args.password_suffix}'.encode()).hexdigest() for key, name in NAMES.items()}
    print(f"Target: rugatha-87e15 / {path}; {len(payload['questions'])} question(s)")
    if not args.apply:
        print('Dry run; no changes. Add --apply to write. Password hashes are never printed.')
        return
    import firebase_admin
    from firebase_admin import firestore
    firebase_admin.initialize_app(options={'projectId': 'rugatha-87e15'})
    client = firestore.client()
    target = client.document(path)
    if 'passwordHashes' not in payload and not target.get().exists:
        suffix = getpass.getpass('Initial shared password suffix: ')
        if not suffix:
            raise SystemExit('A password suffix is required for initial setup')
        payload['passwordHashes'] = {key: hashlib.sha256(f'{name}_{suffix}'.encode()).hexdigest() for key, name in NAMES.items()}
    payload['updatedAt'] = firestore.SERVER_TIMESTAMP
    target.set(payload, merge=list(payload))
    print('Chapter credentials/settings saved. Answers were preserved.')

if __name__ == '__main__':
    main()
