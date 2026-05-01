import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ListChecks, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "./AuthProvider";

type Status = "verifying" | "ready" | "invalid";

/**
 * Parse error / code params from BOTH the URL hash and the query string.
 * Supabase recovery links arrive in one of three shapes:
 *   1. Implicit flow: `#access_token=...&type=recovery`
 *      (the SDK auto-parses this — we just observe AuthProvider's session)
 *   2. PKCE flow:     `?code=...`
 *      (must be exchanged manually)
 *   3. Failure:       `#error=...&error_code=otp_expired&error_description=...`
 *                     (or the same in `?error=...` form)
 */
function parseRecoveryParams() {
  if (typeof window === "undefined") {
    return { code: null, errorDescription: null };
  }
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const queryParams = new URLSearchParams(window.location.search);
  const get = (k: string) => hashParams.get(k) ?? queryParams.get(k);

  const error = get("error") ?? get("error_code");
  const errorDescription = error
    ? (get("error_description") ?? error).replace(/\+/g, " ")
    : null;
  const code = queryParams.get("code");

  return { code, errorDescription };
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>("verifying");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Track whether we've already kicked off a PKCE exchange so we don't
  // re-trigger it when this effect re-runs on auth state changes.
  const exchangeStartedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const markInvalid = (msg: string) => {
      if (cancelled) return;
      setErrorMsg(msg);
      setStatus("invalid");
    };

    const markReady = () => {
      if (cancelled) return;
      // Strip recovery params from the URL so a refresh doesn't re-trigger
      // verification (and so secrets don't linger in the address bar).
      try {
        window.history.replaceState({}, "", window.location.pathname);
      } catch {
        /* noop */
      }
      setStatus("ready");
    };

    const { code, errorDescription } = parseRecoveryParams();

    // Case 1: explicit error in the URL — link expired/used/invalid.
    if (errorDescription) {
      markInvalid(errorDescription);
      return;
    }

    // While AuthProvider is still doing its initial getSession() check, wait.
    // It will flip `loading` to false once it knows whether a session exists.
    if (authLoading) {
      return;
    }

    // Case A: AuthProvider already has a session (implicit-flow recovery hash
    // was parsed by the SDK at app boot and AuthProvider's listener caught
    // the PASSWORD_RECOVERY event). This is the common path.
    if (session) {
      markReady();
      return;
    }

    // Case B: PKCE code in the query string — exchange it for a session.
    // AuthProvider will then catch SIGNED_IN and re-render us with a session.
    if (code) {
      if (exchangeStartedRef.current) return;
      exchangeStartedRef.current = true;
      (async () => {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          markInvalid(
            "This reset link can't be verified in this browser. Please request a new link and open it in the same browser you used to request the reset.",
          );
        }
        // On success: do nothing here — AuthProvider's listener will fire
        // SIGNED_IN, `session` will become truthy, and this effect re-runs
        // hitting Case A above.
      })();
      return;
    }

    // Case C: no session, no code, no error — link is missing or expired.
    markInvalid(
      "This reset link is invalid or has expired. Please request a new one.",
    );

    return () => {
      cancelled = true;
    };
  }, [authLoading, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Use at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSubmitting(false);
      toast({
        title: "Couldn't update password",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Force a fresh login with the new password rather than silently
    // dropping the user into the app via the recovery-token session.
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* noop — we still want to send them to /login */
    }
    setSubmitting(false);
    toast({
      title: "Password updated",
      description: "Sign in with your new password.",
    });
    navigate("/login", { replace: true });
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
          <h1 className="text-base font-semibold mb-1">
            {status === "invalid" ? "Reset link problem" : "Set a new password"}
          </h1>
          <p className="text-xs text-muted-foreground mb-5">
            {status === "invalid"
              ? "We couldn't verify your reset link."
              : "Enter a new password for your account."}
          </p>

          {status === "verifying" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Verifying your reset link…
            </div>
          )}

          {status === "invalid" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                {errorMsg ?? "This reset link is invalid or has expired."}
              </p>
              <Button asChild className="w-full h-9 text-sm">
                <Link to="/forgot-password">Request a new link</Link>
              </Button>
              <Link
                to="/login"
                className="block text-xs text-center text-muted-foreground hover:text-foreground"
              >
                Back to sign in
              </Link>
            </div>
          )}

          {status === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="h-9 text-sm"
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full h-9 text-sm">
                {submitting ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
