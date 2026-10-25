// Administrative synchronization. Personal answers are never printed or exported.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { parseExperienceInfo } from '../experience/register/settings.js';
const info = JSON.parse(await readFile(new URL('../experience/register/experience_info.json', import.meta.url), 'utf8'));
// Inactive events still need complete identity/settings to update their server record.
const config = { ...parseExperienceInfo({ ...info, active: 'y' }), active: info.active };
if (!['y', 'n'].includes(info.active)) throw new Error('active must be y or n');
const registrationOpen = config.active === 'y';
const settings = {
  scriptName: { stringValue: config.scriptName },
  registrationOpen: { booleanValue: registrationOpen },
  deadline: { timestampValue: new Date(config.deadline).toISOString() },
  maxPlayers: { integerValue: String(config.maxPlayers) },
};
console.log(`Target: rugatha-87e15 / experienceEvents/${config.eventId}`);
console.log(`Deadline: ${config.deadline}; open: ${registrationOpen}; max players: ${config.maxPlayers}`);
if (!process.argv.includes('--apply')) {
  console.log('Dry run. Add --apply to sync settings and recalculate registered players.');
} else {
  const require = createRequire(import.meta.url);
  const auth = require('firebase-tools/lib/auth');
  const { requireAuth } = require('firebase-tools/lib/requireAuth');
  const { Client } = require('firebase-tools/lib/apiv2');
  const options = { project: 'rugatha-87e15' };
  const account = auth.getProjectDefaultAccount(process.cwd());
  if (!account) throw new Error('Sign in with firebase login first.');
  auth.setActiveAccount(options, account);
  await requireAuth(options);
  const client = new Client({ urlPrefix: 'https://firestore.googleapis.com' });
  const database = 'projects/rugatha-87e15/databases/(default)';
  const name = `${database}/documents/experienceEvents/${config.eventId}`;
  // Reading the event and its registrations in one transaction prevents a sync
  // from resetting the count while someone is completing a registration.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const started = await client.post(`/v1/${database}/documents:beginTransaction`, {}, { skipLog: { resBody: true } });
    const transaction = started.body.transaction;
    try {
      let previous;
      try { previous = await client.get(`/v1/${name}`, { queryParams: { transaction }, skipLog: { resBody: true } }); }
      catch (error) { if (error.status !== 404) throw error; }
      const rows = await client.post(`/v1/${database}/documents:runQuery`, {
        transaction,
        structuredQuery: {
          from: [{ collectionId: 'experienceRegistrations' }],
          select: { fields: [{ fieldPath: 'partySize' }, { fieldPath: 'status' }] },
          where: { fieldFilter: { field: { fieldPath: 'eventId' }, op: 'EQUAL', value: { stringValue: config.eventId } } },
        },
      }, { skipLog: { reqBody: true, resBody: true } });
      let registeredPlayers = 0;
      for (const row of rows.body) {
        if (!row.document || row.document.fields?.status?.stringValue === 'cancelled') continue;
        const count = Number(row.document.fields?.partySize?.integerValue);
        if (!Number.isSafeInteger(count) || count < 1) throw new Error('An existing registration has an invalid partySize');
        registeredPlayers += count;
      }
      if (registeredPlayers > config.maxPlayers) throw new Error('maxPlayers cannot be less than the registered player count');
      const fields = { ...settings, registeredPlayers: { integerValue: String(registeredPlayers) } };
      if (previous?.body.fields?.lastRegistrationId) fields.lastRegistrationId = previous.body.fields.lastRegistrationId;
      await client.post(`/v1/${database}/documents:commit`, {
        transaction,
        writes: [{ update: { name, fields }, updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }] }],
      }, { skipLog: { reqBody: true, resBody: true } });
      console.log(`Intake settings verified and synchronized. Registered: ${registeredPlayers}; remaining: ${config.maxPlayers - registeredPlayers}.`);
      break;
    } catch (error) {
      try { await client.post(`/v1/${database}/documents:rollback`, { transaction }, { skipLog: { reqBody: true, resBody: true } }); } catch {}
      if (error.status === 409 && attempt < 4) continue;
      throw error;
    }
  }
}
