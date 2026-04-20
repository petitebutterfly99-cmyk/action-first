export type RiskLevel = "high" | "medium" | "low";
export type AccountStatus = "needs_action" | "contacted" | "reviewed" | "snoozed" | "follow_up_needed";

export interface Account {
  id: string;
  name: string;
  daysSinceSignup: number;
  invitesSent: number;
  activeUsers: number;
  lastActivityDays: number;
  risk: RiskLevel;
  arr: number;
  plan: string;
  status: AccountStatus;
  signupDate: string;
  firstTaskCreated: boolean;
  minutesToFirstTask: number | null;
  contactName: string;
  contactEmail: string;
  quote?: { text: string; source: string };
}

const quotes = [
  { text: "I couldn't figure out where to invite my team", source: "Churned user, Day 3" },
  { text: "I just needed a to-do list, not a workspace setup", source: "Churned user, Day 1" },
  { text: "It clicked when I invited my co-founder", source: "Retained user" },
  { text: "The onboarding felt too complex for a solo test", source: "Churned user, Day 2" },
  { text: "Once my team joined, we couldn't go back", source: "Retained user" },
  { text: "I didn't realize inviting was free", source: "Churned user, Day 4" },
  { text: "We started using it daily after the second person joined", source: "Retained user" },
  { text: "I signed up on a whim and forgot about it", source: "Churned user, Day 1" },
];

const companyNames = [
  "Acme Corp", "Beacon Analytics", "CloudStack Inc", "DataPrime", "EdgePoint",
  "FrostByte", "GreenLeaf Tech", "HorizonIO", "InnovateCo", "JetStream",
  "KineticLabs", "LunarSoft", "MapleDev", "NorthStar AI", "OmniFlow",
  "PeakOps", "QuantumBit", "RedShift", "SkyVault", "TerraNode",
  "UltraSync", "VelocityHQ", "WavePoint", "XenonData", "YieldBase",
  "ZetaCloud", "AlphaForge", "BrightPath", "CoreSignal", "DeltaWorks",
  "EchoSystems", "FluxNet", "GridPoint", "HyperLink", "IronClad",
  "JunctionAI", "KeyVault", "LatticeOps", "MetricFlow", "NexaHub",
  "OrbitStack", "PulseDev",
];

const contacts = [
  { name: "Sarah Chen", email: "sarah@" },
  { name: "Marcus Johnson", email: "marcus@" },
  { name: "Emily Rodriguez", email: "emily@" },
  { name: "David Kim", email: "david@" },
  { name: "Lisa Park", email: "lisa@" },
  { name: "James Wright", email: "james@" },
  { name: "Anna Müller", email: "anna@" },
  { name: "Raj Patel", email: "raj@" },
  { name: "Sophie Taylor", email: "sophie@" },
  { name: "Mike Chang", email: "mike@" },
];

const plans = ["Starter", "Professional", "Business", "Enterprise"];

function generateAccounts(): Account[] {
  return companyNames.map((name, i) => {
    const daysSinceSignup = Math.floor(Math.random() * 7) + 1;
    const hasInvited = Math.random() < 0.12; // only 12% invite
    const invitesSent = hasInvited ? Math.floor(Math.random() * 4) + 1 : 0;
    const activeUsers = hasInvited ? Math.floor(Math.random() * 3) + 2 : 1;
    const lastActivityDays = hasInvited ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 5) + 1;
    const firstTaskCreated = Math.random() < 0.3;
    const minutesToFirstTask = firstTaskCreated ? Math.floor(Math.random() * 120) + 5 : null;

    let risk: RiskLevel = "low";
    if (invitesSent === 0 && lastActivityDays >= 2) risk = "high";
    else if (invitesSent === 0 || lastActivityDays >= 2) risk = "medium";

    const arr = [1200, 3600, 6000, 12000, 24000, 48000][Math.floor(Math.random() * 6)];
    const plan = plans[Math.floor(Math.random() * plans.length)];
    const contact = contacts[i % contacts.length];
    const domain = name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z]/g, "") + ".com";

    return {
      id: `acc-${i + 1}`,
      name,
      daysSinceSignup,
      invitesSent,
      activeUsers,
      lastActivityDays,
      risk,
      arr,
      plan,
      status: "needs_action" as AccountStatus,
      signupDate: new Date(Date.now() - daysSinceSignup * 86400000).toISOString().split("T")[0],
      firstTaskCreated,
      minutesToFirstTask,
      contactName: contact.name,
      contactEmail: contact.email + domain,
      quote: Math.random() < 0.6 ? quotes[Math.floor(Math.random() * quotes.length)] : undefined,
    };
  });
}

export const mockAccounts = generateAccounts();

export const activityLog = [
  { id: "1", action: "Sent outreach", account: "Acme Corp", user: "You", timestamp: "2 hours ago" },
  { id: "2", action: "Marked as reviewed", account: "CloudStack Inc", user: "You", timestamp: "3 hours ago" },
  { id: "3", action: "Sent invite prompt", account: "DataPrime", user: "You", timestamp: "Yesterday" },
  { id: "4", action: "Sent outreach", account: "FrostByte", user: "You", timestamp: "Yesterday" },
  { id: "5", action: "Marked as reviewed", account: "HorizonIO", user: "You", timestamp: "2 days ago" },
];
