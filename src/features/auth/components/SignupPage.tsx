import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Use at least 6 characters for your password.");
      return;
    }
    setSubmitting(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName },
      },
    });
    setSubmitting(false);
    if (signUpError) {
      // Inline error preserves name + email so the user doesn't have to retype.
      setError(signUpError.message);
      return;
    }
    toast({
      title: "Account created",
      description: "Welcome! You're now signed in.",
    });
    navigate("/", { replace: true });
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
          <h1 className="text-base font-semibold mb-1">Create your account</h1>
          <p className="text-xs text-muted-foreground mb-5">
            Sign up as a Customer Success Manager.
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
              <Label htmlFor="full_name" className="text-xs">Full name</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>
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
              <Label htmlFor="password" className="text-xs">Password</Label>
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
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
