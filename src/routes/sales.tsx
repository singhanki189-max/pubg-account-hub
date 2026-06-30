import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import pubgHeroBg from "@/assets/pubg-hero-bg.png.asset.json";

type SaleEntry = Tables<"pubg_sales_entries">;

const gmailSchema = z.string().trim().email().max(255);
const amountSchema = z.number().int().min(0).max(1_000_000_000);

export const Route = createFileRoute("/sales")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
  },
  head: () => ({
    meta: [{ title: "Sales & Earnings | PUBG Account Manager" }],
  }),
  component: SalesPage,
});

function SalesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [gmail, setGmail] = useState("");
  const [entryType, setEntryType] = useState<"sale" | "earning">("sale");
  const [amount, setAmount] = useState("0");
  const [note, setNote] = useState("");
  const [soldAt, setSoldAt] = useState("");
  const [gmailFilter, setGmailFilter] = useState("");

  const { data: sales = [], isLoading, error } = useQuery({
    queryKey: ["pubg_sales_entries"],
    queryFn: async () => {
      const { data, error: dbError } = await supabase
        .from("pubg_sales_entries")
        .select("id, user_id, gmail, entry_type, amount, note, sold_at, created_at, updated_at")
        .order("sold_at", { ascending: false });

      if (dbError) throw dbError;
      return data as SaleEntry[];
    },
  });

  const createSaleMutation = useMutation({
    mutationFn: async () => {
      const validatedGmail = gmailSchema.parse(gmail);
      const validatedAmount = amountSchema.parse(Number(amount || 0));
      const soldAtValue = soldAt ? new Date(soldAt).toISOString() : new Date().toISOString();

      const { error: dbError } = await supabase.from("pubg_sales_entries").insert({
        gmail: validatedGmail,
        entry_type: entryType,
        amount: validatedAmount,
        note: note.trim(),
        sold_at: soldAtValue,
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      setGmail("");
      setEntryType("sale");
      setAmount("0");
      setNote("");
      setSoldAt("");
      queryClient.invalidateQueries({ queryKey: ["pubg_sales_entries"] });
    },
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: dbError } = await supabase.from("pubg_sales_entries").delete().eq("id", id);
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pubg_sales_entries"] });
    },
  });

  const filteredSales = useMemo(() => {
    if (!gmailFilter.trim()) return sales;
    const q = gmailFilter.toLowerCase();
    return sales.filter((row) => row.gmail.toLowerCase().includes(q));
  }, [gmailFilter, sales]);

  const totalSales = useMemo(
    () => sales.filter((row) => row.entry_type === "sale").reduce((sum, row) => sum + row.amount, 0),
    [sales],
  );
  const totalEarnings = useMemo(
    () => sales.filter((row) => row.entry_type === "earning").reduce((sum, row) => sum + row.amount, 0),
    [sales],
  );
  const net = totalEarnings - totalSales;

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
              <h1 className="text-2xl font-semibold">Sales & Earnings</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Store all money out (sales) and money in (earnings) records by Gmail.
              </p>
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
              <Button variant="outline" onClick={handleSignOut}>
                Logout
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-border bg-muted p-3 text-sm">
              <p className="text-muted-foreground">Total Sales</p>
              <p className="text-xl font-semibold">{totalSales.toLocaleString()}</p>
            </div>
            <div className="rounded-md border border-border bg-muted p-3 text-sm">
              <p className="text-muted-foreground">Total Earnings</p>
              <p className="text-xl font-semibold">{totalEarnings.toLocaleString()}</p>
            </div>
            <div className="rounded-md border border-border bg-muted p-3 text-sm">
              <p className="text-muted-foreground">Net</p>
              <p className="text-xl font-semibold">{net.toLocaleString()}</p>
            </div>
          </div>
        </section>

        <section className="premium-surface rounded-lg border p-5">
          <h2 className="text-lg font-semibold">Add record</h2>
          <form
            className="mt-4 grid gap-3 md:grid-cols-5"
            onSubmit={(event) => {
              event.preventDefault();
              createSaleMutation.mutate();
            }}
          >
            <Input
              value={gmail}
              onChange={(event) => setGmail(event.target.value)}
              placeholder="gmail@example.com"
              required
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={entryType}
              onChange={(event) => setEntryType(event.target.value as "sale" | "earning")}
            >
              <option value="sale">Sale</option>
              <option value="earning">Earning</option>
            </select>
            <Input
              type="number"
              min={0}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Amount"
            />
            <Input
              type="datetime-local"
              value={soldAt}
              onChange={(event) => setSoldAt(event.target.value)}
            />
            <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note" />
            <Button type="submit" disabled={createSaleMutation.isPending || !gmail.trim()}>
              {createSaleMutation.isPending ? "Saving..." : "Save record"}
            </Button>
          </form>
          {createSaleMutation.error ? (
            <p className="mt-3 text-sm text-destructive">{createSaleMutation.error.message}</p>
          ) : null}
        </section>

        <section className="premium-surface rounded-lg border p-5">
          <h2 className="text-lg font-semibold">Records</h2>
          <div className="mt-4">
            <Input
              value={gmailFilter}
              onChange={(event) => setGmailFilter(event.target.value)}
              placeholder="Search gmail"
            />
          </div>

          {isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading records...</p> : null}
          {error ? <p className="mt-4 text-sm text-destructive">{error.message}</p> : null}

          {!isLoading && !error ? (
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gmail</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.gmail}</TableCell>
                      <TableCell className="capitalize">{row.entry_type}</TableCell>
                      <TableCell>{row.amount.toLocaleString()}</TableCell>
                      <TableCell>{new Date(row.sold_at).toLocaleString()}</TableCell>
                      <TableCell>{row.note || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSaleMutation.mutate(row.id)}
                          disabled={deleteSaleMutation.isPending}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
