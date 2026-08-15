import { useState, useRef, useEffect } from "react";
import {
  Folder,
  ChevronRight,
  BookOpen,
  Globe,
  User,
  Users,
  MessageSquare,
  ChevronsRight,
  ChevronsLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatView } from "./ChatView";

export type VisibilityType = "me" | "members" | "public";

interface Resource {
  id: string;
  name: string;
  loading: boolean;
}

export function StudyGuideView({
  spaceName = "Study Guide",
  visibility: initialVisibility = "public",
  onBack,
  onUpdateVisibility,
}: {
  spaceName?: string;
  visibility?: VisibilityType;
  onBack: () => void;
  onUpdateVisibility?: (vis: VisibilityType) => void;
}) {
  const [visibility, setVisibility] = useState<VisibilityType>(initialVisibility);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  
  // Split pane & Collapse state
  const containerRef = useRef<HTMLDivElement>(null);
  const [chatWidth, setChatWidth] = useState(420); // Default width in pixels
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Chat resources state
  const [chatResources, setChatResources] = useState<Resource[]>([
    { id: "res-resume", name: "Vaibhav_Patil_Resume.docx", loading: false },
  ]);
  const [focusedResourceIds, setFocusedResourceIds] = useState<string[]>(["res-resume"]);

  const visibilityRef = useRef<HTMLDivElement>(null);

  // Drag resizer mechanics
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRef.current.clientWidth;
      // Calculate width from right side of split screen
      const newWidth = containerRect.right - e.clientX;

      // Limit bounds (between 250px and 60% of viewport)
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

  // Click outside to close visibility menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (visibilityRef.current && !visibilityRef.current.contains(event.target as Node)) {
        setVisibilityOpen(false);
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

  const initialChatMessages = [
    {
      id: "welcome-msg",
      sender: "ai" as const,
      text: "I've created a comprehensive study guide based on your selected resources. Feel free to customize it by adding details or removing sections. I understand this material in depth - let know if you'd like me to explain any concepts or add new sections.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ];

  return (
    <div
      ref={containerRef}
      className="flex h-[calc(100vh-20px)] w-full overflow-hidden select-none bg-[#111113]"
    >
      {/* LEFT PANEL: Document Viewer */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0d0d0e] p-6 overflow-y-auto">
        {/* Header toolbar */}
        <div className="flex items-center justify-between pb-4 border-b border-border/40 mb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Folder size={14} />
            <span>My folder</span>
            <ChevronRight size={12} />
            <BookOpen size={14} />
            <span className="font-semibold text-foreground truncate max-w-[200px]">
              {spaceName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Visibility Selector */}
            <div className="relative" ref={visibilityRef}>
              <button
                onClick={() => setVisibilityOpen(!visibilityOpen)}
                className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider cursor-pointer"
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
                      {/* Just me */}
                      <div
                        onClick={() => handleToggleVisibility("me")}
                        className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-colors ${
                          visibility === "me" ? "border-foreground bg-[#27272a]/40" : "border-border/80 hover:bg-[#27272a]/20"
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

                      {/* Members in folder */}
                      <div
                        onClick={() => handleToggleVisibility("members")}
                        className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-colors ${
                          visibility === "members" ? "border-foreground bg-[#27272a]/40" : "border-border/80 hover:bg-[#27272a]/20"
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

                      {/* Anyone on web */}
                      <div
                        onClick={() => handleToggleVisibility("public")}
                        className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-colors ${
                          visibility === "public" ? "border-foreground bg-[#27272a]/40" : "border-border/80 hover:bg-[#27272a]/20"
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

          </div>
        </div>

        {/* Structured Resume content matching Image 1 (completely editable) */}
        <div
          contentEditable
          suppressContentEditableWarning
          className="space-y-6 max-w-2xl text-left select-text outline-none focus:ring-0"
        >
          <h1 className="text-3xl font-extrabold text-foreground leading-tight tracking-tight">
            Vaibhav Ravindra Patil: Full Stack Developer & AI Specialist Study Guide
          </h1>
          
          <p className="text-sm text-muted-foreground leading-relaxed">
            This study guide covers the key information from Vaibhav Ravindra Patil's resume, focusing on his professional summary, technical skills, projects, and education.
          </p>

          <div className="pt-2">
            <h2 className="text-lg font-bold text-foreground border-b border-border/40 pb-1.5 mb-3.5">
              Professional Summary
            </h2>
            <ul className="list-disc pl-5 mt-2 space-y-4 text-sm text-muted-foreground leading-relaxed">
              <li>
                <strong className="text-foreground">Core Identity:</strong> Full Stack Developer, specializing in Generative AI & Agentic Systems.
              </li>
              <li>
                <strong className="text-foreground">Experience:</strong> Hands-on experience with MERN and Next.js ecosystems.
              </li>
              <li>
                <strong className="text-foreground">Current Focus:</strong> Building AI-powered and agentic applications.
              </li>
              <li>
                <strong className="text-foreground">AI Integration Expertise:</strong>
                <ul className="list-circle pl-6 mt-2 space-y-1.5 text-xs text-muted-foreground/90">
                  <li>Integrating Large Language Models (LLMs) like OpenAI, Claude, Gemini into production web applications.</li>
                  <li>Implementing Retrieval-Augmented Generation (RAG).</li>
                  <li>Building tool-calling features.</li>
                  <li>Developing real-time AI features.</li>
                </ul>
              </li>
              <li>
                <strong className="text-foreground">Proficient Technologies:</strong> JavaScript, TypeScript, Python, React.js, Next.js, Node.js, Express.js, MongoDB, PostgreSQL, Docker.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* SPLIT DRAG RESIZER LINE */}
      {!chatCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          className={`w-[3px] hover:w-[6px] cursor-col-resize self-stretch transition-all bg-border/60 hover:bg-primary z-45 ${
            isDragging ? "bg-primary w-[6px]" : ""
          }`}
        />
      )}

      {/* RIGHT PANEL: Collapsible RAG Chat interface */}
      {!chatCollapsed && (
        <div
          style={{ width: chatWidth }}
          className="h-full bg-[#151517] border-l border-border/40 flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 shrink-0"
        >
          {/* Header toolbar with collapse button */}
          <div className="flex items-center px-4 py-3 border-b border-border/40 shrink-0">
            <button
              onClick={() => setChatCollapsed(true)}
              className="p-1 rounded-lg text-muted-foreground hover:bg-[#27272a] hover:text-foreground transition-all cursor-pointer"
              title="Collapse chat"
            >
              <ChevronsRight size={16} />
            </button>
            <span className="text-xs font-bold text-muted-foreground ml-2.5 uppercase tracking-wider">
              Chat Guide
            </span>
          </div>

          {/* Reused ChatView in hideHeader mode */}
          <div className="flex-1 min-h-0">
            <ChatView
              spaceName={spaceName}
              resources={chatResources}
              focusedResourceIds={focusedResourceIds}
              onAddResource={handleAddResource}
              onRemoveResource={handleRemoveResource}
              onToggleFocusResource={handleToggleFocus}
              onUpdateResourceLoading={handleUpdateLoading}
              hideHeader={true}
              initialMessages={initialChatMessages}
            />
          </div>
        </div>
      )}

      {/* Collapsed Chat Panel Strip matching reference image */}
      {chatCollapsed && (
        <div className="w-[60px] h-full bg-[#151517] border-l border-border/40 flex flex-col items-center py-4 gap-2 shrink-0 animate-in slide-in-from-right duration-200">
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
    </div>
  );
}
