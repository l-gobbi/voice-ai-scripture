import { normalizeReference } from '../services/ReferenceNormalizer';

export interface ParsedScriptureClipboard {
  reference: string;
  text: string;
  translation?: string;
}

const KNOWN_TRANSLATIONS = new Set([
  'NVI',
  'ARA',
  'NIV',
  'ESV',
  'KJV',
  'ALMEIDA',
  'ONBV',
  'WEB',
  'NAA',
  'NTLH',
  'ARC',
  'MSG',
  'ASV',
  'NVT',
  'NKJV',
  'NASB',
  'NLT',
]);

/**
 * Strips invisible formatting characters (bidi markers, zero-width spaces)
 * frequently injected by YouVersion and mobile share sheets.
 */
function cleanInvisibleChars(str: string): string {
  return str.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '');
}

/**
 * Parses copied scripture text from YouVersion, Bible.com, or user clipboard,
 * extracting the biblical reference, passage text, and optional translation tag.
 */
export function parseScriptureClipboard(rawText: string): ParsedScriptureClipboard | null {
  if (!rawText || !rawText.trim()) {
    return null;
  }

  const cleaned = cleanInvisibleChars(rawText).trim();
  if (!cleaned) {
    return null;
  }

  // Remove trailing bible app URLs (e.g. https://bible.com/...)
  const lines = cleaned
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => !/^https?:\/\//i.test(l) && l.length > 0);

  if (lines.length === 0) {
    return null;
  }

  // Look for a line containing a scripture reference, checking from bottom to top
  // YouVersion usually puts the citation at the bottom or following a dash/em-dash
  let citationLineIndex = -1;
  let detectedRef = '';
  let detectedTranslation: string | undefined;

  // Regex matching reference followed by optional translation:
  // e.g., "— João 3:16 NVI", "- John 3:16 NIV", "Psalm 28:7 ESV", "João 1:1"
  const citationRegex = /^[—–-]?\s*([1-3]?\s*[A-Za-zÀ-ÖØ-öø-ÿ]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ]+)?\s+\d+:\s*\d+(?:\s*[-–—]\s*\d+)?)(?:\s+([A-Za-z0-9]+))?\s*$/;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const match = line.match(citationRegex);
    if (match) {
      const candidateRef = match[1].trim();
      const norm = normalizeReference(candidateRef);
      if (norm) {
        citationLineIndex = i;
        detectedRef = candidateRef;
        const candidateTrans = match[2]?.trim().toUpperCase();
        if (candidateTrans && KNOWN_TRANSLATIONS.has(candidateTrans)) {
          detectedTranslation = candidateTrans;
        }
        break;
      }
    }
  }

  // If citation line was found
  if (citationLineIndex !== -1) {
    // Text is all preceding lines (or following lines if citation was at index 0)
    const textLines = lines.filter((_, idx) => idx !== citationLineIndex);
    let verseText = textLines.join(' ').trim();

    // Strip wrapping quotation marks (", “, ”, «, »)
    verseText = verseText.replace(/^[“"«]\s*/, '').replace(/\s*[”"»]$/, '');

    return {
      reference: detectedRef,
      text: verseText,
      translation: detectedTranslation,
    };
  }

  // Fallback: Check if the text itself ends with a reference, or is just plain text
  return {
    reference: '',
    text: lines.join(' ').replace(/^[“"«]\s*/, '').replace(/\s*[”"»]$/, '').trim(),
    translation: undefined,
  };
}
