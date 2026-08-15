import { useState } from "react";
import { Folder, ChevronRight, BookOpen, Plus, FileText, Upload } from "lucide-react";

export function StudyGuideEditor({
  spaceName,
  onSolve,
  onSaveText,
  initialText = "",
}: {
  spaceName: string;
  onSolve: () => void;
  onSaveText: (text: string) => void;
  initialText?: string;
}) {
  const [activeTab, setActiveTab] = useState<"upload" | "text">("upload");
  const [text, setText] = useState(initialText);

  const handleSave = () => {
    onSaveText(text);
    onSolve();
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      {/* Breadcrumb Path */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Folder size={15} />
        <span>My folder</span>
        <ChevronRight size={14} />
        <BookOpen size={15} />
        <span className="font-medium text-foreground">{spaceName}</span>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Add a problem</h1>

      {/* Tabs */}
      <div className="mt-6 flex items-center gap-2">
        <button
          onClick={() => setActiveTab("upload")}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === "upload"
              ? "bg-[#27272a] text-foreground"
              : "text-muted-foreground hover:bg-[#27272a]/40 hover:text-foreground"
          }`}
        >
          Upload
        </button>
        <button
          onClick={() => setActiveTab("text")}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === "text"
              ? "bg-[#27272a] text-foreground"
              : "text-muted-foreground hover:bg-[#27272a]/40 hover:text-foreground"
          }`}
        >
          Plain text
        </button>
      </div>

      {/* Main content block */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Problems</span>
          <button className="flex items-center gap-1 rounded-lg border border-border bg-secondary/80 hover:bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition-colors">
            <Plus size={14} />
            Add
          </button>
        </div>

        {activeTab === "upload" ? (
          /* Upload view */
          <div className="mt-4 flex h-[280px] w-full flex-col items-center justify-center rounded-2xl border border-border bg-[#18181b] p-6 text-center">
            <div className="rounded-full bg-secondary/40 p-4">
              <Upload size={24} className="text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-semibold text-foreground">
              Add notes, lectures, textbooks, etc.
            </p>
            <p className="mt-1 text-xs text-muted-foreground max-w-[280px] leading-relaxed">
              Add new problems or select existing ones to get started
            </p>
            <button className="mt-5 rounded-xl bg-secondary hover:bg-secondary-hover px-4 py-2 text-xs font-semibold text-foreground border border-border transition-colors">
              Add problems
            </button>
          </div>
        ) : (
          /* Plain text entry view */
          <div className="mt-4 flex flex-col w-full rounded-2xl border border-border bg-[#18181b] p-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste or write your text guide content here..."
              className="h-[200px] w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleSave}
                className="rounded-lg bg-primary hover:opacity-90 px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-all"
              >
                Save text
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer bar with Solve button */}
      <div className="mt-12 flex justify-end">
        <button
          onClick={onSolve}
          className="rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-foreground text-sm font-semibold px-6 py-2.5 transition-colors border border-border"
        >
          Solve
        </button>
      </div>
    </div>
  );
}
