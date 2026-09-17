export interface PackVerse {
  reference: string;
  text: string;
}

export interface TopicalPack {
  id: string;
  title: string;
  description: string;
  icon: string;
  verses: PackVerse[];
}

export const TOPICAL_PACKS: TopicalPack[] = [
  {
    id: 'peace-and-anxiety',
    title: 'Peace & Anxiety',
    description: 'Anchor your heart when worries rise with promises of God’s perfect peace.',
    icon: '🕊️',
    verses: [
      {
        reference: 'Philippians 4:6-7 (WEB)',
        text: 'In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.',
      },
      {
        reference: 'John 14:27 (WEB)',
        text: 'Peace I leave with you. My peace I give to you; not as the world gives, give I to you. Don’t let your heart be troubled, neither let it be fearful.',
      },
      {
        reference: '1 Peter 5:7 (WEB)',
        text: 'Casting all your worries on him, because he cares for you.',
      },
    ],
  },
  {
    id: 'faith-and-courage',
    title: 'Faith & Courage',
    description: 'Find unshakeable strength to stand firm in the face of trials and uncertainty.',
    icon: '🦁',
    verses: [
      {
        reference: 'Joshua 1:9 (WEB)',
        text: 'Haven’t I commanded you? Be strong and courageous. Don’t be afraid, neither be dismayed: for Yahweh your God is with you wherever you go.',
      },
      {
        reference: 'Isaiah 41:10 (WEB)',
        text: 'Don’t you be afraid, for I am with you. Don’t be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness.',
      },
      {
        reference: 'Proverbs 3:5-6 (WEB)',
        text: 'Trust in Yahweh with all your heart, and don’t lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.',
      },
    ],
  },
  {
    id: 'armor-of-god',
    title: 'Spiritual Warfare',
    description: 'Arm yourself daily with the truth, righteousness, and word of God.',
    icon: '🛡️',
    verses: [
      {
        reference: 'Ephesians 6:10-11 (WEB)',
        text: 'Finally, be strong in the Lord, and in the strength of his might. Put on the whole armor of God, that you may be able to stand against the wiles of the devil.',
      },
      {
        reference: '2 Corinthians 10:4 (WEB)',
        text: 'For the weapons of our warfare are not of the flesh, but mighty before God to the throwing down of strongholds.',
      },
      {
        reference: 'James 4:7 (WEB)',
        text: 'Be subject therefore to God. Resist the devil, and he will flee from you.',
      },
    ],
  },
];
