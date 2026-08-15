import { Folder, ChevronRight, ListChecks, Globe, User, Users, Plus, Play, Sparkles } from "lucide-react";
import { VisibilityType } from "./SpaceWizard";

export function QuizEditor({
  spaceName,
  visibility,
  onTakeQuiz,
  onGenerateQuestions,
}: {
  spaceName: string;
  visibility: VisibilityType;
  onTakeQuiz: () => void;
  onGenerateQuestions: () => void;
}) {
  const getVisibilityIcon = () => {
    if (visibility === "me") return <User size={14} />;
    if (visibility === "members") return <Users size={14} />;
    return <Globe size={14} />;
  };

  const getVisibilityLabel = () => {
    if (visibility === "me") return "Just me";
    if (visibility === "members") return "Folder Members";
    return "Public";
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8 flex flex-col min-h-[calc(100vh-60px)]">
      {/* Top Header Row */}
      <div className="flex items-center justify-between">
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Folder size={15} />
          <span>My folder</span>
          <ChevronRight size={14} />
          <ListChecks size={15} />
          <span className="font-medium text-foreground">{spaceName}</span>
        </div>

        {/* Top-Right Visibility indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
          {getVisibilityIcon()}
          <span>{getVisibilityLabel()}</span>
        </div>
      </div>

      <div className="mt-8 flex-1">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">New quiz</h1>

        {/* Problems container */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Problems</span>
            <button className="flex items-center gap-1 rounded-lg border border-border bg-[#27272a]/60 hover:bg-[#27272a] px-3 py-1.5 text-xs font-semibold text-foreground transition-colors">
              <Plus size={14} />
              Add
            </button>
          </div>

          {/* Central Generator card */}
          <div className="mt-4 flex h-[280px] w-full flex-col items-center justify-center rounded-2xl border border-border bg-[#18181b] p-6 text-center">
            <button
              onClick={onGenerateQuestions}
              className="flex items-center gap-2 rounded-xl bg-secondary hover:bg-secondary-hover px-5 py-2.5 text-sm font-semibold text-foreground border border-border transition-colors shadow-sm"
            >
              <Sparkles size={16} />
              Generate questions
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Floating Control Pill (Image 4 Style) */}
      <div className="mt-12 flex justify-center pb-6">
        <div className="flex items-center rounded-full bg-[#18181b] border border-border p-1 shadow-xl">
          <button
            onClick={onTakeQuiz}
            className="flex items-center gap-2 rounded-full bg-secondary/80 hover:bg-secondary px-5 py-2.5 text-xs font-semibold text-foreground transition-colors"
          >
            <Play size={14} className="fill-current" />
            Take quiz
          </button>
          <div className="mx-2 h-5 w-px bg-border" />
          <button
            onClick={onGenerateQuestions}
            className="flex items-center gap-2 rounded-full hover:bg-secondary/40 px-5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <Sparkles size={14} />
            Generate questions
          </button>
        </div>
      </div>
    </div>
  );
}
