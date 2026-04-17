// ============================================================
// Static locked section card titles — shown for free/invited users.
// These replace the AI-generated titles to give a sense of what's inside
// without revealing personalized content.
// ============================================================

import type { SectionKey } from '@/types/reading';

type Labels = { ka: string[]; en: string[] };

export const LOCKED_CARD_TITLES: Record<SectionKey, Labels> = {
  overview: {
    ka: ['თქვენი პლანეტური ხელნაწერი', 'თქვენი ელემენტური ნიმუში', 'თქვენი რუკის ხელმოწერა'],
    en: ['Your Planetary Blueprint', 'Your Elemental Pattern', 'Your Chart Signature'],
  },
  mission: {
    ka: ['თქვენი სულის მიმართულება', 'თქვენი სიცოცხლის მიზანი', 'თქვენი ჩრდილოეთ ვარსკვლავი'],
    en: ['Your Soul\'s Direction', 'Your Life Purpose', 'Your North Star'],
  },
  characteristics: {
    ka: ['თქვენი ძირეული ბუნება', 'თქვენი შინაგანი სამყარო', 'თქვენი გამოხატვის სტილი'],
    en: ['Your Core Nature', 'Your Inner World', 'Your Expression Style'],
  },
  relationships: {
    ka: ['თქვენი გულის ხელნაწერი', 'თქვენი პარტნიორობის სტილი', 'თქვენი სიყვარულის ენა'],
    en: ['Your Heart\'s Blueprint', 'Your Partnership Style', 'Your Love Language'],
  },
  work: {
    ka: ['თქვენი კარიერის გზა', 'თქვენი პროფესიული ნიჭი', 'თქვენი წარმატების ნიმუში'],
    en: ['Your Career Path', 'Your Professional Gift', 'Your Success Pattern'],
  },
  shadow: {
    ka: ['თქვენი ფარული სიძლიერე', 'თქვენი ზრდის კიდე', 'თქვენი ჩრდილის მუშაობა'],
    en: ['Your Hidden Strength', 'Your Growth Edge', 'Your Shadow Work'],
  },
  spiritual: {
    ka: ['თქვენი სულის საჩუქარი', 'თქვენი სულიერი გზა', 'თქვენი წმინდა პრაქტიკა'],
    en: ['Your Soul\'s Gift', 'Your Spiritual Path', 'Your Sacred Practice'],
  },
  potential: {
    ka: ['თქვენი უმაღლესი გამოხატულება', 'თქვენი ბედის ნიმუში', 'თქვენი ცხოვრების სიმაღლე'],
    en: ['Your Highest Expression', 'Your Destiny Pattern', 'Your Life\'s Peak'],
  },
};
