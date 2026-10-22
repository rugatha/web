// HTTPS loopback harness: exercises the real production worker, not its localhost bypass.
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const directory = await mkdtemp(join(tmpdir(), 'rugatha-letter-https-'));
const key = join(directory, 'key.pem'), cert = join(directory, 'cert.pem');
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key,
  '-out', cert, '-days', '1', '-subj', '/CN=rugatha.test'], { stdio: 'ignore' });
const oldWorker = join(directory, 'old-sw.js');
await writeFile(oldWorker, execFileSync('git', ['show', '46f445b:sw.js']));
process.env.RUGATHA_IMAGE_TEST_TLS_KEY = key;
process.env.RUGATHA_IMAGE_TEST_TLS_CERT = cert;
process.env.RUGATHA_IMAGE_TEST_OLD_WORKER = oldWorker;
process.env.RUGATHA_IMAGE_TEST_PORT = '8767';
await import('./image-browser-server.mjs');
