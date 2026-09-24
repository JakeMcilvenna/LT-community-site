import type { GuildMember, GuildRole } from "@/types/guild";

const SPEC_ALIASES: Record<string, Record<string, string>> = {
  Warrior: {
    arms: "Arms",
    fury: "Fury",
    prot: "Protection",
    protection: "Protection",
  },
  Paladin: {
    holy: "Holy",
    prot: "Protection",
    protection: "Protection",
    ret: "Retribution",
    retro: "Retribution",
    retribution: "Retribution",
  },
  Hunter: {
    bm: "Beast Mastery",
    "beast mastery": "Beast Mastery",
    marksman: "Marksmanship",
    marksmanship: "Marksmanship",
    mm: "Marksmanship",
    survival: "Survival",
  },
  Rogue: {
    assassination: "Assassination",
    combat: "Combat",
    subtlety: "Subtlety",
    sub: "Subtlety",
  },
  Priest: {
    disc: "Discipline",
    discipline: "Discipline",
    holy: "Holy",
    shadow: "Shadow",
  },
  Shaman: {
    elemental: "Elemental",
    ele: "Elemental",
    enhancement: "Enhancement",
    enhance: "Enhancement",
    restoration: "Restoration",
    resto: "Restoration",
  },
  Mage: {
    arcane: "Arcane",
    fire: "Fire",
    frost: "Frost",
  },
  Warlock: {
    affliction: "Affliction",
    affli: "Affliction",
    demonology: "Demonology",
    demo: "Demonology",
    destruction: "Destruction",
    destro: "Destruction",
  },
  Druid: {
    balance: "Balance",
    boomkin: "Balance",
    feral: "Feral",
    guardian: "Guardian",
    restoration: "Restoration",
    resto: "Restoration",
  },
  "Death Knight": {
    blood: "Blood",
    frost: "Frost",
    unholy: "Unholy",
  },
  Monk: {
    brewmaster: "Brewmaster",
    mistweaver: "Mistweaver",
    windwalker: "Windwalker",
  },
  "Demon Hunter": {
    havoc: "Havoc",
    vengeance: "Vengeance",
  },
  Evoker: {
    augmentation: "Augmentation",
    devastation: "Devastation",
    preservation: "Preservation",
  },
};

const TANK_SPECS = new Set(["Blood", "Brewmaster", "Guardian", "Protection", "Vengeance"]);
const HEALER_SPECS = new Set(["Discipline", "Holy", "Mistweaver", "Preservation", "Restoration"]);
const NON_SPEC_VALUES = ["all", "any", "meta", "undecided", "not decided", "whatever"];

export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];

    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}

const clean = (value: string) => value.trim().replace(/\s+/g, " ");

export function discordNameToCharacter(discordName: string): string {
  const cleaned = discordName.trim().replace(/^@/, "").replace(/[^a-z0-9]/gi, "");
  if (!cleaned) return "Unknown";
  const shortened = cleaned.slice(0, 5);
  return shortened.charAt(0).toUpperCase() + shortened.slice(1).toLowerCase();
}

export function normalizeSpecialization(className: string, rawSpec: string): string | undefined {
  const normalized = clean(rawSpec).toLowerCase();
  if (!normalized || NON_SPEC_VALUES.some((value) => normalized.includes(value))) return undefined;

  const aliases = SPEC_ALIASES[className];
  if (!aliases) return clean(rawSpec) || undefined;

  const found = new Set<string>();
  const tokens = normalized.split(/\s*(?:\/|,|\bor\b|\band\b|\+)\s*/);

  for (const token of tokens) {
    const exact = aliases[token];
    if (exact) {
      found.add(exact);
      continue;
    }

    for (const [alias, canonical] of Object.entries(aliases)) {
      if (new RegExp(`\\b${alias.replace(/\s+/g, "\\s+")}\\b`, "i").test(token)) {
        found.add(canonical);
      }
    }
  }

  return found.size ? [...found].join(" / ") : clean(rawSpec);
}

export function roleFromSpecialization(specialization?: string): GuildRole | undefined {
  if (!specialization) return undefined;
  const specs = specialization.split(" / ");
  if (specs.some((spec) => TANK_SPECS.has(spec))) return "Tank";
  if (specs.some((spec) => HEALER_SPECS.has(spec))) return "Healer";
  return "DPS";
}

export function foreverMembersFromCsv(csv: string): GuildMember[] {
  const [headers = [], ...rows] = parseCsv(csv);
  const column = new Map(headers.map((header, index) => [clean(header).toLowerCase(), index]));
  const discordIndex = column.get("discord user");
  const discordIdIndex = column.get("discord id");
  const classIndex = column.get("class");
  const specIndex = column.get("spec");

  if ([discordIndex, classIndex, specIndex].some((index) => index === undefined)) return [];

  return rows.flatMap((row, rowIndex) => {
    const discordName = clean(row[discordIndex!] ?? "");
    const className = clean(row[classIndex!] ?? "");
    if (!discordName || !className) return [];

    const specialization = normalizeSpecialization(className, row[specIndex!] ?? "");
    const discordId = clean(row[discordIdIndex ?? -1] ?? "");

    return [{
      id: `forever-${discordId || `${discordName}-${rowIndex}`}`,
      characterName: discordNameToCharacter(discordName),
      rank: "Forever",
      className,
      specialization,
      role: roleFromSpecialization(specialization),
      showCharacterProfiles: false,
    } satisfies GuildMember];
  }).sort((a, b) => a.characterName.localeCompare(b.characterName));
}
