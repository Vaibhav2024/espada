"use client";

import { useState } from "react";
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
import { FolderSidebar } from "@/components/workspace/FolderSidebar";
import { CreateFolderDialog } from "@/components/workspace/CreateFolderDialog";
import { InviteFriendsDialog } from "@/components/workspace/InviteFriendsDialog";
import { FlashcardsView } from "@/components/study/FlashcardsView";
import { QuizView } from "@/components/study/QuizView";
import { StudyGuideView } from "@/components/study/StudyGuideView";
import { SolveView } from "@/components/study/SolveView";
import { WriteView } from "@/components/study/WriteView";
import { RecordingView } from "@/components/study/RecordingView";
import { NotesView } from "@/components/study/NotesView";

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
  onPlus,
  onInvite,
}: {
  folderOpen: boolean;
  onFolder: () => void;
  onPlus: () => void;
  onInvite: () => void;
}) {
  const router = useRouter();

  return (
    <aside className="z-20 hidden w-[60px] shrink-0 flex-col items-center justify-between overflow-hidden bg-black py-3.5 md:flex">
      <div className="flex w-full flex-col items-center">
        <button
          onClick={() => router.push("/")}
          aria-label="Home"
          className="flex size-10 items-center justify-center rounded-[14px] bg-secondary text-foreground transition-colors hover:bg-card-hover"
        >
          <Home size={18} />
        </button>
        <div className="my-3 h-px w-6 bg-border" />
        <button
          onClick={onFolder}
          aria-label="My folder"
          className={`flex size-10 items-center justify-center rounded-[14px] transition-colors hover:bg-card-hover hover:text-foreground ${
            folderOpen ? "bg-secondary text-foreground" : "bg-secondary/70 text-muted-foreground"
          }`}
        >
          <FolderOpen size={18} />
        </button>
        <button
          onClick={onPlus}
          aria-label="Add"
          className="mt-3 flex size-10 items-center justify-center rounded-[14px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
        >
          <Plus size={19} />
        </button>
      </div>
      <div className="flex flex-col items-center gap-5">
        <button className="text-muted-foreground transition-colors hover:text-foreground">
          <Smartphone size={18} />
        </button>
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
        <div className="rounded-[14px] bg-gradient-to-br from-[#ff8a3d] via-[#7c5cff] to-[#38bdf8] p-[1.5px]">
          <div className="flex flex-col items-center gap-0.5 rounded-[13px] bg-card px-2 py-1.5 text-[10px] font-semibold text-foreground">
            <ArrowUpCircle size={15} />
            Pro
          </div>
        </div>

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
  const [folderOpen, setFolderOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const back = () => setActiveTool(null);

  const views: Record<ToolId, React.ReactNode> = {
    "study-guide": <StudyGuideView onBack={back} />,
    quiz: <QuizView onBack={back} />,
    flashcards: <FlashcardsView onBack={back} />,
    solve: <SolveView onBack={back} />,
    write: <WriteView onBack={back} />,
    recording: <RecordingView onBack={back} />,
    notes: <NotesView onBack={back} />,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <span className="sr-only" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="right"
          sideOffset={-30}
          alignOffset={110}
          className="w-[230px] rounded-2xl border-border bg-popover p-2"
        >
          <DropdownMenuItem
            onSelect={() => setCreateOpen(true)}
            className="gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold"
          >
            <PlusCircle size={16} />
            Create a new folder
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => router.push("/join")}
            className="gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold"
          >
            <Ticket size={16} />
            Join from invite code
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Rail
        folderOpen={folderOpen}
        onFolder={() => setFolderOpen((v) => !v)}
        onPlus={() => setMenuOpen(true)}
        onInvite={() => setInviteOpen(true)}
      />

      {folderOpen ? (
        <div className="hidden shrink-0 md:block">
          <FolderSidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((v) => !v)}
            onNewSpace={() => setMenuOpen(true)}
          />
        </div>
      ) : null}

      <main className="min-w-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTool ?? "hub"}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeTool ? views[activeTool] : <Hub onOpen={setActiveTool} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <CreateFolderDialog open={createOpen} onOpenChange={setCreateOpen} />
      <InviteFriendsDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
