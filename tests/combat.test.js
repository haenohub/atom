import test from 'node:test';
import assert from 'node:assert/strict';
import { bowShot, BOW_DRAW_SECONDS, skillAvailability, isArrowSkill, inSpellArea } from '../src/combat.js';
import { createPlayer } from '../src/state.js';
import { SKILLS, BRANCH_SKILLS, CLASSES, skillsFor } from '../src/data.js';

test('bow starts weak and full draw increases actual speed and damage',()=>{
  const tap=bowShot(0),full=bowShot(BOW_DRAW_SECONDS);assert.equal(tap.charge,0);assert.equal(full.charge,1);assert.equal(full.speed,72);assert.equal(full.multiplier,1.6);assert.equal(full.gravity,9.81);assert.ok(tap.speed<full.speed);assert.ok(tap.multiplier<full.multiplier);assert.ok(tap.spread>full.spread);
});
test('bow charge is bounded and increases monotonically',()=>{assert.equal(bowShot(-9).charge,0);assert.equal(bowShot(99).charge,1);let last=0;for(let i=0;i<30;i++){const c=bowShot(i*.06).charge;assert.ok(c>=last);assert.ok(c>=0&&c<=1);last=c;}});
test('half draw is distinct from tap and full draw',()=>{const mid=bowShot(BOW_DRAW_SECONDS*.5);assert.equal(mid.charge,.5);assert.ok(mid.speed>bowShot(0).speed&&mid.speed<bowShot(100).speed);});
test('ranger offensive skills are arrow modifiers, healing remains instant',()=>{
  const p=createPlayer('ranger');for(const s of SKILLS.ranger.filter(s=>s.power))assert.equal(isArrowSkill(p,s),true);
  for(const b of CLASSES.ranger.branches)for(const s of BRANCH_SKILLS[b])if(s.kind!=='shadowVolley')assert.equal(s.delivery,'arrow');assert.equal(isArrowSkill(p,BRANCH_SKILLS.shadow[0]),false);assert.equal(BRANCH_SKILLS.shadow[0].kind,'shadowVolley');assert.equal(BRANCH_SKILLS.shadow[0].radius,8);assert.equal(isArrowSkill(p,SKILLS.ranger[2]),false);assert.equal(isArrowSkill(createPlayer('mage'),SKILLS.ranger[0]),false);
});
test('all mage offensive base and advancement skills are ground areas',()=>{
  for(const s of [...SKILLS.mage,...BRANCH_SKILLS.archmage,...BRANCH_SKILLS.elementalist])if(s.power){assert.equal(s.targeted,true);assert.ok(s.radius>0&&s.range>s.radius);assert.ok(s.delay>=0);assert.notEqual(s.delivery,'arrow');assert.notEqual(s.kind,'fire');}
});
test('skill readiness checks unlocking, cooldown, mana and free self restore',()=>{
  const p=createPlayer('mage'),s=SKILLS.mage[0];assert.equal(skillAvailability(p,s),null);p.mana=0;assert.match(skillAvailability(p,s),/마나/);p.mana=100;assert.match(skillAvailability(p,s,2),/준비/);assert.match(skillAvailability(p,SKILLS.mage[1]),/해금/);p.level=7;p.mana=0;assert.equal(skillAvailability(p,SKILLS.mage[2]),null);assert.match(skillAvailability(p,skillsFor(p)[3]),/해금/);
});
test('area damage includes boundary and excludes distant or vertically separated targets',()=>{
  const c={x:12,z:-5,y:4};assert.equal(inSpellArea({x:12,z:-5,y:4},c,7),true);assert.equal(inSpellArea({x:19,z:-5,y:4},c,7),true);assert.equal(inSpellArea({x:19.01,z:-5,y:4},c,7),false);assert.equal(inSpellArea({x:12,z:-5,y:12},c,7),false);
});
