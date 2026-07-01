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

const amountSchema = z.number().int().min(0).max(1_000_000_000);
const senderIdSchema = z.string().trim().min(1).max(100);

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

  const [senderId, setSenderId] = useState("");
  const [saleMode, setSaleMode] = useState<"direct" | "reselling">("direct");
  const [popularitySent, setPopularitySent] = useState("");
  const [amount, setAmount] = useState("");
  const [buyAmount, setBuyAmount] = useState("");
  const [note, setNote] = useState("");
  const [soldAt, setSoldAt] = useState("");
  const [gmailFilter, setGmailFilter] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const handleNumericTextChange = (value: string, setValue: (next: string) => void) => {
    setValue(value.replace(/[^0-9]/g, ""));
  };

  const { data: sales = [], isLoading, error } = useQuery({
    queryKey: ["pubg_sales_entries"],
    queryFn: async () => {
      const { data, error: dbError } = await supabase
        .from("pubg_sales_entries")
        .select(
          "id, user_id, gmail, sender_id, popularity_sent, sale_mode, amount, buy_amount, note, sold_at, created_at, updated_at",
        )
        .order("sold_at", { ascending: false });

      if (dbError) throw dbError;
      return data as SaleEntry[];
    },
  });

  const createSaleMutation = useMutation({
    mutationFn: async () => {
      const validatedSenderId = senderIdSchema.parse(senderId);
      const normalizedSender = validatedSenderId.toLowerCase().replace(/[^a-z0-9._-]/g, "");
      const storageGmail = `${normalizedSender || "sender"}@id.local`;
      const validatedPopularitySent = amountSchema.parse(Number(popularitySent || 0));
      const validatedAmount = amountSchema.parse(Number(amount || 0));
      const validatedBuyAmount = amountSchema.parse(Number(buyAmount || 0));
      const soldAtValue = soldAt ? new Date(soldAt).toISOString() : new Date().toISOString();

      const { error: dbError } = await supabase.from("pubg_sales_entries").insert({
        gmail: storageGmail,
        sender_id: validatedSenderId,
        popularity_sent: validatedPopularitySent,
        sale_mode: saleMode,
        entry_type: "sale",
        amount: validatedAmount,
        buy_amount: saleMode === "reselling" ? validatedBuyAmount : 0,
        note: note.trim(),
        sold_at: soldAtValue,
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      setSenderId("");
      setSaleMode("direct");
      setPopularitySent("");
      setAmount("");
      setBuyAmount("");
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
    const q = gmailFilter.trim().toLowerCase();
    return sales.filter((row) => {
      const soldMonth = new Date(row.sold_at).toISOString().slice(0, 7);
      const matchMonth = soldMonth === selectedMonth;
      if (!matchMonth) return false;
      if (!q) return true;
      return (
        row.sender_id.toLowerCase().includes(q) ||
        row.sale_mode.toLowerCase().includes(q)
      );
    });
  }, [gmailFilter, sales, selectedMonth]);

  const monthlyMoneyEarned = useMemo(
    () =>
      filteredSales.reduce((sum, row) => {
        if (row.sale_mode === "reselling") return sum + (row.amount - row.buy_amount);
        return sum + row.amount;
      }, 0),
    [filteredSales],
  );

  const monthlyResellingPayable = useMemo(
    () =>
      filteredSales.reduce(
        (sum, row) => (row.sale_mode === "reselling" ? sum + row.buy_amount : sum),
        0,
      ),
    [filteredSales],
  );

  const totalMoneyEarned = useMemo(
    () =>
      sales.reduce((sum, row) => {
        if (row.sale_mode === "reselling") return sum + (row.amount - row.buy_amount);
        return sum + row.amount;
      }, 0),
    [sales],
  );

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
                Keep day-wise sales records by month with sender ID, popularity, and direct/reselling details.
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
              <Button asChild variant="outline">
                <Link to="/order">Order</Link>
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                Logout
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-border bg-muted p-3 text-sm">
              <p className="text-muted-foreground">Monthly Money Earned</p>
              <p className="text-xl font-semibold">{monthlyMoneyEarned.toLocaleString()}</p>
            </div>
            <div className="rounded-md border border-border bg-muted p-3 text-sm">
              <p className="text-muted-foreground">Monthly Reselling Payable</p>
              <p className="text-xl font-semibold">{monthlyResellingPayable.toLocaleString()}</p>
            </div>
            <div className="rounded-md border border-border bg-muted p-3 text-sm">
              <p className="text-muted-foreground">Total Money Earned</p>
              <p className="text-xl font-semibold">{totalMoneyEarned.toLocaleString()}</p>
            </div>
          </div>
        </section>

        <section className="premium-surface rounded-lg border p-5">
          <h2 className="text-lg font-semibold">Add day-wise record</h2>
          <form
            className="mt-4 grid gap-3 md:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              createSaleMutation.mutate();
            }}
          >
            <Input
              value={senderId}
              onChange={(event) => setSenderId(event.target.value)}
              placeholder="Sender ID number"
              required
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={saleMode}
              onChange={(event) => setSaleMode(event.target.value as "direct" | "reselling")}
            >
              <option value="direct">Direct selling</option>
              <option value="reselling">Reselling</option>
            </select>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={popularitySent}
              onChange={(event) => handleNumericTextChange(event.target.value, setPopularitySent)}
              placeholder="Popularity you sent"
              autoComplete="off"
              required
            />
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={amount}
              onChange={(event) => handleNumericTextChange(event.target.value, setAmount)}
              placeholder="Sell amount (money you get)"
              autoComplete="off"
              required
            />
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={buyAmount}
              onChange={(event) => handleNumericTextChange(event.target.value, setBuyAmount)}
              placeholder="Buy amount (money you pay in reselling)"
              autoComplete="off"
              disabled={saleMode !== "reselling"}
            />
            <Input
              type="datetime-local"
              value={soldAt}
              onChange={(event) => setSoldAt(event.target.value)}
            />
            <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note" />
            <Button type="submit" disabled={createSaleMutation.isPending || !senderId.trim()}>
              {createSaleMutation.isPending ? "Saving..." : "Save record"}
            </Button>
          </form>
          {createSaleMutation.error ? (
            <p className="mt-3 text-sm text-destructive">{createSaleMutation.error.message}</p>
          ) : null}
        </section>

        <section className="premium-surface rounded-lg border p-5">
          <h2 className="text-lg font-semibold">Monthly records</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            />
            <Input
              value={gmailFilter}
              onChange={(event) => setGmailFilter(event.target.value)}
              placeholder="Search sender ID / mode"
            />
          </div>

          {isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading records...</p> : null}
          {error ? <p className="mt-4 text-sm text-destructive">{error.message}</p> : null}

          {!isLoading && !error ? (
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sender ID</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Popularity Sent</TableHead>
                    <TableHead>Money Received</TableHead>
                    <TableHead>Buy Amount</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.sender_id}</TableCell>
                      <TableCell className="capitalize">{row.sale_mode}</TableCell>
                      <TableCell>{row.popularity_sent.toLocaleString()}</TableCell>
                      <TableCell>{row.amount.toLocaleString()}</TableCell>
                      <TableCell>{row.buy_amount.toLocaleString()}</TableCell>
                      <TableCell>
                        {(row.sale_mode === "reselling"
                          ? row.amount - row.buy_amount
                          : row.amount
                        ).toLocaleString()}
                      </TableCell>
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
