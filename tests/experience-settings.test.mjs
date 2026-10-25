import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseExperienceInfo } from '../experience/register/settings.js';
// Validate active-event settings even when the current intake is closed.
const info={...JSON.parse(readFileSync('experience/register/experience_info.json','utf8')),active:'y'};
test('separate dates/times use Taiwan time, deadline covers final minute, fixed fields ignore overrides',()=>{
 const result=parseExperienceInfo({...info,contactEmail:'bad',system:'bad',world:'bad'});
 assert.equal(result.startsAt,'2026-10-31T13:00:00+08:00');
 assert.equal(result.endsAt,'2026-10-31T17:30:00+08:00');
 assert.equal(result.deadline,`${info.deadline}T23:59:59.999+08:00`);
 assert.equal(result.contactEmail,'rugathadnd@gmail.com');
 assert.equal(result.system,'龍與地下城第五版（D&D 5e）');
 assert.equal(result.world,'Rugatha（原創）');
 for(const key of ['poster','remainingSeats','startsAt','endsAt','contactEmail','system','world'])assert.equal(Object.hasOwn(info,key),false);
});
test('rejects impossible dates, invalid times and inconsistent ranges',()=>{
 for(const patch of [{startDate:'2026-02-30'},{endTime:'24:00'},{startTime:'1:00'},{deadline:'2026-11-31'},{endTime:'12:00'},{deadline:'2026-11-01'}])assert.throws(()=>parseExperienceInfo({...info,...patch}));
 assert.equal(parseExperienceInfo({active:'n'}).active,'n');
});
