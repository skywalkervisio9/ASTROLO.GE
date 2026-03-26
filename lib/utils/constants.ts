// ============================================================
// UI constants — section icons, element colors, zodiac
// ============================================================

export const SECTION_ICONS: Record<string, string> = {
  overview: 'gl-sparkle',
  mission: 'gl-node',
  characteristics: 'gl-diamond',
  relationships: 'gl-venus',
  work: 'gl-mars',
  shadow: 'gl-moon',
  spiritual: 'gl-sparkle',
  potential: 'gl-diamond',
};

export const ELEMENT_COLORS = {
  fire: '#d4644a',
  earth: '#6b9a6b',
  air: '#6b8fb5',
  water: '#7b6baa',
} as const;

export const ZODIAC_SIGN_IDS = [
  'gl-aries', 'gl-taurus', 'gl-gemini', 'gl-cancer',
  'gl-leo', 'gl-virgo', 'gl-libra', 'gl-scorpio',
  'gl-sagittarius', 'gl-capricorn', 'gl-aquarius', 'gl-pisces',
] as const;

export const ZODIAC_NAMES = {
  ka: ['ვერძი','კურო','ტყუპები','კირჩხიბი','ლომი','ქალწული','სასწორი','მორიელი','მშვილდოსანი','თხის რქა','მერწყული','თევზები'],
  en: ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'],
} as const;

export const PLANET_NAMES = {
  ka: ['მზე','მთვარე','მერკური','ვენერა','მარსი','იუპიტერი','სატურნი','ურანი','ნეპტუნი','პლუტონი'],
  en: ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'],
} as const;

// Section descriptions for the free section picker
export const SECTION_DESCRIPTIONS = {
  ka: {
    characteristics: 'შენი ხასიათის სიღრმისეული პორტრეტი — ელემენტური ბალანსი, პლანეტარული ძალები',
    relationships: 'სიყვარული, მიჯაჭვულობა, პარტნიორობის ნიმუშები ვენერასა და მარსის მეშვეობით',
    work: 'კარიერა, შემოქმედება, თვითრეალიზაციის გზები — MC და მე-10 სახლის ანალიზი',
    shadow: 'ჩრდილოვანი მხარე, შიშები, განვითარების წერტილები — პლუტონი და ლილითი',
    spiritual: 'სულიერი ზრდა, ინტუიცია, ტრანსცენდენტური პოტენციალი — ნეპტუნი და კვანძები',
    potential: 'შენი უმაღლესი შესაძლებლობა — ყველა ძალის სინთეზი',
  },
  en: {
    characteristics: 'A deep portrait of your character — elemental balance, planetary forces at play',
    relationships: 'Love, attachment, partnership patterns through Venus and Mars',
    work: 'Career, creativity, paths to self-realisation — MC and 10th house analysis',
    shadow: 'Your shadow side, fears, growth edges — Pluto and Lilith',
    spiritual: 'Spiritual growth, intuition, transcendent potential — Neptune and nodes',
    potential: 'Your highest capability — synthesis of all forces',
  },
} as const;
