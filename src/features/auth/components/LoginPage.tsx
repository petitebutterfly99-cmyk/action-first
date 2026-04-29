import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ListChecks, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_USERS = [
  { name: "Sarah Chen", email: "sarah.chen@demo.app" },
  { name: "Marcus Rivera", email: "marcus.rivera@demo.app" },
  { name: "Priya Patel", email: "priya.patel@demo.app" },
  { name: "Daniel Kim", email: "daniel.kim@demo.app" },
];
const DEMO_PASSWORD = "demo1234";

const FRIENDLY_ERROR =
  "We couldn't log you in. Try again or use a demo CSM account.";

function isNetworkError(msg: string): boolean {
  return /failed to fetch|network|fetch/i.test(msg);
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDemoFallback, setShowDemoFallback] = useState(false);

  const signInWith = async (signInEmail: string, signInPassword: string) => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw new Error("offline");
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: signInPassword,
    });
    if (signInError) throw signInError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowDemoFallback(false);
    setSubmitting(true);
    try {
      await signInWith(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "offline" || isNetworkError(msg)) {
        setError(
          "Can't reach the server. You appear to be offline — check your connection and try again.",
        );
      } else {
        // Hide raw technical errors from the user; offer a recovery path.
        setError(FRIENDLY_ERROR);
      }
      setShowDemoFallback(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (demo: { name: string; email: string }) => {
    setError(null);
    setShowDemoFallback(false);
    setDemoLoading(demo.email);
    try {
      await signInWith(demo.email, DEMO_PASSWORD);
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "offline" || isNetworkError(msg)) {
        setError(
          "Can't reach the server. You appear to be offline — check your connection and try again.",
        );
      } else {
        setError(
          `We couldn't sign you in as ${demo.name}. The demo account may not be available right now.`,
        );
      }
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <ListChecks className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-base tracking-tight">RetainIQ</span>
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <h1 className="text-base font-semibold mb-1">Sign in</h1>
          <p className="text-xs text-muted-foreground mb-5">
            Sign in to your CSM workspace.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="flex flex-col gap-2 rounded-md border border-[hsl(var(--risk-high))]/40 bg-[hsl(var(--badge-urgent-bg))]/40 px-3 py-2.5 text-xs text-foreground"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-[hsl(var(--risk-high))] shrink-0" />
                  <span>{error}</span>
                </div>
                {showDemoFallback && (
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("demo-csm-section");
                      el?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    className="self-start ml-5 text-primary hover:underline text-xs font-medium"
                  >
                    Use demo login instead →
                  </button>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-9 text-sm"
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full h-9 text-sm">
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            New here?{" "}
            <Link to="/signup" className="text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>

        <div
          id="demo-csm-section"
          className="mt-5 bg-card border rounded-lg p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <div className="text-sm font-semibold">Try as a demo CSM</div>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            One-click sign-in. The Action Queue will only show accounts assigned
            to the CSM you pick.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DEMO_USERS.map((u) => {
              const loading = demoLoading === u.email;
              return (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => handleDemoLogin(u)}
                  disabled={!!demoLoading || submitting}
                  className="flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-md border border-border bg-background hover:bg-muted hover:border-primary/40 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-left"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">{u.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {u.email}
                    </div>
                  </div>
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                  ) : (
                    <span className="text-[10px] text-primary font-medium shrink-0">
                      Sign in →
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
