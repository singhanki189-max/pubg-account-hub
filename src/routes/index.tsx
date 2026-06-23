import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type PubgAccount = Tables<"pubg_accounts">;

const gmailSchema = z.string().trim().email().max(255);
const nonNegativeNumberSchema = z.number().int().min(0).max(1_000_000_000);

function isDuplicateKeyError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505",
  );
}

function parseBulkRows(rawText: string): Array<{ gmail: string; uc: number; cards: number; mix_pop: number }> {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsedRows: Array<{ gmail: string; uc: number; cards: number; mix_pop: number }> = [];

  for (const line of lines) {
    const columns = line.split(/[;,\t]/).map((value) => value.trim());

    const [gmailValue = "", ucValue = "0", cardsValue = "0", mixPopValue = "0"] = columns;
    const validatedGmail = gmailSchema.parse(gmailValue);

    const parsedUc = nonNegativeNumberSchema.parse(Number(ucValue));
    const parsedCards = nonNegativeNumberSchema.parse(Number(cardsValue));
    const parsedMixPop = nonNegativeNumberSchema.parse(Number(mixPopValue));

    parsedRows.push({
      gmail: validatedGmail,
      uc: parsedUc,
      cards: parsedCards,
      mix_pop: parsedMixPop,
    });
  }

  return parsedRows;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PUBG Account Manager" },
      {
        name: "description",
        content: "Store and filter PUBG account details by Gmail, UC, cards, and mix pop.",
      },
      { property: "og:title", content: "PUBG Account Manager" },
      {
        property: "og:description",
        content: "Store and filter PUBG account details by Gmail, UC, cards, and mix pop.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const queryClient = useQueryClient();

  const [gmail, setGmail] = useState("");
  const [uc, setUc] = useState("0");
  const [cards, setCards] = useState("0");
  const [mixPop, setMixPop] = useState("0");
  const [bulkInput, setBulkInput] = useState("");

  const [gmailFilter, setGmailFilter] = useState("");
  const [minCards, setMinCards] = useState("");
  const [onlyWithUc, setOnlyWithUc] = useState(false);
  const [onlyCards50k, setOnlyCards50k] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGmail, setEditGmail] = useState("");
  const [editUc, setEditUc] = useState("0");
  const [editCards, setEditCards] = useState("0");
  const [editMixPop, setEditMixPop] = useState("0");

  const { data: accounts = [], isLoading, error } = useQuery({
    queryKey: ["pubg_accounts"],
    queryFn: async () => {
      const { data, error: dbError } = await supabase
        .from("pubg_accounts")
        .select("id, gmail, uc, cards, mix_pop, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (dbError) throw dbError;
      return data as PubgAccount[];
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const validatedGmail = gmailSchema.parse(gmail);
      const existingGmailSet = new Set(accounts.map((account) => account.gmail.toLowerCase()));

      if (existingGmailSet.has(validatedGmail.toLowerCase())) {
        throw new Error("This Gmail already exists.");
      }

      const parsedUc = nonNegativeNumberSchema.parse(Number(uc || 0));
      const parsedCards = nonNegativeNumberSchema.parse(Number(cards || 0));
      const parsedMixPop = nonNegativeNumberSchema.parse(Number(mixPop || 0));

      const { error: dbError } = await supabase.from("pubg_accounts").insert({
        gmail: validatedGmail,
        uc: parsedUc,
        cards: parsedCards,
        mix_pop: parsedMixPop,
      });

      if (dbError) {
        if (isDuplicateKeyError(dbError)) throw new Error("This Gmail already exists.");
        throw dbError;
      }
    },
    onSuccess: () => {
      setGmail("");
      setUc("0");
      setCards("0");
      setMixPop("0");
      queryClient.invalidateQueries({ queryKey: ["pubg_accounts"] });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async () => {
      const rows = parseBulkRows(bulkInput);
      if (rows.length === 0) throw new Error("Please paste at least one account row.");

      const existingGmailSet = new Set(accounts.map((account) => account.gmail.toLowerCase()));
      const uniqueRowsByGmail = new Map<string, (typeof rows)[number]>();

      for (const row of rows) {
        const key = row.gmail.toLowerCase();
        if (!existingGmailSet.has(key) && !uniqueRowsByGmail.has(key)) {
          uniqueRowsByGmail.set(key, row);
        }
      }

      const rowsToInsert = Array.from(uniqueRowsByGmail.values());
      if (rowsToInsert.length === 0) {
        throw new Error("All pasted Gmail accounts already exist.");
      }

      const { error: dbError } = await supabase.from("pubg_accounts").insert(rowsToInsert);
      if (dbError) {
        if (isDuplicateKeyError(dbError)) throw new Error("One or more Gmail accounts already exist.");
        throw dbError;
      }
    },
    onSuccess: () => {
      setBulkInput("");
      queryClient.invalidateQueries({ queryKey: ["pubg_accounts"] });
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) throw new Error("No account selected for editing.");

      const validatedGmail = gmailSchema.parse(editGmail);
      const existingGmailSet = new Set(
        accounts
          .filter((account) => account.id !== editingId)
          .map((account) => account.gmail.toLowerCase()),
      );

      if (existingGmailSet.has(validatedGmail.toLowerCase())) {
        throw new Error("This Gmail already exists.");
      }

      const parsedUc = nonNegativeNumberSchema.parse(Number(editUc || 0));
      const parsedCards = nonNegativeNumberSchema.parse(Number(editCards || 0));
      const parsedMixPop = nonNegativeNumberSchema.parse(Number(editMixPop || 0));

      const { error: dbError } = await supabase
        .from("pubg_accounts")
        .update({
          gmail: validatedGmail,
          uc: parsedUc,
          cards: parsedCards,
          mix_pop: parsedMixPop,
        })
        .eq("id", editingId);

      if (dbError) {
        if (isDuplicateKeyError(dbError)) throw new Error("This Gmail already exists.");
        throw dbError;
      }
    },
    onSuccess: () => {
      setEditingId(null);
      setEditGmail("");
      setEditUc("0");
      setEditCards("0");
      setEditMixPop("0");
      queryClient.invalidateQueries({ queryKey: ["pubg_accounts"] });
    },
  });

  function startEditing(account: PubgAccount) {
    setEditingId(account.id);
    setEditGmail(account.gmail);
    setEditUc(String(account.uc));
    setEditCards(String(account.cards));
    setEditMixPop(String(account.mix_pop));
  }

  function cancelEditing() {
    setEditingId(null);
    setEditGmail("");
    setEditUc("0");
    setEditCards("0");
    setEditMixPop("0");
    updateAccountMutation.reset();
  }

  const filteredAccounts = useMemo(() => {
    const minCardsValue = Number(minCards);

    return accounts.filter((account) => {
      const matchesGmail = gmailFilter
        ? account.gmail.toLowerCase().includes(gmailFilter.toLowerCase())
        : true;
      const matchesMinCards = minCards
        ? !Number.isNaN(minCardsValue) && account.cards >= minCardsValue
        : true;
      const matchesUc = onlyWithUc ? account.uc > 0 : true;
      const matches50k = onlyCards50k ? account.cards === 50000 : true;

      return matchesGmail && matchesMinCards && matchesUc && matches50k;
    });
  }, [accounts, gmailFilter, minCards, onlyWithUc, onlyCards50k]);

  const accountsWithUc = useMemo(() => accounts.filter((account) => account.uc > 0), [accounts]);
  const accountsWith50kCards = useMemo(
    () => accounts.filter((account) => account.cards === 50000),
    [accounts],
  );

  const saveError = createAccountMutation.error?.message;
  const bulkSaveError = bulkCreateMutation.error?.message;
  const editSaveError = updateAccountMutation.error?.message;

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <h1 className="text-2xl font-semibold">PUBG Account Manager</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Save Gmail, UC, cards, and mix pop, then filter to quickly find target accounts.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Add account</h2>
          <form
            className="mt-4 grid gap-3 md:grid-cols-5"
            onSubmit={(event) => {
              event.preventDefault();
              createAccountMutation.mutate();
            }}
          >
            <Input
              value={gmail}
              onChange={(event) => setGmail(event.target.value)}
              placeholder="gmail@example.com"
              required
            />
            <Input value={uc} onChange={(event) => setUc(event.target.value)} type="number" min={0} />
            <Input
              value={cards}
              onChange={(event) => setCards(event.target.value)}
              type="number"
              min={0}
            />
            <Input
              value={mixPop}
              onChange={(event) => setMixPop(event.target.value)}
              type="number"
              min={0}
            />
            <Button type="submit" disabled={createAccountMutation.isPending || !gmail.trim()}>
              {createAccountMutation.isPending ? "Saving..." : "Save account"}
            </Button>
          </form>
          {saveError ? <p className="mt-3 text-sm text-destructive">{saveError}</p> : null}
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Bulk add accounts</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Paste one account per line. Format: gmail,uc,cards,mix_pop (UC/cards/mix_pop are optional).
          </p>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              bulkCreateMutation.mutate();
            }}
          >
            <Textarea
              className="min-h-36"
              value={bulkInput}
              onChange={(event) => setBulkInput(event.target.value)}
              placeholder={"user1@gmail.com,1200,50000,3\nuser2@gmail.com,0,12000,1\nuser3@gmail.com"}
            />
            <Button type="submit" disabled={bulkCreateMutation.isPending || !bulkInput.trim()}>
              {bulkCreateMutation.isPending ? "Saving bulk..." : "Save bulk accounts"}
            </Button>
          </form>
          {bulkSaveError ? <p className="mt-3 text-sm text-destructive">{bulkSaveError}</p> : null}
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Filter accounts</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Input
              value={gmailFilter}
              onChange={(event) => setGmailFilter(event.target.value)}
              placeholder="Search gmail"
            />
            <Input
              value={minCards}
              onChange={(event) => setMinCards(event.target.value)}
              type="number"
              min={0}
              placeholder="Min cards"
            />
            <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <input
                checked={onlyCards50k}
                onChange={(event) => setOnlyCards50k(event.target.checked)}
                type="checkbox"
              />
              Only 50k cards
            </label>
            <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <input
                checked={onlyWithUc}
                onChange={(event) => setOnlyWithUc(event.target.checked)}
                type="checkbox"
              />
              Only with UC
            </label>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-border bg-muted p-3 text-sm">
              <p className="text-muted-foreground">Filtered accounts</p>
              <p className="text-xl font-semibold">{filteredAccounts.length}</p>
            </div>
            <div className="rounded-md border border-border bg-muted p-3 text-sm">
              <p className="text-muted-foreground">Gmails with 50k cards</p>
              <p className="text-xl font-semibold">{accountsWith50kCards.length}</p>
            </div>
            <div className="rounded-md border border-border bg-muted p-3 text-sm">
              <p className="text-muted-foreground">Gmails with UC</p>
              <p className="text-xl font-semibold">{accountsWithUc.length}</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Results</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Click <strong>Edit</strong> on any row to update Gmail, UC, cards, or mix pop.
          </p>
          {editSaveError ? <p className="mt-3 text-sm text-destructive">{editSaveError}</p> : null}
          {isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading accounts...</p> : null}
          {error ? <p className="mt-4 text-sm text-destructive">{error.message}</p> : null}

          {!isLoading && !error ? (
            <div className="mt-4 max-h-[500px] overflow-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gmail</TableHead>
                    <TableHead className="text-right">UC</TableHead>
                    <TableHead className="text-right">Cards</TableHead>
                    <TableHead className="text-right">Mix Pop</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      {editingId === account.id ? (
                        <>
                          <TableCell>
                            <Input
                              value={editGmail}
                              onChange={(event) => setEditGmail(event.target.value)}
                              placeholder="gmail@example.com"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              value={editUc}
                              onChange={(event) => setEditUc(event.target.value)}
                              type="number"
                              min={0}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              value={editCards}
                              onChange={(event) => setEditCards(event.target.value)}
                              type="number"
                              min={0}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              value={editMixPop}
                              onChange={(event) => setEditMixPop(event.target.value)}
                              type="number"
                              min={0}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                disabled={updateAccountMutation.isPending || !editGmail.trim()}
                                onClick={() => updateAccountMutation.mutate()}
                                type="button"
                              >
                                {updateAccountMutation.isPending ? "Saving..." : "Save"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditing}
                                type="button"
                              >
                                Cancel
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{account.gmail}</TableCell>
                          <TableCell className="text-right">{account.uc.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{account.cards.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{account.mix_pop.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing(account)}
                                type="button"
                              >
                                Edit
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-2">
          <div>
            <h2 className="text-base font-semibold">Gmails with 50k cards</h2>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {accountsWith50kCards.length === 0 ? <li>None yet</li> : null}
              {accountsWith50kCards.map((account) => (
                <li key={`cards-${account.id}`}>{account.gmail}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold">Gmails with UC</h2>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {accountsWithUc.length === 0 ? <li>None yet</li> : null}
              {accountsWithUc.map((account) => (
                <li key={`uc-${account.id}`}>{account.gmail}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
