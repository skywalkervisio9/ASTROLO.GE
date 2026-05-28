"use client";

/**
 * Full-screen overlay that renders the two legal documents as in-app panels:
 *   - 'terms'   → combined Terms of Use & Privacy ("პირობები და კონფიდენციალობა")
 *   - 'payment' → Payment Terms ("გადახდის პირობები")
 *
 * Both language versions are present in the DOM; CSS toggles them off the
 * `body.lang-en` class (see .lg-ka / .lg-en rules in globals.css), so switching
 * the app language with the top-bar toggle updates the open document live.
 */
import { useEffect } from "react";

export type LegalDoc = "terms" | "payment" | null;

const CONTACT = "contact@astrolo.ge";
const UPDATED_KA = "ბოლო განახლება: 28.05.2026";
const UPDATED_EN = "Last updated: 28 May 2026";

export default function LegalOverlay({
  doc,
  onClose,
}: {
  doc: LegalDoc;
  onClose: () => void;
}) {
  const open = doc !== null;

  // Escape to close + lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <div
      className={"legal-overlay" + (open ? " active" : "")}
      onClick={onClose}
      aria-hidden={!open}
    >
      <div
        className="legal-card"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="legal-close" onClick={onClose} aria-label="Close / დახურვა">
          ✕
        </button>
        {doc === "terms" && <TermsDoc />}
        {doc === "payment" && <PaymentDoc />}
      </div>
    </div>
  );
}

/* ── Combined Terms of Use & Privacy ─────────────────────────────────────── */
function TermsDoc() {
  return (
    <div className="legal-doc">
      {/* ───── ქართული ───── */}
      <div className="lg-ka">
        <div className="legal-eyebrow">✦ სამართლებრივი</div>
        <h1>პირობები და კონფიდენციალობა</h1>
        <div className="legal-updated">{UPDATED_KA}</div>

        <p>
          მოგესალმებით ASTROLO.GE-ზე. წინამდებარე დოკუმენტი აერთიანებს სერვისით
          სარგებლობის პირობებსა და კონფიდენციალობის პოლიტიკას. ანგარიშის
          რეგისტრაციით ან სერვისის გამოყენებით თქვენ ეთანხმებით აქ აღწერილ წესებს.
          თუ არ ეთანხმებით, გთხოვთ, არ ისარგებლოთ სერვისით.
        </p>

        <h2>1. სერვისის აღწერა</h2>
        <p>
          ASTROLO.GE გთავაზობთ ასტროლოგიურ წაკითხვებს — ნატალურ რუკასა და
          თავსებადობის (სინასტრიის) ანალიზს, რომელიც გენერირდება თქვენ მიერ
          მოწოდებული დაბადების მონაცემების საფუძველზე, ავტომატური დამუშავების
          გზით. სერვისი განკუთვნილია თვითშემეცნებისა და გართობისთვის.
        </p>
        <p>
          წაკითხვების შინაარსი არ წარმოადგენს და ვერ ჩაანაცვლებს პროფესიულ
          რჩევას — სამედიცინო, ფსიქოლოგიურ, იურიდიულ თუ ფინანსურ. მნიშვნელოვანი
          გადაწყვეტილებების მიღებამდე მიმართეთ შესაბამის სპეციალისტს.
        </p>

        <h2>2. ანგარიში და რეგისტრაცია</h2>
        <ul>
          <li>რეგისტრაციისას მიუთითეთ ზუსტი და უტყუარი ინფორმაცია.</li>
          <li>
            თქვენ ხართ პასუხისმგებელი თქვენი ანგარიშისა და პაროლის
            კონფიდენციალობაზე, ასევე ანგარიშზე განხორციელებულ ნებისმიერ
            ქმედებაზე.
          </li>
          <li>
            სერვისი განკუთვნილია სრულწლოვანი მომხმარებლებისთვის. არასრულწლოვანმა
            სერვისით სარგებლობა შესაძლოა მხოლოდ მშობლის ან კანონიერი
            წარმომადგენლის თანხმობით.
          </li>
        </ul>

        <h2>3. მისაღები გამოყენება</h2>
        <p>
          აკრძალულია სერვისის გამოყენება უკანონო მიზნებისთვის, სხვისი უფლებების
          დარღვევით, სისტემაში უნებართვო წვდომის მცდელობით ან მისი
          ფუნქციონირების ხელის შეშლით. ვიტოვებთ უფლებას, შევზღუდოთ ან შევაჩეროთ
          ანგარიში ამ წესების დარღვევის შემთხვევაში.
        </p>

        <h2>4. ინტელექტუალური საკუთრება</h2>
        <p>
          სერვისის ფარგლებში გენერირებული ტექსტები, დიზაინი, გრაფიკა და
          პროგრამული უზრუნველყოფა წარმოადგენს ASTROLO.GE-ის ან მისი
          ლიცენზიარების საკუთრებას. პერსონალური წაკითხვის გამოყენება შეგიძლიათ
          პირადი, არაკომერციული მიზნებისთვის.
        </p>

        <h2>5. პასუხისმგებლობის შეზღუდვა</h2>
        <p>
          სერვისი მოწოდებულია არსებული სახით. ჩვენ ვცდილობთ მისი უწყვეტ და
          გამართულ მუშაობას, თუმცა არ ვიძლევით გარანტიას, რომ ის ყოველთვის
          იქნება ხელმისაწვდომი ან შეცდომებისგან თავისუფალი. კანონით ნებადართულ
          ფარგლებში, ASTROLO.GE არ აგებს პასუხს წაკითხვების შინაარსზე
          დაყრდნობით მიღებულ გადაწყვეტილებებზე.
        </p>

        <h2>6. კონფიდენციალობა — რა მონაცემებს ვაგროვებთ</h2>
        <ul>
          <li>
            <b>ანგარიშის მონაცემები:</b> სახელი და ელ-ფოსტა; Google-ით შესვლის
            შემთხვევაში — შესაბამისი ანგარიშის ძირითადი ინფორმაცია.
          </li>
          <li>
            <b>დაბადების მონაცემები:</b> თარიღი, დრო და ადგილი, რომელიც საჭიროა
            თქვენი რუკისა და წაკითხვის შესაქმნელად.
          </li>
          <li>
            <b>გადახდის მონაცემები:</b> ტრანზაქციის დასადასტურებლად საჭირო
            ინფორმაცია. ბარათის სრულ რეკვიზიტებს ჩვენ არ ვინახავთ — მათ ამუშავებს
            გადახდის პროვაიდერი.
          </li>
        </ul>

        <h2>7. რისთვის ვიყენებთ მონაცემებს</h2>
        <p>
          მონაცემებს ვიყენებთ თქვენი რუკისა და წაკითხვების გენერაციისთვის,
          ანგარიშის მართვისთვის, გადახდების დასამუშავებლად და სერვისის
          გასაუმჯობესებლად. დაბადების მონაცემები გამოიყენება მხოლოდ თქვენი
          პერსონალური ანალიზისთვის.
        </p>

        <h2>8. მონაცემთა გაზიარება</h2>
        <p>
          თქვენს მონაცემებს არ ვყიდით. მათ ვუზიარებთ მხოლოდ სანდო მომსახურების
          მომწოდებლებს — ჰოსტინგისა და მონაცემთა შენახვის, გადახდის დამუშავებისა
          და ავტომატური ანალიზისთვის — იმ მოცულობით, რაც აუცილებელია სერვისის
          ფუნქციონირებისთვის. შესაძლოა მონაცემთა გამხელა მოვითხოვოთ კანონის ან
          უფლებამოსილი ორგანოს მოთხოვნის შემთხვევაშიც.
        </p>

        <h2>9. შენახვა და უსაფრთხოება</h2>
        <p>
          მონაცემებს ვინახავთ მანამ, სანამ თქვენი ანგარიში აქტიურია ან სანამ ეს
          საჭიროა სერვისის გასაწევად. ვიყენებთ გონივრულ ტექნიკურ და
          ორგანიზაციულ ზომებს მათ დასაცავად.
        </p>

        <h2>10. თქვენი უფლებები</h2>
        <p>
          თქვენ გაქვთ უფლება, იხილოთ, შეასწოროთ ან წაშალოთ თქვენი მონაცემები.
          ანგარიშის წაშლა შესაძლებელია პარამეტრებიდან ან მოგვწერეთ მისამართზე{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. ანგარიშის წაშლისას
          იშლება მასთან დაკავშირებული პერსონალური მონაცემებიც.
        </p>

        <h2>11. ქუქი-ფაილები</h2>
        <p>
          ვიყენებთ მხოლოდ აუცილებელ (ფუნქციურ) ქუქი-ფაილებს, რომლებიც საჭიროა
          სესიისა და ავტორიზაციის შესანარჩუნებლად.
        </p>

        <h2>12. ცვლილებები</h2>
        <p>
          შესაძლოა პერიოდულად განვაახლოთ ეს პირობები. არსებითი ცვლილების
          შემთხვევაში გაცნობებთ. სერვისით სარგებლობის გაგრძელება ცვლილების
          ძალაში შესვლის შემდეგ ნიშნავს მათ მიღებას.
        </p>

        <h2>13. კონტაქტი</h2>
        <p>
          კითხვების შემთხვევაში დაგვიკავშირდით:{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. სერვისი იმართება
          საქართველოს კანონმდებლობის შესაბამისად.
        </p>
      </div>

      {/* ───── English ───── */}
      <div className="lg-en">
        <div className="legal-eyebrow">✦ Legal</div>
        <h1>Terms &amp; Privacy</h1>
        <div className="legal-updated">{UPDATED_EN}</div>

        <p>
          Welcome to ASTROLO.GE. This document combines our Terms of Use and our
          Privacy Policy. By creating an account or using the service, you agree
          to the terms described here. If you do not agree, please do not use the
          service.
        </p>

        <h2>1. About the service</h2>
        <p>
          ASTROLO.GE offers astrological readings — natal charts and compatibility
          (synastry) analysis — generated through automated processing of the
          birth details you provide. The service is intended for self-reflection
          and entertainment.
        </p>
        <p>
          The content of the readings is not, and cannot replace, professional
          advice — medical, psychological, legal, or financial. Please consult a
          qualified professional before making important decisions.
        </p>

        <h2>2. Account &amp; registration</h2>
        <ul>
          <li>Provide accurate and truthful information when registering.</li>
          <li>
            You are responsible for keeping your account and password
            confidential, and for any activity that occurs under your account.
          </li>
          <li>
            The service is intended for adults. Minors may use it only with the
            consent of a parent or legal guardian.
          </li>
        </ul>

        <h2>3. Acceptable use</h2>
        <p>
          You may not use the service for unlawful purposes, to infringe the
          rights of others, to attempt unauthorized access, or to disrupt its
          operation. We reserve the right to limit or suspend an account that
          breaches these terms.
        </p>

        <h2>4. Intellectual property</h2>
        <p>
          The text, design, graphics, and software within the service are the
          property of ASTROLO.GE or its licensors. You may use your personal
          reading for private, non-commercial purposes.
        </p>

        <h2>5. Limitation of liability</h2>
        <p>
          The service is provided "as is." We strive to keep it running smoothly,
          but we do not guarantee that it will always be available or error-free.
          To the extent permitted by law, ASTROLO.GE is not liable for decisions
          made in reliance on the readings.
        </p>

        <h2>6. Privacy — what data we collect</h2>
        <ul>
          <li>
            <b>Account data:</b> your name and email; if you sign in with Google,
            the basic information from that account.
          </li>
          <li>
            <b>Birth data:</b> the date, time, and place needed to create your
            chart and reading.
          </li>
          <li>
            <b>Payment data:</b> the information needed to confirm a transaction.
            We do not store full card details — these are handled by the payment
            provider.
          </li>
        </ul>

        <h2>7. How we use data</h2>
        <p>
          We use your data to generate your chart and readings, manage your
          account, process payments, and improve the service. Birth data is used
          solely for your personal analysis.
        </p>

        <h2>8. Sharing of data</h2>
        <p>
          We do not sell your data. We share it only with trusted service
          providers — for hosting and data storage, payment processing, and
          automated analysis — and only to the extent needed to run the service.
          We may also disclose data where required by law or a competent
          authority.
        </p>

        <h2>9. Retention &amp; security</h2>
        <p>
          We keep your data for as long as your account is active or as needed to
          provide the service, and we apply reasonable technical and
          organizational measures to protect it.
        </p>

        <h2>10. Your rights</h2>
        <p>
          You have the right to access, correct, or delete your data. You can
          delete your account from settings or write to us at{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Deleting your account also
          deletes the personal data associated with it.
        </p>

        <h2>11. Cookies</h2>
        <p>
          We use only essential (functional) cookies, needed to maintain your
          session and authentication.
        </p>

        <h2>12. Changes</h2>
        <p>
          We may update these terms from time to time. We will notify you of
          material changes. Continued use of the service after a change takes
          effect means you accept it.
        </p>

        <h2>13. Contact</h2>
        <p>
          For any questions, contact us at{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. The service operates in
          accordance with the laws of Georgia.
        </p>
      </div>
    </div>
  );
}

/* ── Payment Terms ───────────────────────────────────────────────────────── */
function PaymentDoc() {
  return (
    <div className="legal-doc">
      {/* ───── ქართული ───── */}
      <div className="lg-ka">
        <div className="legal-eyebrow">✦ გადახდა</div>
        <h1>გადახდის პირობები</h1>
        <div className="legal-updated">{UPDATED_KA}</div>

        <p>
          ეს დოკუმენტი აღწერს ASTROLO.GE-ზე გადახდის, მიწოდებისა და თანხის
          დაბრუნების წესებს. გადახდის განხორციელებით თქვენ ეთანხმებით ამ
          პირობებს.
        </p>

        <h2>1. ფასები</h2>
        <ul>
          <li>
            <b>PREMIUM-ის განბლოკვა — ₾10:</b> ერთჯერადი გადახდა, რომელიც ხსნის
            სრულ ვარსკვლავურ წაკითხვას (ყველა სექცია), სინასტრიის წვდომასა და
            მოწვევის საშუალებას.
          </li>
          <li>
            <b>დამატებითი სინასტრიის სლოტი — ₾5:</b> ერთჯერადი გადახდა ახალი
            თავსებადობის ანალიზის გასახსნელად.
          </li>
        </ul>
        <p>ფასები მითითებულია ქართულ ლარში (₾) და მოიცავს გადასახადებს.</p>

        <h2>2. ერთჯერადი გადახდა</h2>
        <p>
          გადახდები ერთჯერადია. ეს არ არის გამოწერა (სუბსკრიფცია) — არ ხდება
          ავტომატური განმეორებითი ჩამოჭრა. PREMIUM-ის განბლოკვა მუდმივ წვდომას
          გაძლევთ შესაბამის შინაარსზე.
        </p>

        <h2>3. გადახდის მეთოდები</h2>
        <p>
          გადახდა მიიღება საქართველოს ბანკის (BOG) და თიბისის (TBC) მეშვეობით —
          Visa, Mastercard, American Express ან QR. ტრანზაქციას უსაფრთხოდ
          ამუშავებს შესაბამისი ბანკი; ბარათის სრულ რეკვიზიტებს ASTROLO.GE არ
          ინახავს.
        </p>

        <h2>4. ფასდაკლების კოდები</h2>
        <p>
          მოქმედი ფასდაკლების კოდის შეყვანისას ფასი ავტომატურად შემცირდება ან,
          შესაბამის შემთხვევაში, წვდომა უფასოდ გაიხსნება. კოდები შესაძლოა იყოს
          დროებითი ან გამოყენების ლიმიტით შეზღუდული.
        </p>

        <h2>5. სერვისის მიწოდება</h2>
        <p>
          ეს ციფრული პროდუქტია. წარმატებული გადახდის შემდეგ შინაარსი
          ავტომატურად და დაუყოვნებლივ იხსნება თქვენს ანგარიშზე. ცალკე ფიზიკური
          მიწოდება არ ხდება.
        </p>

        <h2>6. თანხის დაბრუნება</h2>
        <p>
          ვინაიდან წაკითხვა პერსონალური ციფრული პროდუქტია და გენერირდება
          გადახდისთანავე, დაბრუნება განიხილება ინდივიდუალურად. თუ მიგაჩნიათ, რომ
          გადახდა არასწორად განხორციელდა, დაგეკისრათ ორმაგი თანხა, შინაარსი არ
          მოგეწოდათ ან ტექნიკურმა ხარვეზმა ხელი შეგიშალათ წვდომაში — მოგვწერეთ
          მისამართზე <a href={`mailto:${CONTACT}`}>{CONTACT}</a> და გთხოვთ,
          მიუთითოთ პრობლემის აღწერა. თითოეულ მოთხოვნას სამართლიანად განვიხილავთ
          და გადავწყვეტთ — თანხის დაბრუნებით ან ხარვეზის გამოსწორებით.
        </p>

        <h2>7. ტექნიკური ხარვეზები</h2>
        <p>
          თუ წაკითხვის გენერაცია ვერ დასრულდა ტექნიკური მიზეზით, შევეცდებით მის
          ხელახლა გენერაციას ან დაგეხმარებით წვდომის აღდგენაში დამატებითი
          გადახდის გარეშე.
        </p>

        <h2>8. ფასის ცვლილება</h2>
        <p>
          ვიტოვებთ ფასების ცვლილების უფლებას. ფასის ცვლილება არ ეხება უკვე
          განხორციელებულ გადახდასა და უკვე გახსნილ წვდომას.
        </p>

        <h2>9. კონტაქტი</h2>
        <p>
          გადახდასთან დაკავშირებული ნებისმიერი საკითხისთვის დაგვიკავშირდით:{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </div>

      {/* ───── English ───── */}
      <div className="lg-en">
        <div className="legal-eyebrow">✦ Payment</div>
        <h1>Payment Terms</h1>
        <div className="legal-updated">{UPDATED_EN}</div>

        <p>
          This document describes how payments, delivery, and refunds work on
          ASTROLO.GE. By making a payment, you agree to these terms.
        </p>

        <h2>1. Prices</h2>
        <ul>
          <li>
            <b>Unlock PREMIUM — ₾10:</b> a one-time payment that unlocks the full
            reading (all sections), synastry access, and the ability to invite
            others.
          </li>
          <li>
            <b>Extra synastry slot — ₾5:</b> a one-time payment to unlock an
            additional compatibility analysis.
          </li>
        </ul>
        <p>Prices are shown in Georgian Lari (₾) and include applicable taxes.</p>

        <h2>2. One-time payment</h2>
        <p>
          Payments are one-time. This is not a subscription — there are no
          automatic recurring charges. Unlocking PREMIUM gives you lasting access
          to the corresponding content.
        </p>

        <h2>3. Payment methods</h2>
        <p>
          Payments are accepted through Bank of Georgia (BOG) and TBC Bank — Visa,
          Mastercard, American Express, or QR. The transaction is processed
          securely by the respective bank; ASTROLO.GE does not store full card
          details.
        </p>

        <h2>4. Promo codes</h2>
        <p>
          Entering a valid promo code automatically reduces the price or, where
          applicable, unlocks access for free. Codes may be temporary or limited
          by usage.
        </p>

        <h2>5. Delivery of the service</h2>
        <p>
          This is a digital product. After a successful payment, the content
          unlocks automatically and immediately in your account. There is no
          separate physical delivery.
        </p>

        <h2>6. Refunds</h2>
        <p>
          Because a reading is a personalized digital product generated right
          after payment, refunds are reviewed on a case-by-case basis. If you
          believe a payment was made in error, you were charged twice, the
          content was not delivered, or a technical fault prevented access, write
          to us at <a href={`mailto:${CONTACT}`}>{CONTACT}</a> with a description
          of the problem. We will review each request fairly and resolve it —
          either with a refund or by fixing the issue.
        </p>

        <h2>7. Technical failures</h2>
        <p>
          If a reading could not be generated due to a technical issue, we will
          try to regenerate it or help you restore access at no extra charge.
        </p>

        <h2>8. Price changes</h2>
        <p>
          We reserve the right to change prices. A price change does not affect a
          payment already made or access already unlocked.
        </p>

        <h2>9. Contact</h2>
        <p>
          For any payment-related question, contact us at{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </div>
    </div>
  );
}
