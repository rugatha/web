"""Resolve an authentication UID to the current Firestore member path."""
import re


def member_path(client, uid):
    mapping = client.document(f'memberKeys/{uid}').get()
    if not mapping.exists:
        return f'members/{uid}'
    number = mapping.to_dict().get('memberNo', '')
    if not re.fullmatch(r'[0-9]{4}-[0-9]{4}', number):
        raise ValueError('Invalid member number mapping')
    return f'members/{number}'
