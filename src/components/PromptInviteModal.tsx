import { Account } from "@/data/mockAccounts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

interface PromptInviteModalProps {
  account: Account | null;
  open: boolean;
  onClose: () => void;
}

export function PromptInviteModal({ account, open, onClose }: PromptInviteModalProps) {
  if (!account) return null;

  const inviteMessage = `Hey ${account.contactName.split(" ")[0]}, you can invite your team in seconds — just share this link and they'll be set up instantly. No friction, no setup needed.`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Prompt Invite — {account.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Recommendation</p>
            <p>Recommend sending a simple invite link to reduce friction. Accounts that invite at least one teammate in the first 5 days retain at 3x the rate.</p>
          </div>
          <div>
            <p className="text-xs font-medium text-foreground mb-1">Suggested message for customer:</p>
            <div className="bg-card border rounded-md p-3 text-xs text-foreground">
              {inviteMessage}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          <Button size="sm" onClick={onClose}>Copy & Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
