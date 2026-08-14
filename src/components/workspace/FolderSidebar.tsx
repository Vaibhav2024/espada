import { Folder, FolderClosed, History, MessageSquare, PanelLeft, Plus, User } from "lucide-react";

export function FolderSidebar({
  collapsed,
  onToggle,
  onNewSpace,
  onMembersToggle,
  isMembersOpen,
  onKnowledgeToggle,
  isKnowledgeOpen,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNewSpace?: () => void;
  onMembersToggle?: () => void;
  isMembersOpen?: boolean;
  onKnowledgeToggle?: () => void;
  isKnowledgeOpen?: boolean;
}) {
  if (collapsed) {
    return (
      <div className="flex h-full w-[74px] flex-col items-center gap-4 border-r border-border bg-sidebar py-4">
        <button
          onClick={onToggle}
          aria-label="Expand sidebar"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <PanelLeft size={19} />
        </button>
        <button 
          onClick={onMembersToggle}
          className={`mt-5 transition-colors hover:text-foreground ${
            isMembersOpen ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <User size={18} />
        </button>
        <button 
          onClick={onKnowledgeToggle}
          className={`transition-colors hover:text-foreground ${
            isKnowledgeOpen ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          <FolderClosed size={18} />
        </button>
        <div className="my-2 h-px w-7 bg-border" />
        <button
          onClick={onNewSpace}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus size={19} />
        </button>
        <button className="mt-3 text-muted-foreground transition-colors hover:text-foreground">
          <History size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-[260px] flex-col border-r border-border bg-sidebar">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
            <Folder size={16} className="text-muted-foreground" />
            My folder
          </div>
          <button
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <PanelLeft size={18} />
          </button>
        </div>

        <button 
          onClick={onMembersToggle}
          className={`mt-4 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-secondary/60 ${
            isMembersOpen ? "bg-secondary text-foreground font-semibold" : "text-foreground"
          }`}
        >
          <span className="flex items-center gap-2.5">
            <User size={15} className="text-muted-foreground" />
            <span className="font-semibold">Members</span>
          </span>
          <span className="text-muted-foreground text-xs bg-secondary/80 px-1.5 py-0.5 rounded">1</span>
        </button>
        <button 
          onClick={onKnowledgeToggle}
          className={`mt-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-secondary/60 ${
            isKnowledgeOpen ? "bg-secondary text-foreground font-semibold" : "text-foreground"
          }`}
        >
          <span className="flex items-center gap-2.5">
            <FolderClosed size={15} className="text-destructive" />
            <span className="font-semibold">Knowledge</span>
          </span>
          <span className="text-muted-foreground text-xs bg-secondary/80 px-1.5 py-0.5 rounded">0</span>
        </button>
      </div>

      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <span className="text-sm font-semibold text-foreground">New space</span>
        <button
          onClick={onNewSpace}
          aria-label="New space"
          className="text-foreground transition-opacity hover:opacity-70"
        >
          <Plus size={19} />
        </button>
      </div>

      <div className="px-6 py-5">
        <p className="text-sm font-semibold text-muted-foreground">Private</p>
        <button className="mt-4 flex w-full items-center gap-2.5 rounded-xl bg-secondary px-3.5 py-2.5 text-sm font-semibold text-foreground">
          <MessageSquare size={15} className="text-muted-foreground" />
          Untitled space
        </button>
      </div>
    </div>
  );
}
