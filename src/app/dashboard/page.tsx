"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { UserButton } from "@clerk/nextjs";
import {
  BookOpen,
  ChevronRight,
  Folder,
  FolderOpen,
  Home,
  Layers,
  LifeBuoy,
  ListChecks,
  ListOrdered,
  Mic,
  MessageSquare,
  PenTool,
  Plus,
  PlusCircle,
  Send,
  Smartphone,
  Ticket,
  ArrowUpCircle,
  FileText,
  type LucideIcon,
} from "lucide-react";
import * as Lucide from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderSidebar, type Space } from "@/components/workspace/FolderSidebar";
import { MembersPanel } from "@/components/workspace/MembersPanel";
import { KnowledgePanel, type KnowledgeItem } from "@/components/workspace/KnowledgePanel";
import { CreateFolderDialog } from "@/components/workspace/CreateFolderDialog";
import { InviteFriendsDialog } from "@/components/workspace/InviteFriendsDialog";
import { SubscriptionModal } from "@/components/workspace/SubscriptionModal";
import { FlashcardsView } from "@/components/study/FlashcardsView";
import { StudyGuideView } from "@/components/study/StudyGuideView";
import { SolveView } from "@/components/study/SolveView";
import { WriteView } from "@/components/study/WriteView";
import { RecordingView } from "@/components/study/RecordingView";
import { NotesView, NotesEditor } from "@/components/study/NotesView";
import { ToolSelectorModal, QuizWizardModal, type VisibilityType } from "@/components/study/SpaceWizard";
import { StudyGuideEditor } from "@/components/study/StudyGuideEditor";
import { QuizEditor } from "@/components/study/QuizEditor";
import { ChatView } from "@/components/study/ChatView";
import {
  fetchFolders,
  createFolder as apiCreateFolder,
  updateFolder as apiUpdateFolder,
  deleteFolder as apiDeleteFolder,
  fetchSpaces,
  createSpace as apiCreateSpace,
  updateSpace as apiUpdateSpace,
  deleteSpace as apiDeleteSpace,
  uploadAsset,
  fetchKnowledgeItems,
  fetchFolderMembers,
  type FolderData as ApiFolderData,
} from "@/lib/api";

type ToolId =
  | "study-guide"
  | "quiz"
  | "flashcards"
  | "solve"
  | "write"
  | "recording"
  | "notes";

type Tool = { id: ToolId; label: string; sub: string; icon: LucideIcon };

const SECTIONS: { title: string; tools: Tool[] }[] = [
  {
    title: "Studying",
    tools: [
      { id: "study-guide", label: "Study guide", sub: "Prepare for a test", icon: BookOpen },
      { id: "quiz", label: "Quiz", sub: "Test your knowledge", icon: ListChecks },
      { id: "flashcards", label: "Flashcards", sub: "Bite-sized studying", icon: Layers },
    ],
  },
  {
    title: "Homework",
    tools: [
      { id: "solve", label: "Solve", sub: "Get answers and explanations", icon: ListOrdered },
      { id: "write", label: "Write", sub: "Draft paragraphs or papers", icon: PenTool },
    ],
  },
  {
    title: "Notes",
    tools: [
      { id: "recording", label: "Recording", sub: "Automatic lecture notes", icon: Mic },
      { id: "notes", label: "Notes", sub: "Detailed notes for any resource", icon: FileText },
    ],
  },
];

function Rail({
  folderOpen,
  onFolder,
  onInvite,
  onHome,
  onCreateFolder,
  onJoinInvite,
  onPro,
  folders = [],
  activeFolderId = "default",
  onSelectFolder,
  onFolderContextMenu,
  hasDefaultFolder = true,
  defaultFolderName = "My folder",
  defaultFolderIconName = "Folder",
  defaultFolderThemeColor = "#a1a1aa",
}: {
  folderOpen: boolean;
  onFolder: () => void;
  onInvite: () => void;
  onHome: () => void;
  onCreateFolder: () => void;
  onJoinInvite: () => void;
  onPro: () => void;
  folders?: FolderData[];
  activeFolderId?: string;
  onSelectFolder: (id: string) => void;
  onFolderContextMenu: (e: React.MouseEvent, folderId: string) => void;
  hasDefaultFolder?: boolean;
  defaultFolderName?: string;
  defaultFolderIconName?: string;
  defaultFolderThemeColor?: string;
}) {
  const isDefaultActive = activeFolderId === "default";
  const handleDefaultFolderClick = () => {
    if (isDefaultActive) {
      onFolder();
    } else {
      onSelectFolder("default");
    }
  };
  const DefaultFolderIcon = (Lucide as any)[defaultFolderIconName] || FolderOpen;
  return (
    <aside className="z-20 hidden w-[60px] shrink-0 flex-col items-center justify-between overflow-hidden bg-black py-3.5 md:flex">
      <div className="flex w-full flex-col items-center">
        <button
          onClick={onHome}
          aria-label="Home"
          className="flex size-10 items-center justify-center rounded-[14px] bg-secondary text-foreground transition-colors hover:bg-card-hover"
        >
          <Home size={18} />
        </button>
        <div className="my-3 h-px w-6 bg-border" />
        {hasDefaultFolder && (
          <div className="relative flex w-full items-center justify-center mt-3 animate-in fade-in zoom-in duration-150">
            <button
              onClick={handleDefaultFolderClick}
              onContextMenu={(e) => onFolderContextMenu(e, "default")}
              aria-label={defaultFolderName}
              className={`flex size-10 items-center justify-center rounded-[14px] transition-colors hover:bg-card-hover hover:text-foreground ${
                isDefaultActive ? "bg-secondary text-foreground" : "bg-secondary/70 text-muted-foreground"
              }`}
            >
              <DefaultFolderIcon size={18} style={{ color: defaultFolderThemeColor }} />
            </button>
            {/* Active indicator — white pill on right edge */}
            {isDefaultActive && (
              <span className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-white" />
            )}
          </div>
        )}

        {folders.map((folder) => {
          const FolderIcon = (Lucide as any)[folder.iconName] || Lucide.Folder;
          const isActive = activeFolderId === folder.id;
          return (
            <div key={folder.id} className="relative flex w-full items-center justify-center mt-3 animate-in fade-in zoom-in duration-150">
              <button
                onClick={() => onSelectFolder(folder.id)}
                onContextMenu={(e) => onFolderContextMenu(e, folder.id)}
                aria-label={folder.name}
                className={`flex size-10 items-center justify-center rounded-[14px] transition-colors hover:bg-card-hover hover:text-foreground ${
                  isActive ? "bg-secondary text-foreground" : "bg-secondary/70 text-muted-foreground"
                }`}
              >
                <FolderIcon size={18} style={{ color: folder.themeColor }} />
              </button>
              {isActive && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-white" />
              )}
            </div>
          );
        })}
        
        {/* Dropdown Menu for Add (+) button aligned to the right of the button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Add"
              className="mt-3 flex size-10 items-center justify-center rounded-[14px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground cursor-pointer"
            >
              <Plus size={19} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="start"
            sideOffset={12}
            className="w-[230px] rounded-2xl border-border bg-popover p-2"
          >
            <DropdownMenuItem
              onSelect={onCreateFolder}
              className="gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold cursor-pointer"
            >
              <PlusCircle size={16} />
              Create a new folder
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={onJoinInvite}
              className="gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold cursor-pointer"
            >
              <Ticket size={16} />
              Join from invite code
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex flex-col items-center gap-5">
        {/* Dropdown Menu for Smartphone button with Android/iOS static coming soon options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-muted-foreground transition-colors hover:text-foreground cursor-pointer">
              <Smartphone size={18} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="start"
            sideOffset={12}
            className="w-[220px] rounded-2xl border-border bg-popover p-2"
          >
            <DropdownMenuItem className="flex flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left hover:bg-transparent focus:bg-transparent cursor-default select-none outline-none">
              <span className="font-semibold text-foreground text-sm">Download for Android</span>
              <span className="text-[10px] text-muted-foreground">Coming soon</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left hover:bg-transparent focus:bg-transparent cursor-default select-none outline-none">
              <span className="font-semibold text-foreground text-sm">Download for iOS</span>
              <span className="text-[10px] text-muted-foreground">Coming soon</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button className="text-muted-foreground transition-colors hover:text-foreground">
          <LifeBuoy size={18} />
        </button>

        {/* Pro upgrade button */}
        <button
          onClick={onPro}
          className="rounded-[14px] bg-gradient-to-br from-[#ff8a3d] via-[#7c5cff] to-[#38bdf8] p-[1.5px] cursor-pointer hover:scale-105 transition-transform border-none outline-none focus:outline-none"
        >
          <div className="flex flex-col items-center gap-0.5 rounded-[13px] bg-[#18181b] px-2 py-1.5 text-[10px] font-semibold text-foreground">
            <ArrowUpCircle size={15} />
            Pro
          </div>
        </button>

        {/* Clerk UserButton — profile picture, account settings, sign-out */}
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-[38px] h-[38px] rounded-[12px]",
              userButtonTrigger: "focus:shadow-none",
            },
          }}
        />
      </div>
    </aside>
  );
}

function Hub({
  onOpen,
  onAskEspada,
}: {
  onOpen: (id: ToolId | "chat") => void;
  onAskEspada: (text: string) => void;
}) {
  const [inputText, setInputText] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputText.trim()) {
      onAskEspada(inputText.trim());
      setInputText("");
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10">
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Folder size={15} />
        <span>My folder</span>
        <ChevronRight size={14} />
        <MessageSquare size={15} />
        <span className="font-medium text-foreground">Untitled space</span>
      </div>

      <div className="rounded-2xl border border-border bg-card/60 p-5 sm:p-7">
        <button onClick={() => onOpen("chat")} className="mb-2 flex w-full items-center gap-2.5 rounded-xl bg-secondary px-4 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-card-hover">
          <MessageSquare size={16} />
          Chat with AI
        </button>

        {SECTIONS.map((section) => (
          <section key={section.title} className="mt-8">
            <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.tools.map((tool) => (
                <motion.button
                  key={tool.id}
                  onClick={() => onOpen(tool.id)}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ type: "spring", stiffness: 320, damping: 24 }}
                  className="group flex h-[150px] flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:bg-card-hover"
                >
                  <tool.icon size={20} className="text-muted-foreground transition-colors group-hover:text-foreground" />
                  <div>
                    <p className="text-base font-semibold text-foreground">{tool.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{tool.sub}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-[#1c1c1f] px-5 py-3.5 flex items-center gap-3 shadow-xl">
        <input
          type="text"
          placeholder="Ask Espada anything…"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground/45"
        />
        {inputText.trim() && (
          <button
            onClick={() => {
              onAskEspada(inputText.trim());
              setInputText("");
            }}
            className="p-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Send size={13} className="fill-current" />
          </button>
        )}
      </div>
    </div>
  );
}

export interface FolderData {
  id: string;
  name: string;
  themeName: string;
  themeColor: string;
  iconName: string;
  isPublic: boolean;
  inviteCode: string;
  ownerId: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>("default");
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [memberCount, setMemberCount] = useState(1);

  // Default folder states
  const [hasDefaultFolder, setHasDefaultFolder] = useState(true);
  const [defaultFolderName, setDefaultFolderName] = useState("My folder");
  const [defaultFolderIconName, setDefaultFolderIconName] = useState("Folder");
  const [defaultFolderThemeColor, setDefaultFolderThemeColor] = useState("#a1a1aa");

  const [folderContextMenu, setFolderContextMenu] = useState<{
    folderId: string;
    x: number;
    y: number;
  } | null>(null);

  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");

  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);

  const handleFolderContextMenu = (e: React.MouseEvent, folderId: string) => {
    e.preventDefault();
    setFolderContextMenu({
      folderId,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleSaveFolderRename = async () => {
    if (renameFolderId && renameFolderName.trim()) {
      if (renameFolderId === "default") {
        setDefaultFolderName(renameFolderName.trim());
      } else {
        try {
          await apiUpdateFolder(renameFolderId, { name: renameFolderName.trim() });
          setFolders((prev) =>
            prev.map((f) => (f.id === renameFolderId ? { ...f, name: renameFolderName.trim() } : f))
          );
        } catch (err) {
          console.error("Failed to rename folder:", err);
        }
      }
    }
    setRenameFolderId(null);
  };

  const handleConfirmFolderDelete = async () => {
    if (deleteFolderId) {
      if (deleteFolderId === "default") {
        setHasDefaultFolder(false);
        setSpaces((prev) => prev.filter((s) => s.folderId !== "default" && s.folderId !== undefined));
        setKnowledgeItems((prev) => prev.filter((k) => k.folderId !== "default" && k.folderId !== undefined));
        if (activeFolderId === "default") {
          if (folders.length > 0) {
            setActiveFolderId(folders[0].id);
          } else {
            setActiveFolderId(null);
          }
        }
      } else {
        try {
          await apiDeleteFolder(deleteFolderId);
        } catch (err) {
          console.error("Failed to delete folder:", err);
        }
        setFolders((prev) => prev.filter((f) => f.id !== deleteFolderId));
        setSpaces((prev) => prev.filter((s) => s.folderId !== deleteFolderId));
        setKnowledgeItems((prev) => prev.filter((k) => k.folderId !== deleteFolderId));
        
        if (activeFolderId === deleteFolderId) {
          if (hasDefaultFolder) {
            setActiveFolderId("default");
          } else if (folders.length > 1) {
            const remaining = folders.filter((f) => f.id !== deleteFolderId);
            setActiveFolderId(remaining[0].id);
          } else {
            setActiveFolderId(null);
          }
        }
      }
      setActiveSpaceId(null);
      setActiveTool(null);
    }
    setDeleteFolderId(null);
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClose = () => setFolderContextMenu(null);
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, []);

  const handleCreateFolder = async (name: string, themeName: string, themeColor: string, iconName: string, isPublic: boolean) => {
    try {
      const folder = await apiCreateFolder({ name, themeName, themeColor, iconName, isPublic });
      const newFolder: FolderData = {
        id: folder.id,
        name: folder.name,
        themeName: folder.themeName,
        themeColor: folder.themeColor,
        iconName: folder.iconName,
        isPublic: folder.isPublic,
        inviteCode: folder.inviteCode,
        ownerId: folder.ownerId,
      };
      setFolders((prev) => [...prev, newFolder]);
      setActiveFolderId(folder.id);
      setActiveSpaceId(null);
      setActiveTool(null);
      setFolderOpen(true);
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  };

  const handleSelectFolder = (id: string) => {
    setActiveFolderId(id);
    setActiveSpaceId(null);
    setActiveTool(null);
    setFolderOpen(true);
  };

  // Load folders from the API on mount
  useEffect(() => {
    fetchFolders()
      .then((apiFolders) => {
        const mapped = apiFolders.map((f) => ({
          id: f.id,
          name: f.name,
          themeName: f.themeName,
          themeColor: f.themeColor,
          iconName: f.iconName,
          isPublic: f.isPublic,
          inviteCode: f.inviteCode,
          ownerId: f.ownerId,
        }));

        // If the API returned a "My folder" (auto-created from "default" virtual folder),
        // use it as the active default folder instead of the virtual one
        const autoCreatedDefault = mapped.find((f) => f.name === "My folder");
        if (autoCreatedDefault) {
          // Replace the virtual "default" with the real DB folder
          setHasDefaultFolder(false);
          setFolders(mapped);
          setActiveFolderId(autoCreatedDefault.id);
        } else {
          setFolders(mapped);
          if (mapped.length > 0 && !hasDefaultFolder) {
            setActiveFolderId(mapped[0].id);
          }
        }
      })
      .catch(() => {
        // API not available (e.g. no DB yet) — fall back to empty state
      });
  }, []);

  // Load spaces when active folder changes
  useEffect(() => {
    if (!activeFolderId || activeFolderId === "default") return;
    fetchSpaces(activeFolderId)
      .then((apiSpaces) => {
        // Filter out unconfigured spaces — they are abandoned drafts
        const configuredSpaces = apiSpaces.filter((s) => s.isConfigured);
        // Delete abandoned unconfigured spaces from DB
        apiSpaces
          .filter((s) => !s.isConfigured)
          .forEach((s) => apiDeleteSpace(s.id).catch(() => {}));

        const mapped: Space[] = configuredSpaces.map((s) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          category: s.category,
          visibility: s.visibility,
          isConfigured: s.isConfigured,
          resources: [],
          focusedResourceIds: [],
          folderId: s.folderId,
        }));
        setSpaces((prev) => {
          // Merge: keep spaces from other folders, replace this folder's spaces
          const others = prev.filter((sp) => sp.folderId !== activeFolderId);
          return [...others, ...mapped];
        });
      })
      .catch(() => {});
  }, [activeFolderId]);

  // Load knowledge items when active folder changes
  useEffect(() => {
    if (!activeFolderId) return;
    fetchKnowledgeItems(activeFolderId)
      .then((items) => {
        const mapped: KnowledgeItem[] = items.map((item) => ({
          id: item.id,
          name: item.asset.name,
          type: item.asset.type === "link" ? "link" as const : "file" as const,
          folderId: activeFolderId,
          status: item.asset.status as KnowledgeItem["status"],
          assetId: item.assetId,
        }));
        setKnowledgeItems((prev) => {
          const others = prev.filter((k) => k.folderId !== activeFolderId);
          return [...others, ...mapped];
        });
      })
      .catch(() => {});
  }, [activeFolderId]);

  // Load member count when active folder changes
  useEffect(() => {
    if (!activeFolderId || activeFolderId === "default") {
      setMemberCount(1);
      return;
    }
    fetchFolderMembers(activeFolderId)
      .then((members) => setMemberCount(members.length))
      .catch(() => setMemberCount(1));
  }, [activeFolderId]);

  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [folderOpen, setFolderOpen] = useState(true); // Default to true to show the spaces sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showKnowledge, setShowKnowledge] = useState(false);

  // Dynamic spaces state
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [pendingPrivateSpace, setPendingPrivateSpace] = useState(false);
  const [showQuizWizard, setShowQuizWizard] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);

  // Note: removed the old useEffect that filtered unconfigured spaces
  // Spaces now persist in the DB and should always be shown

  const handleBackToHub = () => {
    // If leaving an unconfigured space, delete it from DB (user didn't generate anything)
    if (activeSpaceId) {
      const space = spaces.find((s) => s.id === activeSpaceId);
      if (space && !space.isConfigured) {
        setSpaces((prev) => prev.filter((s) => s.id !== activeSpaceId));
        apiDeleteSpace(activeSpaceId).catch(() => {});
      }
    }
    setActiveTool(null);
    setActiveSpaceId(null);
  };

  const handleNewSpace = () => {
    setPendingPrivateSpace(false);
    setShowToolSelector(true);
    setFolderOpen(true);
  };

  const handleNewPrivateSpace = () => {
    setPendingPrivateSpace(true);
    setShowToolSelector(true);
    setFolderOpen(true);
  };

  const handleAskEspada = async (text: string) => {
    const folderId = activeFolderId || undefined;

    // Create a real chat space via API so it gets a proper spaceId for LLM calls
    if (folderId) {
      try {
        const space = await apiCreateSpace(folderId, {
          name: text.length > 25 ? text.slice(0, 25) + "..." : text,
          type: "chat",
          category: "private",
          visibility: "me",
        });
        await apiUpdateSpace(space.id, { isConfigured: true }).catch(() => {});

        const newSpace: Space = {
          id: space.id,
          name: space.name,
          type: "chat",
          category: "private",
          visibility: "me",
          isConfigured: true,
          resources: [],
          focusedResourceIds: [],
          folderId: space.folderId,
          initialMessages: [
            {
              id: `msg-${Date.now()}`,
              sender: "user",
              text,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            }
          ]
        };

        setSpaces((prev) => [...prev, newSpace]);
        setActiveSpaceId(space.id);
        setFolderOpen(true);
        return;
      } catch (err) {
        console.error("Failed to create chat space:", err);
      }
    }

    // Fallback: local-only
    const newId = `space-${Date.now()}`;
    const newSpace: Space = {
      id: newId,
      name: text.length > 25 ? text.slice(0, 25) + "..." : text,
      type: "chat",
      category: "private",
      visibility: "me",
      isConfigured: true,
      resources: [],
      focusedResourceIds: [],
      initialMessages: [
        {
          id: `msg-${Date.now()}`,
          sender: "user",
          text,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
      ]
    };

    setSpaces((prev) => [...prev, newSpace]);
    setActiveSpaceId(newId);
    setFolderOpen(true);
  };

  const handleSelectTool = async (toolId: any) => {
    const forcePrivate = pendingPrivateSpace;
    const folderId = activeFolderId || undefined;

    // Create space via API (resolveFolder handles "default" on the backend)
    if (folderId) {
      try {
        const space = await apiCreateSpace(folderId, {
          name: toolId === "recording" ? "New notes" : "Untitled space",
          type: toolId,
          category: forcePrivate ? "private" : (toolId === "chat" ? "private" : "shared"),
          visibility: (forcePrivate || toolId === "chat") ? "me" : "members",
        });

        // Recording and Chat are immediately configured (no wizard needed)
        const immediatelyConfigured = ["recording", "chat"].includes(toolId);
        if (immediatelyConfigured) {
          await apiUpdateSpace(space.id, { isConfigured: true }).catch(() => {});
        }

        const newSpace: Space = {
          id: space.id,
          name: space.name,
          type: space.type,
          category: space.category,
          visibility: space.visibility,
          isConfigured: immediatelyConfigured ? true : space.isConfigured,
          resources: [],
          focusedResourceIds: [],
          folderId: space.folderId,
        };
        setSpaces((prev) => [...prev, newSpace]);
        setActiveSpaceId(space.id);
        setShowToolSelector(false);
        setPendingPrivateSpace(false);
        if (toolId === "quiz") setShowQuizWizard(true);
        return;
      } catch (err) {
        console.error("Failed to create space:", err);
      }
    }

    // Fallback: local-only (for "default" virtual folder or if API fails)
    const newId = `space-${Date.now()}`;
    const newSpace: Space = {
      id: newId,
      name: toolId === "recording" ? "New notes" : "Untitled space",
      type: toolId,
      category: forcePrivate ? "private" : (toolId === "chat" ? "private" : "shared"),
      visibility: (forcePrivate || toolId === "chat") ? "me" : "members",
      isConfigured: ["recording", "chat"].includes(toolId) || (toolId !== "quiz" && toolId !== "study-guide" && toolId !== "flashcards" && toolId !== "solve" && toolId !== "write" && toolId !== "notes"),
      resources: [],
      focusedResourceIds: [],
      folderId: folderId,
    };

    setSpaces((prev) => [...prev, newSpace]);
    setActiveSpaceId(newId);
    setShowToolSelector(false);
    setPendingPrivateSpace(false);

    if (toolId === "quiz") {
      setShowQuizWizard(true);
    }
  };

  const handleQuizWizardComplete = (method: "resources" | "own", visibility: VisibilityType, questions?: any[]) => {
    setSpaces((prev) =>
      prev.map((s) =>
        s.id === activeSpaceId
          ? { ...s, quizMethod: method, visibility, isConfigured: true, quizQuestions: questions || [] }
          : s
      )
    );
    setShowQuizWizard(false);
    if (activeSpaceId) {
      apiUpdateSpace(activeSpaceId, { isConfigured: true, visibility }).catch(() => {});
    }
  };

  const handleConfigQuiz = () => {
    setSpaces((prev) =>
      prev.map((s) => (s.id === activeSpaceId ? { ...s, isConfigured: true } : s))
    );
    if (activeSpaceId) {
      apiUpdateSpace(activeSpaceId, { isConfigured: true }).catch(() => {});
    }
  };

  const handleRegenerateQuiz = () => {
    // Just open the wizard overlay without touching isConfigured.
    // The space stays visible; wizard appears on top.
    setShowQuizWizard(true);
  };

  const handleConfigStudyGuide = (visibility: VisibilityType, resources: any[], generatedLines?: any[]) => {
    setSpaces((prev) =>
      prev.map((s) =>
        s.id === activeSpaceId
          ? { ...s, visibility, resources, isConfigured: true, generatedLines: generatedLines || [] }
          : s
      )
    );
    setFolderOpen(false);

    // Persist isConfigured to the database so it survives page refresh
    if (activeSpaceId) {
      apiUpdateSpace(activeSpaceId, { isConfigured: true, visibility }).catch(() => {});
    }
  };

  const handleSaveStudyGuideText = (text: string) => {
    setSpaces((prev) =>
      prev.map((s) => (s.id === activeSpaceId ? { ...s, plainTextContent: text } : s))
    );
  };

  const views: Record<ToolId, React.ReactNode> = {
    "study-guide": <StudyGuideView onBack={handleBackToHub} />,
    quiz: <QuizEditor spaceName="Quiz" visibility="members" onTakeQuiz={()=>{}} onGenerateQuestions={handleRegenerateQuiz} />,
    flashcards: <FlashcardsView spaceName="Flashcards" folderId={activeFolderId || undefined} visibility="members" isConfigured={true} onCompleteConfig={()=>{}} onBack={handleBackToHub} />,
    solve: <SolveView spaceName="Solve" folderId={activeFolderId || undefined} visibility="members" isConfigured={true} onBack={handleBackToHub} />,
    write: <WriteView folderId={activeFolderId || undefined} onBack={handleBackToHub} />,
    recording: <RecordingView folderId={activeFolderId || undefined} onBack={handleBackToHub} />,
    notes: (
      <NotesView
        spaceName="Notes"
        visibility="public"
        resources={[]}
        onBack={handleBackToHub}
      />
    ),
  };

  const activeSpace = spaces.find((s) => s.id === activeSpaceId);

  let mainContent: React.ReactNode = null;

  if (activeSpaceId && activeSpace) {
    if (!activeSpace.isConfigured) {
      if (activeSpace.type === "study-guide") {
        mainContent = (
          <StudyGuideEditor
            spaceName={activeSpace.name}
            spaceId={activeSpace.id}
            folderId={activeFolderId || undefined}
            initialText={activeSpace.plainTextContent || ""}
            onSolve={handleConfigStudyGuide}
            onSaveText={handleSaveStudyGuideText}
          />
        );
      } else if (activeSpace.type === "quiz") {
        mainContent = (
          <QuizEditor
            spaceName={activeSpace.name}
            spaceId={activeSpace.id}
            visibility={activeSpace.visibility}
            onTakeQuiz={handleConfigQuiz}
            onGenerateQuestions={handleConfigQuiz}
            onUpdateVisibility={(vis) => setSpaces(prev => prev.map(s => s.id === activeSpace.id ? {...s, visibility: vis} : s))}
          />
        );
      } else if (activeSpace.type === "flashcards") {
        mainContent = (
          <FlashcardsView
            spaceName={activeSpace.name}
            spaceId={activeSpace.id}
            folderId={activeFolderId || undefined}
            visibility={activeSpace.visibility}
            isConfigured={false}
            onCompleteConfig={() => {
              setSpaces((prev) =>
                prev.map((s) => (s.id === activeSpace.id ? { ...s, isConfigured: true } : s))
              );
              if (activeSpace.id) apiUpdateSpace(activeSpace.id, { isConfigured: true }).catch(() => {});
            }}
            onUpdateVisibility={(vis) => setSpaces(prev => prev.map(s => s.id === activeSpace.id ? {...s, visibility: vis} : s))}
            onBack={handleBackToHub}
          />
        );
      } else if (activeSpace.type === "solve") {
        mainContent = (
          <SolveView
            spaceName={activeSpace.name}
            spaceId={activeSpace.id}
            folderId={activeFolderId || undefined}
            visibility={activeSpace.visibility}
            isConfigured={false}
            onCompleteConfig={(problemName) => {
              setSpaces((prev) =>
                prev.map((s) => (s.id === activeSpace.id ? { ...s, name: problemName || s.name, isConfigured: true } : s))
              );
              setFolderOpen(false);
              if (activeSpace.id) apiUpdateSpace(activeSpace.id, { isConfigured: true }).catch(() => {});
            }}
            onUpdateVisibility={(vis) => setSpaces(prev => prev.map(s => s.id === activeSpace.id ? {...s, visibility: vis} : s))}
            onBack={handleBackToHub}
          />
        );
      } else if (activeSpace.type === "write") {
        mainContent = (
          <WriteView
            spaceName={activeSpace.name}
            spaceId={activeSpace.id}
            folderId={activeFolderId || undefined}
            visibility={activeSpace.visibility}
            isConfigured={false}
            onCompleteConfig={(draftName, generatedText) => {
              setSpaces((prev) =>
                prev.map((s) => (s.id === activeSpace.id ? { ...s, name: draftName || s.name, isConfigured: true, plainTextContent: generatedText } : s))
              );
              setFolderOpen(false);
              if (activeSpace.id) apiUpdateSpace(activeSpace.id, { isConfigured: true }).catch(() => {});
            }}
            onUpdateVisibility={(vis) => setSpaces(prev => prev.map(s => s.id === activeSpace.id ? {...s, visibility: vis} : s))}
            onBack={handleBackToHub}
          />
        );
      } else if (activeSpace.type === "notes") {
        mainContent = (
          <NotesEditor
            spaceName={activeSpace.name}
            spaceId={activeSpace.id}
            folderId={activeFolderId || undefined}
            onGenerate={(visibility, resources, generatedName, generatedText) => {
              setSpaces((prev) =>
                prev.map((s) =>
                  s.id === activeSpace.id
                    ? {
                        ...s,
                        name: generatedName || s.name,
                        visibility,
                        resources,
                        isConfigured: true,
                        plainTextContent: generatedText || "",
                      }
                    : s
                )
              );
              setFolderOpen(false);
              if (activeSpace.id) apiUpdateSpace(activeSpace.id, { isConfigured: true }).catch(() => {});
            }}
          />
        );
      } else {
        // default/chat or other — recording and chat should never be unconfigured,
        // but handle gracefully if they are
        if (activeSpace.type === "recording") {
          mainContent = (
            <RecordingView
              spaceName={activeSpace.name}
              spaceId={activeSpace.id}
              folderId={activeFolderId || undefined}
              visibility={activeSpace.visibility}
              onBack={handleBackToHub}
            />
          );
        } else if (activeSpace.type === "chat") {
          mainContent = (
            <ChatView
              spaceName={activeSpace.name}
              spaceId={activeSpace.id}
              folderId={activeFolderId || undefined}
              resources={activeSpace.resources || []}
              focusedResourceIds={activeSpace.focusedResourceIds || []}
              onAddResource={(res) => {
                setSpaces((prev) =>
                  prev.map((s) =>
                    s.id === activeSpace.id
                      ? { ...s, resources: [...(s.resources || []), res] }
                      : s
                  )
                );
              }}
              onRemoveResource={(resId) => {
                setSpaces((prev) =>
                  prev.map((s) =>
                    s.id === activeSpace.id
                      ? { ...s, resources: (s.resources || []).filter((r) => r.id !== resId) }
                      : s
                  )
                );
              }}
              onToggleFocusResource={() => {}}
              onUpdateResourceLoading={() => {}}
              initialMessages={activeSpace.initialMessages}
            />
          );
        } else {
          mainContent = <Hub onOpen={handleSelectTool} onAskEspada={handleAskEspada} />;
        }
      }
    } else {
      if (activeSpace.type === "study-guide") {
        mainContent = (
          <StudyGuideView
            spaceName={activeSpace.name}
            spaceId={activeSpace.id}
            folderId={activeFolderId || undefined}
            visibility={activeSpace.visibility || "public"}
            resources={activeSpace.resources || []}
            generatedLines={(activeSpace as any).generatedLines}
            onBack={handleBackToHub}
            onUpdateVisibility={(vis) => {
              setSpaces((prev) =>
                prev.map((s) =>
                  s.id === activeSpace.id ? { ...s, visibility: vis } : s
                )
              );
            }}
          />
        );
      } else if (activeSpace.type === "quiz") {
        mainContent = (
          <QuizEditor
            spaceName={activeSpace.name}
            spaceId={activeSpace.id}
            visibility={activeSpace.visibility}
            onTakeQuiz={() => {}}
            onGenerateQuestions={handleRegenerateQuiz}
            onUpdateVisibility={(vis) => setSpaces(prev => prev.map(s => s.id === activeSpace.id ? {...s, visibility: vis} : s))}
          />
        );
      } else if (activeSpace.type === "flashcards") {
        mainContent = (
          <FlashcardsView
            spaceName={activeSpace.name}
            spaceId={activeSpace.id}
            folderId={activeFolderId || undefined}
            visibility={activeSpace.visibility}
            isConfigured={true}
            onCompleteConfig={() => {}}
            onUpdateVisibility={(vis) => setSpaces(prev => prev.map(s => s.id === activeSpace.id ? {...s, visibility: vis} : s))}
            onBack={handleBackToHub}
          />
        );
      } else if (activeSpace.type === "solve") {
        mainContent = (
          <SolveView
            spaceName={activeSpace.name}
            spaceId={activeSpace.id}
            folderId={activeFolderId || undefined}
            visibility={activeSpace.visibility}
            isConfigured={true}
            onUpdateVisibility={(vis) => setSpaces(prev => prev.map(s => s.id === activeSpace.id ? {...s, visibility: vis} : s))}
            onBack={handleBackToHub}
          />
        );
      } else if (activeSpace.type === "write") {
        mainContent = (
          <WriteView
            spaceName={activeSpace.name}
            spaceId={activeSpace.id}
            folderId={activeFolderId || undefined}
            visibility={activeSpace.visibility}
            isConfigured={true}
            initialDraft={activeSpace.plainTextContent}
            onUpdateVisibility={(vis) => setSpaces(prev => prev.map(s => s.id === activeSpace.id ? {...s, visibility: vis} : s))}
            onBack={handleBackToHub}
          />
        );
      } else if (activeSpace.type === "recording") {
        mainContent = (
          <RecordingView
            spaceName={activeSpace.name}
            spaceId={activeSpace.id}
            folderId={activeFolderId || undefined}
            visibility={activeSpace.visibility}
            initialDraft={activeSpace.plainTextContent}
            onUpdateVisibility={(vis) => setSpaces(prev => prev.map(s => s.id === activeSpace.id ? {...s, visibility: vis} : s))}
            onBack={handleBackToHub}
          />
        );
      } else if (activeSpace.type === "notes") {
        mainContent = (
          <NotesView
            spaceName={activeSpace.name}
            spaceId={activeSpace.id}
            visibility={activeSpace.visibility || "public"}
            resources={activeSpace.resources || []}
            initialDraft={activeSpace.plainTextContent}
            onBack={handleBackToHub}
            onUpdateVisibility={(vis) => {
              setSpaces((prev) =>
                prev.map((s) =>
                  s.id === activeSpace.id ? { ...s, visibility: vis } : s
                )
              );
            }}
          />
        );
      } else if (activeSpace.type === "chat") {
        mainContent = (
          <ChatView
            spaceName={activeSpace.name}
            spaceId={activeSpace.id}
            folderId={activeFolderId || undefined}
            resources={activeSpace.resources || []}
            focusedResourceIds={activeSpace.focusedResourceIds || []}
            initialMessages={activeSpace.initialMessages}
            onAddResource={(res) => {
              setSpaces((prev) =>
                prev.map((s) =>
                  s.id === activeSpace.id
                    ? { ...s, resources: [...(s.resources || []), res] }
                    : s
                )
              );
            }}
            onRemoveResource={(resId) => {
              setSpaces((prev) =>
                prev.map((s) =>
                  s.id === activeSpace.id
                    ? {
                        ...s,
                        resources: (s.resources || []).filter((r) => r.id !== resId),
                        focusedResourceIds: (s.focusedResourceIds || []).filter(
                          (id) => id !== resId
                        ),
                      }
                    : s
                )
              );
            }}
            onToggleFocusResource={(resId) => {
              setSpaces((prev) =>
                prev.map((s) => {
                  if (s.id === activeSpace.id) {
                    const focusList = s.focusedResourceIds || [];
                    const nextFocus = focusList.includes(resId)
                      ? focusList.filter((id) => id !== resId)
                      : [...focusList, resId];
                    return { ...s, focusedResourceIds: nextFocus };
                  }
                  return s;
                })
              );
            }}
            onUpdateResourceLoading={(resId, loading) => {
              setSpaces((prev) =>
                prev.map((s) =>
                  s.id === activeSpace.id
                    ? {
                        ...s,
                        resources: (s.resources || []).map((r) =>
                          r.id === resId ? { ...r, loading } : r
                        ),
                      }
                    : s
                )
              );
            }}
          />
        );
      } else {
        // Fallback
        mainContent = <Hub onOpen={handleSelectTool} onAskEspada={handleAskEspada} />;
      }
    }
  } else {
    mainContent = activeTool ? (
      views[activeTool]
    ) : (
      <Hub
        onOpen={handleSelectTool}
        onAskEspada={handleAskEspada}
      />
    );
  }

  const filteredSpaces = spaces.filter((s) => (s.folderId || "default") === activeFolderId);
  const activeFolder = activeFolderId === "default"
    ? undefined
    : folders.find((f) => f.id === activeFolderId);

  const finalMainContent = activeFolderId ? mainContent : <div className="h-full w-full bg-[#18181b]" />;

  return (
    <div className="flex h-screen overflow-hidden bg-black text-foreground">
      <Rail
        folderOpen={folderOpen}
        onFolder={() => setFolderOpen((v) => !v)}
        onHome={handleBackToHub}
        onCreateFolder={() => setCreateOpen(true)}
        onJoinInvite={() => router.push("/join")}
        onInvite={() => setInviteOpen(true)}
        onPro={() => setSubscriptionOpen(true)}
        folders={folders}
        activeFolderId={activeFolderId || ""}
        onSelectFolder={handleSelectFolder}
        onFolderContextMenu={handleFolderContextMenu}
        hasDefaultFolder={hasDefaultFolder}
        defaultFolderName={defaultFolderName}
        defaultFolderIconName={defaultFolderIconName}
        defaultFolderThemeColor={defaultFolderThemeColor}
      />

      {/* Floating rounded window container wrapping all content to the right of the Rail */}
      <div className="flex-1 flex overflow-hidden rounded-[20px] border border-border bg-[#18181b] my-2 mr-2 ml-1 shadow-2xl">
        {folderOpen && activeFolderId ? (
          <div className="hidden shrink-0 md:block">
            <FolderSidebar
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed((v) => !v)}
              onNewSpace={handleNewSpace}
              onNewPrivateSpace={handleNewPrivateSpace}
              onMembersToggle={() => {
                setShowMembers((prev) => !prev);
                setShowKnowledge(false);
              }}
              isMembersOpen={showMembers}
              onKnowledgeToggle={() => {
                setShowKnowledge((prev) => !prev);
                setShowMembers(false);
              }}
              isKnowledgeOpen={showKnowledge}
              spaces={filteredSpaces}
              folderName={activeFolderId === "default" ? defaultFolderName : (activeFolder ? activeFolder.name : "My folder")}
              folderIconName={activeFolderId === "default" ? defaultFolderIconName : (activeFolder ? activeFolder.iconName : "Folder")}
              folderThemeColor={activeFolderId === "default" ? defaultFolderThemeColor : (activeFolder ? activeFolder.themeColor : "#a1a1aa")}
              knowledgeCount={knowledgeItems.filter((k) => (k.folderId || "default") === activeFolderId).length}
              memberCount={memberCount}
              activeSpaceId={activeSpaceId}
              onSelectSpace={(id) => {
                // Clean up previous unconfigured space if leaving it
                if (activeSpaceId && activeSpaceId !== id) {
                  const prevSpace = spaces.find((s) => s.id === activeSpaceId);
                  if (prevSpace && !prevSpace.isConfigured) {
                    setSpaces((prev) => prev.filter((s) => s.id !== activeSpaceId));
                    apiDeleteSpace(activeSpaceId).catch(() => {});
                  }
                }
                setActiveSpaceId(id);
                setActiveTool(null);
                const space = spaces.find((s) => s.id === id);
                if (space && !space.isConfigured) {
                  if (space.type === "default") {
                    setShowToolSelector(true);
                    setShowQuizWizard(false);
                  } else if (space.type === "quiz") {
                    setShowQuizWizard(true);
                    setShowToolSelector(false);
                  }
                } else {
                  setShowToolSelector(false);
                  setShowQuizWizard(false);
                }
              }}
              onRenameSpace={async (id, newName) => {
                try {
                  await apiUpdateSpace(id, { name: newName });
                } catch (err) {
                  console.error("Failed to rename space:", err);
                }
                setSpaces((prev) =>
                  prev.map((s) => (s.id === id ? { ...s, name: newName } : s))
                );
              }}
              onDeleteSpace={async (id) => {
                try {
                  await apiDeleteSpace(id);
                } catch (err) {
                  console.error("Failed to delete space:", err);
                }
                setSpaces((prev) => prev.filter((s) => s.id !== id));
                setActiveSpaceId((curr) => {
                  if (curr === id) {
                    setActiveTool(null);
                    return null;
                  }
                  return curr;
                });
              }}
              onMoveSpace={async (id, newCategory) => {
                setSpaces((prev) =>
                  prev.map((s) => (s.id === id ? { ...s, category: newCategory } : s))
                );
                try {
                  await apiUpdateSpace(id, { category: newCategory });
                } catch (err) {
                  console.error("Failed to move space:", err);
                  // Revert on failure
                  setSpaces((prev) =>
                    prev.map((s) => (s.id === id ? { ...s, category: newCategory === "shared" ? "private" : "shared" } : s))
                  );
                }
              }}
            />
          </div>
        ) : null}

        {folderOpen && showMembers ? (
          <div className="hidden shrink-0 md:block">
            <MembersPanel
              folderId={activeFolderId || undefined}
              inviteCode={activeFolder?.inviteCode}
              ownerId={activeFolder?.ownerId}
              onClose={() => setShowMembers(false)}
              onMemberRemoved={() => {
                // Refresh member count
                if (activeFolderId && activeFolderId !== "default") {
                  fetchFolderMembers(activeFolderId)
                    .then((m) => setMemberCount(m.length))
                    .catch(() => {});
                }
              }}
            />
          </div>
        ) : null}

        {folderOpen && showKnowledge ? (
          <div className="hidden shrink-0 md:block">
            <KnowledgePanel
              onClose={() => setShowKnowledge(false)}
              items={knowledgeItems.filter((k) => (k.folderId || "default") === activeFolderId)}
              folderId={activeFolderId || undefined}
              onAddItem={(name, type, assetId, status) => {
                const newItem: KnowledgeItem = {
                  id: `k-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
                  name,
                  type,
                  folderId: activeFolderId || "",
                  status: (status as KnowledgeItem["status"]) || "queued",
                  assetId,
                };
                setKnowledgeItems((prev) => [...prev, newItem]);
              }}
              onUpdateItemStatus={(id, status) => {
                setKnowledgeItems((prev) =>
                  prev.map((k) => (k.id === id ? { ...k, status } : k))
                );
              }}
              onRefresh={() => {
                if (activeFolderId) {
                  fetchKnowledgeItems(activeFolderId).then((items) => {
                    const mapped: KnowledgeItem[] = items.map((item) => ({
                      id: item.id,
                      name: item.asset.name,
                      type: item.asset.type === "link" ? "link" as const : "file" as const,
                      folderId: activeFolderId,
                      status: item.asset.status as KnowledgeItem["status"],
                      assetId: item.assetId,
                    }));
                    setKnowledgeItems((prev) => {
                      const others = prev.filter((k) => k.folderId !== activeFolderId);
                      return [...others, ...mapped];
                    });
                  }).catch(() => {});

                  // Also re-fetch folders to sync sidebar (handles auto-created "My folder")
                  fetchFolders().then((apiFolders) => {
                    const foldersMapped = apiFolders.map((f) => ({
                      id: f.id, name: f.name, themeName: f.themeName,
                      themeColor: f.themeColor, iconName: f.iconName, isPublic: f.isPublic, inviteCode: f.inviteCode, ownerId: f.ownerId,
                    }));
                    const autoCreated = foldersMapped.find((f) => f.name === "My folder");
                    if (autoCreated && hasDefaultFolder) {
                      setHasDefaultFolder(false);
                      setFolders(foldersMapped);
                      setActiveFolderId(autoCreated.id);
                    } else if (foldersMapped.length > 0) {
                      setFolders(foldersMapped);
                    }
                  }).catch(() => {});
                }
              }}
            />
          </div>
        ) : null}

        <main className="min-w-0 flex-1 overflow-y-auto h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSpaceId ? `${activeSpaceId}-${activeSpace?.type}-${activeSpace?.isConfigured}` : (activeTool ?? "hub")}
              className="h-full"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {finalMainContent}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <CreateFolderDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={handleCreateFolder} />
      <InviteFriendsDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      {/* Space setup wizard modals */}
      <ToolSelectorModal
        isOpen={showToolSelector}
        onClose={() => setShowToolSelector(false)}
        onSelect={handleSelectTool}
      />

      <QuizWizardModal
        isOpen={showQuizWizard}
        folderId={activeFolderId || undefined}
        spaceId={activeSpaceId || undefined}
        onClose={() => {
          setShowQuizWizard(false);
          // Only delete the space if it was brand-new (quizMethod not yet set = never completed wizard)
          if (activeSpace && !activeSpace.quizMethod && !activeSpace.isConfigured) {
            setSpaces((prev) => prev.filter((s) => s.id !== activeSpaceId));
            // Also delete from DB
            if (activeSpaceId) apiDeleteSpace(activeSpaceId).catch(() => {});
            setActiveSpaceId(null);
          }
        }}
        onComplete={handleQuizWizardComplete}
      />

      <SubscriptionModal
        isOpen={subscriptionOpen}
        onClose={() => setSubscriptionOpen(false)}
      />

      {/* Floating Folder Context Menu (Rename / Delete) */}
      <AnimatePresence>
        {folderContextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{ top: folderContextMenu.y, left: folderContextMenu.x }}
            className="fixed z-50 w-[150px] rounded-xl border border-border bg-[#1c1c1f] p-1.5 shadow-2xl"
          >
            <button
              onClick={() => {
                if (folderContextMenu.folderId === "default") {
                  setRenameFolderId("default");
                  setRenameFolderName(defaultFolderName);
                } else {
                  const f = folders.find((folder) => folder.id === folderContextMenu.folderId);
                  if (f) {
                    setRenameFolderId(f.id);
                    setRenameFolderName(f.name);
                  }
                }
                setFolderContextMenu(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors border-none bg-transparent text-left cursor-pointer"
            >
              <Lucide.PenTool size={13} className="text-muted-foreground" />
              Rename
            </button>
            <button
              onClick={() => {
                setDeleteFolderId(folderContextMenu.folderId);
                setFolderContextMenu(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors border-none bg-transparent text-left cursor-pointer"
            >
              <Lucide.Trash2 size={13} />
              Delete folder
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Folder Rename Modal */}
      <AnimatePresence>
        {renameFolderId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRenameFolderId(null)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-[360px] rounded-2xl border border-border bg-[#18181b] p-5 shadow-2xl"
            >
              <h3 className="text-base font-semibold text-foreground">Rename Folder</h3>
              <input
                value={renameFolderName}
                onChange={(e) => setRenameFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveFolderRename()}
                className="mt-3.5 w-full rounded-xl bg-secondary/60 border border-border px-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setRenameFolderId(null)}
                  className="flex-1 rounded-xl bg-secondary/60 hover:bg-secondary px-4 py-2 text-xs font-semibold text-foreground border border-border transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFolderRename}
                  className="flex-1 rounded-xl bg-primary hover:opacity-90 px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Folder Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteFolderId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteFolderId(null)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-[360px] rounded-2xl border border-border bg-[#18181b] p-5 shadow-2xl"
            >
              <h3 className="text-base font-semibold text-foreground">Delete Folder</h3>
              <p className="mt-2.5 text-sm text-muted-foreground leading-normal">
                Are you sure you want to delete this folder? All spaces and knowledge within it will be permanently deleted.
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setDeleteFolderId(null)}
                  className="flex-1 rounded-xl bg-secondary/60 hover:bg-secondary px-4 py-2.5 text-xs font-semibold text-foreground border border-border transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmFolderDelete}
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
