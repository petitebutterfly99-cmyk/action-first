import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Global offline indicator. Renders a fixed banner at the top of the
 * viewport whenever `navigator.onLine` is false, and auto-hides when
 * connectivity is restored. Includes a manual retry that pings a
 * lightweight URL and reloads on success.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setChecking(true);
    try {
      // Cache-busting HEAD request to verify real connectivity.
      await fetch(`${window.location.origin}/robots.txt?_=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
      });
      setOnline(true);
      window.location.reload();
    } catch {
      setOnline(false);
    } finally {
      setChecking(false);
    }
  };

  if (online) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 inset-x-0 z-[100] bg-[hsl(var(--badge-urgent-bg))] text-[hsl(var(--badge-urgent-fg))] border-b border-[hsl(var(--risk-high))] shadow-md"
    >
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <WifiOff className="w-4 h-4 shrink-0" />
        <div className="flex-1 text-sm">
          <span className="font-medium">You're offline.</span>{" "}
          <span className="opacity-90">
            Check your connection — we'll reconnect automatically when you're back.
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs bg-background/10 border-current hover:bg-background/20"
          onClick={handleRetry}
          disabled={checking}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Checking…" : "Retry"}
        </Button>
      </div>
    </div>
  );
}
