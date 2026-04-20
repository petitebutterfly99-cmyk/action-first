import { useEffect, useRef, useState } from "react";
import { AlertCircle, Copy, Loader2, RefreshCw } from "lucide-react";
import { Account } from "@/data/mockAccounts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface OutreachModalProps {
  account: Account | null;
  open: boolean;
  onClose: () => void;
  onSend: (account: Account, message: string) => void;
}

type SendState = "idle" | "sending" | "error";

const FALLBACK_PLACEHOLDER =
  "Write a short outreach note to help this customer invite a teammate";

// Simulated generator — variable latency + occasional failures so timeout/fallback paths are real.
function generateSuggestedMessage(account: Account): Promise<string> {
  return new Promise((resolve, reject) => {
    // Random latency 300ms–4500ms so the 2s timeout is exercised regularly.
    const latency = 300 + Math.random() * 4200;
    setTimeout(() => {
      if (Math.random() < 0.15) {
        reject(new Error("generation_failed"));
        return;
      }
      const first = account.contactName?.split(" ")[0] ?? "there";
      resolve(
        `Hey ${first} — most teams see value once they invite a teammate. Want help getting your team set up?`,
      );
    }, latency);
  });
}

const GENERATION_TIMEOUT_MS = 2000;

// Simulated send — fails ~30% of the time so retry/copy paths can be exercised.
function performSend(): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.3) reject(new Error("send_failed"));
      else resolve();
    }, 1200);
  });
}

export function OutreachModal({ account, open, onClose, onSend }: OutreachModalProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [sendState, setSendState] = useState<SendState>("idle");
  const [stillSending, setStillSending] = useState(false);
  const [lastAccountId, setLastAccountId] = useState<string | null>(null);
  const stillSendingTimer = useRef<number | null>(null);

  // Regenerate when account changes / modal opens fresh.
  useEffect(() => {
    if (!account || !open) return;
    if (account.id === lastAccountId) return;
    setLastAccountId(account.id);
    setMessage("");
    setSendState("idle");
    setStillSending(false);
    setGenerationFailed(false);
    setIsGenerating(true);
    let cancelled = false;
    generateSuggestedMessage(account)
      .then((text) => {
        if (cancelled) return;
        setMessage(text);
        setGenerationFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        setGenerationFailed(true);
        setMessage("");
      })
      .finally(() => {
        if (!cancelled) setIsGenerating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [account, open, lastAccountId]);

  const clearStillSendingTimer = () => {
    if (stillSendingTimer.current) {
      window.clearTimeout(stillSendingTimer.current);
      stillSendingTimer.current = null;
    }
  };

  useEffect(() => () => clearStillSendingTimer(), []);

  const handleSend = async () => {
    if (!account || !message.trim() || sendState === "sending") return;
    setSendState("sending");
    setStillSending(false);
    clearStillSendingTimer();
    stillSendingTimer.current = window.setTimeout(() => setStillSending(true), 2500);
    try {
      await performSend();
      clearStillSendingTimer();
      setStillSending(false);
      setSendState("idle");
      onSend(account, message);
    } catch {
      clearStillSendingTimer();
      setStillSending(false);
      setSendState("error");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast({ title: "Message copied" });
    } catch {
      toast({
        title: "Couldn't copy",
        description: "Your browser blocked clipboard access.",
        variant: "destructive",
      });
    }
  };

  // Closing always preserves draft; we only reset when the account itself changes.
  const handleOpenChange = (o: boolean) => {
    if (o) return;
    if (sendState === "sending") return; // do not allow closing mid-send
    onClose();
  };

  if (!account) return null;

  const isSending = sendState === "sending";
  const sendDisabled = isSending || isGenerating || !message.trim();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Send Outreach to {account.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            To: {account.contactName} ({account.contactEmail})
          </div>

          {generationFailed && (
            <div className="flex items-start gap-2 text-xs rounded-md border border-border bg-muted/50 p-2 text-muted-foreground">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-[hsl(var(--risk-medium))] shrink-0" />
              <span>We couldn't generate a suggested message. You can still write your own.</span>
            </div>
          )}

          <div className="relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="text-sm"
              placeholder={FALLBACK_PLACEHOLDER}
              disabled={isSending}
            />
            {isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-md">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating suggested message…
                </div>
              </div>
            )}
          </div>

          {sendState === "error" && (
            <div className="rounded-md border border-[hsl(var(--risk-high))] bg-[hsl(var(--badge-urgent-bg))] p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 text-[hsl(var(--risk-high))] shrink-0" />
                <div className="text-xs">
                  <div className="font-semibold text-[hsl(var(--badge-urgent-fg))]">
                    Message failed to send
                  </div>
                  <div className="text-[hsl(var(--badge-urgent-fg))]/80">
                    Your message was not sent. Check your connection and try again.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-6">
                <Button size="sm" variant="default" className="h-7 text-xs" onClick={handleSend}>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleCopy}>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy message
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {isSending && stillSending && (
            <div className="text-xs text-muted-foreground">Still sending…</div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSend} disabled={sendDisabled}>
            {isSending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Sending…
              </>
            ) : (
              "Send Message"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
