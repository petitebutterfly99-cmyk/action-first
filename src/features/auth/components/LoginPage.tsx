import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_USERS = [
  { name: "Sarah Chen", email: "sarah.chen@demo.app" },
  { name: "Marcus Rivera", email: "marcus.rivera@demo.app" },
  { name: "Priya Patel", email: "priya.patel@demo.app" },
  { name: "Daniel Kim", email: "daniel.kim@demo.app" },
  { name: "Alex Morgan", email: "alex.morgan@demo.app" },
];
const DEMO_PASSWORD = "demo1234";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // Pre-flight offline check — avoids a confusing "Failed to fetch" from the SDK.
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        throw new Error("offline");
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        // Network / fetch failures from the SDK surface as "Failed to fetch" or
        // "NetworkError" — translate those into a clear offline message.
        const msg = signInError.message || "";
        if (/failed to fetch|network|fetch/i.test(msg)) {
          setError(
            "Can't reach the server. You appear to be offline — check your connection and try again.",
          );
        } else {
          setError(signInError.message);
        }
        return;
      }
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "offline" || /failed to fetch|network/i.test(msg)) {
        setError(
          "Can't reach the server. You appear to be offline — check your connection and try again.",
        );
      } else {
        setError(msg || "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
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
                className="flex items-start gap-2 rounded-md border border-[hsl(var(--risk-high))]/40 bg-[hsl(var(--badge-urgent-bg))]/40 px-3 py-2 text-xs text-foreground"
              >
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-[hsl(var(--risk-high))] shrink-0" />
                <span>{error}</span>
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

        <div className="mt-5 bg-muted/40 border rounded-lg p-4">
          <div className="text-xs font-medium mb-2">Demo CSM accounts</div>
          <div className="text-[11px] text-muted-foreground mb-3">
            Password for all demo users: <code className="font-mono">{DEMO_PASSWORD}</code>
          </div>
          <div className="space-y-1.5">
            {DEMO_USERS.map((u) => (
              <button
                key={u.email}
                type="button"
                onClick={() => fillDemo(u.email)}
                className="w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded hover:bg-muted transition-colors"
              >
                <span className="font-medium">{u.name}</span>
                <span className="text-muted-foreground font-mono">{u.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
