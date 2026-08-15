import {
  Folder,
  FolderClosed,
  History,
  MessageSquare,
  PanelLeft,
  Plus,
  User,
  BookOpen,
  Layers,
  ListChecks,
  ListOrdered,
  PenTool,
  Mic,
  FileText,
  Trash2,
  Edit2,
  Users,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface Space {
  id: string;
  name: string;
  type:
    | "study-guide"
    | "quiz"
    | "flashcards"
    | "solve"
    | "write"
    | "recording"
    | "notes"
    | "chat"
    | "default";
  category: "shared" | "private";
  visibility: "me" | "members" | "public";
  isConfigured: boolean;
  plainTextContent?: string;
  quizMethod?: "resources" | "own";
  resources?: { id: string; name: string; loading: boolean }[];
  focusedResourceIds?: string[];
}

export function FolderSidebar({
  collapsed,
  onToggle,
  onNewSpace,
  onNewPrivateSpace,
  onMembersToggle,
  isMembersOpen,
  onKnowledgeToggle,
  isKnowledgeOpen,
  spaces = [],
  activeSpaceId = null,
  onSelectSpace,
  onRenameSpace,
  onDeleteSpace,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNewSpace?: () => void;
  onNewPrivateSpace?: () => void;
  onMembersToggle?: () => void;
  isMembersOpen?: boolean;
  onKnowledgeToggle?: () => void;
  isKnowledgeOpen?: boolean;
  spaces?: Space[];
  activeSpaceId?: string | null;
  onSelectSpace?: (id: string) => void;
  onRenameSpace?: (id: string, newName: string) => void;
  onDeleteSpace?: (id: string) => void;
}) {
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    spaceId: string;
    x: number;
    y: number;
  } | null>(null);

  // Rename Dialog State
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClose = () => setContextMenu(null);
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, []);

  // Handle right-click on space
  const handleContextMenu = (e: React.MouseEvent, spaceId: string) => {
    e.preventDefault();
    setContextMenu({
      spaceId,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const getSpaceIcon = (type: string) => {
    switch (type) {
      case "study-guide":
        return <BookOpen size={15} className="text-muted-foreground" />;
      case "quiz":
        return <ListChecks size={15} className="text-muted-foreground" />;
      case "flashcards":
        return <Layers size={15} className="text-muted-foreground" />;
      case "solve":
        return <ListOrdered size={15} className="text-muted-foreground" />;
      case "write":
        return <PenTool size={15} className="text-muted-foreground" />;
      case "recording":
        return <Mic size={15} className="text-muted-foreground" />;
      case "notes":
        return <FileText size={15} className="text-muted-foreground" />;
      default:
        return <MessageSquare size={15} className="text-muted-foreground" />;
    }
  };

  // Group spaces
  const sharedSpaces = spaces.filter((s) => s.category === "shared");
  const privateSpaces = spaces.filter((s) => s.category === "private");

  const handleSaveRename = () => {
    if (renameId && renameName.trim() && onRenameSpace) {
      onRenameSpace(renameId, renameName.trim());
    }
    setRenameId(null);
  };

  const handleDeleteConfirm = () => {
    if (deleteId && onDeleteSpace) {
      onDeleteSpace(deleteId);
    }
    setDeleteId(null);
  };

  const renderSpaceButton = (space: Space) => {
    const isActive = space.id === activeSpaceId;
    return (
      <button
        key={space.id}
        onClick={() => onSelectSpace && onSelectSpace(space.id)}
        onContextMenu={(e) => handleContextMenu(e, space.id)}
        className={`mt-1.5 flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors text-left ${
          isActive
            ? "bg-secondary text-foreground"
            : "text-foreground hover:bg-secondary/40"
        }`}
      >
        {getSpaceIcon(space.type)}
        <span className="truncate flex-1">{space.name}</span>
      </button>
    );
  };

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
    <div className="relative flex h-full w-[260px] flex-col border-r border-border bg-sidebar select-none">
      <div className="border-b border-border px-3 py-3">
        {/* My folder — full-width active pill row */}
        <div className="flex items-center justify-between rounded-xl bg-secondary/70 px-3 py-2">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
            <Folder size={15} className="text-muted-foreground" />
            My folder
          </div>
          <button
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <PanelLeft size={17} />
          </button>
        </div>

        <button
          onClick={onMembersToggle}
          className={`mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors hover:bg-secondary/60 ${
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
          className={`mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors hover:bg-secondary/60 ${
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

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {/* Shared Spaces Section */}
        {sharedSpaces.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-1.5">Shared</p>
            {sharedSpaces.map(renderSpaceButton)}
          </div>
        )}

        {/* Private Spaces Section */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-1.5">Private</p>
          {privateSpaces.length > 0 ? (
            privateSpaces.map(renderSpaceButton)
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-6 mt-1">
              {/* Dashed box placeholder icon */}
              <div className="w-12 h-12 rounded-xl border-2 border-dashed border-border/60 flex items-center justify-center">
                <div className="w-5 h-5 rounded border-2 border-dashed border-border/60" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">No spaces yet</p>
              <button
                onClick={onNewPrivateSpace}
                className="rounded-xl bg-secondary/80 hover:bg-secondary border border-border px-4 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                Create a space
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-50 w-[140px] rounded-xl border border-border bg-[#1c1c1f] p-1.5 shadow-2xl"
          >
            <button
              onClick={() => {
                const space = spaces.find((s) => s.id === contextMenu.spaceId);
                if (space) {
                  setRenameId(space.id);
                  setRenameName(space.name);
                }
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
            >
              <Edit2 size={13} className="text-muted-foreground" />
              Rename
            </button>
            <button
              onClick={() => {
                setDeleteId(contextMenu.spaceId);
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={13} />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename Dialog Modal */}
      <AnimatePresence>
        {renameId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Click backdrop to cancel */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRenameId(null)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-[360px] rounded-2xl border border-border bg-[#18181b] p-5 shadow-2xl"
            >
              <h3 className="text-base font-semibold text-foreground">Rename Space</h3>
              <input
                ref={renameInputRef}
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveRename()}
                className="mt-3.5 w-full rounded-xl bg-secondary/60 border border-border px-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setRenameId(null)}
                  className="flex-1 rounded-xl bg-secondary/60 hover:bg-secondary px-4 py-2 text-xs font-semibold text-foreground border border-border transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRename}
                  className="flex-1 rounded-xl bg-primary hover:opacity-90 px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-[360px] rounded-2xl border border-border bg-[#18181b] p-5 shadow-2xl"
            >
              <h3 className="text-base font-semibold text-foreground">Delete Space</h3>
              <p className="mt-2.5 text-sm text-muted-foreground leading-normal">
                Are you sure you want to delete the space?
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 rounded-xl bg-secondary/60 hover:bg-secondary px-4 py-2.5 text-xs font-semibold text-foreground border border-border transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 rounded-xl bg-destructive hover:bg-destructive/90 px-4 py-2.5 text-xs font-semibold text-destructive-foreground transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
