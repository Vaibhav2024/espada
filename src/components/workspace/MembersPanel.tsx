"use client";

import { useState, useEffect } from "react";
import {
  UserPlus,
  ChevronsLeft,
  Users,
  Crosshair,
  Brain,
  Globe,
  Lock,
  Check,
} from "lucide-react";
import { fetchFolderMembers, type FolderMemberData } from "@/lib/api";

interface MembersPanelProps {
  folderId?: string;
  inviteCode?: string;
  onClose: () => void;
}

export function MembersPanel({ folderId, inviteCode, onClose }: MembersPanelProps) {
  const [showInvitePopup, setShowInvitePopup] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [joinPreference, setJoinPreference] = useState<"link" | "web">("link");
  const [members, setMembers] = useState<FolderMemberData[]>([]);
  const [loading, setLoading] = useState(false);

  const inviteLink = inviteCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/join?code=${inviteCode}`
    : "";
  const displayCode = inviteCode || "";

  useEffect(() => {
    if (folderId) {
      setLoading(true);
      fetchFolderMembers(folderId)
        .then(setMembers)
        .catch((err) => console.error("Failed to fetch members:", err))
        .finally(() => setLoading(false));
    }
  }, [folderId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(displayCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `Joined ${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    if (diffHours > 0) return `Joined ${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return "Joined just now";
  };

  return (
    <div className="relative flex h-full w-[350px] flex-col border-r border-border bg-[#0d0d0e]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Members</span>
          <span className="text-xs font-semibold text-muted-foreground">{members.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInvitePopup(true)}
            aria-label="Invite member"
            className="text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            <UserPlus size={16} />
          </button>
          <button
            onClick={onClose}
            aria-label="Collapse panel"
            className="text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            <ChevronsLeft size={16} />
          </button>
        </div>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
          </div>
        ) : members.length > 0 ? (
          <div className="space-y-1">
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-3 rounded-xl hover:bg-secondary/40 p-2 -mx-2 transition-colors"
              >
                <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-800 text-foreground font-semibold overflow-hidden">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm">
                      {(member.name || member.email || "?")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {member.name || member.email}
                    {member.role === "owner" && (
                      <span className="ml-2 text-[10px] font-semibold text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded-md">
                        Owner
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{getTimeAgo(member.joinedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Promotion Center Box */}
        {members.length <= 1 && !loading && (
          <div className="mt-12 flex flex-col items-center text-center">
            <div className="flex size-14 items-center justify-center rounded-full border border-dashed border-border bg-card/40 text-muted-foreground mb-6">
              <UserPlus size={24} />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-6">Why invite members to your folder?</h3>
            
            <div className="space-y-6 text-left w-full">
              <div className="flex gap-3 items-start">
                <Users size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Members in your folder can add, remove, and use knowledge in your folder.
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <Crosshair size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  On average, responses from Espada are <span className="text-foreground font-semibold">2x more powerful</span> in folders with 5 or more members.
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <Brain size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  The more members you add, the smarter Espada becomes for everyone in your folder.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowInvitePopup(true)}
              className="mt-8 rounded-xl bg-zinc-800 border border-white/[0.08] hover:bg-zinc-700 px-4 py-2.5 text-xs font-semibold text-foreground transition active:scale-[0.98] cursor-pointer"
            >
              Invite members
            </button>
          </div>
        )}
      </div>

      {/* Invite Popup Popover Overlay */}
      {showInvitePopup && (
        <div className="absolute inset-x-4 top-[64px] z-30 rounded-2xl border border-border bg-[#161617] p-5 shadow-2xl animate-[fadeIn_0.15s_ease-out]">
          <div className="flex justify-between items-start mb-4">
            <h4 className="text-sm font-bold text-foreground">Who can join this folder?</h4>
            <button
              onClick={() => setShowInvitePopup(false)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Close
            </button>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground mb-5">
            Members can use and edit the knowledge, view shared spaces and invite other members.
          </p>

          {/* Preferences Radio List */}
          <div className="space-y-2 mb-6">
            <button
              onClick={() => setJoinPreference("link")}
              className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-xs font-semibold transition-all ${
                joinPreference === "link"
                  ? "border-white/20 bg-white/5 text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-white/5"
              }`}
            >
              <div className="flex size-4 items-center justify-center rounded-full border border-current">
                {joinPreference === "link" && <div className="size-2 rounded-full bg-foreground" />}
              </div>
              <div className="flex items-center gap-2">
                <Lock size={13} />
                <span>Only people with the link</span>
              </div>
            </button>

            <button
              onClick={() => setJoinPreference("web")}
              className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-xs font-semibold transition-all ${
                joinPreference === "web"
                  ? "border-white/20 bg-white/5 text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-white/5"
              }`}
            >
              <div className="flex size-4 items-center justify-center rounded-full border border-current">
                {joinPreference === "web" && <div className="size-2 rounded-full bg-foreground" />}
              </div>
              <div className="flex items-center gap-2">
                <Globe size={13} />
                <span>Anyone on the web</span>
              </div>
            </button>
          </div>

          {/* Copy Actions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 rounded-xl bg-secondary/40 p-1.5 pl-3 border border-border">
              <span className="text-xs text-muted-foreground truncate select-all">{inviteLink || "No invite link available"}</span>
              <button
                onClick={handleCopyLink}
                disabled={!inviteLink}
                className="shrink-0 rounded-lg bg-foreground px-3 py-1.5 text-[11px] font-semibold text-background hover:opacity-90 transition active:scale-95 disabled:opacity-50"
              >
                {copiedLink ? "Copied!" : "Copy link"}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-xl bg-secondary/40 p-1.5 pl-3 border border-border">
              <span className="text-xs text-foreground font-semibold select-all">{displayCode || "—"}</span>
              <button
                onClick={handleCopyCode}
                disabled={!displayCode}
                className="shrink-0 rounded-lg bg-foreground px-3 py-1.5 text-[11px] font-semibold text-background hover:opacity-90 transition active:scale-95 disabled:opacity-50"
              >
                {copiedCode ? "Copied!" : "Copy code"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
