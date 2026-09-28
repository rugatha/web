"""Back up and atomically re-key members and all descendants by memberNo.

Deploy the memberKeys-aware client and rules BEFORE running --apply.
No Storage objects or authentication UIDs are changed.
"""
import argparse
import json
import pickle
import re
from pathlib import Path

import firebase_admin
from firebase_admin import firestore


def descendants(reference):
    for collection in reference.collections():
        for child in collection.list_documents():
            snapshot = child.get(timeout=30)
            if snapshot.exists:
                yield snapshot
            yield from descendants(child)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--backup', type=Path, required=True)
    args = parser.parse_args()
    firebase_admin.initialize_app(options={'projectId': 'rugatha-87e15'})
    db = firestore.client()
    members = list(db.collection('members').stream(timeout=45))
    numbers = [s.to_dict().get('memberNo', '') for s in members]
    if not all(re.fullmatch(r'[0-9]{4}-[0-9]{4}', n) for n in numbers) or len(set(numbers)) != len(numbers):
        raise RuntimeError('Missing or duplicate member numbers')
    moves, mappings = [], []
    for member in members:
        data = member.to_dict()
        uid, number = data['memberId'], data['memberNo']
        if member.id == number:
            mapping = db.document(f'memberKeys/{uid}').get(timeout=30)
            if not mapping.exists or mapping.to_dict() != {'memberNo': number}:
                raise RuntimeError('Existing number-keyed member has an invalid mapping')
            continue
        if member.id != uid:
            raise RuntimeError('Unexpected source key')
        mappings.append((f'memberKeys/{uid}', {'memberNo': number}))
        for source in [member, *descendants(member.reference)]:
            destination = f'members/{number}' + source.reference.path[len(member.reference.path):]
            moves.append((source, destination))
    writes = len(moves) * 2 + len(mappings)
    if writes > 500:
        raise RuntimeError(f'{writes} writes exceed the atomic batch limit; no changes made')
    if not moves:
        print(json.dumps({'status': 'already migrated', 'members': len(members)}))
        return
    # Exclusive creation prevents overwriting a previous recovery backup.
    with args.backup.open('xb') as output:
        pickle.dump([{'path': s.reference.path, 'data': s.to_dict(), 'destination': d} for s, d in moves], output)
    args.backup.chmod(0o600)
    summary = {'members': len(mappings), 'documents': len(moves), 'writes': writes, 'backup': str(args.backup)}
    if not args.apply:
        print(json.dumps({'status': 'dry-run', **summary}))
        return
    batch = db.batch()
    for path, data in mappings:
        batch.create(db.document(path), data)
    for source, destination in moves:
        batch.create(db.document(destination), source.to_dict())
        batch.delete(source.reference, option=db.write_option(last_update_time=source.update_time))
    batch.commit(timeout=60)
    for source, destination in moves:
        copied = db.document(destination).get(timeout=30)
        if not copied.exists or copied.to_dict() != source.to_dict() or source.reference.get(timeout=30).exists:
            raise RuntimeError('Post-migration verification mismatch; consult backup')
    print(json.dumps({'status': 'migrated and verified', **summary}))


if __name__ == '__main__':
    main()
