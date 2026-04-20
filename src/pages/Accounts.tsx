import { AppLayout } from "@/components/AppLayout";
import { mockAccounts } from "@/data/mockAccounts";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AccountsPage() {
  const navigate = useNavigate();

  const handleViewInQueue = (id: string) => {
    navigate(`/?focus=${id}`);
  };

  return (
    <AppLayout title="All Accounts" subtitle="Complete list of managed accounts">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 font-medium">Account</th>
              <th className="pb-2 font-medium">Contact</th>
              <th className="pb-2 font-medium">Plan</th>
              <th className="pb-2 font-medium">ARR</th>
              <th className="pb-2 font-medium">Day</th>
              <th className="pb-2 font-medium">Invites</th>
              <th className="pb-2 font-medium">Users</th>
              <th className="pb-2 font-medium">Risk</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {mockAccounts.map((a) => (
              <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-2.5 font-medium text-foreground">{a.name}</td>
                <td className="py-2.5 text-muted-foreground">{a.contactName}</td>
                <td className="py-2.5 text-muted-foreground">{a.plan}</td>
                <td className="py-2.5 text-muted-foreground">${(a.arr / 1000).toFixed(0)}k</td>
                <td className="py-2.5">{a.daysSinceSignup}</td>
                <td className={`py-2.5 ${a.invitesSent === 0 ? "text-risk-high font-medium" : ""}`}>{a.invitesSent}</td>
                <td className="py-2.5">{a.activeUsers}</td>
                <td className="py-2.5">
                  <span className={`text-xs ${a.risk === "high" ? "text-risk-high" : a.risk === "medium" ? "text-risk-medium" : "text-risk-low"}`}>
                    {a.risk}
                  </span>
                </td>
                <td className="py-2.5 capitalize text-muted-foreground">{a.status.replace(/_/g, " ")}</td>
                <td className="py-2.5 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-primary hover:text-primary"
                    onClick={() => handleViewInQueue(a.id)}
                  >
                    View in Action Queue
                    <ArrowUpRight className="w-3 h-3 ml-1" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
