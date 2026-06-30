import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import pubgHeroBg from "@/assets/pubg-hero-bg.png.asset.json";

export const Route = createFileRoute("/order")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
  },
  head: () => ({
    meta: [{ title: "Order | PUBG Account Manager" }],
  }),
  component: OrderPage,
});

function OrderPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div
      className="min-h-screen premium-page-bg px-4 py-8 text-foreground"
      style={{ ["--pubg-bg-image" as string]: `url(${pubgHeroBg.url})` }}
    >
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="premium-surface rounded-lg border p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Order</h1>
              <p className="mt-2 text-sm text-muted-foreground">Your order page is ready.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/">Home</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/event" search={{ mode: "kr" }}>
                  PUBG KR Event
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/event" search={{ mode: "global" }}>
                  PUBG Global Event
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/sales">Sales</Link>
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                Logout
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}