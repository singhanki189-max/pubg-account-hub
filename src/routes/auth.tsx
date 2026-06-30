import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import pubgHeroBg from "@/assets/pubg-hero-bg.png.asset.json";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Login | PUBG Account Manager" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        navigate({ to: "/", replace: true });
      }
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });

        if (signUpError) throw signUpError;
        setMessage("Account created. You can now log in.");
        setMode("signin");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        navigate({ to: "/", replace: true });
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen premium-page-bg px-4 py-8 text-foreground"
      style={{ ["--pubg-bg-image" as string]: `url(${pubgHeroBg.url})` }}
    >
      <main className="mx-auto flex min-h-[80vh] w-full max-w-md items-center">
        <section className="premium-surface w-full rounded-lg border p-6">
          <h1 className="text-2xl font-semibold">PUBG Account Login</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Only you can access your account, event, and sales details.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant={mode === "signin" ? "default" : "outline"} onClick={() => setMode("signin")}>
              Sign in
            </Button>
            <Button variant={mode === "signup" ? "default" : "outline"} onClick={() => setMode("signup")}>
              Sign up
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <Input
              type="email"
              placeholder="you@gmail.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? mode === "signin"
                  ? "Signing in..."
                  : "Creating..."
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>

          {message ? <p className="mt-3 text-sm text-emerald-400">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </section>
      </main>
    </div>
  );
}
