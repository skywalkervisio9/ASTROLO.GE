import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import PrototypeClient from "@/components/PrototypeClient";

// Unauthenticated visitors are redirected to /auth on the server so they
// never see the prototype shell flash. Authenticated users still get the
// client; AuthBridge handles their per-state redirect (reading / loading /
// birth form). Sending them to /auth here would trigger AuthBridge's
// "signed-in on /auth → sign out" guard.
export default async function Home() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  return <PrototypeClient />;
}
