import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const json = p => JSON.parse(readFileSync(`toolbox/${p}`, 'utf8'));
const abilities = json('shared/abilities.json').abilities;
const feats = json('feats/feat-data.json');
const races = json('race_class/race_details.json');
const classes = json('race_class/class_details.json');
const named = name => abilities.filter(a => a.title_en === name);
const skillNames = {Athletics:'運動', 'Sleight of Hand':'扒手', Stealth:'隱藏', Acrobatics:'特技動作', Investigation:'調查', History:'歷史', Arcana:'奧術', Nature:'自然', Religion:'宗教', 'Animal Handling':'馴服動物', Insight:'察言觀色', Medicine:'醫術', Perception:'觀察', Survival:'求生', Deception:'欺瞞', Intimidation:'威嚇', Performance:'表演', Persuasion:'說服'};

test('shared saved ability indexes remain complete and official feature identities are corrected', () => {
  assert.equal(abilities.length,558);
  assert.equal(abilities[153].title_en,'Maneuver Save DC');
  assert.equal(abilities[217].title_en,'Perfect Self');
  assert.match(abilities[153].desc_zh,/力量或敏捷/);
  assert.equal(abilities[485].title_en,'Dragonborn Traits');
  assert.equal(abilities[557].category,'background');
});
test('all skill proficiency pairs use the attached Taiwan character-sheet vocabulary', () => {
  const walk = v => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (!v || typeof v !== 'object') return;
    for (const [k,en] of Object.entries(v)) {
      if (k.endsWith('_en') && k.includes('skill') && Array.isArray(en)) {
        const zh=v[k.replace(/_en$/,'_zh')]; assert.equal(zh.length,en.length);
        en.forEach((s,i)=>{if(skillNames[s])assert.equal(zh[i],skillNames[s],`${k}: ${s}`);});
      }
      walk(en);
    }
  };
  [abilities,feats,json('shared/proficiency.json'),classes,json('background/background-data.json')].forEach(walk);
});
test('feats do not invent prerequisites and preserve their 2014 constraints in both languages', () => {
  assert.equal(feats.length,41);
  for (const id of ['athlete','durable','linguist','shield-master']) {
    const f=feats.find(f=>f.id===id);assert.equal(f.prerequisite_en,'None');assert.equal(f.prerequisite_zh,'無');
  }
  const pole=feats.find(f=>f.id==='polearm-master');assert.match(pole.summary_zh,/矛/);assert.match(pole.summary_en,/spear/);
  const war=feats.find(f=>f.id==='war-caster');assert.match(war.summary_zh,/單一|只以/);assert.match(war.summary_en,/only|sole/);
});
test('published and playtest invocation variants carry distinct sources and prerequisites', () => {
  const ua=named('Shroud of Shadow v2')[0];const published=named('Shroud of Shadow')[0];
  assert.match(ua.desc_zh,/契術師 15 級/);assert.match(ua.desc_en,/UARevisedClassOptions/);assert.match(ua.desc_zh,/非正式出版/);
  assert.match(published.desc_en,/Xanathar/);assert.doesNotMatch(published.desc_en,/playtest/);
  assert.match(named('Thirsting Blade')[0].desc_zh,/契術師 5 級.*刃之契約/);
  assert.match(named('Agonizing Blast')[0].desc_en,/Prerequisite: eldritch blast cantrip/);
});
test('errata and mistranslated combat limits are included in the shared and reference data', () => {
  assert.match(named('Divine Smite')[0].desc_zh,/6d8/);
  assert.match(named("Thief's Reflexes")[0].desc_zh,/第一輪.*兩個回合/);
  assert.match(named('Empty Body')[0].desc_zh,/力場以外/);
  for (const lang of ['zh','en']) {
    const c=named("Ranger's Companion")[0]['desc_'+lang];
    assert.match(c,lang==='zh'?/閃避/:/Dodges/);
    assert.ok(classes.find(c=>c.id==='ranger').note['lvl03_details_'+lang].includes(c));
  }
  assert.match(named('Exceptional Training')[0].desc_en,/magical/);
  assert.match(named('Bestial Fury')[0].desc_en,/Multiattack/);
});
test('dragonborn traits provide the action, DC and damage progression in both consumers', () => {
  const d=races.find(r=>r.id==='dragonborn').note;
  assert.match(d.details_zh,/一個動作/);assert.match(d.details_en,/Use an action/);
  assert.match(d.details_zh,/2d6.*3d6.*4d6.*5d6/);
  assert.equal(named('Dragonborn Traits')[0].desc_zh,d.details_zh);
});
