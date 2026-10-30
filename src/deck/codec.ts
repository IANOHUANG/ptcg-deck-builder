export interface EncodedEntry {
  id: string;
  qty: number;
}

export function encodeDeck(entries: Array<{ id: string; qty: number }>): string {
  return entries
    .filter((entry) => entry.qty > 0)
    .map((entry) => `${encodeURIComponent(entry.id)}*${entry.qty}`)
    .join("~");
}

export function decodeDeck(raw: string): EncodedEntry[] {
  if (!raw.trim()) return [];
  const merged = new Map<string, number>();
  for (const part of raw.split("~")) {
    const star = part.lastIndexOf("*");
    if (star <= 0) continue;
    let id = "";
    try {
      id = decodeURIComponent(part.slice(0, star));
    } catch {
      continue;
    }
    const qty = Number(part.slice(star + 1));
    if (!id || id.length > 80 || id.includes("/") || !Number.isInteger(qty) || qty < 1 || qty > 60) {
      continue;
    }
    merged.set(id, Math.min(60, (merged.get(id) ?? 0) + qty));
  }
  return [...merged.entries()].map(([id, qty]) => ({ id, qty }));
}
