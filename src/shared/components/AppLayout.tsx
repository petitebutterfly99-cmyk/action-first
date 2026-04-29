import { Sparkles } from "lucide-react";
import { useAuth } from "@/features/auth";
import { AppSidebar } from "./AppSidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

/**
 * Three-pane chrome (sidebar + header + main) used by every page.
 * Pure presentation — no data dependencies.
 */
export function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const { profile, user } = useAuth();
  const email = profile?.email || user?.email || "";
  const isDemo = /@demo\.app$/i.test(email);
  const demoName = profile?.full_name || email;

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between gap-4 px-6 border-b bg-card shrink-0">
          <div className="min-w-0">
            {title && (
              <h1 className="text-base font-semibold text-foreground truncate">{title}</h1>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          {isDemo && (
            <div
              className="inline-flex items-center gap-2 h-7 px-2.5 rounded-full border border-primary/30 bg-primary/10 text-[11px] font-medium text-primary shrink-0"
              aria-label={`Demo mode as ${demoName}`}
            >
              <Sparkles className="w-3 h-3" />
              <span className="uppercase tracking-wider">Demo</span>
              <span className="text-foreground/80">·</span>
              <span className="text-foreground truncate max-w-[160px]">{demoName}</span>
            </div>
          )}
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
