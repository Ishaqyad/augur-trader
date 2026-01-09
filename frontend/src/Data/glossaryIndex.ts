import { GLOSSARY, type GlossaryItem } from "./glossary";

const INDEX: Record<string, GlossaryItem> = {};
for (const item of GLOSSARY) {
  INDEX[item.term.toLowerCase()] = item;
}

// case-insensitive lookup by full term string from glossary.ts
export function findGlossary(term: string): GlossaryItem | undefined {
  return INDEX[term.toLowerCase()];
}
