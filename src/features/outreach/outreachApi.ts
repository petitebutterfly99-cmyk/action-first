import type { Account } from "@/shared/data/accounts";

export const GENERATION_TIMEOUT_MS = 2000;

/**
 * Simulated message generator — variable latency + occasional failures
 * so timeout/fallback paths are real. In production this is the AI call.
 */
export function generateSuggestedMessage(account: Account): Promise<string> {
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

/** Simulated send — fails ~30% so retry/copy paths can be exercised. */
export function performSend(): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.3) reject(new Error("send_failed"));
      else resolve();
    }, 1200);
  });
}
