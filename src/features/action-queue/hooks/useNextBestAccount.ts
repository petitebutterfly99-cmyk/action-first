import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Account, RiskLevel } from "@/shared/data/accounts";
import type { NextBestMode } from "@/features/next-best-account";
import { pickNextBestCandidate } from "../api/queueLogic";

const STILL_SEARCHING_DELAY_MS = 2000;
const NEXT_BEST_RESOLVE_MS = 700;
const FAILURE_RATE = 0.1;

/**
 * State machine for the "Next Best Account" momentum modal.
 *
 * After any handled action we call `advance(handledId)`; the hook simulates
 * a brief lookup, optionally fails (~10%), and then surfaces either a candidate
 * (`ready`), a clean "all done" screen (`done`), or an error with retry.
 * The "still searching" flag flips on after 2s so the loader can change copy.
 */
export function useNextBestAccount(opts: {
  getAccounts: () => Account[];
  riskFilter: RiskLevel[];
  onContinue: (account: Account) => void;
  onSwitchRisk: (risk: RiskLevel) => void;
}) {
  const { toast } = useToast();
  const [nextBestAccount, setNextBestAccount] = useState<Account | null>(null);
  const [nextBestMode, setNextBestMode] = useState<NextBestMode>("ready");
  const [nextBestStillSearching, setNextBestStillSearching] = useState(false);
  const [nextBestOpen, setNextBestOpen] = useState(false);
  const lastHandledIdRef = useRef<string | null>(null);
  const stillSearchingTimer = useRef<number | null>(null);

  const clearStillSearchingTimer = () => {
    if (stillSearchingTimer.current) {
      window.clearTimeout(stillSearchingTimer.current);
      stillSearchingTimer.current = null;
    }
  };

  const advance = (justHandledId: string) => {
    lastHandledIdRef.current = justHandledId;
    setNextBestAccount(null);
    setNextBestMode("loading");
    setNextBestStillSearching(false);
    setNextBestOpen(true);
    clearStillSearchingTimer();
    stillSearchingTimer.current = window.setTimeout(
      () => setNextBestStillSearching(true),
      STILL_SEARCHING_DELAY_MS,
    );

    window.setTimeout(() => {
      clearStillSearchingTimer();
      setNextBestStillSearching(false);

      if (Math.random() < FAILURE_RATE) {
        setNextBestMode("error");
        return;
      }

      const candidate = pickNextBestCandidate(
        opts.getAccounts(),
        justHandledId,
        opts.riskFilter,
      );
      if (candidate) {
        setNextBestAccount(candidate);
        setNextBestMode("ready");
      } else {
        setNextBestMode("done");
      }
    }, NEXT_BEST_RESOLVE_MS);
  };

  const retry = () => {
    if (lastHandledIdRef.current) advance(lastHandledIdRef.current);
  };

  const handleContinue = (account: Account) => {
    setNextBestOpen(false);
    setNextBestAccount(null);
    setNextBestMode("ready");
    opts.onContinue(account);
  };

  const stop = () => {
    clearStillSearchingTimer();
    setNextBestOpen(false);
    setNextBestAccount(null);
    setNextBestMode("ready");
    setNextBestStillSearching(false);
  };

  const switchRisk = (risk: RiskLevel) => {
    opts.onSwitchRisk(risk);
    stop();
    toast({
      title: "Filter updated",
      description: `Now viewing ${risk === "low" ? "Healthy" : risk === "medium" ? "Medium Risk" : "High Risk"} accounts.`,
    });
  };

  return {
    nextBestAccount,
    nextBestMode,
    nextBestStillSearching,
    nextBestOpen,
    advance,
    retry,
    handleContinue,
    stop,
    switchRisk,
  };
}
