import { ChevronDown, LogOut, Settings as SettingsIcon, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { AppSidebar } from "./AppSidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

/**
 * Three-pane chrome (sidebar + header + main) used by every page.
 * Pure presentation — no data dependencies.
 */
export function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const email = profile?.email || user?.email || "";
  const isDemo = /@demo\.app$/i.test(email);
  const displayName = profile?.full_name || email || "Signed-in user";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

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
          <div className="flex items-center gap-3 shrink-0">
            {isDemo && (
              <div
                className="inline-flex items-center gap-2 h-7 px-2.5 rounded-full border border-primary/30 bg-primary/10 text-[11px] font-medium text-primary"
                aria-label={`Demo mode as ${displayName}`}
              >
                <Sparkles className="w-3 h-3" />
                <span className="uppercase tracking-wider">Demo</span>
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center gap-2 h-9 pl-1 pr-2 rounded-full border border-border bg-background hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Open user menu"
              >
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                  {initials(displayName)}
                </span>
                <span className="hidden sm:flex flex-col items-start leading-tight min-w-0 max-w-[160px]">
                  <span className="text-xs font-medium text-foreground truncate w-full">
                    {displayName}
                  </span>
                  {email && (
                    <span className="text-[10px] text-muted-foreground truncate w-full">
                      {email}
                    </span>
                  )}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground truncate">
                      {displayName}
                    </span>
                    {email && (
                      <span className="text-xs text-muted-foreground truncate">{email}</span>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
