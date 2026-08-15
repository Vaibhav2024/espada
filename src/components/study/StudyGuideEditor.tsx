import { useState, useRef, useEffect } from "react";
import {
  Folder,
  ChevronRight,
  BookOpen,
  Plus,
  FileText,
  Upload,
  Globe,
  User,
  Users,
  X,
  Link2,
  FileUp,
  FolderHeart,
  Check,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { KnowledgeSelectorModal } from "./KnowledgeSelector";

export type VisibilityType = "me" | "members" | "public";

interface Resource {
  id: string;
  name: string;
  loading: boolean;
}

export function StudyGuideEditor({
  spaceName,
  onSolve,
  onSaveText,
  initialText = "",
}: {
  spaceName: string;
  onSolve: (visibility: VisibilityType, resources: Resource[]) => void;
  onSaveText: (text: string) => void;
  initialText?: string;
}) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [importantTopics, setImportantTopics] = useState("");
  const [visibility, setVisibility] = useState<VisibilityType>("public");
  
  // Modals & Menu States
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [visibilityOpen, setVisibilityOpen] = useState(false);

  const addMenuRef = useRef<HTMLDivElement>(null);
  const visibilityRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setAddMenuOpen(false);
      }
      if (visibilityRef.current && !visibilityRef.current.contains(event.target as Node)) {
        setVisibilityOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Simulates adding a resource with a 3-second loader
  const addResourceItem = (name: string) => {
    const newId = `res-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const newRes: Resource = { id: newId, name, loading: true };
    setResources((prev) => [...prev, newRes]);
    
    // 3 second loading simulation
    setTimeout(() => {
      setResources((prev) =>
        prev.map((r) => (r.id === newId ? { ...r, loading: false } : r))
      );
    }, 3000);
  };

  const handleAddLink = () => {
    if (linkUrl.trim()) {
      let label = linkUrl.trim();
      try {
        const url = new URL(label.startsWith("http") ? label : `https://${label}`);
        label = url.hostname + url.pathname;
        if (label.length > 30) label = label.slice(0, 30) + "...";
      } catch (e) {}
      addResourceItem(`Link: ${label}`);
      setLinkUrl("");
      setLinkOpen(false);
      setAddMenuOpen(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file) => {
        addResourceItem(file.name);
      });
      setAddMenuOpen(false);
    }
  };

  const handleSelectMultipleKnowledge = (fileNames: string[]) => {
    fileNames.forEach((fileName) => {
      addResourceItem(fileName);
    });
    setAddMenuOpen(false);
  };

  const handleRemoveResource = (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
  };

  const handleGenerate = () => {
    // Save plain text content or metadata if relevant
    onSaveText(importantTopics);
    onSolve(visibility, resources);
  };

  const isGenerateDisabled =
    resources.length === 0 || resources.some((r) => r.loading);

  const getVisibilityLabel = (vis: VisibilityType) => {
    if (vis === "public") return "Public";
    if (vis === "members") return "Folder Members";
    return "Private";
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8 flex flex-col min-h-[calc(100vh-60px)]">
      {/* Breadcrumb Path */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Folder size={15} />
        <span>My folder</span>
        <ChevronRight size={14} />
        <BookOpen size={15} />
        <span className="font-medium text-foreground">{spaceName}</span>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 mt-6 flex flex-col justify-between">
        <div className="space-y-8">
          {/* Main Title */}
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            What are you studying?
          </h1>

          {/* Resources Block */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Resources</span>
              
              {/* + Add button */}
              <div className="relative" ref={addMenuRef}>
                <button
                  onClick={() => setAddMenuOpen(!addMenuOpen)}
                  className="flex items-center gap-1.5 rounded-xl bg-secondary/60 hover:bg-secondary px-3.5 py-2 text-xs font-bold text-foreground transition-all cursor-pointer border border-border"
                >
                  <Plus size={13} />
                  Add
                </button>

                <AnimatePresence>
                  {addMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute right-0 mt-2 w-[190px] rounded-xl border border-border bg-[#1c1c1f] p-1.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-1"
                    >
                      <button
                        onClick={() => {
                          setKnowledgeOpen(true);
                          setAddMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
                      >
                        <FolderHeart size={13} className="text-muted-foreground" />
                        From Knowledge
                      </button>
                      
                      <div className="my-1 border-t border-border/40" />
                      <div className="text-[10px] font-semibold text-muted-foreground px-2.5 py-1">
                        Upload new
                      </div>

                      <button
                        onClick={() => setLinkOpen(true)}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
                      >
                        <Link2 size={13} className="text-muted-foreground" />
                        From link
                      </button>

                      <button
                        onClick={() => {
                          fileInputRef.current?.click();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
                      >
                        <FileUp size={13} className="text-muted-foreground" />
                        From computer
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Hidden Input browser files */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              multiple
            />

            {/* Link paste inline overlay */}
            {linkOpen && (
              <div className="flex gap-2 bg-[#27272a]/30 p-2.5 rounded-xl border border-border">
                <input
                  type="text"
                  placeholder="Paste URL link here..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
                  className="flex-1 rounded-lg bg-[#18181b] px-3.5 py-1.5 text-xs text-foreground outline-none border border-border focus:ring-1 focus:ring-ring"
                  autoFocus
                />
                <button
                  onClick={handleAddLink}
                  className="rounded-lg bg-primary hover:opacity-90 px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all"
                >
                  Add
                </button>
                <button
                  onClick={() => setLinkOpen(false)}
                  className="rounded-lg bg-secondary hover:bg-secondary-hover px-2 py-1 text-xs font-semibold text-foreground border border-border"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Resources Central Container */}
            {resources.length === 0 ? (
              <div className="flex h-[280px] w-full flex-col items-center justify-center rounded-2xl border border-border bg-[#18181b]/35 p-6 text-center shadow-inner">
                <p className="text-sm font-bold text-foreground">
                  Add notes, lectures, textbooks, etc.
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground max-w-[280px] leading-relaxed">
                  Add a new resource or select an existing one to get started
                </p>
                <button
                  onClick={() => setAddMenuOpen(true)}
                  className="mt-6 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] px-4 py-2.5 text-xs font-bold text-foreground border border-border transition-colors cursor-pointer"
                >
                  Add resource
                </button>
              </div>
            ) : (
              /* Populated list view with circular progress spinner (Image 2 style) */
              <div className="rounded-2xl border border-border bg-[#18181b]/35 p-4 space-y-2.5 max-h-[300px] overflow-y-auto">
                {resources.map((res) => (
                  <div
                    key={res.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-[#27272a]/20 px-3.5 py-3"
                  >
                    <div className="flex items-center gap-3 text-xs font-semibold text-foreground min-w-0">
                      <FileText size={15} className="text-muted-foreground shrink-0" />
                      <span className="truncate pr-2">{res.name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {res.loading ? (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                          <div className="size-3.5 animate-spin rounded-full border-2 border-border border-t-foreground" />
                          <span>Embedding...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#10b981]">
                          <Check size={12} />
                          <span>Ready</span>
                        </div>
                      )}
                      <button
                        onClick={() => handleRemoveResource(res.id)}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-[#27272a] hover:text-foreground transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Important Topics Input Block */}
          <div className="space-y-3">
            <span className="text-sm font-bold text-foreground block">
              Important topics
            </span>
            <textarea
              value={importantTopics}
              onChange={(e) => setImportantTopics(e.target.value)}
              placeholder="What should be covered in the study guide? (optional)"
              className="w-full h-24 rounded-2xl border border-border bg-[#18181b]/35 p-4 text-xs font-semibold text-foreground placeholder:text-muted-foreground outline-none resize-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Footer controls layout */}
        <div className="mt-12 flex justify-between items-center border-t border-border/40 pt-4 relative">
          
          {/* Public Select box popover (Image 2 style) */}
          <div className="relative" ref={visibilityRef}>
            <button
              onClick={() => setVisibilityOpen(!visibilityOpen)}
              className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider cursor-pointer"
            >
              <Globe size={13} />
              <span>{getVisibilityLabel(visibility)}</span>
              <ChevronRight size={12} className="rotate-90" />
            </button>

            <AnimatePresence>
              {visibilityOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-full left-0 mb-3 w-[290px] rounded-[20px] border border-border bg-[#1c1c1f] p-4.5 shadow-2xl z-50"
                >
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-3.5">
                    Who can access this space?
                  </span>

                  <div className="space-y-2">
                    {/* Just me */}
                    <div
                      onClick={() => {
                        setVisibility("me");
                        setVisibilityOpen(false);
                      }}
                      className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                        visibility === "me" ? "border-foreground bg-[#27272a]/40" : "border-border/80 hover:bg-[#27272a]/20"
                      }`}
                    >
                      <div className="flex size-4.5 items-center justify-center rounded-full border border-muted-foreground shrink-0 mt-0.5">
                        {visibility === "me" && <div className="size-2 rounded-full bg-foreground" />}
                      </div>
                      <div className="space-y-0.5 text-left">
                        <span className="text-xs font-bold text-foreground block">Just me</span>
                        <span className="text-[10px] text-muted-foreground block">
                          Only you can view and edit this space
                        </span>
                      </div>
                    </div>

                    {/* Members in folder */}
                    <div
                      onClick={() => {
                        setVisibility("members");
                        setVisibilityOpen(false);
                      }}
                      className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                        visibility === "members" ? "border-foreground bg-[#27272a]/40" : "border-border/80 hover:bg-[#27272a]/20"
                      }`}
                    >
                      <div className="flex size-4.5 items-center justify-center rounded-full border border-muted-foreground shrink-0 mt-0.5">
                        {visibility === "members" && <div className="size-2 rounded-full bg-foreground" />}
                      </div>
                      <div className="space-y-0.5 text-left">
                        <span className="text-xs font-bold text-foreground block">Members in this folder</span>
                        <span className="text-[10px] text-muted-foreground block">
                          1 member can view and edit
                        </span>
                      </div>
                    </div>

                    {/* Anyone on web */}
                    <div
                      onClick={() => {
                        setVisibility("public");
                        setVisibilityOpen(false);
                      }}
                      className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                        visibility === "public" ? "border-foreground bg-[#27272a]/40" : "border-border/80 hover:bg-[#27272a]/20"
                      }`}
                    >
                      <div className="flex size-4.5 items-center justify-center rounded-full border border-muted-foreground shrink-0 mt-0.5">
                        {visibility === "public" && <div className="size-2 rounded-full bg-foreground" />}
                      </div>
                      <div className="space-y-0.5 text-left">
                        <span className="text-xs font-bold text-foreground block">Anyone on the web</span>
                        <span className="text-[10px] text-muted-foreground block">
                          Anyone can view, only you can edit
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerateDisabled}
            className="rounded-xl bg-foreground px-6 py-2.5 text-xs font-semibold text-background hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Generate study guide
          </button>
        </div>
      </div>

      {/* Shared Knowledge documents multi-selector */}
      <KnowledgeSelectorModal
        isOpen={knowledgeOpen}
        onClose={() => setKnowledgeOpen(false)}
        onSelectMultiple={handleSelectMultipleKnowledge}
      />
    </div>
  );
}
