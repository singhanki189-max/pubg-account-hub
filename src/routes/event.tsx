import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type PubgAccount = Tables<"pubg_accounts">;
type PubgEvent = Tables<"pubg_events">;
type EventPopularityRow = Tables<"pubg_event_account_popularity">;

type EventDraft = {
  krChecked: boolean;
  krPopularity: string;
  globalChecked: boolean;
  globalPopularity: string;
  spentPopularity: string;
};

const nonNegativeNumberSchema = z.number().int().min(0).max(1_000_000_000);

const defaultEventDraft: EventDraft = {
  krChecked: false,
  krPopularity: "",
  globalChecked: false,
  globalPopularity: "",
  spentPopularity: "0",
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
  const queryClient = useQueryClient();
  const [newEventName, setNewEventName] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [draftByAccount, setDraftByAccount] = useState<Record<string, EventDraft>>({});

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

  const { data: events = [], isLoading: isLoadingEvents, error: eventsError } = useQuery({
    queryKey: ["pubg_events"],
    queryFn: async () => {
      const { data, error: dbError } = await supabase
        .from("pubg_events")
        .select("id, name, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (dbError) throw dbError;
      return data as PubgEvent[];
    },
  });

  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const {
    data: savedRows = [],
    isLoading: isLoadingRows,
    error: savedRowsError,
    refetch: refetchSavedRows,
  } = useQuery({
    queryKey: ["pubg_event_rows", selectedEventId],
    enabled: Boolean(selectedEventId),
    queryFn: async () => {
      if (!selectedEventId) return [];

      const { data, error: dbError } = await supabase
        .from("pubg_event_account_popularity")
        .select(
          "id, event_id, account_id, kr_popularity, global_popularity, spent_popularity, created_at, updated_at",
        )
        .eq("event_id", selectedEventId);

      if (dbError) throw dbError;
      return data as EventPopularityRow[];
    },
  });

  const {
    data: allEventRows = [],
    isLoading: isLoadingAllEventRows,
    error: allEventRowsError,
  } = useQuery({
    queryKey: ["pubg_event_rows_all_accounts"],
    queryFn: async () => {
      const { data, error: dbError } = await supabase
        .from("pubg_event_account_popularity")
        .select("account_id, kr_popularity, global_popularity, spent_popularity");

      if (dbError) throw dbError;
      return data as Pick<
        EventPopularityRow,
        "account_id" | "kr_popularity" | "global_popularity" | "spent_popularity"
      >[];
    },
  });

  const savedByAccount = useMemo(() => {
    const map = new Map<string, EventPopularityRow>();

    for (const row of savedRows) {
      map.set(row.account_id, row);
    }

    return map;
  }, [savedRows]);

  useEffect(() => {
    if (!selectedEventId) {
      setDraftByAccount({});
      return;
    }

    const nextDraft: Record<string, EventDraft> = {};

    for (const account of accounts) {
      const row = savedByAccount.get(account.id);
      const krValue = row ? String(row.kr_popularity) : "";
      const globalValue = row ? String(row.global_popularity) : "";
      const spentValue = row ? String(row.spent_popularity) : "0";

      nextDraft[account.id] = {
        krChecked: row ? row.kr_popularity > 0 : false,
        krPopularity: row ? (row.kr_popularity > 0 ? krValue : "") : "",
        globalChecked: row ? row.global_popularity > 0 : false,
        globalPopularity: row ? (row.global_popularity > 0 ? globalValue : "") : "",
        spentPopularity: spentValue,
      };
    }

    setDraftByAccount(nextDraft);
  }, [accounts, savedByAccount, selectedEventId]);

  const createEventMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = newEventName.trim();
      if (!trimmedName) throw new Error("Please enter an event name.");

      const { data, error: dbError } = await supabase
        .from("pubg_events")
        .insert({ name: trimmedName })
        .select("id, name, created_at, updated_at")
        .single();

      if (dbError) throw dbError;
      return data as PubgEvent;
    },
    onSuccess: (createdEvent) => {
      setNewEventName("");
      setSelectedEventId(createdEvent.id);
      queryClient.invalidateQueries({ queryKey: ["pubg_events"] });
    },
  });

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEventId) throw new Error("Please create or select an event first.");

      const upsertRows = accounts.map((account) => {
        const draft = draftByAccount[account.id] ?? defaultEventDraft;
        const rawKr = draft.krChecked ? Number(draft.krPopularity || 0) : 0;
        const rawGlobal = draft.globalChecked ? Number(draft.globalPopularity || 0) : 0;
        const rawSpent = Number(draft.spentPopularity || 0);

        const krPopularity = nonNegativeNumberSchema.parse(rawKr);
        const globalPopularity = nonNegativeNumberSchema.parse(rawGlobal);
        const spentPopularity = nonNegativeNumberSchema.parse(rawSpent);

        if (spentPopularity > krPopularity + globalPopularity) {
          throw new Error(
            `Spent popularity is higher than total collected for ${account.gmail}.`,
          );
        }

        return {
          event_id: selectedEventId,
          account_id: account.id,
          kr_popularity: krPopularity,
          global_popularity: globalPopularity,
          spent_popularity: spentPopularity,
        };
      });

      const { error: dbError } = await supabase
        .from("pubg_event_account_popularity")
        .upsert(upsertRows, { onConflict: "event_id,account_id" });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pubg_event_rows", selectedEventId] });
    },
  });

  const totals = useMemo(() => {
    let krTotal = 0;
    let globalTotal = 0;
    let spentTotal = 0;
    let availableTotal = 0;

    for (const account of accounts) {
      const draft = draftByAccount[account.id] ?? defaultEventDraft;
      const parsedKr = draft.krChecked ? Number(draft.krPopularity || 0) : 0;
      const parsedGlobal = draft.globalChecked ? Number(draft.globalPopularity || 0) : 0;
      const parsedSpent = Number(draft.spentPopularity || 0);

      if (!Number.isNaN(parsedKr) && parsedKr >= 0) {
        krTotal += parsedKr;
      }

      if (!Number.isNaN(parsedGlobal) && parsedGlobal >= 0) {
        globalTotal += parsedGlobal;
      }

      if (!Number.isNaN(parsedSpent) && parsedSpent >= 0) {
        spentTotal += parsedSpent;
      }

      if (
        !Number.isNaN(parsedKr) &&
        parsedKr >= 0 &&
        !Number.isNaN(parsedGlobal) &&
        parsedGlobal >= 0 &&
        !Number.isNaN(parsedSpent) &&
        parsedSpent >= 0
      ) {
        availableTotal += Math.max(parsedKr + parsedGlobal - parsedSpent, 0);
      }
    }

    return {
      krTotal,
      globalTotal,
      spentTotal,
      availableTotal,
      overallTotal: krTotal + globalTotal,
    };
  }, [accounts, draftByAccount]);

  const availableAcrossAllEventsByAccount = useMemo(() => {
    const map = new Map<string, number>();

    for (const row of allEventRows) {
      const available = Math.max(
        (row.kr_popularity ?? 0) + (row.global_popularity ?? 0) - (row.spent_popularity ?? 0),
        0,
      );
      map.set(row.account_id, (map.get(row.account_id) ?? 0) + available);
    }

    return map;
  }, [allEventRows]);

  const totalAvailableAcrossAllEvents = useMemo(
    () => Array.from(availableAcrossAllEventsByAccount.values()).reduce((sum, value) => sum + value, 0),
    [availableAcrossAllEventsByAccount],
  );

  function getDraft(accountId: string) {
    return draftByAccount[accountId] ?? defaultEventDraft;
  }

  function updateDraft(accountId: string, patch: Partial<EventDraft>) {
    setDraftByAccount((prev) => ({
      ...prev,
      [accountId]: {
        ...(prev[accountId] ?? defaultEventDraft),
        ...patch,
      },
    }));
  }

  async function handleRefreshAll() {
    await refetchSavedRows();
    saveAllMutation.reset();
  }

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const createEventError = createEventMutation.error?.message;
  const saveAllError = saveAllMutation.error?.message;

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Event Popularity</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Create an event, save all account popularity, and track used popularity by account.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/">Back</Link>
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Event setup</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              value={newEventName}
              onChange={(event) => setNewEventName(event.target.value)}
              placeholder="Write event name"
            />
            <Button
              onClick={() => createEventMutation.mutate()}
              disabled={createEventMutation.isPending || !newEventName.trim()}
            >
              {createEventMutation.isPending ? "Creating..." : "Create event"}
            </Button>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={selectedEventId}
              onChange={(event) => setSelectedEventId(event.target.value)}
            >
              <option value="">Select event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>

            <Button
              onClick={() => saveAllMutation.mutate()}
              disabled={!selectedEventId || saveAllMutation.isPending || accounts.length === 0}
            >
              {saveAllMutation.isPending ? "Saving..." : "Save all"}
            </Button>

            <Button
              variant="outline"
              onClick={handleRefreshAll}
              disabled={!selectedEventId || isLoadingRows}
            >
              Refresh all
            </Button>
          </div>

          {isLoadingEvents ? <p className="mt-3 text-sm text-muted-foreground">Loading events...</p> : null}
          {eventsError ? <p className="mt-3 text-sm text-destructive">{eventsError.message}</p> : null}
          {createEventError ? <p className="mt-3 text-sm text-destructive">{createEventError}</p> : null}
          {saveAllError ? <p className="mt-3 text-sm text-destructive">{saveAllError}</p> : null}

          <p className="mt-3 text-sm text-muted-foreground">
            {selectedEvent
              ? `Selected: ${selectedEvent.name}. Saved values stay until you change them and click Save all.`
              : "Create or select an event to start entering popularity."}
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-5">
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
          <div className="rounded-md border border-border bg-card p-4 text-sm">
            <p className="text-muted-foreground">Sent popularity</p>
            <p className="text-2xl font-semibold">{totals.spentTotal.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-border bg-card p-4 text-sm">
            <p className="text-muted-foreground">Available popularity</p>
            <p className="text-2xl font-semibold">{totals.availableTotal.toLocaleString()}</p>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4 text-sm">
          <p className="text-muted-foreground">Stored available popularity (all events)</p>
          <p className="text-2xl font-semibold">{totalAvailableAcrossAllEvents.toLocaleString()}</p>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Account event details</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter collected popularity and how much you sent from each Gmail ID.
          </p>

          {isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading accounts...</p> : null}
          {error ? <p className="mt-4 text-sm text-destructive">{error.message}</p> : null}
          {savedRowsError ? <p className="mt-4 text-sm text-destructive">{savedRowsError.message}</p> : null}
          {allEventRowsError ? (
            <p className="mt-4 text-sm text-destructive">{allEventRowsError.message}</p>
          ) : null}
          {isLoadingRows ? <p className="mt-4 text-sm text-muted-foreground">Loading saved event data...</p> : null}
          {isLoadingAllEventRows ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading all-event availability...</p>
          ) : null}

          {!isLoading && !error ? (
            <div className="mt-4 max-h-[650px] overflow-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gmail</TableHead>
                    <TableHead className="text-right">PUBG KR Event</TableHead>
                    <TableHead className="text-right">PUBG Mobile Event</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Available (All Events)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => {
                    const draft = getDraft(account.id);
                    const parsedKr = draft.krChecked ? Number(draft.krPopularity || 0) : 0;
                    const parsedGlobal = draft.globalChecked ? Number(draft.globalPopularity || 0) : 0;
                    const parsedSpent = Number(draft.spentPopularity || 0);
                    const availablePopularity =
                      Number.isNaN(parsedKr) || Number.isNaN(parsedGlobal) || Number.isNaN(parsedSpent)
                        ? 0
                        : Math.max(parsedKr + parsedGlobal - parsedSpent, 0);
                    const availableAcrossAllEvents =
                      availableAcrossAllEventsByAccount.get(account.id) ?? 0;

                    return (
                      <TableRow key={account.id}>
                        <TableCell>{account.gmail}</TableCell>

                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={draft.krChecked}
                                onChange={(event) =>
                                  updateDraft(account.id, { krChecked: event.target.checked })
                                }
                                disabled={!selectedEventId}
                              />
                              Check
                            </label>
                            <Input
                              className="w-32 text-right"
                              type="number"
                              min={0}
                              placeholder="Popularity"
                              value={draft.krPopularity}
                              onChange={(event) =>
                                updateDraft(account.id, { krPopularity: event.target.value })
                              }
                              disabled={!selectedEventId || !draft.krChecked}
                            />
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={draft.globalChecked}
                                onChange={(event) =>
                                  updateDraft(account.id, {
                                    globalChecked: event.target.checked,
                                  })
                                }
                                disabled={!selectedEventId}
                              />
                              Check
                            </label>
                            <Input
                              className="w-32 text-right"
                              type="number"
                              min={0}
                              placeholder="Popularity"
                              value={draft.globalPopularity}
                              onChange={(event) =>
                                updateDraft(account.id, {
                                  globalPopularity: event.target.value,
                                })
                              }
                              disabled={!selectedEventId || !draft.globalChecked}
                            />
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex justify-end">
                            <Input
                              className="w-28 text-right"
                              type="number"
                              min={0}
                              placeholder="Used"
                              value={draft.spentPopularity}
                              onChange={(event) =>
                                updateDraft(account.id, { spentPopularity: event.target.value })
                              }
                              disabled={!selectedEventId}
                            />
                          </div>
                        </TableCell>

                        <TableCell className="text-right font-medium">
                          {availablePopularity.toLocaleString()}
                        </TableCell>

                        <TableCell className="text-right font-medium">
                          {availableAcrossAllEvents.toLocaleString()}
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
