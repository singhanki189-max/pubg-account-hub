import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type PubgAccount = Tables<"pubg_accounts">;

type EventState = {
  krChecked: boolean;
  krPopularity: string;
  globalChecked: boolean;
  globalPopularity: string;
};

const defaultEventState: EventState = {
  krChecked: false,
  krPopularity: "",
  globalChecked: false,
  globalPopularity: "",
};

export const Route = createFileRoute("/event")({
  head: () => ({
    meta: [
      { title: "PUBG Event Popularity" },
      {
        name: "description",
        content:
          "Track PUBG KR and PUBG Mobile event popularity totals by Gmail account.",
      },
      { property: "og:title", content: "PUBG Event Popularity" },
      {
        property: "og:description",
        content:
          "Track PUBG KR and PUBG Mobile event popularity totals by Gmail account.",
      },
    ],
  }),
  component: EventPage,
});

function EventPage() {
  const [eventByAccount, setEventByAccount] = useState<Record<string, EventState>>({});

  const { data: accounts = [], isLoading, error } = useQuery({
    queryKey: ["pubg_accounts"],
    queryFn: async () => {
      const { data, error: dbError } = await supabase
        .from("pubg_accounts")
        .select("id, gmail, email_level, uc, cards, mix_pop, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (dbError) throw dbError;
      return data as PubgAccount[];
    },
  });

  const totals = useMemo(() => {
    let krTotal = 0;
    let globalTotal = 0;

    for (const account of accounts) {
      const eventState = eventByAccount[account.id] ?? defaultEventState;
      const parsedKr = Number(eventState.krPopularity || 0);
      const parsedGlobal = Number(eventState.globalPopularity || 0);

      if (eventState.krChecked && !Number.isNaN(parsedKr) && parsedKr >= 0) {
        krTotal += parsedKr;
      }

      if (eventState.globalChecked && !Number.isNaN(parsedGlobal) && parsedGlobal >= 0) {
        globalTotal += parsedGlobal;
      }
    }

    return {
      krTotal,
      globalTotal,
      overallTotal: krTotal + globalTotal,
    };
  }, [accounts, eventByAccount]);

  function getEventState(accountId: string) {
    return eventByAccount[accountId] ?? defaultEventState;
  }

  function updateEventState(accountId: string, patch: Partial<EventState>) {
    setEventByAccount((prev) => ({
      ...prev,
      [accountId]: {
        ...(prev[accountId] ?? defaultEventState),
        ...patch,
      },
    }));
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Event Popularity</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Mark account participation and enter popularity for KR and Global events.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/">Back</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-border bg-card p-4 text-sm">
            <p className="text-muted-foreground">Total popularity (KR + Global)</p>
            <p className="text-2xl font-semibold">{totals.overallTotal.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-border bg-card p-4 text-sm">
            <p className="text-muted-foreground">PUBG KR total</p>
            <p className="text-2xl font-semibold">{totals.krTotal.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-border bg-card p-4 text-sm">
            <p className="text-muted-foreground">PUBG Mobile total</p>
            <p className="text-2xl font-semibold">{totals.globalTotal.toLocaleString()}</p>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Account event details</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Each account has two sections: PUBG KR Event and PUBG Mobile Event.
          </p>

          {isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading accounts...</p> : null}
          {error ? <p className="mt-4 text-sm text-destructive">{error.message}</p> : null}

          {!isLoading && !error ? (
            <div className="mt-4 max-h-[650px] overflow-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gmail</TableHead>
                    <TableHead className="text-right">PUBG KR Event</TableHead>
                    <TableHead className="text-right">PUBG Mobile Event</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => {
                    const state = getEventState(account.id);

                    return (
                      <TableRow key={account.id}>
                        <TableCell>{account.gmail}</TableCell>

                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={state.krChecked}
                                onChange={(event) =>
                                  updateEventState(account.id, { krChecked: event.target.checked })
                                }
                              />
                              Check
                            </label>
                            <Input
                              className="w-32 text-right"
                              type="number"
                              min={0}
                              placeholder="Popularity"
                              value={state.krPopularity}
                              onChange={(event) =>
                                updateEventState(account.id, { krPopularity: event.target.value })
                              }
                            />
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={state.globalChecked}
                                onChange={(event) =>
                                  updateEventState(account.id, {
                                    globalChecked: event.target.checked,
                                  })
                                }
                              />
                              Check
                            </label>
                            <Input
                              className="w-32 text-right"
                              type="number"
                              min={0}
                              placeholder="Popularity"
                              value={state.globalPopularity}
                              onChange={(event) =>
                                updateEventState(account.id, {
                                  globalPopularity: event.target.value,
                                })
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
