import { readFileSync } from "node:fs";
import test, { after, before } from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
import { get, ref, set } from "firebase/database";

const PROJECT_ID = "demo-rugatha-maintenance";
let environment;

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    database: { rules: readFileSync("database.maintenance.rules.json", "utf8") }
  });
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.database();
    await set(ref(db, "members/owner"), {
      memberId: "owner",
      email: "owner@example.test"
    });
    await set(ref(db, "members_meta/memberNoCounter"), 57);
    await set(ref(db, "qa_choices/owner/page"), {
      memberNo: "0000-0001",
      questionPage: "page",
      choice: "C1"
    });
  });
});

after(async () => {
  await environment.cleanup();
});

test("maintenance rules preserve reads and reject every migrated write path", async () => {
  const ownerDb = environment.authenticatedContext("owner", {
    email: "owner@example.test"
  }).database();
  const publicDb = environment.unauthenticatedContext().database();

  await assertSucceeds(get(ref(ownerDb, "members/owner")));
  await assertSucceeds(get(ref(ownerDb, "members_meta/memberNoCounter")));
  await assertSucceeds(get(ref(publicDb, "qa_choices")));

  await assertFails(set(ref(ownerDb, "members/owner/title"), "blocked"));
  await assertFails(set(ref(ownerDb, "members_meta/memberNoCounter"), 58));
  await assertFails(set(ref(ownerDb, "qa_choices/owner/new-page"), {
    memberNo: "0000-0001",
    questionPage: "new-page",
    choice: "C2"
  }));
});
