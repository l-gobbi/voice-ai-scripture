export interface CanonBook {
  readonly id: string;
  readonly testament: 'OT' | 'NT';
  readonly enName: string;
  readonly ptName: string;
  readonly enAliases: readonly string[];
  readonly ptAliases: readonly string[];
  readonly chapters: number;
  readonly verseCounts: readonly number[];
}

const RAW_CANON_BOOKS: CanonBook[] = [
  {
    "id": "GEN",
    "testament": "OT",
    "enName": "Genesis",
    "ptName": "Gênesis",
    "enAliases": [
      "genesis",
      "gen",
      "ge",
      "gn"
    ],
    "ptAliases": [
      "genesis",
      "gen",
      "gn"
    ],
    "verseCounts": [
      31,
      25,
      24,
      26,
      32,
      22,
      24,
      22,
      29,
      32,
      32,
      20,
      18,
      24,
      21,
      16,
      27,
      33,
      38,
      18,
      34,
      24,
      20,
      67,
      34,
      35,
      46,
      22,
      35,
      43,
      55,
      32,
      20,
      31,
      29,
      43,
      36,
      30,
      23,
      23,
      57,
      38,
      34,
      34,
      28,
      34,
      31,
      22,
      33,
      26
    ],
    "chapters": 50
  },
  {
    "id": "EXO",
    "testament": "OT",
    "enName": "Exodus",
    "ptName": "Êxodo",
    "enAliases": [
      "exodus",
      "exod",
      "exo",
      "ex"
    ],
    "ptAliases": [
      "exodo",
      "exod",
      "exo",
      "ex"
    ],
    "verseCounts": [
      22,
      25,
      22,
      31,
      23,
      30,
      25,
      32,
      35,
      29,
      10,
      51,
      22,
      31,
      27,
      36,
      16,
      27,
      25,
      26,
      36,
      31,
      33,
      18,
      40,
      37,
      21,
      43,
      46,
      38,
      18,
      35,
      23,
      35,
      35,
      38,
      29,
      31,
      43,
      38
    ],
    "chapters": 40
  },
  {
    "id": "LEV",
    "testament": "OT",
    "enName": "Leviticus",
    "ptName": "Levítico",
    "enAliases": [
      "leviticus",
      "lev",
      "le",
      "lv"
    ],
    "ptAliases": [
      "levitico",
      "lev",
      "lv"
    ],
    "verseCounts": [
      17,
      16,
      17,
      35,
      19,
      30,
      38,
      36,
      24,
      20,
      47,
      8,
      59,
      57,
      33,
      34,
      16,
      30,
      37,
      27,
      24,
      33,
      44,
      23,
      55,
      46,
      34
    ],
    "chapters": 27
  },
  {
    "id": "NUM",
    "testament": "OT",
    "enName": "Numbers",
    "ptName": "Números",
    "enAliases": [
      "numbers",
      "num",
      "nu",
      "nm"
    ],
    "ptAliases": [
      "numeros",
      "num",
      "nm"
    ],
    "verseCounts": [
      54,
      34,
      51,
      49,
      31,
      27,
      89,
      26,
      23,
      36,
      35,
      16,
      33,
      45,
      41,
      50,
      13,
      32,
      22,
      29,
      35,
      41,
      30,
      25,
      18,
      65,
      23,
      31,
      40,
      16,
      54,
      42,
      56,
      29,
      34,
      13
    ],
    "chapters": 36
  },
  {
    "id": "DEU",
    "testament": "OT",
    "enName": "Deuteronomy",
    "ptName": "Deuteronômio",
    "enAliases": [
      "deuteronomy",
      "deut",
      "deu",
      "dt"
    ],
    "ptAliases": [
      "deuteronomio",
      "deut",
      "dt"
    ],
    "verseCounts": [
      46,
      37,
      29,
      49,
      33,
      25,
      26,
      20,
      29,
      22,
      32,
      32,
      18,
      29,
      23,
      22,
      20,
      22,
      21,
      20,
      23,
      30,
      25,
      22,
      19,
      19,
      26,
      68,
      29,
      20,
      30,
      52,
      29,
      12
    ],
    "chapters": 34
  },
  {
    "id": "JOS",
    "testament": "OT",
    "enName": "Joshua",
    "ptName": "Josué",
    "enAliases": [
      "joshua",
      "josh",
      "jos"
    ],
    "ptAliases": [
      "josue",
      "jos",
      "js"
    ],
    "verseCounts": [
      18,
      24,
      17,
      24,
      15,
      27,
      26,
      35,
      27,
      43,
      23,
      24,
      33,
      15,
      63,
      10,
      18,
      28,
      51,
      9,
      45,
      34,
      16,
      33
    ],
    "chapters": 24
  },
  {
    "id": "JDG",
    "testament": "OT",
    "enName": "Judges",
    "ptName": "Juízes",
    "enAliases": [
      "judges",
      "judg",
      "jdg",
      "jg"
    ],
    "ptAliases": [
      "juizes",
      "juiz",
      "jz"
    ],
    "verseCounts": [
      36,
      23,
      31,
      24,
      31,
      40,
      25,
      35,
      57,
      18,
      40,
      15,
      25,
      20,
      20,
      31,
      13,
      31,
      30,
      48,
      25
    ],
    "chapters": 21
  },
  {
    "id": "RUT",
    "testament": "OT",
    "enName": "Ruth",
    "ptName": "Rute",
    "enAliases": [
      "ruth",
      "rut",
      "ru"
    ],
    "ptAliases": [
      "rute",
      "rut",
      "rt"
    ],
    "verseCounts": [
      22,
      23,
      18,
      22
    ],
    "chapters": 4
  },
  {
    "id": "1SA",
    "testament": "OT",
    "enName": "1 Samuel",
    "ptName": "1 Samuel",
    "enAliases": [
      "1 samuel",
      "1 sam",
      "1sa",
      "1s"
    ],
    "ptAliases": [
      "1 samuel",
      "1 sam",
      "1sa",
      "1s",
      "1sm"
    ],
    "verseCounts": [
      28,
      36,
      21,
      22,
      12,
      21,
      17,
      22,
      27,
      27,
      15,
      25,
      23,
      52,
      35,
      23,
      58,
      30,
      24,
      42,
      15,
      23,
      29,
      22,
      44,
      25,
      12,
      25,
      11,
      31,
      13
    ],
    "chapters": 31
  },
  {
    "id": "2SA",
    "testament": "OT",
    "enName": "2 Samuel",
    "ptName": "2 Samuel",
    "enAliases": [
      "2 samuel",
      "2 sam",
      "2sa",
      "2s"
    ],
    "ptAliases": [
      "2 samuel",
      "2 sam",
      "2sa",
      "2s",
      "2sm"
    ],
    "verseCounts": [
      27,
      32,
      39,
      12,
      25,
      23,
      29,
      18,
      13,
      19,
      27,
      31,
      39,
      33,
      37,
      23,
      29,
      33,
      43,
      26,
      22,
      51,
      39,
      25
    ],
    "chapters": 24
  },
  {
    "id": "1KI",
    "testament": "OT",
    "enName": "1 Kings",
    "ptName": "1 Reis",
    "enAliases": [
      "1 kings",
      "1 king",
      "1ki",
      "1k"
    ],
    "ptAliases": [
      "1 reis",
      "1 rei",
      "1re",
      "1r"
    ],
    "verseCounts": [
      53,
      46,
      28,
      34,
      18,
      38,
      51,
      66,
      28,
      29,
      43,
      33,
      34,
      31,
      34,
      34,
      24,
      46,
      21,
      43,
      29,
      53
    ],
    "chapters": 22
  },
  {
    "id": "2KI",
    "testament": "OT",
    "enName": "2 Kings",
    "ptName": "2 Reis",
    "enAliases": [
      "2 kings",
      "2 king",
      "2ki",
      "2k"
    ],
    "ptAliases": [
      "2 reis",
      "2 rei",
      "2re",
      "2r"
    ],
    "verseCounts": [
      18,
      25,
      27,
      44,
      27,
      33,
      20,
      29,
      37,
      36,
      21,
      21,
      25,
      29,
      38,
      20,
      41,
      37,
      37,
      21,
      26,
      20,
      37,
      20,
      30
    ],
    "chapters": 25
  },
  {
    "id": "1CH",
    "testament": "OT",
    "enName": "1 Chronicles",
    "ptName": "1 Crônicas",
    "enAliases": [
      "1 chronicles",
      "1 chron",
      "1ch",
      "1chr"
    ],
    "ptAliases": [
      "1 cronicas",
      "1 cron",
      "1cr"
    ],
    "verseCounts": [
      54,
      55,
      24,
      43,
      26,
      81,
      40,
      40,
      44,
      14,
      47,
      40,
      14,
      17,
      29,
      43,
      27,
      17,
      19,
      8,
      30,
      19,
      32,
      31,
      31,
      32,
      34,
      21,
      30
    ],
    "chapters": 29
  },
  {
    "id": "2CH",
    "testament": "OT",
    "enName": "2 Chronicles",
    "ptName": "2 Crônicas",
    "enAliases": [
      "2 chronicles",
      "2 chron",
      "2ch",
      "2chr"
    ],
    "ptAliases": [
      "2 cronicas",
      "2 cron",
      "2cr"
    ],
    "verseCounts": [
      17,
      18,
      17,
      22,
      14,
      42,
      22,
      18,
      31,
      19,
      23,
      16,
      22,
      15,
      19,
      14,
      19,
      34,
      11,
      37,
      20,
      12,
      21,
      27,
      28,
      23,
      9,
      27,
      36,
      27,
      21,
      33,
      25,
      33,
      27,
      23
    ],
    "chapters": 36
  },
  {
    "id": "EZR",
    "testament": "OT",
    "enName": "Ezra",
    "ptName": "Esdras",
    "enAliases": [
      "ezra",
      "ezr"
    ],
    "ptAliases": [
      "esdras",
      "esd",
      "ed"
    ],
    "verseCounts": [
      11,
      70,
      13,
      24,
      17,
      22,
      28,
      36,
      15,
      44
    ],
    "chapters": 10
  },
  {
    "id": "NEH",
    "testament": "OT",
    "enName": "Nehemiah",
    "ptName": "Neemias",
    "enAliases": [
      "nehemiah",
      "neh",
      "ne"
    ],
    "ptAliases": [
      "neemias",
      "ne",
      "neem"
    ],
    "verseCounts": [
      11,
      20,
      32,
      23,
      19,
      19,
      73,
      18,
      38,
      39,
      36,
      47,
      31
    ],
    "chapters": 13
  },
  {
    "id": "EST",
    "testament": "OT",
    "enName": "Esther",
    "ptName": "Ester",
    "enAliases": [
      "esther",
      "est",
      "esth"
    ],
    "ptAliases": [
      "ester",
      "est",
      "et"
    ],
    "verseCounts": [
      22,
      23,
      15,
      17,
      14,
      14,
      10,
      17,
      32,
      3
    ],
    "chapters": 10
  },
  {
    "id": "JOB",
    "testament": "OT",
    "enName": "Job",
    "ptName": "Jó",
    "enAliases": [
      "job",
      "jb"
    ],
    "ptAliases": [
      "jo",
      "jó"
    ],
    "verseCounts": [
      22,
      13,
      26,
      21,
      27,
      30,
      21,
      22,
      35,
      22,
      20,
      25,
      28,
      22,
      35,
      22,
      16,
      21,
      29,
      29,
      34,
      30,
      17,
      25,
      6,
      14,
      23,
      28,
      25,
      31,
      40,
      22,
      33,
      37,
      16,
      33,
      24,
      41,
      30,
      24,
      34,
      17
    ],
    "chapters": 42
  },
  {
    "id": "PSA",
    "testament": "OT",
    "enName": "Psalms",
    "ptName": "Salmos",
    "enAliases": [
      "psalms",
      "psalm",
      "psa",
      "ps"
    ],
    "ptAliases": [
      "salmos",
      "salmo",
      "sl",
      "sal"
    ],
    "verseCounts": [
      6,
      12,
      8,
      8,
      12,
      10,
      17,
      9,
      20,
      18,
      7,
      8,
      6,
      7,
      5,
      11,
      15,
      50,
      14,
      9,
      13,
      31,
      6,
      10,
      22,
      12,
      14,
      9,
      11,
      12,
      24,
      11,
      22,
      22,
      28,
      12,
      40,
      22,
      13,
      17,
      13,
      11,
      5,
      26,
      17,
      11,
      9,
      14,
      20,
      23,
      19,
      9,
      6,
      7,
      23,
      13,
      11,
      11,
      17,
      12,
      8,
      12,
      11,
      10,
      13,
      20,
      7,
      35,
      36,
      5,
      24,
      20,
      28,
      23,
      10,
      12,
      20,
      72,
      13,
      19,
      16,
      8,
      18,
      12,
      13,
      17,
      7,
      18,
      52,
      17,
      16,
      15,
      5,
      23,
      11,
      13,
      12,
      9,
      9,
      5,
      8,
      28,
      22,
      35,
      45,
      48,
      43,
      13,
      31,
      7,
      10,
      10,
      9,
      8,
      18,
      19,
      2,
      29,
      176,
      7,
      8,
      9,
      4,
      8,
      5,
      6,
      5,
      6,
      8,
      8,
      3,
      18,
      3,
      3,
      21,
      26,
      9,
      8,
      24,
      13,
      10,
      7,
      12,
      15,
      21,
      10,
      20,
      14,
      9,
      6
    ],
    "chapters": 150
  },
  {
    "id": "PRO",
    "testament": "OT",
    "enName": "Proverbs",
    "ptName": "Provérbios",
    "enAliases": [
      "proverbs",
      "prov",
      "pro",
      "pr"
    ],
    "ptAliases": [
      "proverbios",
      "prov",
      "pv",
      "pr"
    ],
    "verseCounts": [
      33,
      22,
      35,
      27,
      23,
      35,
      27,
      36,
      18,
      32,
      31,
      28,
      25,
      35,
      33,
      33,
      28,
      24,
      29,
      30,
      31,
      29,
      35,
      34,
      28,
      28,
      27,
      28,
      27,
      33,
      31
    ],
    "chapters": 31
  },
  {
    "id": "ECC",
    "testament": "OT",
    "enName": "Ecclesiastes",
    "ptName": "Eclesiastes",
    "enAliases": [
      "ecclesiastes",
      "eccles",
      "ecc",
      "ec"
    ],
    "ptAliases": [
      "eclesiastes",
      "ecl",
      "ec"
    ],
    "verseCounts": [
      18,
      26,
      22,
      16,
      20,
      12,
      29,
      17,
      18,
      20,
      10,
      14
    ],
    "chapters": 12
  },
  {
    "id": "SNG",
    "testament": "OT",
    "enName": "Song of Solomon",
    "ptName": "Cânticos",
    "enAliases": [
      "song of solomon",
      "song",
      "songs",
      "sos",
      "canticles"
    ],
    "ptAliases": [
      "canticos",
      "cantares",
      "cant",
      "ct"
    ],
    "verseCounts": [
      17,
      17,
      11,
      16,
      16,
      13,
      13,
      14
    ],
    "chapters": 8
  },
  {
    "id": "ISA",
    "testament": "OT",
    "enName": "Isaiah",
    "ptName": "Isaías",
    "enAliases": [
      "isaiah",
      "isa",
      "is"
    ],
    "ptAliases": [
      "isaias",
      "isa",
      "is"
    ],
    "verseCounts": [
      31,
      22,
      26,
      6,
      30,
      13,
      25,
      22,
      21,
      34,
      16,
      6,
      22,
      32,
      9,
      14,
      14,
      7,
      25,
      6,
      17,
      25,
      18,
      23,
      12,
      21,
      13,
      29,
      24,
      33,
      9,
      20,
      24,
      17,
      10,
      22,
      38,
      22,
      8,
      31,
      29,
      25,
      28,
      28,
      25,
      13,
      15,
      22,
      26,
      11,
      23,
      15,
      12,
      17,
      13,
      12,
      21,
      14,
      21,
      22,
      11,
      12,
      19,
      12,
      25,
      24
    ],
    "chapters": 66
  },
  {
    "id": "JER",
    "testament": "OT",
    "enName": "Jeremiah",
    "ptName": "Jeremias",
    "enAliases": [
      "jeremiah",
      "jer",
      "je"
    ],
    "ptAliases": [
      "jeremias",
      "jer",
      "jr"
    ],
    "verseCounts": [
      19,
      37,
      25,
      31,
      31,
      30,
      34,
      22,
      26,
      25,
      23,
      17,
      27,
      22,
      21,
      21,
      27,
      23,
      15,
      18,
      14,
      30,
      40,
      10,
      38,
      24,
      22,
      17,
      32,
      24,
      40,
      44,
      26,
      22,
      19,
      32,
      21,
      28,
      18,
      16,
      18,
      22,
      13,
      30,
      5,
      28,
      7,
      47,
      39,
      46,
      64,
      34
    ],
    "chapters": 52
  },
  {
    "id": "LAM",
    "testament": "OT",
    "enName": "Lamentations",
    "ptName": "Lamentações",
    "enAliases": [
      "lamentations",
      "lam",
      "la"
    ],
    "ptAliases": [
      "lamentacoes",
      "lam",
      "lm"
    ],
    "verseCounts": [
      22,
      22,
      66,
      22,
      22
    ],
    "chapters": 5
  },
  {
    "id": "EZK",
    "testament": "OT",
    "enName": "Ezekiel",
    "ptName": "Ezequiel",
    "enAliases": [
      "ezekiel",
      "ezek",
      "ezk"
    ],
    "ptAliases": [
      "ezequiel",
      "eze",
      "ez"
    ],
    "verseCounts": [
      28,
      10,
      27,
      17,
      17,
      14,
      27,
      18,
      11,
      22,
      25,
      28,
      23,
      23,
      8,
      63,
      24,
      32,
      14,
      49,
      32,
      31,
      49,
      27,
      17,
      21,
      36,
      26,
      21,
      26,
      18,
      32,
      33,
      31,
      15,
      38,
      28,
      23,
      29,
      49,
      26,
      20,
      27,
      31,
      25,
      24,
      23,
      35
    ],
    "chapters": 48
  },
  {
    "id": "DAN",
    "testament": "OT",
    "enName": "Daniel",
    "ptName": "Daniel",
    "enAliases": [
      "daniel",
      "dan",
      "da"
    ],
    "ptAliases": [
      "daniel",
      "dan",
      "dn"
    ],
    "verseCounts": [
      21,
      49,
      30,
      37,
      31,
      28,
      28,
      27,
      27,
      21,
      45,
      13
    ],
    "chapters": 12
  },
  {
    "id": "HOS",
    "testament": "OT",
    "enName": "Hosea",
    "ptName": "Oseias",
    "enAliases": [
      "hosea",
      "hos",
      "ho"
    ],
    "ptAliases": [
      "oseias",
      "os",
      "ose"
    ],
    "verseCounts": [
      11,
      23,
      5,
      19,
      15,
      11,
      16,
      14,
      17,
      15,
      12,
      14,
      16,
      9
    ],
    "chapters": 14
  },
  {
    "id": "JOL",
    "testament": "OT",
    "enName": "Joel",
    "ptName": "Joel",
    "enAliases": [
      "joel",
      "jol",
      "jl"
    ],
    "ptAliases": [
      "joel",
      "jl"
    ],
    "verseCounts": [
      20,
      32,
      21
    ],
    "chapters": 3
  },
  {
    "id": "AMO",
    "testament": "OT",
    "enName": "Amos",
    "ptName": "Amós",
    "enAliases": [
      "amos",
      "amo",
      "am"
    ],
    "ptAliases": [
      "amos",
      "am"
    ],
    "verseCounts": [
      15,
      16,
      15,
      13,
      27,
      14,
      17,
      14,
      15
    ],
    "chapters": 9
  },
  {
    "id": "OBA",
    "testament": "OT",
    "enName": "Obadiah",
    "ptName": "Obadias",
    "enAliases": [
      "obadiah",
      "obad",
      "oba",
      "ob"
    ],
    "ptAliases": [
      "obadias",
      "obad",
      "ob"
    ],
    "verseCounts": [
      21
    ],
    "chapters": 1
  },
  {
    "id": "JON",
    "testament": "OT",
    "enName": "Jonah",
    "ptName": "Jonas",
    "enAliases": [
      "jonah",
      "jon",
      "jnh"
    ],
    "ptAliases": [
      "jonas",
      "jon",
      "jn"
    ],
    "verseCounts": [
      17,
      10,
      10,
      11
    ],
    "chapters": 4
  },
  {
    "id": "MIC",
    "testament": "OT",
    "enName": "Micah",
    "ptName": "Miqueias",
    "enAliases": [
      "micah",
      "mic"
    ],
    "ptAliases": [
      "miqueias",
      "miq",
      "mq"
    ],
    "verseCounts": [
      16,
      13,
      12,
      13,
      15,
      16,
      20
    ],
    "chapters": 7
  },
  {
    "id": "NAM",
    "testament": "OT",
    "enName": "Nahum",
    "ptName": "Naum",
    "enAliases": [
      "nahum",
      "nah",
      "na"
    ],
    "ptAliases": [
      "naum",
      "na"
    ],
    "verseCounts": [
      15,
      13,
      19
    ],
    "chapters": 3
  },
  {
    "id": "HAB",
    "testament": "OT",
    "enName": "Habakkuk",
    "ptName": "Habacuque",
    "enAliases": [
      "habakkuk",
      "hab"
    ],
    "ptAliases": [
      "habacuque",
      "hab",
      "hc"
    ],
    "verseCounts": [
      17,
      20,
      19
    ],
    "chapters": 3
  },
  {
    "id": "ZEP",
    "testament": "OT",
    "enName": "Zephaniah",
    "ptName": "Sofonias",
    "enAliases": [
      "zephaniah",
      "zeph",
      "zep"
    ],
    "ptAliases": [
      "sofonias",
      "sof",
      "sf"
    ],
    "verseCounts": [
      18,
      15,
      20
    ],
    "chapters": 3
  },
  {
    "id": "HAG",
    "testament": "OT",
    "enName": "Haggai",
    "ptName": "Ageu",
    "enAliases": [
      "haggai",
      "hag"
    ],
    "ptAliases": [
      "ageu",
      "ag"
    ],
    "verseCounts": [
      15,
      23
    ],
    "chapters": 2
  },
  {
    "id": "ZEC",
    "testament": "OT",
    "enName": "Zechariah",
    "ptName": "Zacarias",
    "enAliases": [
      "zechariah",
      "zech",
      "zec"
    ],
    "ptAliases": [
      "zacarias",
      "zac",
      "zc"
    ],
    "verseCounts": [
      21,
      13,
      10,
      14,
      11,
      15,
      14,
      23,
      17,
      12,
      17,
      14,
      9,
      21
    ],
    "chapters": 14
  },
  {
    "id": "MAL",
    "testament": "OT",
    "enName": "Malachi",
    "ptName": "Malaquias",
    "enAliases": [
      "malachi",
      "mal"
    ],
    "ptAliases": [
      "malaquias",
      "mal",
      "ml"
    ],
    "verseCounts": [
      14,
      17,
      18,
      6
    ],
    "chapters": 4
  },
  {
    "id": "MAT",
    "testament": "NT",
    "enName": "Matthew",
    "ptName": "Mateus",
    "enAliases": [
      "matthew",
      "matt",
      "mat",
      "mt"
    ],
    "ptAliases": [
      "mateus",
      "mat",
      "mt"
    ],
    "verseCounts": [
      25,
      23,
      17,
      25,
      48,
      34,
      29,
      34,
      38,
      42,
      30,
      50,
      58,
      36,
      39,
      28,
      27,
      35,
      30,
      34,
      46,
      46,
      39,
      51,
      46,
      75,
      66,
      20
    ],
    "chapters": 28
  },
  {
    "id": "MRK",
    "testament": "NT",
    "enName": "Mark",
    "ptName": "Marcos",
    "enAliases": [
      "mark",
      "mrk",
      "mk"
    ],
    "ptAliases": [
      "marcos",
      "marc",
      "mc"
    ],
    "verseCounts": [
      45,
      28,
      35,
      41,
      43,
      56,
      37,
      38,
      50,
      52,
      33,
      44,
      37,
      72,
      47,
      20
    ],
    "chapters": 16
  },
  {
    "id": "LUK",
    "testament": "NT",
    "enName": "Luke",
    "ptName": "Lucas",
    "enAliases": [
      "luke",
      "luk",
      "lk"
    ],
    "ptAliases": [
      "lucas",
      "luc",
      "lc"
    ],
    "verseCounts": [
      80,
      52,
      38,
      44,
      39,
      49,
      50,
      56,
      62,
      42,
      54,
      59,
      35,
      35,
      32,
      31,
      37,
      43,
      48,
      47,
      38,
      71,
      56,
      53
    ],
    "chapters": 24
  },
  {
    "id": "JHN",
    "testament": "NT",
    "enName": "John",
    "ptName": "João",
    "enAliases": [
      "john",
      "jhn",
      "jn"
    ],
    "ptAliases": [
      "joao",
      "jo",
      "jn"
    ],
    "verseCounts": [
      51,
      25,
      36,
      54,
      47,
      71,
      53,
      59,
      41,
      42,
      57,
      50,
      38,
      31,
      27,
      33,
      26,
      40,
      42,
      31,
      25
    ],
    "chapters": 21
  },
  {
    "id": "ACT",
    "testament": "NT",
    "enName": "Acts",
    "ptName": "Atos",
    "enAliases": [
      "acts",
      "act",
      "ac"
    ],
    "ptAliases": [
      "atos",
      "at"
    ],
    "verseCounts": [
      26,
      47,
      26,
      37,
      42,
      15,
      60,
      40,
      43,
      48,
      30,
      25,
      52,
      28,
      41,
      40,
      34,
      28,
      41,
      38,
      40,
      30,
      35,
      27,
      27,
      32,
      44,
      31
    ],
    "chapters": 28
  },
  {
    "id": "ROM",
    "testament": "NT",
    "enName": "Romans",
    "ptName": "Romanos",
    "enAliases": [
      "romans",
      "rom",
      "ro",
      "rm"
    ],
    "ptAliases": [
      "romanos",
      "rom",
      "rm"
    ],
    "verseCounts": [
      32,
      29,
      31,
      25,
      21,
      23,
      25,
      39,
      33,
      21,
      36,
      21,
      14,
      23,
      33,
      27
    ],
    "chapters": 16
  },
  {
    "id": "1CO",
    "testament": "NT",
    "enName": "1 Corinthians",
    "ptName": "1 Coríntios",
    "enAliases": [
      "1 corinthians",
      "1 cor",
      "1co",
      "1c"
    ],
    "ptAliases": [
      "1 corintios",
      "1 cor",
      "1co",
      "1c"
    ],
    "verseCounts": [
      31,
      16,
      23,
      21,
      13,
      20,
      40,
      13,
      27,
      33,
      34,
      31,
      13,
      40,
      58,
      24
    ],
    "chapters": 16
  },
  {
    "id": "2CO",
    "testament": "NT",
    "enName": "2 Corinthians",
    "ptName": "2 Coríntios",
    "enAliases": [
      "2 corinthians",
      "2 cor",
      "2co",
      "2c"
    ],
    "ptAliases": [
      "2 corintios",
      "2 cor",
      "2co",
      "2c"
    ],
    "verseCounts": [
      24,
      17,
      18,
      18,
      21,
      18,
      16,
      24,
      15,
      18,
      33,
      21,
      14
    ],
    "chapters": 13
  },
  {
    "id": "GAL",
    "testament": "NT",
    "enName": "Galatians",
    "ptName": "Gálatas",
    "enAliases": [
      "galatians",
      "gal",
      "ga"
    ],
    "ptAliases": [
      "galatas",
      "gal",
      "gl"
    ],
    "verseCounts": [
      24,
      21,
      29,
      31,
      26,
      18
    ],
    "chapters": 6
  },
  {
    "id": "EPH",
    "testament": "NT",
    "enName": "Ephesians",
    "ptName": "Efésios",
    "enAliases": [
      "ephesians",
      "eph",
      "ep"
    ],
    "ptAliases": [
      "efesios",
      "ef",
      "efe"
    ],
    "verseCounts": [
      23,
      22,
      21,
      32,
      33,
      24
    ],
    "chapters": 6
  },
  {
    "id": "PHP",
    "testament": "NT",
    "enName": "Philippians",
    "ptName": "Filipenses",
    "enAliases": [
      "philippians",
      "phil",
      "php",
      "pp"
    ],
    "ptAliases": [
      "filipenses",
      "fil",
      "flp",
      "fp"
    ],
    "verseCounts": [
      30,
      30,
      21,
      23
    ],
    "chapters": 4
  },
  {
    "id": "COL",
    "testament": "NT",
    "enName": "Colossians",
    "ptName": "Colossenses",
    "enAliases": [
      "colossians",
      "col",
      "co"
    ],
    "ptAliases": [
      "colossenses",
      "col",
      "cl"
    ],
    "verseCounts": [
      29,
      23,
      25,
      18
    ],
    "chapters": 4
  },
  {
    "id": "1TH",
    "testament": "NT",
    "enName": "1 Thessalonians",
    "ptName": "1 Tessalonicenses",
    "enAliases": [
      "1 thessalonians",
      "1 thess",
      "1th",
      "1ts"
    ],
    "ptAliases": [
      "1 tessalonicenses",
      "1 tess",
      "1ts"
    ],
    "verseCounts": [
      10,
      20,
      13,
      18,
      28
    ],
    "chapters": 5
  },
  {
    "id": "2TH",
    "testament": "NT",
    "enName": "2 Thessalonians",
    "ptName": "2 Tessalonicenses",
    "enAliases": [
      "2 thessalonians",
      "2 thess",
      "2th",
      "2ts"
    ],
    "ptAliases": [
      "2 tessalonicenses",
      "2 tess",
      "2ts"
    ],
    "verseCounts": [
      12,
      17,
      18
    ],
    "chapters": 3
  },
  {
    "id": "1TI",
    "testament": "NT",
    "enName": "1 Timothy",
    "ptName": "1 Timóteo",
    "enAliases": [
      "1 timothy",
      "1 tim",
      "1ti",
      "1t"
    ],
    "ptAliases": [
      "1 timoteo",
      "1 tim",
      "1tm"
    ],
    "verseCounts": [
      20,
      15,
      16,
      16,
      25,
      21
    ],
    "chapters": 6
  },
  {
    "id": "2TI",
    "testament": "NT",
    "enName": "2 Timothy",
    "ptName": "2 Timóteo",
    "enAliases": [
      "2 timothy",
      "2 tim",
      "2ti",
      "2t"
    ],
    "ptAliases": [
      "2 timoteo",
      "2 tim",
      "2tm"
    ],
    "verseCounts": [
      18,
      26,
      17,
      22
    ],
    "chapters": 4
  },
  {
    "id": "TIT",
    "testament": "NT",
    "enName": "Titus",
    "ptName": "Tito",
    "enAliases": [
      "titus",
      "tit",
      "ti"
    ],
    "ptAliases": [
      "tito",
      "tit",
      "tt"
    ],
    "verseCounts": [
      16,
      15,
      15
    ],
    "chapters": 3
  },
  {
    "id": "PHM",
    "testament": "NT",
    "enName": "Philemon",
    "ptName": "Filemom",
    "enAliases": [
      "philemon",
      "phm",
      "pm"
    ],
    "ptAliases": [
      "filemom",
      "fm",
      "flm"
    ],
    "verseCounts": [
      25
    ],
    "chapters": 1
  },
  {
    "id": "HEB",
    "testament": "NT",
    "enName": "Hebrews",
    "ptName": "Hebreus",
    "enAliases": [
      "hebrews",
      "heb",
      "he"
    ],
    "ptAliases": [
      "hebreus",
      "heb",
      "hb"
    ],
    "verseCounts": [
      14,
      18,
      19,
      16,
      14,
      20,
      28,
      13,
      28,
      39,
      40,
      29,
      25
    ],
    "chapters": 13
  },
  {
    "id": "JAS",
    "testament": "NT",
    "enName": "James",
    "ptName": "Tiago",
    "enAliases": [
      "james",
      "jas",
      "jm"
    ],
    "ptAliases": [
      "tiago",
      "tg"
    ],
    "verseCounts": [
      27,
      26,
      18,
      17,
      20
    ],
    "chapters": 5
  },
  {
    "id": "1PE",
    "testament": "NT",
    "enName": "1 Peter",
    "ptName": "1 Pedro",
    "enAliases": [
      "1 peter",
      "1 pet",
      "1pe",
      "1p"
    ],
    "ptAliases": [
      "1 pedro",
      "1 ped",
      "1pe",
      "1p"
    ],
    "verseCounts": [
      25,
      25,
      22,
      19,
      14
    ],
    "chapters": 5
  },
  {
    "id": "2PE",
    "testament": "NT",
    "enName": "2 Peter",
    "ptName": "2 Pedro",
    "enAliases": [
      "2 peter",
      "2 pet",
      "2pe",
      "2p"
    ],
    "ptAliases": [
      "2 pedro",
      "2 ped",
      "2pe",
      "2p"
    ],
    "verseCounts": [
      21,
      22,
      18
    ],
    "chapters": 3
  },
  {
    "id": "1JN",
    "testament": "NT",
    "enName": "1 John",
    "ptName": "1 João",
    "enAliases": [
      "1 john",
      "1 jhn",
      "1jn",
      "1j"
    ],
    "ptAliases": [
      "1 joao",
      "1 jo",
      "1jn",
      "1j"
    ],
    "verseCounts": [
      10,
      29,
      24,
      21,
      21
    ],
    "chapters": 5
  },
  {
    "id": "2JN",
    "testament": "NT",
    "enName": "2 John",
    "ptName": "2 João",
    "enAliases": [
      "2 john",
      "2 jhn",
      "2jn",
      "2j"
    ],
    "ptAliases": [
      "2 joao",
      "2 jo",
      "2jn",
      "2j"
    ],
    "verseCounts": [
      13
    ],
    "chapters": 1
  },
  {
    "id": "3JN",
    "testament": "NT",
    "enName": "3 John",
    "ptName": "3 João",
    "enAliases": [
      "3 john",
      "3 jhn",
      "3jn",
      "3j"
    ],
    "ptAliases": [
      "3 joao",
      "3 jo",
      "3jn",
      "3j"
    ],
    "verseCounts": [
      14
    ],
    "chapters": 1
  },
  {
    "id": "JUD",
    "testament": "NT",
    "enName": "Jude",
    "ptName": "Judas",
    "enAliases": [
      "jude",
      "jud",
      "jd"
    ],
    "ptAliases": [
      "judas",
      "jud",
      "jd"
    ],
    "verseCounts": [
      25
    ],
    "chapters": 1
  },
  {
    "id": "REV",
    "testament": "NT",
    "enName": "Revelation",
    "ptName": "Apocalipse",
    "enAliases": [
      "revelation",
      "rev",
      "re"
    ],
    "ptAliases": [
      "apocalipse",
      "apoc",
      "ap"
    ],
    "verseCounts": [
      20,
      29,
      22,
      11,
      14,
      17,
      17,
      13,
      21,
      11,
      19,
      17,
      18,
      20,
      8,
      21,
      18,
      24,
      21,
      15,
      27,
      21
    ],
    "chapters": 22
  }
];

export const CANON_BOOKS: readonly CanonBook[] = Object.freeze(
  RAW_CANON_BOOKS.map((book) =>
    Object.freeze({
      ...book,
      enAliases: Object.freeze([...book.enAliases]),
      ptAliases: Object.freeze([...book.ptAliases]),
      verseCounts: Object.freeze([...book.verseCounts]),
    })
  )
);

const BOOK_BY_ID = new Map<string, CanonBook>(
  CANON_BOOKS.map((book) => [book.id.toUpperCase(), book])
);

function sanitizeSearch(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function getCanonBooks(testament?: 'OT' | 'NT'): readonly CanonBook[] {
  if (!testament) {
    return [...CANON_BOOKS];
  }
  return CANON_BOOKS.filter((b) => b.testament === testament);
}

export function getCanonBook(bookId: string): CanonBook | undefined {
  return BOOK_BY_ID.get(bookId.toUpperCase().trim());
}

export function getChapterCount(bookId: string): number {
  const book = getCanonBook(bookId);
  return book ? book.chapters : 0;
}

export function getVerseCount(bookId: string, chapter: number): number {
  const book = getCanonBook(bookId);
  if (!book || chapter < 1 || chapter > book.chapters) {
    return 0;
  }
  return book.verseCounts[chapter - 1] ?? 0;
}

export function searchCanonBooks(
  query: string,
  testament?: 'OT' | 'NT'
): readonly CanonBook[] {
  const trimmed = query.trim();
  const pool = testament ? getCanonBooks(testament) : CANON_BOOKS;
  if (!trimmed) {
    return [...pool];
  }

  const cleanQuery = sanitizeSearch(trimmed);
  if (!cleanQuery) {
    return pool;
  }

  const matchesAlias = (alias: string) => {
    const c = sanitizeSearch(alias);
    return c === cleanQuery || c.startsWith(cleanQuery);
  };

  return pool.filter((book) => {
    const cleanEn = sanitizeSearch(book.enName);
    const cleanPt = sanitizeSearch(book.ptName);
    if (cleanEn.includes(cleanQuery) || cleanPt.includes(cleanQuery)) {
      return true;
    }

    return book.enAliases.some(matchesAlias) || book.ptAliases.some(matchesAlias);
  });
}
