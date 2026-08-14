import { RotateCw, UserPlus } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CODE = "KMGOKF";

function CopyRow({ value }: { value: string }) {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary/60 py-2 pl-4 pr-2">
      <span className="flex-1 truncate text-sm text-foreground">{value}</span>
      <button
        onClick={() => navigator.clipboard?.writeText(value)}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Copy
      </button>
    </div>
  );
}

export function InviteFriendsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] gap-0 rounded-3xl border-border bg-popover p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            Invite friends, get Pro for 1 day
          </DialogTitle>
        </DialogHeader>
        <p className="mt-3 text-sm text-muted-foreground">
          Unlock 1 day of Atlas Pro each time a friend you invite finishes creating their account
        </p>

        <p className="mt-6 text-sm font-semibold text-foreground">Invite with link</p>
        <CopyRow value={`www.atlas.org/invite?u=${CODE}`} />

        <p className="mt-6 text-sm font-semibold text-foreground">Invite code</p>
        <CopyRow value={CODE} />

        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            Invite history <span className="text-muted-foreground">0</span>
          </p>
          <button
            aria-label="Refresh"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCw size={16} />
          </button>
        </div>

        <div className="flex flex-col items-center py-8">
          <UserPlus size={40} className="text-muted-foreground" />
          <p className="mt-5 text-base font-semibold text-foreground">No completed invites</p>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Invites are completed when your friend finishes creating their account
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
