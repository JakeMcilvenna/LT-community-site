import assert from 'node:assert/strict';
import test from 'node:test';

import { enrichForeverCharacter } from '../lib/battlenet/forever-character-details.ts';
import { buildForeverCharacterProfileLinks } from '../lib/forever-character-profile.ts';

const owned = { id: '42', name: 'Asha', surname: 'Brightvale', fullName: 'Asha Brightvale', level: 25, region: 'eu', className: 'Mage' };
const identity = { id: 42, name: 'Asha', surname: 'Brightvale' };
const talents = (groups) => ({ character: identity, specialization_groups: groups });
const tree = (name, points) => ({ specialization_name: name, spent_points: points });

test('Forever links point to the Forever Armory and the appropriate Raider.IO ruleset', () => {
  for (const [id, slug] of [[1, 'pvp'], [2, 'normal'], [3, 'rp'], [15, 'pvp-rp']]) {
    const links = buildForeverCharacterProfileLinks({ ...owned, rulesetId: id });
    assert.equal(links.armoryUrl, 'https://worldofwarcraft.blizzard.com/en-gb/forever/eu/armory/character/asha-brightvale');
    assert.equal(links.raiderIoProfileUrl, `https://forever.raider.io/characters/eu/${slug}/Asha%20Brightvale`);
  }
  assert.equal(buildForeverCharacterProfileLinks(owned).raiderIoProfileUrl, undefined);
  assert.equal(buildForeverCharacterProfileLinks({ ...owned, rulesetId: 999 }).raiderIoProfileUrl, undefined);
});

test('Forever links encode accented names and their surname', () => {
  const links = buildForeverCharacterProfileLinks({ ...owned, name: 'Björn', surname: 'Brûme', rulesetId: 1 });
  assert.match(links.armoryUrl, /bj%C3%B6rn-br%C3%BBme$/);
  assert.match(links.raiderIoProfileUrl, /Bj%C3%B6rn%20Br%C3%BBme$/);
});

test('Forever spec comes from the active talent group and its dominant tree', () => {
  const details = enrichForeverCharacter(owned, null, talents([
    { is_active: false, specializations: [tree('Fire', 20)] },
    { is_active: true, specializations: [tree('Arcane', 5), tree('Frost', 11)] },
  ]));
  assert.equal(details.specialization, 'Frost');
});

test('Forever hybrid talent ties remain explicit and unspent talents stay unavailable', () => {
  assert.equal(enrichForeverCharacter(owned, null, talents([{ is_active: true, specializations: [tree('Fire', 5), tree('Frost', 5)] }])).specialization, 'Fire / Frost');
  assert.equal(enrichForeverCharacter(owned, null, talents([{ is_active: true, specializations: [tree('Frost', 0)] }])).specialization, undefined);
  assert.equal(enrichForeverCharacter(owned, null, talents([{ is_active: true }])).specialization, undefined);
});

test('Forever ignores profile or talent data that belongs to another character', () => {
  const details = enrichForeverCharacter(owned,
    { ...identity, id: 999, level: 60, active_spec: { name: 'Fire' }, ruleset: { id: 1 } },
    { ...talents([{ is_active: true, specializations: [tree('Fire', 30)] }]), character: { ...identity, id: 999 } });
  assert.equal(details.level, 25);
  assert.equal(details.specialization, undefined);
  assert.equal(details.raiderIoProfileUrl, undefined);
});
