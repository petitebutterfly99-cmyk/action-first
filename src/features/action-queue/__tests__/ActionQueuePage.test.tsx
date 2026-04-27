import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Mocks (must be declared before importing the component) ----------------

// fetchAccounts is the only data path we need to control for these tests.
const fetchAccountsMock = vi.fn();
vi.mock("@/shared/data/accounts", async () => {
  const actual = await vi.importActual<typeof import("@/shared/data/accounts")>(
    "@/shared/data/accounts",
  );
  return {
    ...actual,
    fetchAccounts: (...args: unknown[]) => fetchAccountsMock(...args),
    updateAccountInDb: vi.fn().mockResolvedValue(undefined),
    bulkUpdateAccountsInDb: vi.fn().mockResolvedValue(undefined),
  };
});

// AuthProvider would otherwise call into Supabase — stub the hook.
vi.mock("@/features/auth", () => ({
  useAuth: () => ({
    user: { id: "test-user", email: "test@demo.app" },
    profile: { id: "test-user", full_name: "Test User", email: "test@demo.app", role: "csm" },
    session: { access_token: "x" },
    loading: false,
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}));

// Activity log + analytics are fire-and-forget side effects unrelated to these tests.
vi.mock("@/features/activity-log", () => ({
  safeLog: (_t: unknown, fn: () => void) => fn(),
  activityStore: {
    list: () => [],
    hydrate: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn(),
    setCurrentUser: vi.fn(),
    subscribe: () => () => {},
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/features/analytics", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/features/analytics");
  return {
    ...actual,
    trackEvent: vi.fn().mockResolvedValue(undefined),
    useSession: () => ({ sessionStartedISO: new Date().toISOString() }),
    useMetrics: () => null,
    KpiRow: () => null,
    CsmPerformancePanel: () => null,
    classifyAiUsage: () => null,
  };
});

// --- Now import the component under test -----------------------------------

import ActionQueuePage from "../components/ActionQueuePage";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ActionQueuePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ActionQueuePage — error & empty states", () => {
  beforeEach(() => {
    fetchAccountsMock.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the empty 'No assigned accounts' state when fetch returns []", async () => {
    fetchAccountsMock.mockResolvedValueOnce([]);
    renderPage();
    expect(await screen.findByText(/No assigned accounts/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /contact admin/i }),
    ).toBeInTheDocument();
  });

  it("shows an error card with a Retry button when fetch fails, then refetches on click", async () => {
    fetchAccountsMock
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce([]);

    renderPage();

    // Error card is shown.
    expect(await screen.findByText(/Couldn't load accounts/i)).toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: /retry/i });

    // Click Retry -> re-runs fetchAccounts, lands on the empty state.
    fireEvent.click(retryButton);
    await waitFor(() => expect(fetchAccountsMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/No assigned accounts/i)).toBeInTheDocument();
  });
});
