import { useState } from "react";
import { Account } from "@/data/mockAccounts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface OutreachModalProps {
  account: Account | null;
  open: boolean;
  onClose: () => void;
  onSend: (account: Account, message: string) => void;
}

export function OutreachModal({ account, open, onClose, onSend }: OutreachModalProps) {
  const defaultMessage = `Hey ${account?.contactName?.split(" ")[0] ?? ""} — most teams see value once they invite a teammate. Want help getting your team set up?`;
  const [message, setMessage] = useState(defaultMessage);

  // Reset message when account changes
  const [lastAccountId, setLastAccountId] = useState<string | null>(null);
  if (account && account.id !== lastAccountId) {
    setLastAccountId(account.id);
    setMessage(`Hey ${account.contactName.split(" ")[0]} — most teams see value once they invite a teammate. Want help getting your team set up?`);
  }

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
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
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="text-sm"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onSend(account, message)}>Send Message</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
