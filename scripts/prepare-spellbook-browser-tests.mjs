import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const directory = process.env.RUGATHA_FIREBASE_TEST_SDK_DIR || join(tmpdir(), 'rugatha-firebase-12.7.0');
await mkdir(directory, { recursive: true });
for (const name of ['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js', 'firebase-storage.js']) {
  const response = await fetch(`https://www.gstatic.com/firebasejs/12.7.0/${name}`);
  if (!response.ok) throw new Error(`${name}: ${response.status}`);
  await writeFile(join(directory, name), await response.text());
}
console.log(`Firebase browser test SDK ready: ${directory}`);
