import Link from 'next/link';

export const metadata = {
  title: 'ASTROLO.GE',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="nf-wrap">
      <div className="nf-stars" aria-hidden>
        <span className="nf-star" style={{ top: '12%', left: '18%', animationDelay: '0s' }} />
        <span className="nf-star" style={{ top: '28%', left: '72%', animationDelay: '1.2s' }} />
        <span className="nf-star" style={{ top: '54%', left: '8%', animationDelay: '2.1s' }} />
        <span className="nf-star" style={{ top: '70%', left: '88%', animationDelay: '0.6s' }} />
        <span className="nf-star" style={{ top: '82%', left: '32%', animationDelay: '1.8s' }} />
      </div>

      <div className="nf-card">
        <div className="nf-sigil" aria-hidden>
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(201,168,76,.18)" strokeWidth=".8" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(201,168,76,.1)" strokeWidth=".5" strokeDasharray="2 4" />
            <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(201,168,76,.4)" strokeWidth="1.2" />
            <text x="50" y="58" textAnchor="middle" fill="var(--gold)" fontSize="22" fontFamily="Cormorant Garamond, serif" fontStyle="italic">?</text>
          </svg>
        </div>

        <h1 className="nf-title-ka">გვერდი ვერ მოიძებნა</h1>
        <h2 className="nf-title-en">Page not found</h2>

        <p className="nf-body-ka">
          ეს რუკა აღარ არსებობს. შესაძლოა მფლობელმა წაშალა ანგარიში, ან ბმული არასწორია.
        </p>
        <p className="nf-body-en">
          This reading no longer exists. The owner may have deleted their account, or the link is wrong.
        </p>

        <Link href="/" className="nf-cta">
          <span className="nf-cta-ka">დაბრუნება</span>
          <span className="nf-cta-sep">·</span>
          <span className="nf-cta-en">Return home</span>
        </Link>
      </div>
    </div>
  );
}
