import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const transcity = localFont({
  src: "./fonts/Transcity.otf",
  variable: "--f-brand",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: "ASTROLO.GE — ნატალური რუკა & სინასტრია",
  description: "ნატალური რუკის წაკითხვა და სინასტრია",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ka" className={transcity.variable} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Space+Grotesk:wght@300;400;500;600;700&family=Noto+Serif+Georgian:wght@300;400;500;600;700&family=Noto+Sans+Georgian:wght@200;300;400;500;600&family=Outfit:wght@200;300;400;500;600&display=swap"
        />
      </head>
      {/* `zodiac-names` is the server default because the symbols toggle starts
          OFF — first paint then matches the common case with no JS correction.
          _initZodiacMode (public/app-runtime.js) drops it for the minority who
          stored an explicit 'icon' preference. */}
      <body
        className="mode-couple zodiac-names"
        data-view="natal"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
