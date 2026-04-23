import { ListChecks, Building2, Clock, Settings, LogOut } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { NavLink } from "./NavLink";
import { useAuth } from "@/features/auth";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Action Queue", url: "/", icon: ListChecks },
  { title: "Accounts", url: "/accounts", icon: Building2 },
  { title: "Activity Log", url: "/activity", icon: Clock },
  { title: "Settings", url: "/settings", icon: Settings },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();

  const displayName = profile?.full_name || user?.email || "Signed-in user";
  const displayEmail = profile?.email || user?.email || "";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="w-60 min-h-screen flex-shrink-0 bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="h-14 flex items-center px-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <ListChecks className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm text-sidebar-accent-foreground tracking-tight">
            RetainIQ
          </span>
        </div>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.url;
          return (
            <NavLink
              key={item.url}
              to={item.url}
              end
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              }`}
              activeClassName=""
            >
              <item.icon className="w-4 h-4" />
              <span>{item.title}</span>
              {item.url === "/" && (
                <span className="ml-auto text-xs bg-primary/20 text-primary-foreground px-1.5 py-0.5 rounded-full font-medium">
                  !
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border space-y-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-medium text-sidebar-accent-foreground shrink-0">
            {initials(displayName)}
          </div>
          <div className="text-xs min-w-0">
            <div className="font-medium text-sidebar-accent-foreground truncate">
              {displayName}
            </div>
            <div className="text-sidebar-foreground truncate">{displayEmail}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start h-8 text-xs text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="w-3.5 h-3.5 mr-2" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
