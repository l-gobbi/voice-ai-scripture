import {
  encodeDeckPayload,
  decodeDeckPayload,
  generateShareMessage,
  extractDeckFromClipboard,
  SharedDeckPayload,
} from './deckSharing';

describe('deckSharing utility (Ticket 33)', () => {
  const sampleDeck: SharedDeckPayload = {
    name: 'Peace in Anxiety',
    verses: [
      {
        ref: 'Philippians 4:6-7',
        text: 'Do not be anxious about anything...',
        trans: 'WEB',
      },
      {
        ref: '1 Peter 5:7',
        text: 'Cast all your anxiety on him because he cares for you.',
        trans: 'WEB',
      },
    ],
    note: 'Memorize these whenever feeling overwhelmed.',
  };

  it('encodes and decodes a deck payload symmetrically into a URL-safe base64 string', () => {
    const encoded = encodeDeckPayload(sampleDeck);
    expect(typeof encoded).toBe('string');
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');

    const decoded = decodeDeckPayload(encoded);
    expect(decoded).toEqual(sampleDeck);
  });

  it('gracefully returns null for malformed, truncated, or invalid payloads without throwing', () => {
    expect(decodeDeckPayload('')).toBeNull();
    expect(decodeDeckPayload('not-a-valid-base64!@#$')).toBeNull();
    expect(decodeDeckPayload('e30')).toBeNull(); // empty object "{}"
    expect(decodeDeckPayload(Buffer.from('{"name":"Test"}').toString('base64'))).toBeNull(); // missing verses
    expect(
      decodeDeckPayload(
        Buffer.from('{"name":"Test","verses":[]}').toString('base64')
      )
    ).toBeNull(); // empty verses array
  });

  it('generates a dual-format share message containing readable text and import link', () => {
    const message = generateShareMessage(sampleDeck);

    expect(message).toContain('Deck: Peace in Anxiety (2 verses)');
    expect(message).toContain('Note: Memorize these whenever feeling overwhelmed.');
    expect(message).toContain('1. Philippians 4:6-7 (WEB)');
    expect(message).toContain('"Do not be anxious about anything..."');
    expect(message).toContain('2. 1 Peter 5:7 (WEB)');
    expect(message).toContain('https://voice-scripture.app/i#');
  });

  it('extracts deck payload from a full share message or deep link in clipboard text', () => {
    const message = generateShareMessage(sampleDeck);
    const extractedFromMessage = extractDeckFromClipboard(message);
    expect(extractedFromMessage).toEqual(sampleDeck);

    const encoded = encodeDeckPayload(sampleDeck);
    const deepLink = `https://voice-scripture.app/i#${encoded}`;
    const extractedFromLink = extractDeckFromClipboard(deepLink);
    expect(extractedFromLink).toEqual(sampleDeck);

    const customScheme = `voice-scripture://deck?data=${encoded}`;
    const extractedFromScheme = extractDeckFromClipboard(customScheme);
    expect(extractedFromScheme).toEqual(sampleDeck);

    expect(extractDeckFromClipboard('Random unrelated clipboard text')).toBeNull();
  });
});
