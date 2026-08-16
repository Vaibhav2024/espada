import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatView } from "./ChatView";

export type VisibilityType = "me" | "members" | "public";

interface Resource {
  id: string;
  name: string;
  loading: boolean;
}

interface DocLine {
  id: string;
  text: string;
  type: "h1" | "h2" | "h3" | "bullet" | "number" | "quote" | "plain" | "table";
  tableData?: {
    headers: string[];
    rows: string[][];
    style?: "default" | "striped" | "clean" | "glass";
  };
}

const DEFAULT_LINES: DocLine[] = [
  {
    id: "line-1",
    text: "Vaibhav Ravindra Patil: Full Stack Developer & AI Specialist Study Guide",
    type: "h1",
  },
  {
    id: "line-2",
    text: "This study guide covers the key information from Vaibhav Ravindra Patil's resume, focusing on his professional summary, technical skills, projects, and education.",
    type: "plain",
  },
  {
    id: "line-3",
    text: "Professional Summary",
    type: "h2",
  },
  {
    id: "line-4",
    text: "Core Identity: Full Stack Developer, specializing in Generative AI & Agentic Systems.",
    type: "bullet",
  },
  {
    id: "line-5",
    text: "Experience: Hands-on experience with MERN and Next.js ecosystems.",
    type: "bullet",
  },
  {
    id: "line-6",
    text: "Current Focus: Building AI-powered and agentic applications.",
    type: "bullet",
  },
  {
    id: "line-7",
    text: "AI Integration Expertise:",
    type: "bullet",
  },
  {
    id: "line-8",
    text: "Integrating Large Language Models (LLMs) like OpenAI, Claude, Gemini into production web applications.",
    type: "bullet",
  },
  {
    id: "line-9",
    text: "Implementing Retrieval-Augmented Generation (RAG).",
    type: "bullet",
  },
  {
    id: "line-10",
    text: "Building tool-calling features.",
    type: "bullet",
  },
  {
    id: "line-11",
    text: "Developing real-time AI features.",
    type: "bullet",
  },
  {
    id: "line-12",
    text: "Proficient Technologies: JavaScript, TypeScript, Python, React.js, Next.js, Node.js, Express.js, MongoDB, PostgreSQL, Docker.",
    type: "bullet",
  },
  {
    id: "line-13",
    text: "Technical Skill Outline Table",
    type: "h2",
  },
  {
    id: "line-14",
    text: "",
    type: "table",
    tableData: {
      headers: ["Skill Category", "Key Technologies Group"],
      rows: [
        ["Frontend Development", "React.js, Next.js, HTML5, CSS3, TS"],
        ["Backend Development", "Node.js, Express.js, Python, PostgreSQL"],
        ["AI & Agents Systems", "OpenAI API, RAG, Tool Calling, Claude"]
      ],
      style: "default",
    }
  }
];

export function StudyGuideView({
  spaceName = "Study Guide",
  visibility: initialVisibility = "public",
  onBack,
  onUpdateVisibility,
  resources: initialResources = [],
}: {
  spaceName?: string;
  visibility?: VisibilityType;
  onBack: () => void;
  onUpdateVisibility?: (vis: VisibilityType) => void;
  resources?: Resource[];
}) {
  const [visibility, setVisibility] = useState<VisibilityType>(initialVisibility);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const visibilityRef = useRef<HTMLDivElement>(null);

  // Document lines state
  const [lines, setLines] = useState<DocLine[]>(() => {
    if (initialResources && initialResources.length > 0) {
      if (initialResources[0].id === "res-resume") {
        return DEFAULT_LINES;
      }
      return [
        {
          id: `line-${Date.now()}-1`,
          text: `${initialResources[0].name.replace(/\.[^/.]+$/, "")} Study Guide Outline`,
          type: "h1",
        },
        {
          id: `line-${Date.now()}-2`,
          text: `This study guide represents the automatically generated outline for your file: ${initialResources[0].name}.`,
          type: "plain",
        },
        {
          id: `line-${Date.now()}-3`,
          text: "Executive Summary",
          type: "h2",
        },
        {
          id: `line-${Date.now()}-4`,
          text: "Key Point 1: Essential definition or parameter extracted from this source.",
          type: "bullet",
        },
        {
          id: `line-${Date.now()}-5`,
          text: "Key Point 2: Supporting arguments or contextual details.",
          type: "bullet",
        },
        {
          id: `line-${Date.now()}-6`,
          text: "Practical Implications & Next Steps",
          type: "h2",
        },
        {
          id: `line-${Date.now()}-7`,
          text: "Apply the findings to refine application architecture.",
          type: "bullet",
        },
      ];
    }
    return DEFAULT_LINES;
  });
  const [activeSlashLineId, setActiveSlashLineId] = useState<string | null>(null);
  const [activeMenuLineId, setActiveMenuLineId] = useState<string | null>(null);
  const [lineIndexMap, setLineIndexMap] = useState<Record<string, number>>({});

  // Split pane & Collapse state
  const containerRef = useRef<HTMLDivElement>(null);
  const [chatWidth, setChatWidth] = useState(420);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Chat resources state
  const [chatResources, setChatResources] = useState<Resource[]>(() => {
    if (initialResources && initialResources.length > 0) {
      return initialResources;
    }
    return [
      { id: "res-resume", name: "Vaibhav_Patil_Resume.docx", loading: false },
    ];
  });
  const [focusedResourceIds, setFocusedResourceIds] = useState<string[]>(() => {
    if (initialResources && initialResources.length > 0) {
      return initialResources.map((r) => r.id);
    }
    return ["res-resume"];
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
    return "res-resume";
  });
  const [fileContentMap, setFileContentMap] = useState<Record<string, DocLine[]>>(() => {
    if (initialResources && initialResources.length > 0) {
      const initialMap: Record<string, DocLine[]> = {};
      if (initialResources[0].id === "res-resume") {
        initialMap["res-resume"] = DEFAULT_LINES;
      } else {
        initialMap[initialResources[0].id] = [
          {
            id: `line-${Date.now()}-1`,
            text: `${initialResources[0].name.replace(/\.[^/.]+$/, "")} Study Guide Outline`,
            type: "h1",
          },
          {
            id: `line-${Date.now()}-2`,
            text: `This study guide represents the automatically generated outline for your file: ${initialResources[0].name}.`,
            type: "plain",
          },
          {
            id: `line-${Date.now()}-3`,
            text: "Executive Summary",
            type: "h2",
          },
          {
            id: `line-${Date.now()}-4`,
            text: "Key Point 1: Essential definition or parameter extracted from this source.",
            type: "bullet",
          },
          {
            id: `line-${Date.now()}-5`,
            text: "Key Point 2: Supporting arguments or contextual details.",
            type: "bullet",
          },
          {
            id: `line-${Date.now()}-6`,
            text: "Practical Implications & Next Steps",
            type: "h2",
          },
          {
            id: `line-${Date.now()}-7`,
            text: "Apply the findings to refine application architecture.",
            type: "bullet",
          },
        ];
      }
      return initialMap;
    }
    return {
      "res-resume": DEFAULT_LINES,
    };
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
      text: `${fileName.replace(/\.[^/.]+$/, "")} Study Guide Outline`,
      type: "h1",
    },
    {
      id: `line-${Date.now()}-2`,
      text: `This study guide represents the automatically generated outline for your file: ${fileName}.`,
      type: "plain",
    },
    {
      id: `line-${Date.now()}-3`,
      text: "Executive Summary",
      type: "h2",
    },
    {
      id: `line-${Date.now()}-4`,
      text: "Key Point 1: Essential definition or parameter extracted from this source.",
      type: "bullet",
    },
    {
      id: `line-${Date.now()}-5`,
      text: "Key Point 2: Supporting arguments or contextual details.",
      type: "bullet",
    },
    {
      id: `line-${Date.now()}-6`,
      text: "Practical Implications & Next Steps",
      type: "h2",
    },
    {
      id: `line-${Date.now()}-7`,
      text: "Apply the findings to refine application architecture.",
      type: "bullet",
    },
  ];

  const handleSelectResource = (resId: string) => {
    // 1. Save current editor lines to map first
    setFileContentMap((prev) => ({
      ...prev,
      [activeResourceId]: lines,
    }));

    // 2. Set new active resource
    setActiveResourceId(resId);

    // 3. Load lines for new active resource
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

  // Calculate list numbers
  useEffect(() => {
    let numIndex = 1;
    const nextMap: Record<string, number> = {};
    lines.forEach((l) => {
      if (l.type === "number") {
        nextMap[l.id] = numIndex++;
      } else {
        numIndex = 1; // Reset index if type breaks sequence
      }
    });
    setLineIndexMap(nextMap);
  }, [lines]);

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

  // Click outside to close visibility menu and line menus
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (visibilityRef.current && !visibilityRef.current.contains(event.target as Node)) {
        setVisibilityOpen(false);
      }
      
      // Close active line menus on backdrop clicks
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

  // Editor Actions
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
    // Set focus to the newly created line
    setTimeout(() => {
      const element = document.getElementById(`editable-${newId}`);
      element?.focus();
    }, 50);
  };

  const handleDeleteLine = (id: string, focusPrev = false) => {
    if (lines.length <= 1) return; // Keep at least 1 line
    const idx = lines.findIndex((l) => l.id === id);
    updateLines((prev) => prev.filter((l) => l.id !== id));
    
    if (focusPrev && idx > 0) {
      const prevLine = lines[idx - 1];
      setTimeout(() => {
        const element = document.getElementById(`editable-${prevLine.id}`);
        element?.focus();
        
        // Move caret to end of text
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
    const copyBlock: DocLine = { ...line, id };
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

    // Focus the new line, update innerText to "/" and open slash command
    setTimeout(() => {
      const element = document.getElementById(`editable-${newId}`);
      if (element) {
        element.innerText = "/";
        element.focus();
        
        // Move caret to end of text
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
          // Strip '/' suffix if formatting was chosen from slash command
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
              ["Value A", "Value B"],
              ["Value C", "Value D"]
            ],
            style: "default" as const
          } : undefined;
          return { ...l, type: formatType, text: cleanText, tableData };
        }
        return l;
      })
    );

    setActiveSlashLineId(null);

    // Re-focus the editor node to match state change updates
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
      {/* LEFT PANEL: Document block editor */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0d0d0e] p-6 overflow-y-auto">
        {/* Header toolbar */}
        <div className="flex items-center justify-between pb-4 border-b border-border/40 mb-6 shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground folder-breadcrumb-container relative">
            <button
              onClick={() => setFolderDropdownOpen(!folderDropdownOpen)}
              className="flex items-center gap-1.5 hover:text-foreground hover:bg-[#27272a]/40 px-2 py-1 rounded-lg transition-all cursor-pointer text-muted-foreground"
            >
              <Folder size={14} />
              <span>My folder</span>
            </button>
            <ChevronRight size={12} />
            <BookOpen size={14} />
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
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold hover:bg-[#27272a] transition-colors ${
                          activeResourceId === res.id ? "text-foreground bg-[#27272a]/60" : "text-muted-foreground"
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
        <div className="flex-1 space-y-2 select-text max-w-2xl w-full ml-12">
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
              initialInputText={chatInputText}
              onInputChange={(val) => setChatInputText(val)}
            />
          </div>
        </div>
      )}

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
            className="flex items-center gap-1.5 text-xs font-semibold text-foreground hover:bg-[#27272a] px-2 py-1 rounded-lg transition-colors cursor-pointer"
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
            className="size-7 flex items-center justify-center font-bold text-xs text-foreground hover:bg-[#27272a] rounded-lg cursor-pointer"
            title="Bold"
          >
            B
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              document.execCommand("italic");
            }}
            className="size-7 flex items-center justify-center italic font-semibold text-xs text-foreground hover:bg-[#27272a] rounded-lg cursor-pointer"
            title="Italic"
          >
            I
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              document.execCommand("underline");
            }}
            className="size-7 flex items-center justify-center underline text-xs text-foreground hover:bg-[#27272a] rounded-lg cursor-pointer"
            title="Underline"
          >
            U
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              document.execCommand("strikeThrough");
            }}
            className="size-7 flex items-center justify-center line-through text-xs text-foreground hover:bg-[#27272a] rounded-lg cursor-pointer"
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
      ["Value A", "Value B"],
      ["Value C", "Value D"]
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

  // Column widths and row heights state
  const [colWidths, setColWidths] = useState<number[]>(() =>
    Array(tableData.headers.length).fill(180)
  );
  const [rowHeights, setRowHeights] = useState<number[]>(() =>
    Array(tableData.rows.length).fill(42)
  );

  // Sync dimensions arrays on column/row additions or deletions
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

  // Horizontal dragging (column resize) handler
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

  // Vertical dragging (row resize) handler
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

  // Design styling classes
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
      {/* TABLE ACTIONS TOOLBAR */}
      {isSelected && (
        <div className="flex items-center gap-1.5 mb-2 py-1 px-2.5 bg-[#18181b] border border-border/80 rounded-xl max-w-max select-none shadow-lg animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={handleAddRow}
            className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-[#27272a] px-2 py-1 rounded transition-all cursor-pointer"
          >
            <Plus size={10} /> Row
          </button>
          <button
            onClick={handleRemoveRow}
            disabled={tableData.rows.length <= 1}
            className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-destructive disabled:opacity-40 disabled:hover:text-muted-foreground hover:bg-[#27272a] px-2 py-1 rounded transition-all cursor-pointer"
          >
            <Minus size={10} /> Row
          </button>
          <div className="h-3.5 w-[1px] bg-border/60 mx-0.5" />
          <button
            onClick={handleAddCol}
            className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-[#27272a] px-2 py-1 rounded transition-all cursor-pointer"
          >
            <Plus size={10} /> Column
          </button>
          <button
            onClick={handleRemoveCol}
            disabled={tableData.headers.length <= 1}
            className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-destructive disabled:opacity-40 disabled:hover:text-muted-foreground hover:bg-[#27272a] px-2 py-1 rounded transition-all cursor-pointer"
          >
            <Minus size={10} /> Column
          </button>
          <div className="h-3.5 w-[1px] bg-border/60 mx-0.5" />
          
          {/* Style switcher dropdown */}
          <div className="relative">
            <button
              onClick={() => setStyleMenuOpen(!styleMenuOpen)}
              className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-[#27272a] px-2 py-1 rounded transition-all cursor-pointer capitalize"
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
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-[10px] font-bold text-foreground hover:bg-[#27272a] capitalize transition-all"
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

      {/* RENDER RESIZABLE DYNAMIC TABLE */}
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
                  {/* COLUMN RESIZER DRAG HANDLE */}
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
                className={`${trClass} ${
                  style === "striped" && rowIndex % 2 === 1 ? "bg-[#1c1c1f]/40" : ""
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
                    {/* ROW RESIZER DRAG HANDLE */}
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

// Inner wrapper component for block editing
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

  // Sync state text into DOM once at start to prevent caret jumping
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
      
      {/* HOVER HELPER BUTTONS (Image 1 style) */}
      <div className="absolute -left-[54px] top-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
        <button
          onClick={handlePlusClick}
          className="p-1 hover:bg-[#27272a] rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          title="Add block commands"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={onOpenMenu}
          className="p-1 hover:bg-[#27272a] rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          title="Line settings"
        >
          <MoreVertical size={14} />
        </button>
      </div>

      {/* RENDER THE BLOCK */}
      <div className="w-full pl-2">
        {renderBlockElement()}
      </div>

      {/* SLASH COMMAND BLOCK MENU (Image 2 style) */}
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
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
              >
                <span className="font-bold text-[10px] text-muted-foreground bg-[#27272a] px-1 py-0.5 rounded shrink-0">H1</span>
                <span>Heading 1</span>
              </button>

              <button
                onClick={() => onApplyFormat(line.id, "h2")}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
              >
                <span className="font-bold text-[9px] text-muted-foreground bg-[#27272a] px-1 py-0.5 rounded shrink-0">H2</span>
                <span>Heading 2</span>
              </button>

              <button
                onClick={() => onApplyFormat(line.id, "h3")}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
              >
                <span className="font-bold text-[8px] text-muted-foreground bg-[#27272a] px-1 py-0.5 rounded shrink-0">H3</span>
                <span>Heading 3</span>
              </button>

              <button
                onClick={() => onApplyFormat(line.id, "bullet")}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
              >
                <List size={13} className="text-muted-foreground shrink-0" />
                <span>Bullet List</span>
              </button>

              <button
                onClick={() => onApplyFormat(line.id, "number")}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
              >
                <ListOrdered size={13} className="text-muted-foreground shrink-0" />
                <span>Numbered List</span>
              </button>

              <button
                onClick={() => onApplyFormat(line.id, "quote")}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
              >
                <Quote size={13} className="text-muted-foreground shrink-0" />
                <span>Quote</span>
              </button>

              <button
                onClick={() => onApplyFormat(line.id, "table")}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
              >
                <Table size={13} className="text-muted-foreground shrink-0" />
                <span>Table</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ⋮ BUTTON SETTINGS MENU (Image 3 style) */}
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
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
              >
                <Eraser size={13} className="text-muted-foreground shrink-0" />
                <span>Clear formatting</span>
              </button>

              <button
                onClick={() => onCopyText(line.text)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
              >
                <Copy size={13} className="text-muted-foreground shrink-0" />
                <span>Copy</span>
              </button>

              <button
                onClick={() => onDuplicateLine(line.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
              >
                <Layers size={13} className="text-muted-foreground shrink-0" />
                <span>Duplicate</span>
              </button>

              <div className="my-1 border-t border-border/40" />

              <button
                onClick={() => onDeleteLine(line.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
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
