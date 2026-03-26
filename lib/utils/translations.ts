// ============================================================
// Bilingual UI labels — Georgian (ka) + English (en)
// Used by frontend components for instant language switching
// ============================================================

export const TR = {
  // Natal section nav
  natalNav: {
    ka: ['მიმოხილვა','მისია','მახასიათებლები','ურთიერთობები','საქმე','ჩრდილი','სამშვინველი','სრულყოფილება'],
    en: ['Overview','Mission','Characteristics','Relationships','Work','Shadow','Soul','Perfection']
  },
  // Synastry section nav (couple)
  synNavCouple: {
    ka: ['ემოციური','ვნება','კარმული','ნუმეროლოგია','ზრდა','ჩრდილი','პრაქტიკა','პოტენციალი'],
    en: ['Emotional','Passion','Karmic','Numerology','Growth','Shadow','Practice','Potential']
  },
  // Synastry section nav (friend)
  synNavFriend: {
    ka: ['ემოციური','ინტელექტუალური','კარმული','ზრდა','თავგადასავლები','ჩრდილი','პოტენციალი','პრაქტიკა'],
    en: ['Emotional','Intellectual','Karmic','Growth','Adventures','Shadow','Potential','Practice']
  },
  sidebar: {
    ka: { myMap: 'ჩემი რუკა', natal: 'ნატალური რუკა', synastry: 'სინასტრია', invite: 'მოწვევა', share: 'გაზიარება', shareBtn: 'რუკის გაზიარება', logout: 'გასვლა', couple: 'მეწყვილე', friend: 'მეგობარი' },
    en: { myMap: 'MY CHART', natal: 'Natal Chart', synastry: 'Synastry', invite: 'Invite', share: 'SHARE', shareBtn: 'Share reading', logout: 'Sign out', couple: 'Couple', friend: 'Friend' }
  },
  hero: {
    ka: { sub: 'სულის ნახაზი', h1: 'ნატალური რუკის წაკითხვა' },
    en: { sub: 'SOUL BLUEPRINT', h1: 'Natal Chart Reading' }
  },
  synHero: {
    ka: { couple: 'ვარსკვლავები ორისთვის', friend: 'ვარსკვლავთა მეგობრობა', coupleSub: 'სინასტრიის სიღრმისეული ანალიზი', friendSub: 'მეგობრული თავსებადობის ანალიზი' },
    en: { couple: 'Stars for Two', friend: 'Stellar Friendship', coupleSub: 'Deep synastry analysis', friendSub: 'Friendship compatibility analysis' }
  },
  bread: {
    ka: { back: '← ჩემი რუკა', syn: 'სინასტრია', partner: 'გიორგის რუკა →' },
    en: { back: '← My Chart', syn: 'Synastry', partner: "Giorgi's Chart →" }
  },
  footer: {
    ka: ['ჩვენს შესახებ','კონფიდენციალობა','პირობები','კონტაქტი'],
    en: ['About','Privacy','Terms','Contact']
  },
  compat: { ka: 'თავსებადობა', en: 'Compatibility' },
  auth: {
    ka: { login: 'შესვლა', signup: 'რეგისტრაცია', forgot: 'პაროლის აღდგენა', birthData: 'დაბადების მონაცემები', google: 'Google-ით შესვლა', googleSignup: 'Google-ით რეგისტრაცია', orEmail: 'ან ელ-ფოსტით', email: 'ელ-ფოსტა', password: 'პაროლი', name: 'სახელი', forgotLink: 'დაგავიწყდა?', createAccount: 'ანგარიშის შექმნა', haveAccount: 'უკვე გაქვს ანგარიში?', sendReset: 'ბმულის გაგზავნა', resetSent: 'ბმული გაგზავნილია', back: '← უკან', generateChart: 'რუკის აგება ✦', birthHint: 'რატომ გვჭირდება?', birthHintText: 'ნატალური რუკა ზუსტ პლანეტარულ პოზიციებს ეფუძნება შენი დაბადების მომენტში.', day: 'დღე', month: 'თვე', year: 'წელი', hour: 'საათი', minute: 'წუთი', timeUnknown: 'დაბადების დრო უცნობია', place: 'დაბადების ადგილი', gender: 'სქესი', female: 'ქალი', male: 'კაცი', loginSub: 'შენი ციური ნახაზი გელოდება', signupSub: 'დაიწყე შენი ციური მოგზაურობა', birthSub: 'ნატალური რუკის აგებისთვის' },
    en: { login: 'Sign In', signup: 'Create Account', forgot: 'Reset Password', birthData: 'Birth Data', google: 'Continue with Google', googleSignup: 'Continue with Google', orEmail: 'or with email', email: 'EMAIL', password: 'PASSWORD', name: 'NAME', forgotLink: 'Forgot password?', createAccount: 'Create Account', haveAccount: 'Already have an account?', sendReset: 'Send Reset Link', resetSent: 'Check your email', back: '← Back', generateChart: 'Generate Chart ✦', birthHint: 'Why do we need this?', birthHintText: 'Your natal chart maps exact planetary positions at birth. More precision means a deeper reading.', day: 'DAY', month: 'MONTH', year: 'YEAR', hour: 'HOUR', minute: 'MINUTE', timeUnknown: 'Birth time unknown', place: 'PLACE OF BIRTH', gender: 'GENDER', female: 'Female', male: 'Male', loginSub: 'Your celestial blueprint awaits', signupSub: 'Begin your celestial journey', birthSub: 'Required for your natal chart' }
  },
  loading: {
    ka: { title: 'ვარსკვლავები ლაპარაკობენ…', didYouKnow: '✦ იცოდი?', messages: ['ვარსკვლავური კოორდინატების გაანგარიშება…','პლანეტარული პოზიციების მოძიება…','ასპექტების ანალიზი…','სახლების სისტემის აგება…','ელემენტური ბალანსის შეფასება…','კარმული კვანძების ინტერპრეტაცია…','ჩრდილის ინტეგრაციის რუკა…','სულიერი გზის სინთეზი…','შენი ციური ნახაზი მზადდება…'], facts: ['თევზები ზოდიაქოს ბოლო ნიშანია — ყველა წინა ნიშნის სიბრძნეს ატარებს.','სატურნის დაბრუნება ~29 წელიწადში ხდება და სიმწიფის ახალ ციკლს იწყებს.','მთვარის კვანძები 18.6 წელიწადში ასრულებენ სრულ ციკლს.','პლუტონი მერწყულში 2024-დან 2044-მდე დარჩება — თაობრივი ტრანსფორმაცია.','ვენერა ციურ სხეულებს შორის ყველაზე სრულყოფილ წრეს ხაზავს — ვარდის ნიმუშს.'] },
    en: { title: 'The stars are speaking…', didYouKnow: '✦ DID YOU KNOW?', messages: ['Calculating stellar coordinates…','Fetching planetary positions…','Analyzing aspects & angles…','Building house system…','Evaluating elemental balance…','Interpreting karmic nodes…','Mapping shadow integration…','Synthesizing spiritual path…','Composing your celestial blueprint…'], facts: ['Pisces is the final sign — it carries the wisdom of every sign before it.','Saturn return happens every ~29 years, marking a new maturity cycle.','The lunar nodes complete a full cycle every 18.6 years.','Pluto will be in Aquarius from 2024 to 2044 — a generational shift.','Venus traces the most perfect circle among celestial bodies — a rose pattern.'] }
  },
  sectionPicker: {
    ka: {
      title: 'აირჩიე სექცია',
      subtitle: 'მიმოხილვა და მისია ყოველთვის ხელმისაწვდომია. აირჩიე კიდევ ერთი სექცია უფასოდ:',
      confirm: 'არჩევა',
      characteristics: 'მახასიათებლები',
      relationships: 'ურთიერთობები',
      work: 'საქმე და თვითრეალიზაცია',
      shadow: 'ჩრდილი',
      spiritual: 'სამშვინველი',
      potential: 'სრულყოფილება',
    },
    en: {
      title: 'Choose a Section',
      subtitle: 'Overview and Mission are always available. Choose one more section for free:',
      confirm: 'Select',
      characteristics: 'Characteristics',
      relationships: 'Relationships',
      work: 'Work & Self-Realisation',
      shadow: 'Shadow Self',
      spiritual: 'Spiritual Growth',
      potential: 'Maximum Potential',
    }
  }
} as const;

export type Lang = 'ka' | 'en';
