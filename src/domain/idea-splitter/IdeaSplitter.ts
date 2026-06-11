export interface SplitItem {
  /** Short title (first 60 chars) */
  title: string;
  /** Full text of this item */
  content: string;
}

/** Common abbreviations that end with a period but should NOT trigger a split. */
const ABBREVIATIONS = /\b(?:Dr|Mr|Mrs|Ms|Prof|Jr|Sr|Inc|Ltd|Corp|etc|vs|e\.g|i\.e)\.$/i;

/**
 * Split a multi-idea input string into individual thought items.
 *
 * Splitting rules (in precedence order):
 *   1. Newlines (\n, \r\n) — unconditional split
 *   2. Chinese period 。— unconditional split
 *   3. Chinese semicolon ；— unconditional split
 *   4. English period . — split only when followed by space + uppercase letter,
 *      and NOT after a common abbreviation
 *   5. Comma/dun-hao (, ，、) — do NOT split (keep as single item)
 */
export function splitIdeas(raw: string): SplitItem[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // Step 1: split on newlines first
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());

  // Step 2: for each line, split on strong Chinese delimiters
  const items: string[] = [];
  for (const line of lines) {
    // Split on 。and ；, keep delimiter attached to preceding segment
    const subItems = line
      .split(/(?<=[。；])/)
      .filter((s) => s.trim())
      .map((s) => {
        // Split on English period only when followed by space + uppercase,
        // but NOT after common abbreviations (e.g., Dr. Mr. etc.)
        const segments: string[] = [];
        let current = '';
        const tokens = s.split(/(\.+\s+)/);
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          if (/^\.+\s+$/.test(token) && i + 1 < tokens.length && /^[A-Z]/.test(tokens[i + 1])) {
            // token is '. ' so the full prefix before it ends with '.'
            if (ABBREVIATIONS.test(current + '.')) {
              current += token;
            } else {
              segments.push(current);
              current = '';
            }
          } else {
            current += token;
          }
        }
        if (current.trim()) segments.push(current);
        return segments.filter((x) => x.trim());
      })
      .flat();

    items.push(...subItems);
  }

  return items.map((item) => {
    const clean = item.trim();
    return {
      title: clean.slice(0, 60),
      content: clean,
    };
  });
}
