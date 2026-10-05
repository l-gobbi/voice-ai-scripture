import { scriptureCatalog, NormalizedReference } from './ScriptureCatalog';

export type { NormalizedReference };

/**
 * @deprecated Legacy shallow facade retired in Ticket 48.
 * Call `scriptureCatalog.resolveReference(rawInput)` directly.
 */
export function normalizeReference(rawInput: string): NormalizedReference | null {
  return scriptureCatalog.resolveReference(rawInput);
}
