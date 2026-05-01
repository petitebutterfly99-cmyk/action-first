import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ListChecks, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Status = "verifying" | "ready" | "invalid";

/**
 * Parse the URL hash + query string for every shape the recovery link can
 * arrive in:
 *   1. Implicit flow: `#access_token=...&refresh_token=...&type=recovery`
 *   2. PKCE flow:     `?code=...`
 *   3. Token hash:    `?token_hash=...&type=recovery`
 *   4. Failure:       `#error=...&error_code=otp_expired&error_description=...`
 *
 * NOTE: The Supabase SDK has `detectSessionInUrl: true` by default. On initial
 * load it eagerly consumes implicit-flow hash params, removes them from the
 * URL, and fires a `PASSWORD_RECOVERY` auth event. So in practice the hash is
 * usually empty by the time this effect runs — we still parse it as a fallback
 * and rely on the auth event listener as the primary signal.
 */
function parseRecoveryParams() {
  if (typeof window === "undefined") {
    return {
      accessToken: null as string | null,
      refreshToken: null as string | null,
      type: null as string | null,
      code: null as string | null,
      tokenHash: null as string | null,
      errorDescription: null as string | null,
    };
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

  return {
    accessToken: get("access_token"),
    refreshToken: get("refresh_token"),
    type: get("type"),
    code: queryParams.get("code"),
    tokenHash: get("token_hash") ?? get("hashed_token"),
    errorDescription,
  };
}

function clearUrlHash() {
  try {
    window.history.replaceState({}, "", window.location.pathname);
  } catch {
    /* noop */
  }
}

const INVALID_LINK_MSG =
  "This reset link is invalid or has expired. Please request a new one.";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>("verifying");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    let settled = false;

    const markInvalid = (msg: string) => {
      if (cancelled || settled) return;
      settled = true;
      setErrorMsg(msg);
      setStatus("invalid");
    };

    const markReady = () => {
      if (cancelled || settled) return;
      settled = true;
      clearUrlHash();
      setStatus("ready");
    };

    // Primary signal: the SDK auto-detects the recovery hash on load and
    // fires PASSWORD_RECOVERY (or SIGNED_IN if the link was already
    // consumed). Any session arriving while we're on /reset-password means
    // the recovery link was valid.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        markReady();
        return;
      }
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        markReady();
      }
    });

    (async () => {
      const { accessToken, refreshToken, type, code, tokenHash, errorDescription } =
        parseRecoveryParams();

      // Explicit error in URL — link expired/used/invalid.
      if (errorDescription) {
        markInvalid(errorDescription);
        return;
      }

      // Implicit recovery link — set the session ourselves as a belt-and-
      // braces fallback in case the SDK's auto-detect has not run yet.
      if (accessToken && refreshToken && (type === "recovery" || !type)) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (cancelled) return;
        if (error) {
          markInvalid(INVALID_LINK_MSG);
          return;
        }
        markReady();
        return;
      }

      // Token-hash recovery link.
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (cancelled) return;
        if (error) {
          markInvalid(INVALID_LINK_MSG);
          return;
        }
        markReady();
        return;
      }

      // PKCE recovery link.
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          markInvalid(
            "This reset link can't be verified in this browser. Open the link in the same browser you used to request the reset, or request a new link.",
          );
          return;
        }
        markReady();
        return;
      }

      // No params left in the URL — the SDK most likely already consumed
      // them. Check whether a session exists now.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        markReady();
        return;
      }

      // Give the SDK a moment to finish processing the URL hash and fire
      // its PASSWORD_RECOVERY / SIGNED_IN event before we conclude the
      // link is invalid.
      setTimeout(async () => {
        if (cancelled || settled) return;
        const { data: late } = await supabase.auth.getSession();
        if (cancelled || settled) return;
        if (late.session) {
          markReady();
        } else {
          markInvalid(INVALID_LINK_MSG);
        }
      }, 1500);
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

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

    // Force a fresh sign-in with the new password rather than silently
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
                {errorMsg ?? INVALID_LINK_MSG}
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
