import { useState, useRef, useEffect } from "react";
import { generateQuiz, fetchKnowledgeItems, addSpaceResource } from "@/lib/api";
import {
  BookOpen,
  Layers,
  ListChecks,
  ListOrdered,
  PenTool,
  Mic,
  FileText,
  MessageSquare,
  Globe,
  User,
  Users,
  ChevronDown,
  X,
  Plus,
  Play,
  Sparkles,
  Link2,
  FileUp,
  FolderHeart,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { KnowledgeSelectorModal } from "./KnowledgeSelector";

type ToolId =
  | "study-guide"
  | "quiz"
  | "flashcards"
  | "solve"
  | "write"
  | "recording"
  | "notes"
  | "chat";

interface Tool {
  id: ToolId;
  label: string;
  sub: string;
  icon: any;
}

const WIZARD_SECTIONS = [
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

export function ToolSelectorModal({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (id: ToolId) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[680px] overflow-hidden rounded-[24px] border border-border bg-[#18181b] p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="text-sm text-muted-foreground">Select a tool for this space</div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5">
          <button
            onClick={() => onSelect("chat")}
            className="flex w-full items-center gap-3 rounded-xl bg-secondary/60 hover:bg-secondary px-4 py-3.5 text-left text-sm font-semibold text-foreground transition-colors"
          >
            <MessageSquare size={16} className="text-muted-foreground" />
            Chat with AI
          </button>

          {WIZARD_SECTIONS.map((section) => (
            <div key={section.title} className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                {section.title}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => onSelect(tool.id as ToolId)}
                    className="group flex h-[130px] flex-col justify-between rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-card-hover"
                  >
                    <tool.icon
                      size={18}
                      className="text-muted-foreground transition-colors group-hover:text-foreground"
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{tool.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                        {tool.sub}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export type VisibilityType = "me" | "members" | "public";

interface Resource {
  id: string;
  name: string;
  loading: boolean;
}

export function QuizWizardModal({
  isOpen,
  onClose,
  onComplete,
  folderId,
  spaceId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (method: "resources" | "own", visibility: VisibilityType, questions?: any[]) => void;
  folderId?: string;
  spaceId?: string;
}) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [method, setMethod] = useState<"resources" | "own">("resources");
  const [visibility, setVisibility] = useState<VisibilityType>("public");
  
  // Resources States
  const [resources, setResources] = useState<Resource[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  
  // Custom Topics State
  const [topics, setTopics] = useState("");
  const [knowledgeSelectorOpen, setKnowledgeSelectorOpen] = useState(false);

  // Quiz Settings States
  const [maxQuestions, setMaxQuestions] = useState("20");
  const [questionTypes, setQuestionTypes] = useState<string[]>([
    "Multiple choice",
    "True or false",
    "Short response",
    "Fill in the blank",
  ]);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [language, setLanguage] = useState("English");
  const [hardMode, setHardMode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const typeSelectorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setAddMenuOpen(false);
      }
      if (typeSelectorRef.current && !typeSelectorRef.current.contains(event.target as Node)) {
        setShowTypeSelector(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset wizard state when reopened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setMethod("resources");
      setResources([]);
      setTopics("");
      setMaxQuestions("20");
      setQuestionTypes(["Multiple choice", "True or false", "Short response", "Fill in the blank"]);
      setLanguage("English");
      setHardMode(false);
      setGenerating(false);
      setGenError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const visibilityLabels: Record<VisibilityType, string> = {
    me: "Just me",
    members: "Members in this folder",
    public: "Anyone on the web",
  };

  const getVisibilityShortLabel = (vis: VisibilityType) => {
    if (vis === "public") return "Public";
    if (vis === "members") return "Folder Members";
    return "Private";
  };

  // Adds a resource to the list
  const addResourceItem = (name: string, alreadyEmbedded = false) => {
    const newId = `res-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const newRes: Resource = { id: newId, name, loading: !alreadyEmbedded };
    setResources((prev) => [...prev, newRes]);

    if (!alreadyEmbedded) {
      // Real upload would poll status here — for now use timeout as placeholder
      setTimeout(() => {
        setResources((prev) =>
          prev.map((r) => (r.id === newId ? { ...r, loading: false } : r))
        );
      }, 3000);
    }
  };

  const handleAddLink = () => {
    if (linkUrl.trim()) {
      // clean hostname or label
      let label = linkUrl.trim();
      try {
        const url = new URL(label.startsWith("http") ? label : `https://${label}`);
        label = url.hostname + url.pathname;
        if (label.length > 30) label = label.slice(0, 30) + "...";
      } catch (e) {}
      addResourceItem(`Link: ${label}`);
      setLinkUrl("");
      setShowLinkInput(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file) => {
        addResourceItem(file.name);
      });
    }
  };

  const handleAddFromKnowledge = () => {
    setKnowledgeSelectorOpen(true);
    setAddMenuOpen(false);
  };

  const handleSelectMultipleKnowledge = async (fileNames: string[]) => {
    // Mark as ready immediately — these are already embedded
    fileNames.forEach((fileName) => {
      addResourceItem(fileName, true);
    });
    setAddMenuOpen(false);

    // Link existing knowledge assets to this space (no re-embedding)
    if (spaceId && folderId) {
      try {
        const items = await fetchKnowledgeItems(folderId);
        for (const fileName of fileNames) {
          const match = items.find((item) => item.asset.name === fileName);
          if (match) {
            await addSpaceResource(spaceId, match.assetId);
          }
        }
      } catch (err) {
        console.error("Failed to link knowledge resources:", err);
      }
    }
  };

  const toggleQuestionType = (type: string) => {
    if (questionTypes.includes(type)) {
      setQuestionTypes((prev) => prev.filter((t) => t !== type));
    } else {
      setQuestionTypes((prev) => [...prev, type]);
    }
  };

  const allAvailableTypes = [
    "Multiple choice",
    "True or false",
    "Short response",
    "Fill in the blank",
  ];
  const missingTypes = allAvailableTypes.filter((t) => !questionTypes.includes(t));

  const isNextDisabled =
    currentStep === 1 && (resources.length === 0 || resources.some((r) => r.loading));

  // Determine width based on current step
  const modalWidth = currentStep === 0 ? "max-w-[480px]" : "max-w-[650px]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <motion.div
        layout
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={`relative z-10 w-full ${modalWidth} overflow-visible rounded-[24px] border border-border bg-[#18181b] p-6 shadow-2xl`}
      >
        {/* Step Progress indicators (Steps 1, 2, 3) */}
        {currentStep > 0 && (
          <div className="flex items-center gap-5 border-b border-border/40 pb-4 mb-5 text-xs">
            <span
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all ${
                currentStep === 1
                  ? "bg-[#27272a] text-foreground font-semibold border-border"
                  : "text-muted-foreground font-medium border-transparent"
              }`}
            >
              <span className="flex size-4 items-center justify-center rounded-full bg-secondary text-[10px] text-foreground font-bold">
                1
              </span>
              Resources
            </span>
            <span
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all ${
                currentStep === 2
                  ? "bg-[#27272a] text-foreground font-semibold border-border"
                  : "text-muted-foreground font-medium border-transparent"
              }`}
            >
              <span className="flex size-4 items-center justify-center rounded-full bg-secondary text-[10px] text-foreground font-bold">
                2
              </span>
              Customize
            </span>
            <span
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all ${
                currentStep === 3
                  ? "bg-[#27272a] text-foreground font-semibold border-border"
                  : "text-muted-foreground font-medium border-transparent"
              }`}
            >
              <span className="flex size-4 items-center justify-center rounded-full bg-secondary text-[10px] text-foreground font-bold">
                3
              </span>
              Settings
            </span>
          </div>
        )}

        <div className="flex justify-between items-center pb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Quiz Configuration
          </span>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* STEP 0: METHOD SELECTION */}
        {currentStep === 0 && (
          <div>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
              How do you want to make questions?
            </h2>

            <div className="mt-6 space-y-3">
              <div
                onClick={() => setMethod("resources")}
                className={`flex items-center gap-3.5 rounded-xl border p-4 cursor-pointer select-none transition-colors ${
                  method === "resources"
                    ? "border-foreground bg-secondary/40 text-foreground"
                    : "border-border bg-transparent text-muted-foreground hover:bg-secondary/20"
                }`}
              >
                <div className="flex size-4 items-center justify-center rounded-full border border-muted-foreground">
                  {method === "resources" && (
                    <div className="size-2.5 rounded-full bg-foreground" />
                  )}
                </div>
                <span className="text-sm font-medium">Turn resources into questions</span>
              </div>

              <div
                onClick={() => setMethod("own")}
                className={`flex items-center gap-3.5 rounded-xl border p-4 cursor-pointer select-none transition-colors ${
                  method === "own"
                    ? "border-foreground bg-secondary/40 text-foreground"
                    : "border-border bg-transparent text-muted-foreground hover:bg-secondary/20"
                }`}
              >
                <div className="flex size-4 items-center justify-center rounded-full border border-muted-foreground">
                  {method === "own" && <div className="size-2.5 rounded-full bg-foreground" />}
                </div>
                <span className="text-sm font-medium">Write my own</span>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="mt-8 flex items-center justify-between border-t border-border/60 pt-4 relative">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-xl bg-secondary/60 hover:bg-secondary px-3.5 py-2 text-sm font-medium text-foreground transition-colors border border-border"
                >
                  <Globe size={15} className="text-muted-foreground" />
                  <span>{getVisibilityShortLabel(visibility)}</span>
                  <ChevronDown size={14} className="text-muted-foreground" />
                </button>

                {/* Visibility dropdown */}
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute bottom-full left-0 mb-2 w-[280px] rounded-2xl border border-border bg-[#18181b] p-3 shadow-xl z-50"
                    >
                      <div className="text-xs font-semibold text-muted-foreground px-2 py-1 mb-2">
                        Who can access this space?
                      </div>

                      <div className="space-y-1.5">
                        <div
                          onClick={() => {
                            setVisibility("me");
                            setDropdownOpen(false);
                          }}
                          className={`flex items-start gap-2.5 rounded-xl p-2.5 cursor-pointer transition-colors ${
                            visibility === "me" ? "bg-secondary" : "hover:bg-secondary/40"
                          }`}
                        >
                          <div className="mt-0.5 flex size-4 items-center justify-center rounded-full border border-muted-foreground">
                            {visibility === "me" && (
                              <div className="size-2 rounded-full bg-foreground" />
                            )}
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <User size={12} className="text-muted-foreground" />
                              Just me
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                              Only you can view and edit this space
                            </span>
                          </div>
                        </div>

                        <div
                          onClick={() => {
                            setVisibility("members");
                            setDropdownOpen(false);
                          }}
                          className={`flex items-start gap-2.5 rounded-xl p-2.5 cursor-pointer transition-colors ${
                            visibility === "members" ? "bg-secondary" : "hover:bg-secondary/40"
                          }`}
                        >
                          <div className="mt-0.5 flex size-4 items-center justify-center rounded-full border border-muted-foreground">
                            {visibility === "members" && (
                              <div className="size-2 rounded-full bg-foreground" />
                            )}
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <Users size={12} className="text-muted-foreground" />
                              Members in this folder
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                              1 member can view and edit
                            </span>
                          </div>
                        </div>

                        <div
                          onClick={() => {
                            setVisibility("public");
                            setDropdownOpen(false);
                          }}
                          className={`flex items-start gap-2.5 rounded-xl p-2.5 cursor-pointer transition-colors ${
                            visibility === "public" ? "bg-secondary" : "hover:bg-secondary/40"
                          }`}
                        >
                          <div className="mt-0.5 flex size-4 items-center justify-center rounded-full border border-muted-foreground">
                            {visibility === "public" && (
                              <div className="size-2 rounded-full bg-foreground" />
                            )}
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <Globe size={12} className="text-muted-foreground" />
                              Anyone on the web
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                              Anyone can view, only you can edit
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={() => {
                  if (method === "resources") {
                    setCurrentStep(1);
                  } else {
                    onComplete(method, visibility);
                  }
                }}
                className="rounded-xl bg-foreground px-6 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: ADD RESOURCES */}
        {currentStep === 1 && (
          <div>
            <div className="flex items-center justify-between mt-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Add resources
              </h2>
              
              {/* Add resource drop menu trigger */}
              <div className="relative" ref={addMenuRef}>
                <button
                  onClick={() => setAddMenuOpen(!addMenuOpen)}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-[#27272a]/60 hover:bg-[#27272a] px-3.5 py-2 text-xs font-semibold text-foreground transition-colors"
                >
                  <Plus size={14} />
                  Add
                </button>

                {/* Dropdown Options (From Knowledge, Link, Computer) */}
                <AnimatePresence>
                  {addMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute right-0 top-full mt-2 w-[190px] rounded-xl border border-border bg-[#1c1c1f] p-1.5 shadow-xl z-50"
                    >
                      <button
                        onClick={handleAddFromKnowledge}
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
                        onClick={() => {
                          setShowLinkInput(true);
                          setAddMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
                      >
                        <Link2 size={13} className="text-muted-foreground" />
                        From link
                      </button>

                      <button
                        onClick={() => {
                          fileInputRef.current?.click();
                          setAddMenuOpen(false);
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

            <p className="text-xs text-muted-foreground mt-1">Resources</p>

            {/* Link input inline popover */}
            {showLinkInput && (
              <div className="mt-4 flex gap-2 bg-[#27272a]/30 p-3 rounded-xl border border-border">
                <input
                  type="text"
                  placeholder="Paste URL link here..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
                  className="flex-1 rounded-lg bg-[#18181b] px-3.5 py-2 text-xs text-foreground outline-none border border-border focus:ring-1 focus:ring-ring"
                  autoFocus
                />
                <button
                  onClick={handleAddLink}
                  className="rounded-lg bg-primary hover:opacity-90 px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-all"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowLinkInput(false)}
                  className="rounded-lg bg-secondary hover:bg-secondary-hover px-2 py-2 text-xs font-semibold text-foreground border border-border"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
            />

            {/* Central Content Box */}
            <div className="mt-4 min-h-[220px] rounded-2xl border border-border bg-[#18181b]/50 p-6 flex flex-col justify-center items-center">
              {resources.length === 0 ? (
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">
                    Add notes, lectures, textbooks, etc.
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground max-w-[340px] leading-relaxed">
                    Your quiz will be based on the content of the resources you add
                  </p>
                  <button
                    onClick={() => setAddMenuOpen(true)}
                    className="mt-5 rounded-xl bg-secondary hover:bg-secondary-hover border border-border px-4 py-2 text-xs font-semibold text-foreground transition-colors"
                  >
                    Add resource
                  </button>
                </div>
              ) : (
                /* Dynamic Resources list with loading spinner (Image 3) */
                <div className="w-full grid gap-3 sm:grid-cols-2">
                  {resources.map((res) => (
                    <div
                      key={res.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-[#27272a]/20 px-4 py-3 text-left overflow-hidden"
                    >
                      {res.loading ? (
                        /* Spinner */
                        <div className="size-5 shrink-0 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
                      ) : (
                        /* Checkmark */
                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success/20 text-success">
                          <Check size={12} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {res.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                          {res.loading ? "Studying" : "Ready"}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setResources((prev) => prev.filter((r) => r.id !== res.id))
                        }
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer row */}
            <div className="mt-6 flex justify-between items-center border-t border-border/40 pt-4">
              <button
                onClick={() => setCurrentStep(0)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(2)}
                disabled={isNextDisabled}
                className={`rounded-xl px-6 py-2.5 text-xs font-semibold transition-all ${
                  isNextDisabled
                    ? "bg-[#27272a] text-muted-foreground cursor-not-allowed"
                    : "bg-foreground text-background hover:opacity-90 cursor-pointer"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PICK TOPICS (Image 4) */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground mt-2">
              Pick topics to focus on (optional)
            </h2>

            <div className="mt-6">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Custom topics
              </label>
              <textarea
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                placeholder="Topic 1, Topic 2, Topic 3"
                className="w-full h-[150px] rounded-xl border border-border bg-[#18181b] p-4 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none focus:ring-1 focus:ring-ring"
              />
              <p className="text-[10px] text-muted-foreground mt-2">
                Separate custom topics with a comma
              </p>
            </div>

            {/* Footer row */}
            <div className="mt-6 flex justify-between items-center border-t border-border/40 pt-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="rounded-xl bg-foreground px-6 py-2.5 text-xs font-semibold text-background hover:opacity-90 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SETTINGS (Image 5) */}
        {currentStep === 3 && (
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground mt-2">
              Quiz resources
            </h2>

            <div className="mt-6 space-y-5">
              {/* Question Count */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Maximum number of questions
                </label>
                <input
                  type="number"
                  value={maxQuestions}
                  onChange={(e) => setMaxQuestions(e.target.value)}
                  className="w-full rounded-xl border border-border bg-[#18181b] px-4 py-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                />
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  30 questions or fewer. You can add more later.
                </p>
              </div>

              {/* Question Types pills */}
              <div className="relative">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Question Types
                </label>
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-[#18181b]/50 p-2.5 min-h-[50px] relative pr-10">
                  {questionTypes.map((type) => (
                    <div
                      key={type}
                      className="flex items-center gap-1.5 rounded-lg bg-secondary/80 border border-border px-2.5 py-1 text-xs font-semibold text-foreground select-none"
                    >
                      <span>{type}</span>
                      <button
                        onClick={() => toggleQuestionType(type)}
                        className="rounded-full p-0.5 hover:bg-card-hover text-muted-foreground hover:text-foreground"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}

                  {/* Dropdown open indicator arrow */}
                  <button
                    onClick={() => setShowTypeSelector(!showTypeSelector)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>

                {/* Add back question types dropdown list */}
                <AnimatePresence>
                  {showTypeSelector && missingTypes.length > 0 && (
                    <motion.div
                      ref={typeSelectorRef}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute left-0 top-full mt-1.5 w-full rounded-xl border border-border bg-[#1c1c1f] p-1.5 shadow-xl z-50"
                    >
                      {missingTypes.map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            toggleQuestionType(type);
                            setShowTypeSelector(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
                        >
                          <Plus size={13} className="text-muted-foreground" />
                          {type}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Language & Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                {/* Language Select */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-xl border border-border bg-[#18181b] px-4 py-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                  </select>
                </div>

                {/* Hard Mode Toggle */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                    Difficulty
                  </label>
                  <div className="flex h-[46px] items-center justify-between rounded-xl border border-border bg-[#18181b] px-4 py-2.5">
                    <span className="text-xs font-semibold text-foreground">Hard mode</span>
                    <button
                      onClick={() => setHardMode(!hardMode)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                        hardMode ? "bg-[#3b82f6]" : "bg-secondary"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          hardMode ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Error message */}
            {genError && (
              <p className="mt-4 text-xs text-destructive font-semibold">{genError}</p>
            )}

            {/* Footer row */}
            <div className="mt-8 flex justify-between items-center border-t border-border/40 pt-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Back
              </button>
              <button
                onClick={async () => {
                  setGenerating(true);
                  try {
                    const questions = await generateQuiz({
                      spaceId: spaceId || "",
                      folderId,
                      count: Math.min(Number(maxQuestions) || 10, 30),
                      types: questionTypes,
                      language,
                      hardMode,
                      topics: topics || undefined,
                    });
                    setGenerating(false);
                    if (questions && questions.length > 0) {
                      onComplete(method, visibility, questions);
                    } else {
                      setGenError("No questions were generated. Try different settings or add more resources.");
                    }
                  } catch (err) {
                    console.error("Quiz generation failed:", err);
                    setGenerating(false);
                    setGenError("Failed to generate quiz. Please try again.");
                  }
                }}
                disabled={generating}
                className="rounded-xl bg-foreground px-6 py-2.5 text-xs font-semibold text-background hover:opacity-90 cursor-pointer transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <span className="size-3.5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Generating...
                  </span>
                ) : (
                  "Generate"
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
      <KnowledgeSelectorModal
        isOpen={knowledgeSelectorOpen}
        onClose={() => setKnowledgeSelectorOpen(false)}
        folderId={folderId}
        onSelectMultiple={handleSelectMultipleKnowledge}
      />
    </div>
  );
}
