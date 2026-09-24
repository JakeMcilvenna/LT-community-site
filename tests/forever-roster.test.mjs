import assert from "node:assert/strict";
import test from "node:test";

import {
  discordNameToCharacter,
  foreverMembersFromCsv,
  normalizeSpecialization,
  parseCsv,
  roleFromSpecialization,
} from "../lib/forever-roster-core.ts";

test("parses quoted CSV fields", () => {
  assert.deepEqual(parseCsv('Name,Note\r\n"Dirk, Jr","Says ""hello"""\r\n'), [
    ["Name", "Note"],
    ["Dirk, Jr", 'Says "hello"'],
  ]);
});

test("builds the requested short character name from Discord", () => {
  assert.equal(discordNameToCharacter("dirk3656"), "Dirk3");
  assert.equal(discordNameToCharacter("m4kt"), "M4kt");
  assert.equal(discordNameToCharacter("mystic_slam"), "Mysti");
});

test("normalizes current free-form spec values and derives roles", () => {
  assert.equal(normalizeSpecialization("Paladin", "Retro"), "Retribution");
  assert.equal(normalizeSpecialization("Hunter", "MM"), "Marksmanship");
  assert.equal(normalizeSpecialization("Shaman", "Restoration/Elemental"), "Restoration / Elemental");
  assert.equal(normalizeSpecialization("Priest", "Shadow and disc or holy"), "Shadow / Discipline / Holy");
  assert.equal(normalizeSpecialization("Warlock", "Whatever's meta"), undefined);
  assert.equal(roleFromSpecialization("Restoration / Elemental"), "Healer");
  assert.equal(roleFromSpecialization("Retribution"), "DPS");
});

test("maps spreadsheet columns without relying on column positions", () => {
  const csv = [
    "Discord ID,Discord User,Character,Class,Spec,Profession 1,Profession 2,Last Updated",
    '123,crubz1,"Ignored, Name",Warrior,Fury,Mining,Skinning,21/09/2026 17:45',
  ].join("\r\n");
  const members = foreverMembersFromCsv(csv);

  assert.equal(members.length, 1);
  assert.deepEqual(members[0], {
    id: "forever-123",
    characterName: "Crubz",
    rank: "Forever",
    className: "Warrior",
    specialization: "Fury",
    role: "DPS",
    showCharacterProfiles: false,
  });
});
