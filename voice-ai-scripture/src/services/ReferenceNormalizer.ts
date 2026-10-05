import { scriptureCatalog, NormalizedReference } from './ScriptureCatalog';

export type { NormalizedReference };

/**
 * Normalizes an arbitrary scripture reference string to its canonical form and language.
 * Delegates to the authoritative ScriptureCatalog.
 */
export function normalizeReference(rawInput: string): NormalizedReference | null {
  return scriptureCatalog.resolveReference(rawInput);
}
