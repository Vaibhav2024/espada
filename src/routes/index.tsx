import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
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
  Send,
  Smartphone,
  ArrowUpCircle,
  User,
  FileText,
  type LucideIcon,
} from "lucide-react";

import { FlashcardsView } from "@/components/study/FlashcardsView";
import { QuizView } from "@/components/study/QuizView";
import { StudyGuideView } from "@/components/study/StudyGuideView";
import { SolveView } from "@/components/study/SolveView";
import { WriteView } from "@/components/study/WriteView";
import { RecordingView } from "@/components/study/RecordingView";
import { NotesView } from "@/components/study/NotesView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atlas Study Workspace — AI Study Hub" },
      {
        name: "description",
        content:
          "A dark-mode AI study workspace with flashcards, quizzes, study guides, homework solving, writing tools, lecture recording and notes.",
      },
      { property: "og:title", content: "Atlas Study Workspace — AI Study Hub" },
      {
        property: "og:description",
        content:
          "Flashcards, quizzes, study guides, homework help, writing and lecture notes in one dark AI workspace.",
      },
    ],
  }),
  component: Index,
});

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

function Rail() {
  const bottom = [Smartphone, Send, LifeBuoy, User];
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[60px] flex-col items-center justify-between overflow-hidden bg-black py-3.5 md:flex">
      <div className="flex w-full flex-col items-center">
        <button className="flex size-10 items-center justify-center rounded-[14px] bg-secondary text-foreground transition-colors hover:bg-card-hover">
          <Home size={18} />
        </button>
        <div className="my-3 h-px w-6 bg-border" />
        <button className="flex size-10 items-center justify-center rounded-[14px] bg-secondary/70 text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground">
          <FolderOpen size={18} />
        </button>
        <button className="mt-3 flex size-10 items-center justify-center rounded-[14px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground">
          <Plus size={19} />
        </button>
      </div>
      <div className="flex flex-col items-center gap-5">
        {bottom.map((Icon, i) => (
          <button
            key={i}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Icon size={18} />
          </button>
        ))}
        <div className="rounded-[14px] bg-gradient-to-br from-[#ff8a3d] via-[#7c5cff] to-[#38bdf8] p-[1.5px]">
          <div className="flex flex-col items-center gap-0.5 rounded-[13px] bg-card px-2 py-1.5 text-[10px] font-semibold text-foreground">
            <ArrowUpCircle size={15} />
            Pro
          </div>
        </div>
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
                  <tool.icon
                    size={20}
                    className="text-muted-foreground transition-colors group-hover:text-foreground"
                  />
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
        <p className="text-sm text-muted-foreground">Ask Atlas anything…</p>
      </div>
    </div>
  );
}

function Index() {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
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
    <div className="flex min-h-screen bg-background text-foreground">
      <Rail />
      <main className="min-w-0 flex-1">
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
    </div>
  );
}
