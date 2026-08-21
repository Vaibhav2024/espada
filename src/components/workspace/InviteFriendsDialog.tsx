"use client";

import { useEffect, useState } from "react";
import { RotateCw, UserPlus, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchUserProfile, fetchInvites, type InviteData } from "@/lib/api";

function CopyRow({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary/60 py-2 pl-4 pr-2">
      <span className="flex-1 truncate text-sm text-foreground select-all">{value}</span>
      <button
        onClick={handleCopy}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

export function InviteFriendsDialog({
  open,
  onOpenChange,
  inviteCode: propInviteCode,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  inviteCode?: string;
}) {
  const [code, setCode] = useState(propInviteCode || "");
  const [inviteHistory, setInviteHistory] = useState<InviteData[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profile, history] = await Promise.all([
        fetchUserProfile(),
        fetchInvites(),
      ]);
      setCode(profile.inviteCode);
      setInviteHistory(history);
    } catch (err) {
      console.error("Failed to load invite data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const completedCount = inviteHistory.filter((i) => i.status === "completed").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[500px] gap-0 sm:rounded-3xl rounded-2xl border-border bg-popover p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            Invite friends, get Pro for 1 day
          </DialogTitle>
        </DialogHeader>
        <p className="mt-3 text-sm text-muted-foreground">
          Unlock 1 day of Espada Pro each time a friend you invite finishes creating their account
        </p>

        {/* Known gap: No abuse prevention (e.g. self-referral via multiple accounts) is built in this pass. */}

        <p className="mt-6 text-sm font-semibold text-foreground">Invite with link</p>
        <CopyRow value={`https://mytestingdomain.co.in/invite?u=${code}`} />

        <p className="mt-6 text-sm font-semibold text-foreground">Invite code</p>
        <CopyRow value={code} />

        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            Invite history{" "}
            <span className="text-muted-foreground">{completedCount}</span>
          </p>
          <button
            onClick={loadData}
            disabled={loading}
            aria-label="Refresh"
            className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            <RotateCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {inviteHistory.length === 0 ? (
          <div className="flex flex-col items-center py-8">
            <UserPlus size={40} className="text-muted-foreground" />
            <p className="mt-5 text-base font-semibold text-foreground">No completed invites</p>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Invites are completed when your friend finishes creating their account
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto">
            {inviteHistory.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between rounded-xl bg-secondary/40 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-[#10b981]/10 text-[#10b981]">
                    <Check size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {invite.inviteeName || invite.inviteeEmail || "Unknown user"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {invite.completedAt
                        ? new Date(invite.completedAt).toLocaleDateString()
                        : "Pending"}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#10b981]">+1 day Pro</span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
