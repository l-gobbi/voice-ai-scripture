import {
  generateClozeTokens,
  revealWord,
  hideWord,
  ClozeToken,
} from './clozeEngine';

describe('clozeEngine', () => {
  describe('generateClozeTokens', () => {
    it('generates first-letter tokens preserving punctuation, casing, and word lengths', () => {
      const text = 'For God so loved the world, that He gave!';
      const tokens = generateClozeTokens(text, 'first-letter');

      // Words should retain their first letter followed by underscores corresponding to remaining letter count
      // 'For' -> 'F__'
      // 'God' -> 'G__'
      // 'loved' -> 'l____'
      // 'world,' -> display with trailing comma preserved
      expect(tokens).toEqual([
        { word: 'For', masked: 'F__', firstLetter: 'F', punctuation: '', isRevealed: false, trailingSpace: true },
        { word: 'God', masked: 'G__', firstLetter: 'G', punctuation: '', isRevealed: false, trailingSpace: true },
        { word: 'so', masked: 's_', firstLetter: 's', punctuation: '', isRevealed: false, trailingSpace: true },
        { word: 'loved', masked: 'l____', firstLetter: 'l', punctuation: '', isRevealed: false, trailingSpace: true },
        { word: 'the', masked: 't__', firstLetter: 't', punctuation: '', isRevealed: false, trailingSpace: true },
        { word: 'world,', masked: 'w____,', firstLetter: 'w', punctuation: ',', isRevealed: false, trailingSpace: true },
        { word: 'that', masked: 't___', firstLetter: 't', punctuation: '', isRevealed: false, trailingSpace: true },
        { word: 'He', masked: 'H_', firstLetter: 'H', punctuation: '', isRevealed: false, trailingSpace: true },
        { word: 'gave!', masked: 'g___!', firstLetter: 'g', punctuation: '!', isRevealed: false, trailingSpace: false },
      ]);
    });

    it('generates blank tokens for Level 3 (Blind Recitation) masking all letters with underscores', () => {
      const text = 'In the beginning';
      const tokens = generateClozeTokens(text, 'blank');

      expect(tokens).toEqual([
        { word: 'In', masked: '__', firstLetter: 'I', punctuation: '', isRevealed: false, trailingSpace: true },
        { word: 'the', masked: '___', firstLetter: 't', punctuation: '', isRevealed: false, trailingSpace: true },
        { word: 'beginning', masked: '_________', firstLetter: 'b', punctuation: '', isRevealed: false, trailingSpace: false },
      ]);
    });
  });

  describe('revealWord and hideWord', () => {
    it('reveals a specific word by index without mutating original tokens', () => {
      const text = 'For God so loved';
      const initial = generateClozeTokens(text, 'first-letter');

      const revealed = revealWord(initial, 1); // God
      expect(revealed[1].isRevealed).toBe(true);
      expect(revealed[1].word).toBe('God');
      expect(revealed[0].isRevealed).toBe(false);
      expect(initial[1].isRevealed).toBe(false); // immutability check
    });

    it('hides a previously revealed word (e.g. after a 3s peek timer expires)', () => {
      const text = 'For God';
      const initial = generateClozeTokens(text, 'blank');
      const revealed = revealWord(initial, 0);
      expect(revealed[0].isRevealed).toBe(true);

      const hidden = hideWord(revealed, 0);
      expect(hidden[0].isRevealed).toBe(false);
    });

    it('handles out of bounds indices gracefully', () => {
      const initial = generateClozeTokens('One two', 'blank');
      const outOfBounds = revealWord(initial, 99);
      expect(outOfBounds).toEqual(initial);
    });
  });
});
