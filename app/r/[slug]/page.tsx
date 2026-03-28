import PublicReadingClient from "@/components/PublicReadingClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PublicReadingPage({ params }: Props) {
  const { slug } = await params;
  return <PublicReadingClient slug={slug} />;
}
