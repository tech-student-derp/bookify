// Translation data for all 14 supported languages
// International (7) + Philippine (7)

export interface LanguageEntry {
  code: string;
  name: string;
  nativeName: string;
  headline: string;
  supporting: string;
}

export const languages: LanguageEntry[] = [
  // International
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    headline: 'Read books, sell books, buy books, read books again.',
    supporting:
      "Find your next favorite read, discover books from independent sellers, or share stories of your own. Whether you're buying or selling, there's a place for you here.",
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Espanol',
    headline: 'Lee libros, vende libros, compra libros, lelos otra vez.',
    supporting:
      'Encuentra tu proxima lectura favorita, descubre libros de vendedores independientes o comparte tus propias historias. Ya sea que compres o vendas, aqui hay un lugar para ti.',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Francais',
    headline: 'Lisez, vendez, achetez des livres, puis recommencez.',
    supporting:
      "Trouvez votre prochaine lecture preferee, decouvrez des livres de vendeurs independants ou partagez vos propres histoires. Que vous achetiez ou vendiez, vous avez votre place ici.",
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    headline: 'Bucher lesen, verkaufen, kaufen und wieder von vorn.',
    supporting:
      "Finde dein nachstes Lieblingsbuch, entdecke Bucher von unabhangigen Verkaufern oder teile deine eigenen Geschichten. Ob Kaufer oder Verkaufer, hier ist Platz fur dich.",
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '\u65e5\u672c\u8a9e',
    headline: '\u672c\u3092\u8aad\u3093\u3067\u3001\u58f2\u3063\u3066\u3001\u8cb7\u3063\u3066\u3001\u307e\u305f\u8aad\u3080\u3002',
    supporting:
      '\u6b21\u306e\u304a\u6c17\u306b\u5165\u308a\u306e\u4e00\u518a\u3092\u898b\u3064\u3051\u3088\u3046\u3002\u500b\u4eba\u51fa\u54c1\u8005\u306e\u672c\u3092\u767a\u6398\u3057\u305f\u308a\u3001\u3042\u306a\u305f\u81ea\u8eab\u306e\u30b9\u30c8\u30fc\u30ea\u30fc\u3092\u5c4a\u3051\u308b\u3053\u3068\u3082\u3067\u304d\u307e\u3059\u3002\u8cb7\u3044\u624b\u3067\u3082\u58f2\u308a\u624b\u3067\u3082\u3001\u3053\u3053\u306b\u3042\u306a\u305f\u306e\u5c45\u5834\u6240\u304c\u3042\u308a\u307e\u3059\u3002',
  },
  {
    code: 'ko',
    name: 'Korean',
    nativeName: '\ud55c\uad6d\uc5b4',
    headline: '\uccb5\uc744 \uc77d\uace0, \ud314\uace0, \uc0ac\uace0, \ub610 \uc77d\uace0.',
    supporting:
      '\ub2e4\uc74c\uc5d0 \uc77d\uc744 \uccb5\uc744 \ucc3e\uc544\ubcf4\uc138\uc694. \uac1c\uc778 \ud310\ub9e4\uc790\uc758 \uccb5\uc744 \ubc1c\uacac\ud558\uac70\ub098, \ub2f9\uc2e0\uc758 \uc774\uc57c\uae30\ub97c \ub098\ub204\uc5b8 \uc218\ub3c4 \uc788\uc5b4\uc694. \uc0ac\ub4e0 \ud314\ub4e0, \uc5ec\uae30\uc5d4 \ub2f9\uc2e0\uc744 \uc704\ud55c \uc790\ub9ac\uac00 \uc788\uc2b5\ub2c8\ub2e4.',
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '\u4e2d\u6587',
    headline: '\u8bfb\u4e66\u3001\u5356\u4e66\u3001\u4e70\u4e66\uff0c\u7136\u540e\u518d\u8bfb\u4e00\u904d\u3002',
    supporting:
      '\u627e\u5230\u4f60\u4e0b\u4e00\u672c\u6700\u7231\u7684\u4e66\uff0c\u53d1\u73b0\u72ec\u7acb\u5356\u5bb6\u7684\u597d\u4e66\uff0c\u6216\u8005\u5206\u4eab\u4f60\u81ea\u5df1\u7684\u6545\u4e8b\u3002\u65e0\u8bba\u662f\u4e70\u4e66\u8fd8\u662f\u5356\u4e66\uff0c\u8fd9\u91cc\u90fd\u6709\u5c5e\u4e8e\u4f60\u7684\u4f4d\u7f6e\u3002',
  },

  // Philippine
  {
    code: 'fil',
    name: 'Filipino',
    nativeName: 'Filipino',
    headline: 'Magbasa, magbenta, bumili ng libro, at magsimulang muli.',
    supporting:
      "Hanapin ang susunod mong paboritong libro, tuklasin ang mga aklat mula sa mga independiyenteng nagbebenta, o ibahagi ang iyong sariling kwento. Bumibili man o nagbebenta ka, mayroon kang lugar dito.",
  },
  {
    code: 'ceb',
    name: 'Cebuano',
    nativeName: 'Cebuano',
    headline: 'Basaha, ibaligya, palita ang libro ug basaha pag-usab.',
    supporting:
      'Pangitaa ang imong sunod nga paboritong basahon, tuklasin ang mga libro gikan sa mga independiyenteng nagbaligya, o ipaambit ang imong kaugalingong istorya. Mopalit o mobaligya ka man, adunay lugar alang kanimo dinhi.',
  },
  {
    code: 'ilo',
    name: 'Ilocano',
    nativeName: 'Ilokano',
    headline: 'Agbasa, agbalin, aggatang ti libro ket agbasa manen.',
    supporting:
      'Biroken ti sumaruno a paboritom a basaen, diskubreren dagiti libro manipud kadagiti naindependensian a mangibalin, wenno ibingay dagiti kenkam a mismo a sarita. Aggatang man wenno agbalin, adda ti lugar mo ditoy.',
  },
  {
    code: 'hil',
    name: 'Hiligaynon',
    nativeName: 'Hiligaynon',
    headline: 'Magbasa, magbaligya, maggwa sang libro kag magbasa liwat.',
    supporting:
      'Hanapon ang imo sunod nga paborito nga basahon, tuklasin ang mga libro halin sa mga independyente nga nagabaligya, ukon ibahagi ang imo kaugalingon nga istorya. Nagabakal man ukon nagabaligya, may lugar ka diri.',
  },
  {
    code: 'war',
    name: 'Waray',
    nativeName: 'Winaray',
    headline: 'Magbasa, magbaligya, mamalit hin libro ngan magbasa ha liwat.',
    supporting:
      'Hanapa in imo sunod nga paborito nga libro, tuklasin an mga libro tikang ha mga independyente nga nagbabaligya, o ibinayad an imo kaugalingon nga istorya. Mamalit man o magbaligya, may lugar ka dinhi.',
  },
  {
    code: 'pam',
    name: 'Kapampangan',
    nativeName: 'Kapampangan',
    headline: 'Mamasa, mamalakad, mamili ning libro at mamasa na naman.',
    supporting:
      'Aluganan ing susunod mong paboritong libro, tuklasin la reng libro kapamilala na nagsalin, o ibahagi ing sarili mong kwentu. Mamili man o mamalakad, atin yang lugar para keka deti.',
  },
  {
    code: 'bcl',
    name: 'Bikol',
    nativeName: 'Bikol',
    headline: 'Magbasa, magbakal, magbenta nin libro asin magbasa liwat.',
    supporting:
      'Hanapon an sunod mong paboritong libro, tuklasen an mga libro hale sa mga independyenteng nagbabakal, o ibahagi an sadiri mong istorya. Nagbabakal man o nagbebenta, igwa kang lugar dini.',
  },
];

export const getRandomLanguage = (
  current: string,
  all: LanguageEntry[],
): LanguageEntry => {
  const others = all.filter((l) => l.code !== current);
  return others[Math.floor(Math.random() * others.length)];
};
