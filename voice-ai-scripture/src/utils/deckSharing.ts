/**
 * deckSharing.ts
 *
 * Pure utility for encoding, decoding, generating share messages,
 * and extracting shared deck payloads from links or clipboard strings.
 */

export interface SharedDeckVerse {
  ref: string;
  text: string;
  trans?: string;
}

export interface SharedDeckPayload {
  name: string;
  verses: SharedDeckVerse[];
  note?: string;
}

export const DEEP_LINK_PREFIX = 'https://voice-scripture.app/i#';
export const CUSTOM_SCHEME_PREFIX = 'voice-scripture://deck?data=';

export function encodeDeckPayload(payload: SharedDeckPayload): string {
  const json = JSON.stringify(payload);
  const base64 = Buffer.from(json, 'utf8').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeDeckPayload(raw: string): SharedDeckPayload | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  try {
    let b64 = raw.trim().replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) {
      b64 += '=';
    }

    const json = Buffer.from(b64, 'base64').toString('utf8');
    const parsed = JSON.parse(json);

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.name !== 'string' ||
      !parsed.name.trim() ||
      !Array.isArray(parsed.verses) ||
      parsed.verses.length === 0
    ) {
      return null;
    }

    for (const v of parsed.verses) {
      if (
        !v ||
        typeof v !== 'object' ||
        typeof v.ref !== 'string' ||
        !v.ref.trim() ||
        typeof v.text !== 'string' ||
        !v.text.trim()
      ) {
        return null;
      }
    }

    return {
      name: parsed.name.trim(),
      verses: parsed.verses.map((v: any) => ({
        ref: v.ref.trim(),
        text: v.text.trim(),
        ...(v.trans ? { trans: String(v.trans).trim() } : {}),
      })),
      ...(parsed.note ? { note: String(parsed.note).trim() } : {}),
    };
  } catch {
    return null;
  }
}

export function generateShareMessage(deck: SharedDeckPayload): string {
  const encoded = encodeDeckPayload(deck);
  const verseCount = deck.verses.length;
  const verseLabel = verseCount === 1 ? 'verse' : 'verses';

  const formattedVerses = deck.verses
    .map((v, i) => `${i + 1}. ${v.ref}${v.trans ? ` (${v.trans})` : ''}\n"${v.text}"`)
    .join('\n\n');

  const noteSection = deck.note ? `\nNote: ${deck.note}\n` : '';

  return (
    `📖 Memorize scripture with me on Voice AI Scripture!\n` +
    `Deck: ${deck.name} (${verseCount} ${verseLabel})${noteSection}\n\n` +
    `${formattedVerses}\n\n` +
    `Tap to recite this deck in Voice AI Scripture:\n` +
    `${DEEP_LINK_PREFIX}${encoded}`
  );
}

export function extractDeckFromClipboard(clipboardText: string): SharedDeckPayload | null {
  if (!clipboardText || typeof clipboardText !== 'string') {
    return null;
  }

  const text = clipboardText.trim();

  // 1. Check for web deep link
  const webMatch = text.match(/https:\/\/voice-scripture\.app\/i#([A-Za-z0-9_-]+)/);
  if (webMatch && webMatch[1]) {
    return decodeDeckPayload(webMatch[1]);
  }

  // 2. Check for custom app scheme
  const schemeMatch = text.match(/voice-scripture:\/\/deck\?data=([A-Za-z0-9_-]+)/);
  if (schemeMatch && schemeMatch[1]) {
    return decodeDeckPayload(schemeMatch[1]);
  }

  // 3. Fallback: check if entire string is a bare payload
  return decodeDeckPayload(text);
}
