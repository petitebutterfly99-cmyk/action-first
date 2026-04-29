import { useEffect, useRef, useState } from "react";
import { AlertCircle, Copy, Loader2, RefreshCw } from "lucide-react";
import type { Account } from "@/shared/data/accounts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { trackEvent, classifyAiUsage } from "@/features/analytics";
import { buildDefaultTemplate, FALLBACK_PLACEHOLDER, loadDefaultTemplate } from "../api/template";
import {
  GENERATION_TIMEOUT_MS,
  generateSuggestedMessage,
  performSend,
} from "../api/outreachApi";

interface OutreachModalProps {
  account: Account | null;
  open: boolean;
  onClose: () => void;
  onSend: (account: Account, message: string) => void;
  /** Optional ref forwarded to the "Send Message" button (for the guided tour). */
  sendButtonRef?: React.Ref<HTMLButtonElement>;
}

type SendState = "idle" | "sending" | "error";

export function OutreachModal({ account, open, onClose, onSend, sendButtonRef }: OutreachModalProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [generationTimedOut, setGenerationTimedOut] = useState(false);
  const [sendState, setSendState] = useState<SendState>("idle");
  const [stillSending, setStillSending] = useState(false);
  const [lastAccountId, setLastAccountId] = useState<string | null>(null);
  const stillSendingTimer = useRef<number | null>(null);
  const userTypedRef = useRef(false);
  const generationIdRef = useRef(0);
  const aiSuggestionRef = useRef<string>(""); // last successful AI suggestion text
  const sendAttemptCountRef = useRef(0); // for outreach_retry classification

  const startGeneration = (acc: Account) => {
    const myId = ++generationIdRef.current;
    setIsGenerating(true);
    setGenerationFailed(false);
    setGenerationTimedOut(false);

    let settled = false;

    // Hard 2s cap — after which generation becomes non-blocking and we surface fallback copy.
    // We do NOT cancel the underlying promise; if it lands later and the user hasn't typed,
    // we still insert the suggestion.
    const timeoutHandle = window.setTimeout(() => {
      if (settled || myId !== generationIdRef.current) return;
      setGenerationTimedOut(true);
      setIsGenerating(false);
    }, GENERATION_TIMEOUT_MS);

    generateSuggestedMessage(acc)
      .then((text) => {
        settled = true;
        window.clearTimeout(timeoutHandle);
        if (myId !== generationIdRef.current) return;
        setIsGenerating(false);
        aiSuggestionRef.current = text;
        if (!userTypedRef.current) {
          setMessage(text);
          setGenerationTimedOut(false);
          setGenerationFailed(false);
        }
      })
      .catch(() => {
        settled = true;
        window.clearTimeout(timeoutHandle);
        if (myId !== generationIdRef.current) return;
        setIsGenerating(false);
        if (!userTypedRef.current) {
          setGenerationFailed(true);
          setGenerationTimedOut(false);
        }
      });
  };

  // Open modal immediately with a default template; kick off AI generation in the background.
  useEffect(() => {
    if (!account || !open) return;
    if (account.id === lastAccountId) return;
    setLastAccountId(account.id);
    // Sync fallback first so the textarea is never empty.
    setMessage(buildDefaultTemplate(account));
    setSendState("idle");
    setStillSending(false);
    userTypedRef.current = false;
    aiSuggestionRef.current = "";
    sendAttemptCountRef.current = 0;
    // Async: prefer the user's saved default template if any.
    loadDefaultTemplate(account).then((tpl) => {
      if (!userTypedRef.current) setMessage(tpl);
    });
    startGeneration(account);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, open, lastAccountId]);

  const handleRetryGeneration = () => {
    if (!account) return;
    if (!userTypedRef.current || message === buildDefaultTemplate(account)) {
      userTypedRef.current = false;
    }
    startGeneration(account);
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    userTypedRef.current = true;
    setMessage(e.target.value);
  };

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

    sendAttemptCountRef.current += 1;
    const isRetry = sendAttemptCountRef.current > 1;
    void trackEvent({
      type: "outreach_send_attempt",
      accountId: account.id,
      metadata: { attempt: sendAttemptCountRef.current, retry: isRetry },
    });
    if (isRetry) {
      void trackEvent({
        type: "outreach_retry",
        accountId: account.id,
        metadata: { attempt: sendAttemptCountRef.current },
      });
    }

    try {
      await performSend();
      clearStillSendingTimer();
      setStillSending(false);
      setSendState("idle");

      // Classify AI suggestion usage based on what was actually sent.
      const aiClass = classifyAiUsage(aiSuggestionRef.current, message);
      if (aiClass) {
        void trackEvent({
          type: aiClass,
          accountId: account.id,
        });
      }
      void trackEvent({
        type: "outreach_send_success",
        accountId: account.id,
        metadata: { attempt: sendAttemptCountRef.current },
      });

      onSend(account, message);
    } catch {
      clearStillSendingTimer();
      setStillSending(false);
      setSendState("error");
      void trackEvent({
        type: "outreach_send_failure",
        accountId: account.id,
        metadata: { attempt: sendAttemptCountRef.current },
      });
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
  const sendDisabled = isSending || !message.trim();

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

          <Textarea
            value={message}
            onChange={handleMessageChange}
            rows={4}
            className="text-sm"
            placeholder={FALLBACK_PLACEHOLDER}
            disabled={isSending}
            autoFocus
          />

          {/* Background generation status — never blocks the compose UI. */}
          {isGenerating && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating suggested message…
            </div>
          )}

          {!isGenerating && (generationTimedOut || generationFailed) && (
            <div className="flex items-start justify-between gap-2 text-xs rounded-md border border-border bg-muted/50 p-2 text-muted-foreground">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-[hsl(var(--risk-medium))] shrink-0" />
                <span>
                  We couldn't generate a suggestion right now. You can still edit this message.
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs px-2 -mt-0.5 shrink-0"
                onClick={handleRetryGeneration}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Try again
              </Button>
            </div>
          )}

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
          <Button ref={sendButtonRef} size="sm" onClick={handleSend} disabled={sendDisabled}>
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
