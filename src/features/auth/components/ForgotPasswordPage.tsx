import { useState } from "react";
import { Link } from "react-router-dom";
import { ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

function getPasswordResetRedirectUrl() {
  const url = new URL("/reset-password", window.location.origin);
  const previewToken = new URLSearchParams(window.location.search).get("__lovable_token");

  if (previewToken) {
    url.searchParams.set("__lovable_token", previewToken);
  }

  return url.toString();
}

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordResetRedirectUrl(),
    });
    setSubmitting(false);
    if (error) {
      toast({
        title: "Couldn't send reset email",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setSent(true);
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
          <h1 className="text-base font-semibold mb-1">Reset your password</h1>
          <p className="text-xs text-muted-foreground mb-5">
            We'll email you a link to set a new password.
          </p>

          {sent ? (
            <div className="text-xs text-muted-foreground space-y-3">
              <p>
                If an account exists for <span className="font-medium">{email}</span>, a
                reset link is on its way.
              </p>
              <Link to="/login" className="text-primary hover:underline inline-block">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <Button type="submit" disabled={submitting} className="w-full h-9 text-sm">
                {submitting ? "Sending…" : "Send reset link"}
              </Button>
              <Link
                to="/login"
                className="block text-xs text-center text-muted-foreground hover:text-foreground"
              >
                Back to sign in
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
