import { useState, useRef, useEffect } from "react";
import { streamNotes, readStream, streamChat, fetchDocLines, saveDocLines, uploadKnowledge, addKnowledgeLink, pollAssetStatus } from "@/lib/api";
import { ACCEPTED_FILE_TYPES } from "@/hooks/useResourceUpload";
import {
  Folder,
  ChevronRight,
  BookOpen,
  Globe,
  Plus,
  MoreVertical,
  Quote,
  Table,
  List,
  ListOrdered,
  Eraser,
  Copy,
  Layers,
  Trash2,
  ChevronsRight,
  ChevronsLeft,
  Check,
  FileText,
  Minus,
  Upload,
  Link2,
  FileUp,
  FolderHeart,
  X,
  User,
  Users,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatView } from "./ChatView";
import { KnowledgeSelectorModal } from "./KnowledgeSelector";

export type VisibilityType = "me" | "members" | "public";

export interface Resource {
  id: string;
  name: string;
  loading: boolean;
}

export interface DocLine {
  id: string;
  text: string;
  type: "h1" | "h2" | "h3" | "bullet" | "number" | "quote" | "plain" | "table";
  tableData?: {
    headers: string[];
    rows: string[][];
    style?: "default" | "striped" | "clean" | "glass";
  };
}

// ==========================================
// 1. NOTES EDITOR (WIZARD SETUP PAGE)
// ==========================================
export function NotesEditor({
  spaceName,
  spaceId,
  folderId,
  onGenerate,
}: {
  spaceName: string;
  spaceId?: string;
  folderId?: string;
  onGenerate: (visibility: VisibilityType, resources: Resource[], generatedName: string, generatedText?: string) => void;
}) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
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

  const addResourceItem = (name: string, assetId?: string, alreadyReady?: boolean) => {
    const newId = `res-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const newRes: Resource = { id: newId, name, loading: !(assetId || alreadyReady) };
    setResources((prev) => [...prev, newRes]);
    if (assetId) {
      setSelectedAssetIds((prev) => [...prev, assetId]);
    }
    return newId;
  };

  const handleAddLink = async () => {
    if (!linkUrl.trim() || !folderId) return;
    const rawUrl = linkUrl.trim().startsWith("http") ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    let label = rawUrl;
    try {
      const parsed = new URL(rawUrl);
      label = parsed.hostname + parsed.pathname;
      if (label.length > 30) label = label.slice(0, 30) + "...";
    } catch {}

    const resId = addResourceItem(`Link: ${label}`);
    setLinkUrl("");
    setLinkOpen(false);
    setAddMenuOpen(false);

    try {
      const item = await addKnowledgeLink(folderId, rawUrl, label);
      setSelectedAssetIds((prev) => [...prev, item.assetId]);
      // Poll until ready
      await pollAssetStatus(item.assetId, (status) => {
        if (status === "ready" || status === "failed") {
          setResources((prev) => prev.map((r) => r.id === resId ? { ...r, loading: false } : r));
        }
      });
    } catch {
      setResources((prev) => prev.map((r) => r.id === resId ? { ...r, loading: false } : r));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !folderId) return;
    setAddMenuOpen(false);

    for (const file of Array.from(e.target.files)) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !["pdf", "pptx", "docx", "txt", "md"].includes(ext)) continue;

      const resId = addResourceItem(file.name);

      try {
        const item = await uploadKnowledge(folderId, file);
        setSelectedAssetIds((prev) => [...prev, item.assetId]);
        await pollAssetStatus(item.assetId, (status) => {
          if (status === "ready" || status === "failed") {
            setResources((prev) => prev.map((r) => r.id === resId ? { ...r, loading: false } : r));
          }
        });
      } catch {
        setResources((prev) => prev.map((r) => r.id === resId ? { ...r, loading: false } : r));
      }
    }
    // Reset file input
    if (e.target) e.target.value = "";
  };

  const handleSelectMultipleKnowledge = (fileNames: string[]) => {
    fileNames.forEach((fileName) => {
      addResourceItem(fileName, undefined, true);
    });
    setAddMenuOpen(false);
  };

  const handleSelectWithAssets = (items: { name: string; assetId: string }[]) => {
    items.forEach((item) => {
      addResourceItem(item.name, item.assetId);
    });
  };

  const handleRemoveResource = (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
  };

  const handleGenerate = async () => {
    const firstResName = resources[0]?.name || "";
    const baseName = firstResName.replace(/\.[^/.]+$/, "");
    const generatedName = baseName ? `Notes on ${baseName}` : "Generated Notes";

    if (spaceId) {
      setGenerating(true);
      setGenerateError(null);
      try {
        const response = await streamNotes({ spaceId, folderId, assetIds: selectedAssetIds });
        let fullText = "";
        await readStream(response, (chunk) => {
          fullText += chunk;
        });
        setGenerating(false);
        onGenerate(visibility, resources, generatedName, fullText);
      } catch (err: any) {
        setGenerating(false);
        setGenerateError(
          err?.status === 429
            ? "Daily AI limit reached. Please try again later or upgrade your plan."
            : "Failed to generate notes. Please try again."
        );
      }
    } else {
      onGenerate(visibility, resources, generatedName);
    }
  };

  const isGenerateDisabled =
    resources.length === 0 || resources.some((r) => r.loading) || generating;

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
        <FileText size={15} />
        <span className="font-medium text-foreground truncate max-w-[200px]">{spaceName}</span>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 mt-6 flex flex-col justify-between">
        <div className="space-y-8">
          {/* Main Title */}
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            What would you like notes for?
          </h1>

          {/* Resources Block */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Resources</span>
              
              {/* + Add button */}
              <div className="relative" ref={addMenuRef}>
                <button
                  onClick={() => setAddMenuOpen(!addMenuOpen)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#27272a]/60 hover:bg-[#27272a] px-3.5 py-2 text-xs font-bold text-foreground transition-all cursor-pointer border border-border"
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
                      className="absolute right-0 mt-2 w-[190px] rounded-xl border border-border bg-[#1c1c1f] p-1.5 shadow-xl z-50"
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
              accept={ACCEPTED_FILE_TYPES}
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
              /* Populated list view with circular progress spinner */
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
        </div>

        {/* Footer controls layout */}
        <div className="mt-12 flex justify-between items-center border-t border-border/40 pt-4 relative">
          
          {/* Public Select box popover */}
          <div className="relative" ref={visibilityRef}>
            <button
              onClick={() => setVisibilityOpen(!visibilityOpen)}
              className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider cursor-pointer border-none bg-transparent outline-none"
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
          {generateError && (
            <p className="text-xs text-destructive font-medium absolute bottom-full mb-2 right-0">{generateError}</p>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerateDisabled}
            className="rounded-xl bg-foreground px-6 py-2.5 text-xs font-semibold text-background hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-none outline-none"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="size-3 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Generating...
              </span>
            ) : (
              "Generate notes"
            )}
          </button>
        </div>
      </div>

      {/* Shared Knowledge documents multi-selector */}
      <KnowledgeSelectorModal
        isOpen={knowledgeOpen}
        onClose={() => setKnowledgeOpen(false)}
        folderId={folderId}
        onSelectMultiple={handleSelectMultipleKnowledge}
        onSelectWithAssets={handleSelectWithAssets}
      />
    </div>
  );
}

// ==========================================
// 2. NOTES VIEW (EDITOR + CHAT PAGE)
// ==========================================
export function NotesView({
  spaceName = "Notes on RAG and LLMs",
  spaceId,
  visibility: initialVisibility = "public",
  onBack,
  onUpdateVisibility,
  resources: initialResources = [],
  initialDraft,
}: {
  spaceName?: string;
  spaceId?: string;
  visibility?: VisibilityType;
  onBack: () => void;
  onUpdateVisibility?: (vis: VisibilityType) => void;
  resources?: Resource[];
  initialDraft?: string;
}) {
  const [visibility, setVisibility] = useState<VisibilityType>(initialVisibility);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const visibilityRef = useRef<HTMLDivElement>(null);

  // Document lines state
  const [lines, setLines] = useState<DocLine[]>([]);

  // Parse text into structured doc lines (same as WriteView)
  const parseTextToLines = (rawText: string): DocLine[] => {
    const rawLines = rawText.split("\n");
    const docLines: DocLine[] = [];
    let currentParagraph = "";

    const flushParagraph = () => {
      if (currentParagraph.trim()) {
        docLines.push({
          id: `line-init-${docLines.length}-${Date.now()}`,
          text: stripInlineMarkdown(currentParagraph.trim()),
          type: "plain",
        });
        currentParagraph = "";
      }
    };

    for (const rawLine of rawLines) {
      const trimmed = rawLine.trim();
      if (trimmed === "") { flushParagraph(); continue; }
      if (trimmed.startsWith("### ")) { flushParagraph(); docLines.push({ id: `line-init-${docLines.length}-${Date.now()}`, text: stripInlineMarkdown(trimmed.slice(4)), type: "h3" }); continue; }
      if (trimmed.startsWith("## ")) { flushParagraph(); docLines.push({ id: `line-init-${docLines.length}-${Date.now()}`, text: stripInlineMarkdown(trimmed.slice(3)), type: "h2" }); continue; }
      if (trimmed.startsWith("# ")) { flushParagraph(); docLines.push({ id: `line-init-${docLines.length}-${Date.now()}`, text: stripInlineMarkdown(trimmed.slice(2)), type: "h1" }); continue; }
      if (/^[-*]\s+/.test(trimmed)) { flushParagraph(); docLines.push({ id: `line-init-${docLines.length}-${Date.now()}`, text: stripInlineMarkdown(trimmed.replace(/^[-*]\s+/, "")), type: "bullet" }); continue; }
      if (/^\d+[.)]\s+/.test(trimmed)) { flushParagraph(); docLines.push({ id: `line-init-${docLines.length}-${Date.now()}`, text: stripInlineMarkdown(trimmed.replace(/^\d+[.)]\s+/, "")), type: "number" }); continue; }
      if (trimmed.startsWith("> ")) { flushParagraph(); docLines.push({ id: `line-init-${docLines.length}-${Date.now()}`, text: stripInlineMarkdown(trimmed.slice(2)), type: "quote" }); continue; }
      currentParagraph += (currentParagraph ? " " : "") + trimmed;
    }
    flushParagraph();
    if (docLines.length === 0) return [{ id: `line-1`, text: "", type: "plain" }];
    return docLines;
  };

  const stripInlineMarkdown = (text: string): string => {
    return text
      .replace(/\*\*\*(.*?)\*\*\*/g, "$1")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      .replace(/~~(.*?)~~/g, "$1")
      .replace(/`(.*?)`/g, "$1")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1");
  };

  // Load content: from initialDraft prop OR from database on refresh
  const [contentLoaded, setContentLoaded] = useState(false);
  useEffect(() => {
    if (contentLoaded) return;
    if (initialDraft) {
      const parsed = parseTextToLines(initialDraft);
      setLines(parsed);
      setContentLoaded(true);
    } else if (spaceId) {
      fetchDocLines(spaceId)
        .then((dbLines) => {
          if (dbLines.length > 0) {
            setLines(dbLines.map((l) => ({
              id: l.id,
              text: l.text,
              type: l.type as DocLine["type"],
              tableData: l.tableData as DocLine["tableData"],
            })));
          }
          setContentLoaded(true);
        })
        .catch(() => setContentLoaded(true));
    } else {
      setContentLoaded(true);
    }
  }, [initialDraft, spaceId]);

  // Auto-save: debounced save to DB whenever lines change
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!spaceId || !contentLoaded || lines.length === 0) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDocLines(
        spaceId,
        lines.map((l) => ({ type: l.type, text: l.text, tableData: l.tableData }))
      ).catch(() => {});
    }, 1500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [lines, spaceId, contentLoaded]);

  const [activeSlashLineId, setActiveSlashLineId] = useState<string | null>(null);
  const [activeMenuLineId, setActiveMenuLineId] = useState<string | null>(null);
  const [lineIndexMap, setLineIndexMap] = useState<Record<string, number>>({});

  // Split pane & Collapse state
  const containerRef = useRef<HTMLDivElement>(null);
  const [chatWidth, setChatWidth] = useState(420);
  const [chatCollapsed, setChatCollapsed] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      setChatCollapsed(false);
    }
  }, []);

  // Chat resources state
  const [chatResources, setChatResources] = useState<Resource[]>(() => {
    if (initialResources && initialResources.length > 0) {
      return initialResources;
    }
    return [
      { id: "res-rag", name: "RAG_Overview.pdf", loading: false },
    ];
  });
  const [focusedResourceIds, setFocusedResourceIds] = useState<string[]>(() => {
    if (initialResources && initialResources.length > 0) {
      return initialResources.map((r) => r.id);
    }
    return ["res-rag"];
  });

  // Floating text selection popover states
  const [chatInputText, setChatInputText] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [popupCoords, setPopupCoords] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setPopupCoords(null);
        setSelectedText("");
        return;
      }

      const text = selection.toString();
      const anchorNode = selection.anchorNode;
      let isInsideEditor = false;
      let parent = anchorNode?.parentElement;
      while (parent) {
        if (parent.classList.contains("line-wrapper")) {
          isInsideEditor = true;
          break;
        }
        parent = parent.parentElement;
      }

      if (!isInsideEditor) {
        setPopupCoords(null);
        setSelectedText("");
        return;
      }

      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        setPopupCoords({
          x: rect.left + rect.width / 2,
          y: rect.bottom + 8,
        });
        setSelectedText(text);
      } catch (e) {
        setPopupCoords(null);
        setSelectedText("");
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  const handleAddToChat = () => {
    setChatInputText(selectedText);
    window.getSelection()?.removeAllRanges();
    setPopupCoords(null);
  };

  // File switcher states
  const [folderDropdownOpen, setFolderDropdownOpen] = useState(false);
  const [activeResourceId, setActiveResourceId] = useState(() => {
    if (initialResources && initialResources.length > 0) {
      return initialResources[0].id;
    }
    return "res-rag";
  });
  const [fileContentMap, setFileContentMap] = useState<Record<string, DocLine[]>>(() => {
    const initialMap: Record<string, DocLine[]> = {};
    if (initialResources && initialResources.length > 0) {
      initialMap[initialResources[0].id] = lines;
    }
    return initialMap;
  });

  const updateLines = (newLines: DocLine[] | ((prev: DocLine[]) => DocLine[])) => {
    setLines((prev) => {
      const next = typeof newLines === "function" ? newLines(prev) : newLines;
      setFileContentMap((map) => ({ ...map, [activeResourceId]: next }));
      return next;
    });
  };

  const generateMockLinesForFile = (fileName: string): DocLine[] => [
    {
      id: `line-${Date.now()}-1`,
      text: `Notes on ${fileName.replace(/\.[^/.]+$/, "")}`,
      type: "h1",
    },
    {
      id: `line-${Date.now()}-2`,
      text: "",
      type: "plain",
    },
  ];

  const handleSelectResource = (resId: string) => {
    setFileContentMap((prev) => ({
      ...prev,
      [activeResourceId]: lines,
    }));

    setActiveResourceId(resId);

    const existing = fileContentMap[resId];
    if (existing) {
      setLines(existing);
    } else {
      const resource = chatResources.find((r) => r.id === resId);
      const generated = generateMockLinesForFile(resource ? resource.name : "Document");
      setLines(generated);
      setFileContentMap((prev) => ({
        ...prev,
        [resId]: generated,
      }));
    }

    setFolderDropdownOpen(false);
  };

  const handleAddResource = (res: Resource) => {
    setChatResources((prev) => [...prev, res]);
  };

  const handleRemoveResource = (id: string) => {
    setChatResources((prev) => prev.filter((r) => r.id !== id));
    setFocusedResourceIds((prev) => prev.filter((fid) => fid !== id));
  };

  const handleToggleFocus = (id: string) => {
    setFocusedResourceIds((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    );
  };

  const handleUpdateLoading = (id: string, loading: boolean) => {
    setChatResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, loading } : r))
    );
  };

  useEffect(() => {
    let numIndex = 1;
    const nextMap: Record<string, number> = {};
    lines.forEach((l) => {
      if (l.type === "number") {
        nextMap[l.id] = numIndex++;
      } else {
        numIndex = 1;
      }
    });
    setLineIndexMap(nextMap);
  }, [lines]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRef.current.clientWidth;
      const newWidth = containerRect.right - e.clientX;

      if (newWidth > 250 && newWidth < containerWidth * 0.6) {
        setChatWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (visibilityRef.current && !visibilityRef.current.contains(event.target as Node)) {
        setVisibilityOpen(false);
      }

      const target = event.target as HTMLElement;
      if (!target.closest(".line-wrapper")) {
        setActiveSlashLineId(null);
        setActiveMenuLineId(null);
      }

      if (!target.closest(".folder-breadcrumb-container")) {
        setFolderDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleVisibility = (vis: VisibilityType) => {
    setVisibility(vis);
    setVisibilityOpen(false);
    if (onUpdateVisibility) {
      onUpdateVisibility(vis);
    }
  };

  const getVisibilityLabel = (vis: VisibilityType) => {
    if (vis === "public") return "Public";
    if (vis === "members") return "Folder Members";
    return "Private";
  };

  const handleUpdateText = (id: string, text: string) => {
    updateLines((prev) => prev.map((l) => (l.id === id ? { ...l, text } : l)));
  };

  const handleInsertLine = (afterId: string) => {
    const newId = `line-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const newBlock: DocLine = { id: newId, text: "", type: "plain" };
    updateLines((prev) => {
      const idx = prev.findIndex((l) => l.id === afterId);
      const next = [...prev];
      next.splice(idx + 1, 0, newBlock);
      return next;
    });
    setTimeout(() => {
      const element = document.getElementById(`editable-${newId}`);
      element?.focus();
    }, 50);
  };

  const handleDeleteLine = (id: string, focusPrev = false) => {
    if (lines.length <= 1) return;
    const idx = lines.findIndex((l) => l.id === id);
    updateLines((prev) => prev.filter((l) => l.id !== id));

    if (focusPrev && idx > 0) {
      const prevLine = lines[idx - 1];
      setTimeout(() => {
        const element = document.getElementById(`editable-${prevLine.id}`);
        element?.focus();

        if (element) {
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(element);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }, 50);
    }
  };

  const handleDuplicateLine = (id: string) => {
    const line = lines.find((l) => l.id === id);
    if (!line) return;
    const newId = `line-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const newBlock: DocLine = { ...line, id: newId };
    updateLines((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, newBlock);
      return next;
    });
    setActiveMenuLineId(null);
  };

  const handlePlusClickOnLine = (lineId: string) => {
    const newId = `line-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const newBlock: DocLine = { id: newId, text: "/", type: "plain" };
    updateLines((prev) => {
      const idx = prev.findIndex((l) => l.id === lineId);
      const next = [...prev];
      next.splice(idx + 1, 0, newBlock);
      return next;
    });

    setActiveMenuLineId(null);

    setTimeout(() => {
      const element = document.getElementById(`editable-${newId}`);
      if (element) {
        element.innerText = "/";
        element.focus();

        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(element);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      setActiveSlashLineId(newId);
    }, 50);
  };

  const handleApplyFormat = (id: string, formatType: DocLine["type"]) => {
    updateLines((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          let cleanText = l.text;
          if (cleanText.endsWith("/")) {
            cleanText = cleanText.slice(0, -1);
          }
          const element = document.getElementById(`editable-${id}`);
          if (element) {
            element.innerText = cleanText;
          }
          const tableData = formatType === "table" ? {
            headers: ["Col 1", "Col 2"],
            rows: [
              ["", ""],
              ["", ""]
            ],
            style: "default" as const
          } : undefined;
          return { ...l, type: formatType, text: cleanText, tableData };
        }
        return l;
      })
    );

    setActiveSlashLineId(null);

    setTimeout(() => {
      const element = document.getElementById(`editable-${id}`);
      element?.focus();
    }, 50);
  };

  const handleUpdateTableData = (id: string, tableData: DocLine["tableData"]) => {
    updateLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, tableData } : l))
    );
  };

  const handleClearFormatting = (id: string) => {
    updateLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, type: "plain" } : l))
    );
    setActiveMenuLineId(null);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setActiveMenuLineId(null);
  };

  const initialChatMessages = [
    {
      id: "welcome-notes-msg",
      sender: "ai" as const,
      text: "I've generated a set of detailed notes for your selected resources. You can edit them directly in the workspace, add tables, quotes, or format lines using the Gutenberg blocks editor. How can I help you refine or learn this material?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ];

  return (
    <div
      ref={containerRef}
      className="flex h-[calc(100vh-20px)] w-full overflow-hidden select-none bg-[#111113]"
    >
      {/* LEFT PANEL: Document block editor */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0d0d0e] p-6 overflow-y-auto">
        {/* Header toolbar */}
        <div className="hidden md:flex items-center justify-between pb-4 border-b border-border/40 mb-6 shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground folder-breadcrumb-container relative">
            <button
              onClick={() => setFolderDropdownOpen(!folderDropdownOpen)}
              className="flex items-center gap-1.5 hover:text-foreground hover:bg-[#27272a]/40 px-2 py-1 rounded-lg transition-all cursor-pointer text-muted-foreground border-none bg-transparent"
            >
              <Folder size={14} />
              <span>My folder</span>
            </button>
            <ChevronRight size={12} />
            <FileText size={14} className="text-muted-foreground" />
            <span className="font-semibold text-foreground truncate max-w-[200px]">
              {spaceName}
            </span>

            <AnimatePresence>
              {folderDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute left-0 top-full mt-2 w-[240px] rounded-xl border border-border bg-[#1c1c1f] p-1.5 shadow-2xl z-50 text-left"
                >
                  <span className="text-[9px] font-bold text-[#a1a1aa] uppercase tracking-wider block px-2.5 py-1.5">
                    Select Document to View
                  </span>

                  <div className="space-y-0.5 max-h-[220px] overflow-y-auto">
                    {chatResources.map((res) => (
                      <button
                        key={res.id}
                        onClick={() => handleSelectResource(res.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold hover:bg-[#27272a] transition-colors border-none bg-transparent cursor-pointer ${activeResourceId === res.id ? "text-foreground bg-[#27272a]/60" : "text-muted-foreground"
                          }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText size={13} className="text-muted-foreground shrink-0" />
                          <span className="truncate">{res.name}</span>
                        </div>
                        {activeResourceId === res.id && (
                          <Check size={12} className="text-[#3b82f6] shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-3">
            {/* Visibility Selector */}
            <div className="relative" ref={visibilityRef}>
              <button
                onClick={() => setVisibilityOpen(!visibilityOpen)}
                className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider cursor-pointer border-none bg-transparent outline-none"
              >
                <Globe size={12} />
                <span>{getVisibilityLabel(visibility)}</span>
                <ChevronRight size={10} className="rotate-90" />
              </button>

              <AnimatePresence>
                {visibilityOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 mt-2 w-[280px] rounded-[18px] border border-border bg-[#1c1c1f] p-4 shadow-2xl z-50 text-left"
                  >
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-3">
                      Who can access this space?
                    </span>

                    <div className="space-y-2">
                      <div
                        onClick={() => handleToggleVisibility("me")}
                        className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-colors ${visibility === "me" ? "border-foreground bg-[#27272a]/40" : "border-border/80 hover:bg-[#27272a]/20"
                          }`}
                      >
                        <div className="flex size-4 items-center justify-center rounded-full border border-muted-foreground shrink-0 mt-0.5">
                          {visibility === "me" && <div className="size-1.5 rounded-full bg-foreground" />}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-foreground block">Just me</span>
                          <span className="text-[9px] text-muted-foreground block mt-0.5">
                            Only you can view and edit this space
                          </span>
                        </div>
                      </div>

                      <div
                        onClick={() => handleToggleVisibility("members")}
                        className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-colors ${visibility === "members" ? "border-foreground bg-[#27272a]/40" : "border-border/80 hover:bg-[#27272a]/20"
                          }`}
                      >
                        <div className="flex size-4 items-center justify-center rounded-full border border-muted-foreground shrink-0 mt-0.5">
                          {visibility === "members" && <div className="size-1.5 rounded-full bg-foreground" />}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-foreground block">Members in this folder</span>
                          <span className="text-[9px] text-muted-foreground block mt-0.5">
                            1 member can view and edit
                          </span>
                        </div>
                      </div>

                      <div
                        onClick={() => handleToggleVisibility("public")}
                        className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-colors ${visibility === "public" ? "border-foreground bg-[#27272a]/40" : "border-border/80 hover:bg-[#27272a]/20"
                          }`}
                      >
                        <div className="flex size-4 items-center justify-center rounded-full border border-muted-foreground shrink-0 mt-0.5">
                          {visibility === "public" && <div className="size-1.5 rounded-full bg-foreground" />}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-foreground block">Anyone on the web</span>
                          <span className="text-[9px] text-muted-foreground block mt-0.5">
                            Anyone can view, only you can edit
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {chatCollapsed && (
              <button
                onClick={() => setChatCollapsed(false)}
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer border border-border bg-[#18181b] px-3 py-1.5 rounded-xl ml-2"
              >
                <ChevronsLeft size={13} />
                Chat
              </button>
            )}
          </div>
        </div>

        {/* Dynamic block document editor */}
        <div className="flex-1 space-y-2 select-text max-w-2xl w-full ml-0 md:ml-12 px-4 md:px-0">
          {lines.map((line) => {
            const lineIndex = lineIndexMap[line.id];
            return (
              <DocLineWrapper
                key={line.id}
                line={line}
                lineIndex={lineIndex}
                isSlashOpen={activeSlashLineId === line.id}
                isMenuOpen={activeMenuLineId === line.id}
                onOpenSlash={() => {
                  setActiveSlashLineId(line.id);
                  setActiveMenuLineId(null);
                }}
                onCloseSlash={() => setActiveSlashLineId(null)}
                onOpenMenu={() => {
                  setActiveMenuLineId(line.id);
                  setActiveSlashLineId(null);
                }}
                onCloseMenu={() => setActiveMenuLineId(null)}
                onChangeText={handleUpdateText}
                onInsertLine={handleInsertLine}
                onDeleteLine={handleDeleteLine}
                onDuplicateLine={handleDuplicateLine}
                onApplyFormat={handleApplyFormat}
                onClearFormatting={handleClearFormatting}
                onCopyText={handleCopyText}
                onPlusClick={handlePlusClickOnLine}
                onUpdateTableData={handleUpdateTableData}
              />
            );
          })}
        </div>
      </div>

      {/* SPLIT DRAG RESIZER LINE */}
      {!chatCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          className={`hidden md:block w-[3px] hover:w-[6px] cursor-col-resize self-stretch transition-all bg-border/60 hover:bg-primary z-45 ${isDragging ? "bg-primary w-[6px]" : ""
            }`}
        />
      )}

      {/* Backdrop for mobile */}
      {!chatCollapsed && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setChatCollapsed(true)}
        />
      )}

      {/* RIGHT PANEL: Collapsible RAG Chat interface */}
      {!chatCollapsed && (
        <div
          style={typeof window !== "undefined" && window.innerWidth >= 768 ? { width: chatWidth } : undefined}
          className="fixed inset-y-0 right-0 z-40 w-full md:relative md:inset-auto md:z-auto h-full bg-[#151517] border-l border-border/40 flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 shrink-0"
        >
          <div className="flex items-center px-4 py-3 border-b border-border/40 shrink-0">
            <button
              onClick={() => setChatCollapsed(true)}
              className="p-1 rounded-lg text-muted-foreground hover:bg-[#27272a] hover:text-foreground transition-all cursor-pointer border-none bg-transparent"
              title="Collapse chat"
            >
              <ChevronsRight size={16} />
            </button>
            <span className="text-xs font-bold text-muted-foreground ml-2.5 uppercase tracking-wider">
              Chat Guide
            </span>
          </div>

          <div className="flex-1 min-h-0">
            <ChatView
              spaceName={spaceName}
              spaceId={spaceId}
              resources={chatResources}
              focusedResourceIds={focusedResourceIds}
              onAddResource={handleAddResource}
              onRemoveResource={handleRemoveResource}
              onToggleFocusResource={handleToggleFocus}
              onUpdateResourceLoading={handleUpdateLoading}
              hideHeader={true}
              initialMessages={initialChatMessages}
              initialInputText={chatInputText}
              onInputChange={(val) => setChatInputText(val)}
            />
          </div>
        </div>
      )}

      {chatCollapsed && (
        <div className="hidden md:flex w-[60px] h-full bg-[#151517] border-l border-border/40 flex-col items-center py-4 gap-2 shrink-0 animate-in slide-in-from-right duration-200">
          <button
            onClick={() => setChatCollapsed(false)}
            className="flex size-9 items-center justify-center rounded-xl bg-secondary/50 hover:bg-secondary text-foreground transition-all cursor-pointer border border-border"
            title="Expand chat"
          >
            <ChevronsLeft size={16} />
          </button>
          <span className="text-[10px] font-bold text-muted-foreground select-none mt-1">
            Chat
          </span>
        </div>
      )}

      {/* Mobile Floating Action Buttons (visible only on mobile) */}
      <div className="md:hidden fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        {/* Visibility Selector Circle Button */}
        <div className="relative">
          <button
            onClick={() => setVisibilityOpen(!visibilityOpen)}
            className="flex size-11 items-center justify-center rounded-full border border-border bg-[#1c1c1f] text-muted-foreground hover:text-foreground shadow-2xl transition-colors"
            aria-label="Toggle visibility"
          >
            <Globe size={18} />
          </button>
          
          <AnimatePresence>
            {visibilityOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute bottom-full right-0 mb-3 w-[260px] rounded-[18px] border border-border bg-[#1c1c1f] p-4 shadow-3xl z-50 text-left"
              >
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-3">
                  Who can access this space?
                </span>
                <div className="space-y-2">
                  {(["me", "members", "public"] as const).map((v) => {
                    const label = v === "me" ? "Just me" : v === "members" ? "Folder Members" : "Public";
                    const sub = v === "me" ? "Only you can access" : v === "members" ? "Members in this folder" : "Anyone with link";
                    return (
                      <div
                        key={v}
                        onClick={() => {
                          setVisibility(v);
                          onUpdateVisibility?.(v);
                          setVisibilityOpen(false);
                        }}
                        className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-colors ${
                          visibility === v ? "border-foreground bg-[#27272a]/40" : "border-border/80 hover:bg-[#27272a]/20"
                        }`}
                      >
                        <div className="flex size-4 items-center justify-center rounded-full border border-muted-foreground shrink-0 mt-0.5">
                          {visibility === v && <div className="size-1.5 rounded-full bg-foreground" />}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-foreground block">{label}</span>
                          <span className="text-[9px] text-muted-foreground block mt-0.5">{sub}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat Toggle Circle Button */}
        <button
          onClick={() => setChatCollapsed(!chatCollapsed)}
          className="flex size-11 items-center justify-center rounded-full border border-border bg-[#1c1c1f] text-muted-foreground hover:text-foreground shadow-2xl transition-colors"
          aria-label="Toggle chat"
        >
          <MessageSquare size={18} />
        </button>
      </div>

      {popupCoords && (
        <div
          style={{
            position: "fixed",
            left: popupCoords.x,
            top: popupCoords.y,
            transform: "translateX(-50%)",
          }}
          className="flex items-center gap-1 bg-[#1c1c1f] border border-border/80 rounded-xl px-2.5 py-1.5 shadow-2xl z-[9999] animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleAddToChat();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-foreground hover:bg-[#27272a] px-2 py-1 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
          >
            <Plus size={13} />
            <span>Add to chat</span>
          </button>

          <div className="h-4 w-[1px] bg-border/60 mx-1.5" />

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              document.execCommand("bold");
            }}
            className="size-7 flex items-center justify-center font-bold text-xs text-foreground hover:bg-[#27272a] rounded-lg cursor-pointer border-none bg-transparent"
            title="Bold"
          >
            B
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              document.execCommand("italic");
            }}
            className="size-7 flex items-center justify-center italic font-semibold text-xs text-foreground hover:bg-[#27272a] rounded-lg cursor-pointer border-none bg-transparent"
            title="Italic"
          >
            I
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              document.execCommand("underline");
            }}
            className="size-7 flex items-center justify-center underline text-xs text-foreground hover:bg-[#27272a] rounded-lg cursor-pointer border-none bg-transparent"
            title="Underline"
          >
            U
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              document.execCommand("strikeThrough");
            }}
            className="size-7 flex items-center justify-center line-through text-xs text-foreground hover:bg-[#27272a] rounded-lg cursor-pointer border-none bg-transparent"
            title="Strikethrough"
          >
            S
          </button>
        </div>
      )}
    </div>
  );
}

interface DocTableBlockProps {
  line: DocLine;
  onUpdateTableData?: (id: string, tableData: DocLine["tableData"]) => void;
  styleMenuOpen: boolean;
  setStyleMenuOpen: (open: boolean) => void;
}

function DocTableBlock({
  line,
  onUpdateTableData,
  styleMenuOpen,
  setStyleMenuOpen,
}: DocTableBlockProps) {
  const tableData = line.tableData || {
    headers: ["Col 1", "Col 2"],
    rows: [
      ["", ""],
      ["", ""]
    ],
    style: "default" as const
  };

  const [isSelected, setIsSelected] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tableRef.current && !tableRef.current.contains(event.target as Node)) {
        setIsSelected(false);
        setStyleMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setStyleMenuOpen]);

  const style = tableData.style || "default";
  const [colWidths, setColWidths] = useState<number[]>(() =>
    Array(tableData.headers.length).fill(180)
  );
  const [rowHeights, setRowHeights] = useState<number[]>(() =>
    Array(tableData.rows.length).fill(42)
  );

  useEffect(() => {
    setColWidths((prev) => {
      const next = [...prev];
      while (next.length < tableData.headers.length) next.push(180);
      return next.slice(0, tableData.headers.length);
    });
  }, [tableData.headers.length]);

  useEffect(() => {
    setRowHeights((prev) => {
      const next = [...prev];
      while (next.length < tableData.rows.length) next.push(42);
      return next.slice(0, tableData.rows.length);
    });
  }, [tableData.rows.length]);

  const handleColResizeStart = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[index] || 180;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(80, startWidth + deltaX);
      setColWidths((prev) => {
        const next = [...prev];
        next[index] = newWidth;
        return next;
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleRowResizeStart = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startHeight = rowHeights[index] || 42;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(25, startHeight + deltaY);
      setRowHeights((prev) => {
        const next = [...prev];
        next[index] = newHeight;
        return next;
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleHeaderBlur = (index: number, val: string) => {
    if (!onUpdateTableData) return;
    const nextHeaders = [...tableData.headers];
    nextHeaders[index] = val;
    onUpdateTableData(line.id, {
      ...tableData,
      headers: nextHeaders
    });
  };

  const handleCellBlur = (rowIndex: number, colIndex: number, val: string) => {
    if (!onUpdateTableData) return;
    const nextRows = tableData.rows.map((row, rIdx) =>
      rIdx === rowIndex ? row.map((cell, cIdx) => cIdx === colIndex ? val : cell) : row
    );
    onUpdateTableData(line.id, {
      ...tableData,
      rows: nextRows
    });
  };

  const handleAddRow = () => {
    if (!onUpdateTableData) return;
    const newRow = Array(tableData.headers.length).fill("");
    onUpdateTableData(line.id, {
      ...tableData,
      rows: [...tableData.rows, newRow]
    });
  };

  const handleRemoveRow = () => {
    if (!onUpdateTableData || tableData.rows.length <= 1) return;
    onUpdateTableData(line.id, {
      ...tableData,
      rows: tableData.rows.slice(0, -1)
    });
  };

  const handleAddCol = () => {
    if (!onUpdateTableData) return;
    const nextHeaders = [...tableData.headers, `Col ${tableData.headers.length + 1}`];
    const nextRows = tableData.rows.map((row) => [...row, ""]);
    onUpdateTableData(line.id, {
      ...tableData,
      headers: nextHeaders,
      rows: nextRows
    });
  };

  const handleRemoveCol = () => {
    if (!onUpdateTableData || tableData.headers.length <= 1) return;
    const nextHeaders = tableData.headers.slice(0, -1);
    const nextRows = tableData.rows.map((row) => row.slice(0, -1));
    onUpdateTableData(line.id, {
      ...tableData,
      headers: nextHeaders,
      rows: nextRows
    });
  };

  const handleChangeStyle = (newStyle: "default" | "striped" | "clean" | "glass") => {
    if (!onUpdateTableData) return;
    onUpdateTableData(line.id, {
      ...tableData,
      style: newStyle
    });
  };

  let tableClass = "min-w-full border-collapse rounded-xl overflow-hidden ";
  let thClass = "p-2.5 text-xs font-bold text-foreground text-left outline-none relative ";
  let tdClass = "p-2.5 text-xs text-muted-foreground outline-none relative ";
  let trClass = "";

  if (style === "default") {
    tableClass += "border border-border";
    thClass += "border border-border bg-secondary/40";
    tdClass += "border border-border";
  } else if (style === "striped") {
    tableClass += "border border-border";
    thClass += "border border-border bg-secondary/60";
    tdClass += "border border-border";
  } else if (style === "clean") {
    tableClass += "border-0 border-b border-border";
    thClass += "border-b border-border font-bold text-foreground";
    trClass = "border-b border-border/40 hover:bg-[#27272a]/10";
  } else if (style === "glass") {
    tableClass += "border border-white/5 bg-white/5 backdrop-blur-md";
    thClass += "border border-white/5 bg-gradient-to-r from-blue-500/10 to-purple-500/10";
    tdClass += "border border-white/5";
  }

  const totalTableWidth = colWidths.reduce((a, b) => a + b, 0);

  return (
    <div ref={tableRef} onClick={() => setIsSelected(true)} className="w-full my-4 relative group/table select-text">
      {isSelected && (
        <div className="flex items-center gap-1.5 mb-2 py-1 px-2.5 bg-[#18181b] border border-border/80 rounded-xl max-w-max select-none shadow-lg animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={handleAddRow}
            className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-[#27272a] px-2 py-1 rounded transition-all cursor-pointer border-none bg-transparent"
          >
            <Plus size={10} /> Row
          </button>
          <button
            onClick={handleRemoveRow}
            disabled={tableData.rows.length <= 1}
            className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-destructive disabled:opacity-40 disabled:hover:text-muted-foreground hover:bg-[#27272a] px-2 py-1 rounded transition-all cursor-pointer border-none bg-transparent"
          >
            <Minus size={10} /> Row
          </button>
          <div className="h-3.5 w-[1px] bg-border/60 mx-0.5" />
          <button
            onClick={handleAddCol}
            className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-[#27272a] px-2 py-1 rounded transition-all cursor-pointer border-none bg-transparent"
          >
            <Plus size={10} /> Column
          </button>
          <button
            onClick={handleRemoveCol}
            disabled={tableData.headers.length <= 1}
            className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-destructive disabled:opacity-40 disabled:hover:text-muted-foreground hover:bg-[#27272a] px-2 py-1 rounded transition-all cursor-pointer border-none bg-transparent"
          >
            <Minus size={10} /> Column
          </button>
          <div className="h-3.5 w-[1px] bg-border/60 mx-0.5" />

          <div className="relative">
            <button
              onClick={() => setStyleMenuOpen(!styleMenuOpen)}
              className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-[#27272a] px-2 py-1 rounded transition-all cursor-pointer capitalize border-none bg-transparent"
            >
              <span>Style: {style}</span>
              <ChevronRight size={8} className="rotate-90 text-muted-foreground" />
            </button>

            {styleMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-[130px] bg-[#1c1c1f] border border-border/80 rounded-xl p-1 shadow-2xl z-50 text-left">
                {(["default", "striped", "clean", "glass"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      handleChangeStyle(s);
                      setStyleMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-[10px] font-bold text-foreground hover:bg-[#27272a] capitalize transition-all border-none bg-transparent"
                  >
                    <span>{s}</span>
                    {style === s && <Check size={10} className="text-[#3b82f6]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="w-full overflow-x-auto border border-border/40 rounded-xl bg-transparent">
        <table className={tableClass} style={{ tableLayout: "fixed", width: totalTableWidth }}>
          <thead>
            <tr className="border-b border-border/40">
              {tableData.headers.map((header, colIndex) => (
                <th
                  key={`header-${colIndex}`}
                  className={thClass}
                  style={{ width: colWidths[colIndex] || 180 }}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleHeaderBlur(colIndex, e.currentTarget.innerText)}
                >
                  {header}
                  <div
                    onMouseDown={(e) => handleColResizeStart(e, colIndex)}
                    className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-[#3b82f6]/40 transition-colors z-20"
                    title="Drag to resize column"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.rows.map((row, rowIndex) => (
              <tr
                key={`row-${rowIndex}`}
                className={`${trClass} ${style === "striped" && rowIndex % 2 === 1 ? "bg-[#1c1c1f]/40" : ""
                  }`}
                style={{ height: rowHeights[rowIndex] || 42 }}
              >
                {row.map((cell, colIndex) => (
                  <td
                    key={`cell-${rowIndex}-${colIndex}`}
                    className={tdClass}
                    style={{
                      width: colWidths[colIndex] || 180,
                      height: rowHeights[rowIndex] || 42,
                    }}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleCellBlur(rowIndex, colIndex, e.currentTarget.innerText)}
                  >
                    {cell}
                    {colIndex === 0 && (
                      <div
                        onMouseDown={(e) => handleRowResizeStart(e, rowIndex)}
                        className="absolute left-0 bottom-0 w-full h-1.5 cursor-row-resize hover:bg-[#3b82f6]/40 transition-colors z-20"
                        title="Drag to resize row"
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocLineWrapper({
  line,
  lineIndex,
  isSlashOpen,
  isMenuOpen,
  onOpenSlash,
  onCloseSlash,
  onOpenMenu,
  onCloseMenu,
  onChangeText,
  onInsertLine,
  onDeleteLine,
  onDuplicateLine,
  onApplyFormat,
  onClearFormatting,
  onCopyText,
  onPlusClick,
  onUpdateTableData,
}: {
  line: DocLine;
  lineIndex?: number;
  isSlashOpen: boolean;
  isMenuOpen: boolean;
  onOpenSlash: () => void;
  onCloseSlash: () => void;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onChangeText: (id: string, text: string) => void;
  onInsertLine: (afterId: string) => void;
  onDeleteLine: (id: string, focusPrev?: boolean) => void;
  onDuplicateLine: (id: string) => void;
  onApplyFormat: (id: string, type: DocLine["type"]) => void;
  onClearFormatting: (id: string) => void;
  onCopyText: (text: string) => void;
  onPlusClick?: (lineId: string) => void;
  onUpdateTableData?: (id: string, tableData: DocLine["tableData"]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);

  useEffect(() => {
    if (ref.current && ref.current.innerText !== line.text) {
      ref.current.innerText = line.text;
    }
  }, []);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const text = e.currentTarget.innerText;
    onChangeText(line.id, text);
    if (text.endsWith("/")) {
      onOpenSlash();
    } else {
      onCloseSlash();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onInsertLine(line.id);
    } else if (e.key === "Backspace") {
      const text = ref.current?.innerText || "";
      if (text.replace(/\n/g, "").trim() === "") {
        e.preventDefault();
        onDeleteLine(line.id, true);
      }
    }
  };

  const getStyleForType = (type: DocLine["type"]) => {
    switch (type) {
      case "h1":
        return "text-3xl font-extrabold text-foreground leading-tight tracking-tight outline-none py-1 w-full";
      case "h2":
        return "text-xl font-bold text-foreground outline-none py-1 w-full";
      case "h3":
        return "text-sm font-semibold text-foreground outline-none py-0.5 w-full";
      case "quote":
        return "italic text-muted-foreground outline-none w-full";
      default:
        return "text-sm text-muted-foreground leading-relaxed outline-none py-0.5 w-full";
    }
  };

  const renderBlockElement = () => {
    const editableNode = (
      <div
        id={`editable-${line.id}`}
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className={getStyleForType(line.type)}
        data-placeholder={line.text === "" ? "Press '/' for commands..." : ""}
      />
    );

    if (line.type === "bullet") {
      return (
        <div className="flex items-start gap-3 w-full">
          <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
          {editableNode}
        </div>
      );
    }

    if (line.type === "number") {
      return (
        <div className="flex items-start gap-2.5 w-full">
          <span className="text-xs font-bold text-muted-foreground mt-1 shrink-0">
            {lineIndex ?? 1}.
          </span>
          {editableNode}
        </div>
      );
    }

    if (line.type === "quote") {
      return (
        <div className="w-full border-l-4 border-[#3b82f6]/50 bg-secondary/10 px-4 py-2 italic text-muted-foreground rounded-r-xl outline-none">
          {editableNode}
        </div>
      );
    }

    if (line.type === "table") {
      return (
        <DocTableBlock
          line={line}
          onUpdateTableData={onUpdateTableData}
          styleMenuOpen={styleMenuOpen}
          setStyleMenuOpen={setStyleMenuOpen}
        />
      );
    }

    return editableNode;
  };

  const handlePlusClick = () => {
    if (onPlusClick) {
      onPlusClick(line.id);
    }
  };

  return (
    <div className="relative group flex items-start w-full line-wrapper min-h-[32px]">
      <div className="absolute -left-[54px] top-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
        <button
          onClick={handlePlusClick}
          className="p-1 hover:bg-[#27272a] rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors border-none bg-transparent"
          title="Add block commands"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={onOpenMenu}
          className="p-1 hover:bg-[#27272a] rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors border-none bg-transparent"
          title="Line settings"
        >
          <MoreVertical size={14} />
        </button>
      </div>

      <div className="w-full pl-2">
        {renderBlockElement()}
      </div>

      <AnimatePresence>
        {isSlashOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute top-full left-2 mt-1 w-[210px] rounded-xl border border-border bg-[#1c1c1f] p-1.5 shadow-2xl z-[999] text-left animate-in fade-in"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block px-2.5 py-1.5">
              Basic blocks
            </span>

            <div className="space-y-0.5">
              <button
                onClick={() => onApplyFormat(line.id, "h1")}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors border-none bg-transparent text-left cursor-pointer"
              >
                <span className="font-bold text-[10px] text-muted-foreground bg-[#27272a] px-1 py-0.5 rounded shrink-0">H1</span>
                <span>Heading 1</span>
              </button>

              <button
                onClick={() => onApplyFormat(line.id, "h2")}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors border-none bg-transparent text-left cursor-pointer"
              >
                <span className="font-bold text-[9px] text-muted-foreground bg-[#27272a] px-1 py-0.5 rounded shrink-0">H2</span>
                <span>Heading 2</span>
              </button>

              <button
                onClick={() => onApplyFormat(line.id, "h3")}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors border-none bg-transparent text-left cursor-pointer"
              >
                <span className="font-bold text-[8px] text-muted-foreground bg-[#27272a] px-1 py-0.5 rounded shrink-0">H3</span>
                <span>Heading 3</span>
              </button>

              <button
                onClick={() => onApplyFormat(line.id, "bullet")}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors border-none bg-transparent text-left cursor-pointer"
              >
                <List size={13} className="text-muted-foreground shrink-0" />
                <span>Bullet List</span>
              </button>

              <button
                onClick={() => onApplyFormat(line.id, "number")}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors border-none bg-transparent text-left cursor-pointer"
              >
                <ListOrdered size={13} className="text-muted-foreground shrink-0" />
                <span>Numbered List</span>
              </button>

              <button
                onClick={() => onApplyFormat(line.id, "quote")}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors border-none bg-transparent text-left cursor-pointer"
              >
                <Quote size={13} className="text-muted-foreground shrink-0" />
                <span>Quote</span>
              </button>

              <button
                onClick={() => onApplyFormat(line.id, "table")}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors border-none bg-transparent text-left cursor-pointer"
              >
                <Table size={13} className="text-muted-foreground shrink-0" />
                <span>Table</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute top-full left-[-48px] mt-1 w-[160px] rounded-xl border border-border bg-[#1c1c1f] p-1.5 shadow-2xl z-[999] text-left animate-in fade-in"
          >
            <div className="space-y-0.5">
              <button
                onClick={() => onClearFormatting(line.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors border-none bg-transparent text-left cursor-pointer"
              >
                <Eraser size={13} className="text-muted-foreground shrink-0" />
                <span>Clear formatting</span>
              </button>

              <button
                onClick={() => onCopyText(line.text)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors border-none bg-transparent text-left cursor-pointer"
              >
                <Copy size={13} className="text-muted-foreground shrink-0" />
                <span>Copy</span>
              </button>

              <button
                onClick={() => onDuplicateLine(line.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors border-none bg-transparent text-left cursor-pointer"
              >
                <Layers size={13} className="text-muted-foreground shrink-0" />
                <span>Duplicate</span>
              </button>

              <button
                onClick={() => onDeleteLine(line.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors border-none bg-transparent text-left cursor-pointer"
              >
                <Trash2 size={13} className="shrink-0" />
                <span>Delete</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
