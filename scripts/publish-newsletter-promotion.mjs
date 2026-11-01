// Publish this public campaign image immutably; default mode does not write.
import { readFile } from 'node:fs/promises';
import { storageClient } from './image-original-archive.mjs';
import { imageBucket, publicImageUrl, sha256 } from './image-assets.mjs';

if (process.argv.slice(2).some(arg => arg !== '--publish')) throw Error('Usage: node scripts/publish-newsletter-promotion.mjs [--publish]');
const bytes = await readFile(new URL('../experience/subscription.png', import.meta.url));
if (bytes.subarray(0,8).toString('hex') !== '89504e470d0a1a0a') throw Error('Expected PNG');
const hash = sha256(bytes);
const object = `public-images/experience/subscription-${hash}.png`;
const url = publicImageUrl(imageBucket, object);
const cacheControl = 'public, max-age=31536000, immutable';
if (!process.argv.includes('--publish')) {
  console.log(JSON.stringify({mode:'dry-run',object,url,bytes:bytes.length}));
} else {
  const client = await storageClient();
  const quiet = () => ({skipLog:{reqBody:true,resBody:true}});
  const endpoint = `/storage/v1/b/${imageBucket}/o/${encodeURIComponent(object)}`;
  let metadata;
  try { metadata = (await client.get(endpoint,quiet())).body; }
  catch(error) { if(error.status !== 404) throw error; }
  if (!metadata) {
    const boundary = `rugatha-${hash}`;
    const info = {name:object,contentType:'image/png',cacheControl,metadata:{sha256:hash}};
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(info)}\r\n--${boundary}\r\nContent-Type: image/png\r\n\r\n`),
      bytes,Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);
    await client.request({method:'POST',path:`/upload/storage/v1/b/${imageBucket}/o`,queryParams:{uploadType:'multipart',ifGenerationMatch:0},headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body,...quiet()});
    metadata = (await client.get(endpoint,quiet())).body;
  }
  if(metadata.metadata?.sha256 !== hash || Number(metadata.size) !== bytes.length || metadata.contentType !== 'image/png' || metadata.cacheControl !== cacheControl) throw Error('Object metadata mismatch');
  const response = await fetch(url);
  if(!response.ok || sha256(Buffer.from(await response.arrayBuffer())) !== hash) throw Error(`Anonymous read-back failed: ${response.status}`);
  console.log(JSON.stringify({mode:'published-and-verified',object,url,bytes:bytes.length}));
}
