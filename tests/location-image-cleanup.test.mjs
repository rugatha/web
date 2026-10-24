import test from 'node:test';
import assert from 'node:assert/strict';
import {planCleanup} from '../scripts/cleanup-location-images.mjs';
const hash='a'.repeat(64);
const image=id=>({name:`public-images/locations/${id}/${hash}/reading.png`,generation:'123',size:'100',metadata:{sha256:hash}});

test('cleanup protects runtime references even when metadata is unexpected',()=>{
 const current=image('current');delete current.metadata;
 const old=image('old');const p=planCleanup([current,old],new Set([current.name]));
 assert.deepEqual(p.kept,[current]);assert.deepEqual(p.candidates,[old]);
});
test('missing runtime images abort cleanup rather than allowing partial protection',()=>{
 assert.throws(()=>planCleanup([image('old')],new Set([image('current').name])),/Referenced image missing/);
});
test('unrecognized, held and mismatched objects cannot enter the deletion plan',()=>{
 const held={...image('held'),temporaryHold:true};
 const mismatch={...image('mismatch'),metadata:{sha256:'b'.repeat(64)}};
 const other={...image('other'),name:'public-images/npcs/other/reading.png'};
 const retained={...image('retained'),retention:{mode:'Locked'}};
 const p=planCleanup([held,mismatch,other,retained],new Set());
 assert.equal(p.candidates.length,0);assert.equal(p.blocked.length,4);
});
