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
  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center px-6 border-b bg-card shrink-0">
          <div>
            {title && <h1 className="text-base font-semibold text-foreground">{title}</h1>}
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
