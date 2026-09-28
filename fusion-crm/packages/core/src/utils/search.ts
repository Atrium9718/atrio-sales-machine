/**
 * Normalizes a string by removing accents/diacritics and converting it to lowercase.
 * This makes search operations more resilient to typos and missing accents.
 */
export function normalizeForSearch(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Checks if a target string matches a query string after normalization.
 * A match is successful if all words in the query appear in the target string.
 */
export function fuzzyMatch(query: string, target: string | null | undefined): boolean {
  if (!query) return true;
  if (!target) return false;
  
  const normalizedQuery = normalizeForSearch(query);
  const normalizedTarget = normalizeForSearch(target);
  
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
  
  return queryWords.every(word => normalizedTarget.includes(word));
}

/**
 * Checks if ANY target string from an array matches the query.
 */
export function fuzzyMatchAny(query: string, targets: (string | null | undefined)[]): boolean {
    if (!query) return true;
    return targets.some(t => fuzzyMatch(query, t));
}
