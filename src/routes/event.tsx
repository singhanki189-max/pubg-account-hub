import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import pubgHeroBg from "@/assets/pubg-hero-bg.png.asset.json";

type PubgAccount = Tables<"pubg_accounts">;
type PubgEvent = Tables<"pubg_events">;
type EventPopularityRow = Tables<"pubg_event_account_popularity">;
type EventMode = "kr" | "global";

type EventDraft = {
  krChecked: boolean;
  krPopularity: string;
  globalChecked: boolean;
  globalPopularity: string;
  krSpentPopularity: string;
  globalSpentPopularity: string;
};

const nonNegativeNumberSchema = z.number().int().min(0).max(1_000_000_000);

const defaultEventDraft: EventDraft = {
  krChecked: false,
  krPopularity: "",
  globalChecked: false,
  globalPopularity: "",
  krSpentPopularity: "0",
  globalSpentPopularity: "0",
};

export const Route = createFileRoute("/event")({
  validateSearch: z.object({
    mode: z.enum(["kr", "global"]).optional(),
  }),
  head: () => ({
    meta: [
      { title: "PUBG Event Popularity" },
      {
        name: "description",
        content: "Track PUBG KR and PUBG Global events separately by Gmail account.",
      },
      { property: "og:title", content: "PUBG Event Popularity" },
      {
        property: "og:description",
        content: "Track PUBG KR and PUBG Global events separately by Gmail account.",
      },
    ],
  }),
  component: EventPage,
});

function EventPage() {
  const { mode = "kr" } = Route.useSearch();
  const isKrMode = mode === "kr";
  const modeLabel = isKrMode ? "PUBG KR" : "PUBG Global";
  const queryClient = useQueryClient();
  const [newEventName, setNewEventName] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [editEventName, setEditEventName] = useState("");
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

  const {
    data: events = [],
    isLoading: isLoadingEvents,
    error: eventsError,
  } = useQuery({
    queryKey: ["pubg_events", mode],
    queryFn: async () => {
      const { data, error: dbError } = await supabase
        .from("pubg_events")
        .select("id, name, created_at, updated_at")
        .eq("mode", mode)
        .order("created_at", { ascending: false });

      if (dbError) throw dbError;
      return data as PubgEvent[];
    },
  });

  useEffect(() => {
    if (events.length === 0) {
      if (selectedEventId) setSelectedEventId("");
      return;
    }

    const hasSelectedInCurrentMode = events.some((event) => event.id === selectedEventId);
    if (!hasSelectedInCurrentMode) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    const selected = events.find((event) => event.id === selectedEventId);
    const nextName = selected?.name ?? "";
    setEditEventName((prev) => (prev === nextName ? prev : nextName));
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
          "id, event_id, account_id, kr_popularity, global_popularity, spent_popularity, kr_spent_popularity, global_spent_popularity, created_at, updated_at",
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
        .select(
          "event_id, account_id, kr_popularity, global_popularity, spent_popularity, kr_spent_popularity, global_spent_popularity",
        );

      if (dbError) throw dbError;
      return data as Pick<
        EventPopularityRow,
        | "event_id"
        | "account_id"
        | "kr_popularity"
        | "global_popularity"
        | "spent_popularity"
        | "kr_spent_popularity"
        | "global_spent_popularity"
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
      nextDraft[account.id] = {
        krChecked: row ? row.kr_popularity > 0 : false,
        krPopularity: row ? (row.kr_popularity > 0 ? String(row.kr_popularity) : "") : "",
        globalChecked: row ? row.global_popularity > 0 : false,
        globalPopularity: row ? (row.global_popularity > 0 ? String(row.global_popularity) : "") : "",
        krSpentPopularity: row ? String(row.kr_spent_popularity ?? 0) : "0",
        globalSpentPopularity: row ? String(row.global_spent_popularity ?? 0) : "0",
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
        .insert({ name: trimmedName, mode })
        .select("id, name, created_at, updated_at")
        .single();

      if (dbError) throw dbError;
      return data as PubgEvent;
    },
    onSuccess: (createdEvent) => {
      setNewEventName("");
      setSelectedEventId(createdEvent.id);
      queryClient.invalidateQueries({ queryKey: ["pubg_events", mode] });
    },
  });

  const updateEventNameMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = editEventName.trim();
      if (!selectedEventId) throw new Error("Please select an event first.");
      if (!trimmedName) throw new Error("Please enter an event name.");

      const { error: dbError } = await supabase
        .from("pubg_events")
        .update({ name: trimmedName })
        .eq("id", selectedEventId);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pubg_events", mode] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEventId) throw new Error("Please select an event first.");

      const { error: rowsDeleteError } = await supabase
        .from("pubg_event_account_popularity")
        .delete()
        .eq("event_id", selectedEventId);

      if (rowsDeleteError) throw rowsDeleteError;

      const { error: eventDeleteError } = await supabase
        .from("pubg_events")
        .delete()
        .eq("id", selectedEventId);

      if (eventDeleteError) throw eventDeleteError;
    },
    onSuccess: () => {
      setSelectedEventId("");
      setEditEventName("");
      queryClient.invalidateQueries({ queryKey: ["pubg_events", mode] });
      queryClient.invalidateQueries({ queryKey: ["pubg_event_rows"] });
      queryClient.invalidateQueries({ queryKey: ["pubg_event_rows_all_accounts"] });
    },
  });

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEventId) throw new Error("Please create or select an event first.");

      const upsertRows = accounts.map((account) => {
        const draft = draftByAccount[account.id] ?? defaultEventDraft;
        const rawKr = draft.krChecked ? Number(draft.krPopularity || 0) : 0;
        const rawGlobal = draft.globalChecked ? Number(draft.globalPopularity || 0) : 0;
        const rawKrSpent = Number(draft.krSpentPopularity || 0);
        const rawGlobalSpent = Number(draft.globalSpentPopularity || 0);

        const krPopularity = nonNegativeNumberSchema.parse(rawKr);
        const globalPopularity = nonNegativeNumberSchema.parse(rawGlobal);
        const krSpentPopularity = nonNegativeNumberSchema.parse(rawKrSpent);
        const globalSpentPopularity = nonNegativeNumberSchema.parse(rawGlobalSpent);

        if (krSpentPopularity > krPopularity) {
          throw new Error(`KR sent popularity is higher than KR collected for ${account.gmail}.`);
        }

        if (globalSpentPopularity > globalPopularity) {
          throw new Error(
            `Global sent popularity is higher than Global collected for ${account.gmail}.`,
          );
        }

        return {
          event_id: selectedEventId,
          account_id: account.id,
          kr_popularity: krPopularity,
          global_popularity: globalPopularity,
          kr_spent_popularity: krSpentPopularity,
          global_spent_popularity: globalSpentPopularity,
          spent_popularity: krSpentPopularity + globalSpentPopularity,
        };
      });

      const { error: dbError } = await supabase
        .from("pubg_event_account_popularity")
        .upsert(upsertRows, { onConflict: "event_id,account_id" });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pubg_event_rows", selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ["pubg_event_rows_all_accounts"] });
    },
  });

  const totals = useMemo(() => {
    let collectedTotal = 0;
    let sentTotal = 0;
    let availableTotal = 0;

    for (const account of accounts) {
      const draft = draftByAccount[account.id] ?? defaultEventDraft;
      const collected = isKrMode
        ? draft.krChecked
          ? Number(draft.krPopularity || 0)
          : 0
        : draft.globalChecked
          ? Number(draft.globalPopularity || 0)
          : 0;
      const sent = isKrMode
        ? Number(draft.krSpentPopularity || 0)
        : Number(draft.globalSpentPopularity || 0);

      if (!Number.isNaN(collected) && collected >= 0) {
        collectedTotal += collected;
      }

      if (!Number.isNaN(sent) && sent >= 0) {
        sentTotal += sent;
      }

      if (!Number.isNaN(collected) && collected >= 0 && !Number.isNaN(sent) && sent >= 0) {
        availableTotal += Math.max(collected - sent, 0);
      }
    }

    return { collectedTotal, sentTotal, availableTotal };
  }, [accounts, draftByAccount, isKrMode]);

  const availableAcrossAllEventsByAccount = useMemo(() => {
    const map = new Map<string, number>();

    for (const row of allEventRows) {
      const collected = isKrMode ? (row.kr_popularity ?? 0) : (row.global_popularity ?? 0);
      const sent = isKrMode ? (row.kr_spent_popularity ?? 0) : (row.global_spent_popularity ?? 0);
      map.set(row.account_id, (map.get(row.account_id) ?? 0) + Math.max(collected - sent, 0));
    }

    if (!selectedEventId) {
      return map;
    }

    for (const account of accounts) {
      const savedSelectedRow = savedByAccount.get(account.id);
      const savedCollected = savedSelectedRow
        ? isKrMode
          ? (savedSelectedRow.kr_popularity ?? 0)
          : (savedSelectedRow.global_popularity ?? 0)
        : 0;
      const savedSent = savedSelectedRow
        ? isKrMode
          ? (savedSelectedRow.kr_spent_popularity ?? 0)
          : (savedSelectedRow.global_spent_popularity ?? 0)
        : 0;
      const savedAvailable = Math.max(savedCollected - savedSent, 0);

      const draft = draftByAccount[account.id] ?? defaultEventDraft;
      const draftCollected = isKrMode
        ? draft.krChecked
          ? Number(draft.krPopularity || 0)
          : 0
        : draft.globalChecked
          ? Number(draft.globalPopularity || 0)
          : 0;
      const draftSent = isKrMode
        ? Number(draft.krSpentPopularity || 0)
        : Number(draft.globalSpentPopularity || 0);
      const draftAvailable =
        Number.isNaN(draftCollected) || Number.isNaN(draftSent)
          ? 0
          : Math.max(draftCollected - draftSent, 0);

      const baseTotal = map.get(account.id) ?? 0;
      map.set(account.id, Math.max(baseTotal - savedAvailable + draftAvailable, 0));
    }

    return map;
  }, [
    accounts,
    allEventRows,
    draftByAccount,
    isKrMode,
    savedByAccount,
    selectedEventId,
  ]);

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
    await Promise.all([
      refetchSavedRows(),
      queryClient.refetchQueries({ queryKey: ["pubg_event_rows_all_accounts"], exact: true }),
    ]);
    saveAllMutation.reset();
  }

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const createEventError = createEventMutation.error?.message;
  const updateEventError = updateEventNameMutation.error?.message;
  const deleteEventError = deleteEventMutation.error?.message;
  const saveAllError = saveAllMutation.error?.message;

  return (
    <div
      className="min-h-screen premium-page-bg px-4 py-8 text-foreground"
      style={{ ["--pubg-bg-image" as string]: `url(${pubgHeroBg.url})` }}
    >
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="premium-surface rounded-lg border p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{modeLabel} Event</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Manage {modeLabel} event collected, sent, and available popularity by Gmail.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant={isKrMode ? "default" : "outline"}>
                <Link to="/event" search={{ mode: "kr" }}>
                  PUBG KR Event
                </Link>
              </Button>
              <Button asChild variant={isKrMode ? "outline" : "default"}>
                <Link to="/event" search={{ mode: "global" }}>
                  PUBG Global Event
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/">Back</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="premium-surface rounded-lg border p-5">
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

            <Button variant="outline" onClick={handleRefreshAll} disabled={!selectedEventId || isLoadingRows}>
              Refresh all
            </Button>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <Input
              value={editEventName}
              onChange={(event) => setEditEventName(event.target.value)}
              placeholder="Edit selected event name"
              disabled={!selectedEventId}
            />
            <Button
              variant="outline"
              onClick={() => updateEventNameMutation.mutate()}
              disabled={!selectedEventId || updateEventNameMutation.isPending || !editEventName.trim()}
            >
              {updateEventNameMutation.isPending ? "Updating..." : "Update name"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!selectedEventId) return;
                const ok = window.confirm("Delete this event and all saved rows for this event?");
                if (ok) deleteEventMutation.mutate();
              }}
              disabled={!selectedEventId || deleteEventMutation.isPending}
            >
              {deleteEventMutation.isPending ? "Deleting..." : "Delete event"}
            </Button>
          </div>

          {isLoadingEvents ? <p className="mt-3 text-sm text-muted-foreground">Loading events...</p> : null}
          {eventsError ? <p className="mt-3 text-sm text-destructive">{eventsError.message}</p> : null}
          {createEventError ? <p className="mt-3 text-sm text-destructive">{createEventError}</p> : null}
          {updateEventError ? <p className="mt-3 text-sm text-destructive">{updateEventError}</p> : null}
          {deleteEventError ? <p className="mt-3 text-sm text-destructive">{deleteEventError}</p> : null}
          {saveAllError ? <p className="mt-3 text-sm text-destructive">{saveAllError}</p> : null}

          <p className="mt-3 text-sm text-muted-foreground">
            {selectedEvent
              ? `Selected: ${selectedEvent.name}. Saved values stay until you change them and click Save all.`
              : "Create or select an event to start entering popularity."}
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="premium-surface rounded-md border p-4 text-sm">
            <p className="text-muted-foreground">{modeLabel} collected</p>
            <p className="text-2xl font-semibold">{totals.collectedTotal.toLocaleString()}</p>
          </div>
          <div className="premium-surface rounded-md border p-4 text-sm">
            <p className="text-muted-foreground">{modeLabel} sent</p>
            <p className="text-2xl font-semibold">{totals.sentTotal.toLocaleString()}</p>
          </div>
          <div className="premium-surface rounded-md border p-4 text-sm">
            <p className="text-muted-foreground">{modeLabel} available</p>
            <p className="text-2xl font-semibold">{totals.availableTotal.toLocaleString()}</p>
          </div>
        </section>

        <section className="premium-surface rounded-lg border p-4 text-sm">
          <p className="text-muted-foreground">Stored available {modeLabel} (all events)</p>
          <p className="text-2xl font-semibold">{totalAvailableAcrossAllEvents.toLocaleString()}</p>
        </section>

        <section className="premium-surface rounded-lg border p-5">
          <h2 className="text-lg font-semibold">{modeLabel} account event details</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter collected and sent popularity for each Gmail ID in this mode.
          </p>

          {isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading accounts...</p> : null}
          {error ? <p className="mt-4 text-sm text-destructive">{error.message}</p> : null}
          {savedRowsError ? <p className="mt-4 text-sm text-destructive">{savedRowsError.message}</p> : null}
          {allEventRowsError ? <p className="mt-4 text-sm text-destructive">{allEventRowsError.message}</p> : null}
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
                    <TableHead className="text-right">{modeLabel} Event</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Available (All Events)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => {
                    const draft = getDraft(account.id);
                    const checked = isKrMode ? draft.krChecked : draft.globalChecked;
                    const popularityValue = isKrMode ? draft.krPopularity : draft.globalPopularity;
                    const sentValue = isKrMode ? draft.krSpentPopularity : draft.globalSpentPopularity;
                    const parsedCollected = checked ? Number(popularityValue || 0) : 0;
                    const parsedSent = Number(sentValue || 0);
                    const availablePopularity =
                      Number.isNaN(parsedCollected) || Number.isNaN(parsedSent)
                        ? 0
                        : Math.max(parsedCollected - parsedSent, 0);
                    const availableAcrossAllEvents = availableAcrossAllEventsByAccount.get(account.id) ?? 0;

                    return (
                      <TableRow key={account.id}>
                        <TableCell>{account.gmail}</TableCell>

                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) =>
                                  isKrMode
                                    ? updateDraft(account.id, { krChecked: event.target.checked })
                                    : updateDraft(account.id, { globalChecked: event.target.checked })
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
                              value={popularityValue}
                              onChange={(event) =>
                                isKrMode
                                  ? updateDraft(account.id, { krPopularity: event.target.value })
                                  : updateDraft(account.id, { globalPopularity: event.target.value })
                              }
                              disabled={!selectedEventId || !checked}
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
                              value={sentValue}
                              onChange={(event) =>
                                isKrMode
                                  ? updateDraft(account.id, { krSpentPopularity: event.target.value })
                                  : updateDraft(account.id, { globalSpentPopularity: event.target.value })
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
