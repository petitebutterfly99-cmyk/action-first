import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { AppLayout } from "@/shared/components/AppLayout";
import { mockAccounts } from "@/shared/data/accounts";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

/**
 * Source of truth for what's currently in the Action Queue. In a real app
 * this would consult the same store as ActionQueue. For the prototype we
 * expose a single helper so both screens stay in sync.
 */
function isAccountInQueue(id: string): boolean {
  return mockAccounts.some((a) => a.id === id);
}

export default function AccountsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notInQueueAccount, setNotInQueueAccount] = useState<{ id: string; name: string } | null>(
    null,
  );

  const navigateToQueue = (id: string) => {
    try {
      navigate(`/?focus=${encodeURIComponent(id)}`);
    } catch {
      const t = toast({
        title: "Navigation failed",
        description: "We couldn't open this account in the Action Queue.",
        variant: "destructive",
        duration: 10000,
        action: (
          <ToastAction
            altText="Retry"
            onClick={(e) => {
              e.preventDefault();
              t.dismiss();
              navigateToQueue(id);
            }}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </ToastAction>
        ),
      });
    }
  };

  const handleViewInQueue = (id: string, name: string) => {
    if (!isAccountInQueue(id)) {
      setNotInQueueAccount({ id, name });
      return;
    }
    navigateToQueue(id);
  };

  const handleViewAllInQueue = () => {
    setNotInQueueAccount(null);
    navigate(`/?reset=1`);
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
                <td
                  className={`py-2.5 ${a.invitesSent === 0 ? "text-risk-high font-medium" : ""}`}
                >
                  {a.invitesSent}
                </td>
                <td className="py-2.5">{a.activeUsers}</td>
                <td className="py-2.5">
                  <span
                    className={`text-xs ${a.risk === "high" ? "text-risk-high" : a.risk === "medium" ? "text-risk-medium" : "text-risk-low"}`}
                  >
                    {a.risk}
                  </span>
                </td>
                <td className="py-2.5 capitalize text-muted-foreground">
                  {a.status.replace(/_/g, " ")}
                </td>
                <td className="py-2.5 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-primary hover:text-primary"
                    onClick={() => handleViewInQueue(a.id, a.name)}
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

      <AlertDialog
        open={!!notInQueueAccount}
        onOpenChange={(o) => !o && setNotInQueueAccount(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              This account is not currently in the Action Queue.
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {notInQueueAccount?.name
                ? `${notInQueueAccount.name} may not match the current risk or status criteria.`
                : "It may not match the current risk or status criteria."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Stay on Account</AlertDialogCancel>
            <AlertDialogAction className="text-xs h-8" onClick={handleViewAllInQueue}>
              View all accounts in queue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
