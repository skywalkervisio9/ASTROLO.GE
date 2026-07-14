import SynastryPreviewClient from './SynastryPreviewClient';

export const metadata = {
  title: 'Synastry Opening — Preview',
};

// Dev preview of the redesigned synastry opening. Renders the real
// SynastryView with a sample reading; no auth, no data fetching.
export default function Page() {
  return <SynastryPreviewClient />;
}
