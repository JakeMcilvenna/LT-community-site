import type { WowClass } from "@/data/recruitment-application";

export const FALLBACK_CLASS_COLOR = "#808080";
export const FALLBACK_CLASS_ICON_PATH = "/images/marks.png";

type ClassMetadata = {
  color: string;
  iconPath: string;
};

export const classMetadata = {
  "Death Knight": { color: "#C41E3A", iconPath: "/images/classes/death-knight.png" },
  "Demon Hunter": { color: "#A330C9", iconPath: "/images/classes/demon-hunter.png" },
  Druid: { color: "#FF7C0A", iconPath: "/images/classes/druid.png" },
  Evoker: { color: "#33937F", iconPath: "/images/classes/evoker.png" },
  Hunter: { color: "#AAD372", iconPath: "/images/classes/hunter.png" },
  Mage: { color: "#3FC7EB", iconPath: "/images/classes/mage.png" },
  Monk: { color: "#00FF98", iconPath: "/images/classes/monk.png" },
  Paladin: { color: "#F48CBA", iconPath: "/images/classes/paladin.png" },
  Priest: { color: "#FFFFFF", iconPath: "/images/classes/priest.png" },
  Rogue: { color: "#FFF468", iconPath: "/images/classes/rogue.png" },
  Shaman: { color: "#0070DD", iconPath: "/images/classes/shaman.png" },
  Warlock: { color: "#8788EE", iconPath: "/images/classes/warlock.png" },
  Warrior: { color: "#C69B6D", iconPath: "/images/classes/warrior.png" },
} as const satisfies Record<WowClass, ClassMetadata>;

export const classColors = Object.fromEntries(
  Object.entries(classMetadata).map(([className, metadata]) => [className, metadata.color]),
) as Record<WowClass, string>;

const getClassMetadata = (className: string) =>
  Object.prototype.hasOwnProperty.call(classMetadata, className)
    ? classMetadata[className as WowClass]
    : undefined;

export const getClassColor = (className: string) =>
  getClassMetadata(className)?.color ?? FALLBACK_CLASS_COLOR;

export const getClassIconPath = (className: string) =>
  getClassMetadata(className)?.iconPath ?? FALLBACK_CLASS_ICON_PATH;
