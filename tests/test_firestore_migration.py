import datetime as dt
import base64
import importlib.util
import sys
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).parents[1] / "scripts" / "firestore_migration.py"
SPEC = importlib.util.spec_from_file_location("firestore_migration", SCRIPT_PATH)
assert SPEC and SPEC.loader
MIGRATION = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MIGRATION
SPEC.loader.exec_module(MIGRATION)


class MigrationPlanTest(unittest.TestCase):
    def make_source(self):
        bookmark_path = "npc/one.html"
        bookmark_key = base64.urlsafe_b64encode(bookmark_path.encode()).decode().rstrip("=")
        return {
            "members": {
                "uid-admin": {
                    "memberId": "uid-admin",
                    "memberNo": "0000-0000",
                    "displayName": "Admin",
                    "email": "admin@example.test",
                    "createdAt": "2026-01-01T00:00:00.000Z",
                },
                "uid-one": {
                    "memberId": "uid-one",
                    "memberNo": "0000-0001",
                    "displayName": "One",
                    "email": "one@example.test",
                    "createdAt": "2026-01-02T00:00:00.000Z",
                    "BadgeSTR": 10,
                    "photoUrl": "data:image/jpeg;base64,AAAA",
                    "bookmarks": {
                        bookmark_key: {
                            "path": bookmark_path,
                            "title": "One",
                            "savedAt": "2026-01-03T00:00:00.000Z",
                        }
                    },
                },
            },
            "members_meta": {"memberNoCounter": 1},
            "qa_choices": {
                "0000-0001": {
                    "npc%2Fone%2Ehtml": {
                        "memberNo": "0000-0001",
                        "questionPage": "npc/one.html",
                        "choice": "C1",
                    }
                }
            },
        }

    def test_plan_skips_photo_and_builds_subcollections(self):
        plan = MIGRATION.build_plan(self.make_source(), "a" * 64, "test-run")
        docs = {doc.path: doc.data for doc in plan.documents}
        self.assertEqual(plan.summary["memberDocuments"], 2)
        self.assertEqual(plan.summary["bookmarkDocuments"], 1)
        self.assertEqual(plan.summary["qaChoiceDocuments"], 1)
        self.assertEqual(plan.summary["qaStatsDocuments"], 1)
        self.assertEqual(plan.summary["skippedPhotoCount"], 1)
        self.assertFalse(plan.summary["containsDataUrls"])
        self.assertIsNone(docs["members/uid-one"]["profile"]["photo"])
        self.assertEqual(docs["members/uid-one"]["qaChoiceCount"], 1)
        self.assertEqual(docs["qaStats/npc%2Fone%2Ehtml"]["c1"], 1)
        self.assertEqual(docs["qaStats/npc%2Fone%2Ehtml"]["total"], 1)
        self.assertIsInstance(docs["members/uid-one"]["createdAt"], dt.datetime)

    def test_rejects_unresolved_qa_owner(self):
        source = self.make_source()
        source["qa_choices"]["unknown"] = source["qa_choices"].pop("0000-0001")
        with self.assertRaises(MIGRATION.MigrationError):
            MIGRATION.build_plan(source, "a" * 64, "test-run")

    def test_rejects_bad_qa_key(self):
        source = self.make_source()
        entry = source["qa_choices"]["0000-0001"].pop("npc%2Fone%2Ehtml")
        source["qa_choices"]["0000-0001"]["wrong"] = entry
        with self.assertRaises(MIGRATION.MigrationError):
            MIGRATION.build_plan(source, "a" * 64, "test-run")

    def test_rejects_counter_mismatch(self):
        source = self.make_source()
        source["members_meta"]["memberNoCounter"] = 2
        with self.assertRaises(MIGRATION.MigrationError):
            MIGRATION.build_plan(source, "a" * 64, "test-run")

    def test_firestore_member_converts_back_to_legacy_shape(self):
        member = {
            "memberNo": "0000-0001",
            "displayName": "One",
            "email": "one@example.test",
            "profile": {"title": "Knight", "photo": None},
            "badges": {"STR": 12},
            "achievements": {"ach_one": True},
            "rewardedAchievements": {"ach_one": True},
            "totalTimeSeconds": 120,
            "campaign": "Alpha",
            "character": "Hero",
            "createdAt": dt.datetime(2026, 1, 2, tzinfo=dt.timezone.utc),
        }
        legacy = MIGRATION._member_document_to_rtdb("uid-one", member)
        self.assertEqual(legacy["memberId"], "uid-one")
        self.assertEqual(legacy["BadgeSTR"], 12)
        self.assertEqual(legacy["Campaign"], "Alpha")
        self.assertEqual(legacy["Character"], "Hero")
        self.assertEqual(legacy["createdAt"], "2026-01-02T00:00:00.000Z")
        self.assertEqual(legacy["photoUrl"], "")


if __name__ == "__main__":
    unittest.main()
