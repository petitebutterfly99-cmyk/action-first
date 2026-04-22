import { ListChecks, Building2, Clock, Settings } from "lucide-react";
import { useLocation } from "react-router-dom";
import { NavLink } from "./NavLink";

const navItems = [
  { title: "Action Queue", url: "/", icon: ListChecks },
  { title: "Accounts", url: "/accounts", icon: Building2 },
  { title: "Activity Log", url: "/activity", icon: Clock },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();

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
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-medium text-sidebar-accent-foreground">
            JD
          </div>
          <div className="text-xs">
            <div className="font-medium text-sidebar-accent-foreground">Jane Doe</div>
            <div className="text-sidebar-foreground">CSM</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
