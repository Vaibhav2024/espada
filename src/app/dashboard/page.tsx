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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderSidebar, type Space } from "@/components/workspace/FolderSidebar";
import { MembersPanel } from "@/components/workspace/MembersPanel";
import { KnowledgePanel } from "@/components/workspace/KnowledgePanel";
import { CreateFolderDialog } from "@/components/workspace/CreateFolderDialog";
import { InviteFriendsDialog } from "@/components/workspace/InviteFriendsDialog";
import { SubscriptionModal } from "@/components/workspace/SubscriptionModal";
import { FlashcardsView } from "@/components/study/FlashcardsView";
import { QuizView } from "@/components/study/QuizView";
import { StudyGuideView } from "@/components/study/StudyGuideView";
import { SolveView } from "@/components/study/SolveView";
import { WriteView } from "@/components/study/WriteView";
import { RecordingView } from "@/components/study/RecordingView";
import { NotesView } from "@/components/study/NotesView";
import { ToolSelectorModal, QuizWizardModal, type VisibilityType } from "@/components/study/SpaceWizard";
import { StudyGuideEditor } from "@/components/study/StudyGuideEditor";
import { QuizEditor } from "@/components/study/QuizEditor";
import { ChatView } from "@/components/study/ChatView";

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
}: {
  folderOpen: boolean;
  onFolder: () => void;
  onInvite: () => void;
  onHome: () => void;
  onCreateFolder: () => void;
  onJoinInvite: () => void;
  onPro: () => void;
}) {
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
        <div className="relative flex w-full items-center justify-center mt-3">
          <button
            onClick={onFolder}
            aria-label="My folder"
            className={`flex size-10 items-center justify-center rounded-[14px] transition-colors hover:bg-card-hover hover:text-foreground ${
              folderOpen ? "bg-secondary text-foreground" : "bg-secondary/70 text-muted-foreground"
            }`}
          >
            <FolderOpen size={18} />
          </button>
          {/* Active indicator — white pill on right edge */}
          {folderOpen && (
            <span className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-white" />
          )}
        </div>
        
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

        <button
          onClick={onInvite}
          aria-label="Invite friends"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <Send size={18} />
        </button>
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

function Hub({ onOpen }: { onOpen: (id: ToolId) => void }) {
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
        <button className="mb-2 flex w-full items-center gap-2.5 rounded-xl bg-secondary px-4 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-card-hover">
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

      <div className="mt-6 rounded-2xl border border-border bg-card px-5 py-4">
        <p className="text-sm text-muted-foreground">Ask Espada anything…</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [folderOpen, setFolderOpen] = useState(true); // Default to true to show the spaces sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showKnowledge, setShowKnowledge] = useState(false);

  // Dynamic spaces state
  const [spaces, setSpaces] = useState<Space[]>([
    {
      id: "college-2026",
      name: "College 2026",
      type: "study-guide",
      category: "shared",
      visibility: "members",
      isConfigured: true,
      resources: [],
      focusedResourceIds: [],
    },
    {
      id: "untitled-space",
      name: "Untitled space",
      type: "chat",
      category: "private",
      visibility: "me",
      isConfigured: true,
      resources: [],
      focusedResourceIds: [],
    },
  ]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>("college-2026");
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [pendingPrivateSpace, setPendingPrivateSpace] = useState(false);
  const [showQuizWizard, setShowQuizWizard] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);

  useEffect(() => {
    setSpaces((prev) =>
      prev.filter((s) => s.isConfigured || s.id === activeSpaceId)
    );
  }, [activeSpaceId]);

  const handleBackToHub = () => {
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

  const handleSelectTool = (toolId: any) => {
    const newId = `space-${Date.now()}`;
    const forcePrivate = pendingPrivateSpace;
    const newSpace: Space = {
      id: newId,
      name: "Untitled space",
      type: toolId,
      category: forcePrivate ? "private" : (toolId === "chat" ? "private" : "shared"),
      visibility: (forcePrivate || toolId === "chat") ? "me" : "members",
      isConfigured: toolId !== "quiz" && toolId !== "study-guide",
      resources: [],
      focusedResourceIds: [],
    };

    setSpaces((prev) => [...prev, newSpace]);
    setActiveSpaceId(newId);
    setShowToolSelector(false);
    setPendingPrivateSpace(false);

    if (toolId === "quiz") {
      setShowQuizWizard(true);
    }
  };

  const handleQuizWizardComplete = (method: "resources" | "own", visibility: VisibilityType) => {
    setSpaces((prev) =>
      prev.map((s) =>
        s.id === activeSpaceId
          ? { ...s, quizMethod: method, visibility, isConfigured: true }
          : s
      )
    );
    setShowQuizWizard(false);
  };

  const handleConfigQuiz = () => {
    setSpaces((prev) =>
      prev.map((s) => (s.id === activeSpaceId ? { ...s, isConfigured: true } : s))
    );
  };

  const handleConfigStudyGuide = (visibility: VisibilityType, resources: any[]) => {
    setSpaces((prev) =>
      prev.map((s) =>
        s.id === activeSpaceId ? { ...s, visibility, resources, isConfigured: true } : s
      )
    );
    setFolderOpen(false);
  };

  const handleSaveStudyGuideText = (text: string) => {
    setSpaces((prev) =>
      prev.map((s) => (s.id === activeSpaceId ? { ...s, plainTextContent: text } : s))
    );
  };

  const views: Record<ToolId, React.ReactNode> = {
    "study-guide": <StudyGuideView onBack={handleBackToHub} />,
    quiz: <QuizView onBack={handleBackToHub} />,
    flashcards: <FlashcardsView onBack={handleBackToHub} />,
    solve: <SolveView onBack={handleBackToHub} />,
    write: <WriteView onBack={handleBackToHub} />,
    recording: <RecordingView onBack={handleBackToHub} />,
    notes: <NotesView onBack={handleBackToHub} />,
  };

  const activeSpace = spaces.find((s) => s.id === activeSpaceId);

  let mainContent: React.ReactNode = null;

  if (activeSpaceId && activeSpace) {
    if (!activeSpace.isConfigured) {
      if (activeSpace.type === "study-guide") {
        mainContent = (
          <StudyGuideEditor
            spaceName={activeSpace.name}
            initialText={activeSpace.plainTextContent || ""}
            onSolve={handleConfigStudyGuide}
            onSaveText={handleSaveStudyGuideText}
          />
        );
      } else if (activeSpace.type === "quiz") {
        mainContent = (
          <QuizEditor
            spaceName={activeSpace.name}
            visibility={activeSpace.visibility}
            onTakeQuiz={handleConfigQuiz}
            onGenerateQuestions={handleConfigQuiz}
          />
        );
      } else {
        // default/chat or other
        mainContent = <Hub onOpen={handleSelectTool} />;
      }
    } else {
      if (activeSpace.type === "study-guide") {
        mainContent = (
          <StudyGuideView
            spaceName={activeSpace.name}
            visibility={activeSpace.visibility || "public"}
            resources={activeSpace.resources || []}
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
        mainContent = <QuizView onBack={handleBackToHub} />;
      } else if (activeSpace.type === "flashcards") {
        mainContent = <FlashcardsView onBack={handleBackToHub} />;
      } else if (activeSpace.type === "solve") {
        mainContent = <SolveView onBack={handleBackToHub} />;
      } else if (activeSpace.type === "write") {
        mainContent = <WriteView onBack={handleBackToHub} />;
      } else if (activeSpace.type === "recording") {
        mainContent = <RecordingView onBack={handleBackToHub} />;
      } else if (activeSpace.type === "notes") {
        mainContent = <NotesView onBack={handleBackToHub} />;
      } else if (activeSpace.type === "chat") {
        mainContent = (
          <ChatView
            spaceName={activeSpace.name}
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
        mainContent = <Hub onOpen={handleSelectTool} />;
      }
    }
  } else {
    mainContent = activeTool ? (
      views[activeTool]
    ) : (
      <Hub
        onOpen={handleSelectTool}
      />
    );
  }

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
      />

      {/* Floating rounded window container wrapping all content to the right of the Rail */}
      <div className="flex-1 flex overflow-hidden rounded-[20px] border border-border bg-[#18181b] my-2 mr-2 ml-1 shadow-2xl">
        {folderOpen ? (
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
              spaces={spaces}
              activeSpaceId={activeSpaceId}
              onSelectSpace={(id) => {
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
              onRenameSpace={(id, newName) => {
                setSpaces((prev) =>
                  prev.map((s) => (s.id === id ? { ...s, name: newName } : s))
                );
              }}
              onDeleteSpace={(id) => {
                setSpaces((prev) => prev.filter((s) => s.id !== id));
                setActiveSpaceId((curr) => {
                  if (curr === id) {
                    setActiveTool(null);
                    return null;
                  }
                  return curr;
                });
              }}
            />
          </div>
        ) : null}

        {folderOpen && showMembers ? (
          <div className="hidden shrink-0 md:block">
            <MembersPanel onClose={() => setShowMembers(false)} />
          </div>
        ) : null}

        {folderOpen && showKnowledge ? (
          <div className="hidden shrink-0 md:block">
            <KnowledgePanel onClose={() => setShowKnowledge(false)} />
          </div>
        ) : null}

        <main className="min-w-0 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSpaceId ? `${activeSpaceId}-${activeSpace?.type}-${activeSpace?.isConfigured}` : (activeTool ?? "hub")}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {mainContent}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <CreateFolderDialog open={createOpen} onOpenChange={setCreateOpen} />
      <InviteFriendsDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      {/* Space setup wizard modals */}
      <ToolSelectorModal
        isOpen={showToolSelector}
        onClose={() => setShowToolSelector(false)}
        onSelect={handleSelectTool}
      />

      <QuizWizardModal
        isOpen={showQuizWizard}
        onClose={() => {
          setShowQuizWizard(false);
          if (activeSpace && !activeSpace.isConfigured) {
            setSpaces((prev) => prev.filter((s) => s.id !== activeSpaceId));
            setActiveSpaceId(null);
          }
        }}
        onComplete={handleQuizWizardComplete}
      />

      <SubscriptionModal
        isOpen={subscriptionOpen}
        onClose={() => setSubscriptionOpen(false)}
      />
    </div>
  );
}
