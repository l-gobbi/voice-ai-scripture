import { VerseTranslation } from '../services/VerseEngine';

export type PackLanguage = 'en' | 'pt';

export interface PackVerse {
  reference: string;
  text: string;
  translation: VerseTranslation;
}

export interface TopicalPack {
  id: string;
  title: string;
  description: string;
  icon: string;
  language: PackLanguage;
  translation: VerseTranslation;
  verses: PackVerse[];
}

export const TOPICAL_PACKS: TopicalPack[] = [
  // English Packs
  {
    id: 'peace-and-anxiety',
    title: 'Peace & Anxiety',
    description: 'Anchor your heart when worries rise with promises of God’s perfect peace.',
    icon: '🕊️',
    language: 'en',
    translation: 'WEB',
    verses: [
      {
        reference: 'Philippians 4:6-7',
        text: 'In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.',
        translation: 'WEB',
      },
      {
        reference: 'John 14:27',
        text: 'Peace I leave with you. My peace I give to you; not as the world gives, give I to you. Don’t let your heart be troubled, neither let it be fearful.',
        translation: 'WEB',
      },
      {
        reference: '1 Peter 5:7',
        text: 'Casting all your worries on him, because he cares for you.',
        translation: 'WEB',
      },
    ],
  },
  {
    id: 'faith-and-courage',
    title: 'Faith & Courage',
    description: 'Find unshakeable strength to stand firm in the face of trials and uncertainty.',
    icon: '🦁',
    language: 'en',
    translation: 'WEB',
    verses: [
      {
        reference: 'Joshua 1:9',
        text: 'Haven’t I commanded you? Be strong and courageous. Don’t be afraid, neither be dismayed: for Yahweh your God is with you wherever you go.',
        translation: 'WEB',
      },
      {
        reference: 'Isaiah 41:10',
        text: 'Don’t you be afraid, for I am with you. Don’t be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness.',
        translation: 'WEB',
      },
      {
        reference: 'Proverbs 3:5-6',
        text: 'Trust in Yahweh with all your heart, and don’t lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.',
        translation: 'WEB',
      },
    ],
  },
  {
    id: 'armor-of-god',
    title: 'Strength & Spiritual Warfare',
    description: 'Arm yourself daily with the truth, righteousness, and word of God.',
    icon: '🛡️',
    language: 'en',
    translation: 'WEB',
    verses: [
      {
        reference: 'Ephesians 6:10-11',
        text: 'Finally, be strong in the Lord, and in the strength of his might. Put on the whole armor of God, that you may be able to stand against the wiles of the devil.',
        translation: 'WEB',
      },
      {
        reference: '2 Corinthians 10:4',
        text: 'For the weapons of our warfare are not of the flesh, but mighty before God to the throwing down of strongholds.',
        translation: 'WEB',
      },
      {
        reference: 'James 4:7',
        text: 'Be subject therefore to God. Resist the devil, and he will flee from you.',
        translation: 'WEB',
      },
    ],
  },

  // Portuguese Packs (Almeida)
  {
    id: 'peace-pt',
    title: 'Paz',
    description: 'Acalme seu coração em tempos de ansiedade com as promessas da perfeita paz de Deus.',
    icon: '🕊️',
    language: 'pt',
    translation: 'ALMEIDA',
    verses: [
      {
        reference: 'Salmos 23:1',
        text: 'O Senhor é o meu pastor, nada me faltará.',
        translation: 'ALMEIDA',
      },
      {
        reference: 'João 14:27',
        text: 'Deixo-vos a paz, a minha paz vos dou; não vo-la dou como o mundo a dá. Não se turbe o vosso coração, nem se atemorize.',
        translation: 'ALMEIDA',
      },
      {
        reference: 'Filipenses 4:6-7',
        text: 'Não estejais inquietos por coisa alguma; antes as vossas petições sejam em tudo conhecidas diante de Deus pela oração e súplica, com ação de graças. E a paz de Deus, que excede todo o entendimento, guardará os vossos corações e os vossos sentimentos em Cristo Jesus.',
        translation: 'ALMEIDA',
      },
    ],
  },
  {
    id: 'faith-pt',
    title: 'Fé',
    description: 'Encontre força inabalável para confiar nas promessas divinas diante de qualquer desafio.',
    icon: '🦁',
    language: 'pt',
    translation: 'ALMEIDA',
    verses: [
      {
        reference: 'Hebreus 11:1',
        text: 'Ora, a fé é o firme fundamento das coisas que se esperam, e a prova das coisas que se não veem.',
        translation: 'ALMEIDA',
      },
      {
        reference: 'Romanos 10:17',
        text: 'De sorte que a fé é pelo ouvir, e o ouvir pela palavra de Deus.',
        translation: 'ALMEIDA',
      },
      {
        reference: '2 Coríntios 5:7',
        text: 'Porque andamos por fé, e não por vista.',
        translation: 'ALMEIDA',
      },
    ],
  },
  {
    id: 'hope-pt',
    title: 'Esperança',
    description: 'Renove suas forças com a certeza dos planos de Deus para o seu presente e futuro.',
    icon: '⚓',
    language: 'pt',
    translation: 'ALMEIDA',
    verses: [
      {
        reference: 'Jeremias 29:11',
        text: 'Porque eu bem sei os pensamentos que penso de vós, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais.',
        translation: 'ALMEIDA',
      },
      {
        reference: 'Romanos 15:13',
        text: 'Ora o Deus de esperança vos encha de todo o gozo e paz em crença, para que abundeis em esperança pela virtude do Espírito Santo.',
        translation: 'ALMEIDA',
      },
      {
        reference: 'Isaías 40:31',
        text: 'Mas os que esperam no Senhor renovarão as forças, subirão com asas como águias; correrão, e não se cansarão; caminharão, e não se fatigarão.',
        translation: 'ALMEIDA',
      },
    ],
  },
];
