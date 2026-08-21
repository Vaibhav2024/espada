"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { streamWrite, streamChat, readStream, fetchDocLines, saveDocLines, uploadKnowledge, addKnowledgeLink, pollAssetStatus } from "@/lib/api";
import { ACCEPTED_FILE_TYPES } from "@/hooks/useResourceUpload";
import {
  Folder,
  ChevronRight,
  Plus,
  Send,
  Globe,
  X,
  FileText,
  Check,
  Trash2,
  Link2,
  FileUp,
  FolderHeart,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Search,
  Menu,
  Pencil,
  MoreVertical,
  Quote,
  Table,
  List,
  ListOrdered,
  Eraser,
  Copy,
  Layers,
  Minus,
  Undo,
  Redo,
  CheckCircle,
  Minimize2,
  Maximize2,
  AlignLeft,
  Play,
  Scale,
  ArrowUp,
  MessageSquare,
} from "lucide-react";
import { KnowledgeSelectorModal } from "./KnowledgeSelector";

interface Resource {
  id: string;
  name: string;
  loading: boolean;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
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

export function WriteView({
  spaceName = "Write",
  spaceId,
  folderId,
  visibility: initialVisibility = "members",
  isConfigured = false,
  initialDraft = "",
  onCompleteConfig,
  onUpdateVisibility,
  onBack,
}: {
  spaceName?: string;
  spaceId?: string;
  folderId?: string;
  visibility?: "me" | "members" | "public";
  isConfigured?: boolean;
  initialDraft?: string;
  onCompleteConfig?: (draftName: string, generatedText: string) => void;
  onUpdateVisibility?: (vis: "me" | "members" | "public") => void;
  onBack: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      setChatCollapsed(false);
    }
  }, []);

  // Wizard Configuration State
  const [promptText, setPromptText] = useState("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const [tone, setTone] = useState<string>("");
  const [toneOpen, setToneOpen] = useState(false);
  const [lengthValue, setLengthValue] = useState<string>("1000");
  const [lengthUnit, setLengthUnit] = useState<string>("words");
  const [lengthUnitOpen, setLengthUnitOpen] = useState(false);
  const [tense, setTense] = useState<string>("");
  const [tenseOpen, setTenseOpen] = useState(false);
  const [perspective, setPerspective] = useState<string>("");
  const [perspectiveOpen, setPerspectiveOpen] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Document lines state & undo/redo stacks
  const [lines, setLines] = useState<DocLine[]>([]);
  const [history, setHistory] = useState<DocLine[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lineIndexMap, setLineIndexMap] = useState<Record<string, number>>({});

  const [activeSlashLineId, setActiveSlashLineId] = useState<string | null>(null);
  const [activeMenuLineId, setActiveMenuLineId] = useState<string | null>(null);
  const [popupCoords, setPopupCoords] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [showAskEspadaInput, setShowAskEspadaInput] = useState(false);
  const [askEspadaPrompt, setAskEspadaPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRange, setSelectedRange] = useState<Range | null>(null);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);

  const [continuingAI, setContinuingAI] = useState(false);

  // Visibility and Chat Panel States
  const [visibility, setVisibility] = useState(initialVisibility);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(420);
  const [chatCollapsed, setChatCollapsed] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Chat Resources & Focus States
  const [chatUploadOpen, setChatUploadOpen] = useState(false);
  const [chatFocusOpen, setChatFocusOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [chatLinkOpen, setChatLinkOpen] = useState(false);
  const [chatLinkUrl, setChatLinkUrl] = useState("");
  const [chatKnowledgeOpen, setChatKnowledgeOpen] = useState(false);

  const [spaceResources, setSpaceResources] = useState<Resource[]>([
    { id: "res-write-default", name: "Research Notes Draft.pdf", loading: false }
  ]);
  const [focusedResourceIds, setFocusedResourceIds] = useState<string[]>(["res-write-default"]);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const visibilityRef = useRef<HTMLDivElement>(null);
  const chatUploadRef = useRef<HTMLDivElement>(null);
  const chatFocusRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  const toneRef = useRef<HTMLDivElement>(null);
  const lengthRef = useRef<HTMLDivElement>(null);
  const tenseRef = useRef<HTMLDivElement>(null);
  const perspectiveRef = useRef<HTMLDivElement>(null);
  const askEspadaRef = useRef<HTMLDivElement>(null);

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (addMenuRef.current && !addMenuRef.current.contains(target)) {
        setAddMenuOpen(false);
      }
      const isVisibilityClick = (target as HTMLElement).closest(".visibility-selector-container");
      if (!isVisibilityClick && visibilityRef.current && !visibilityRef.current.contains(target)) {
        setVisibilityOpen(false);
      }
      if (chatUploadRef.current && !chatUploadRef.current.contains(target)) {
        setChatUploadOpen(false);
      }
      if (chatFocusRef.current && !chatFocusRef.current.contains(target)) {
        setChatFocusOpen(false);
      }
      if (toneRef.current && !toneRef.current.contains(target)) {
        setToneOpen(false);
      }
      if (lengthRef.current && !lengthRef.current.contains(target)) {
        setLengthUnitOpen(false);
      }
      if (tenseRef.current && !tenseRef.current.contains(target)) {
        setTenseOpen(false);
      }
      if (perspectiveRef.current && !perspectiveRef.current.contains(target)) {
        setPerspectiveOpen(false);
      }
      
      const isQuickAskBtn = (target as HTMLElement).closest(".quick-ask-espada-btn");
      if (askEspadaRef.current && !askEspadaRef.current.contains(target) && !isQuickAskBtn) {
        setShowAskEspadaInput(false);
        setPopupCoords(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        if (!showAskEspadaInput) {
          setPopupCoords(null);
          setSelectedText("");
        }
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(sel.toString());
      setSelectedRange(range.cloneRange());
      setSelectionRect(rect);
      setPopupCoords({
        x: rect.left + rect.width / 2,
        y: rect.top - 46,
      });
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [showAskEspadaInput]);


  // Parse draft text block to structured DocLine blocks
  const parseTextToLines = (rawText: string): DocLine[] => {
    // Split by single newlines to handle markdown line-by-line
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

      // Empty line — flush current paragraph
      if (trimmed === "") {
        flushParagraph();
        continue;
      }

      // Heading detection
      if (trimmed.startsWith("### ")) {
        flushParagraph();
        docLines.push({
          id: `line-init-${docLines.length}-${Date.now()}`,
          text: stripInlineMarkdown(trimmed.slice(4)),
          type: "h3",
        });
        continue;
      }
      if (trimmed.startsWith("## ")) {
        flushParagraph();
        docLines.push({
          id: `line-init-${docLines.length}-${Date.now()}`,
          text: stripInlineMarkdown(trimmed.slice(3)),
          type: "h2",
        });
        continue;
      }
      if (trimmed.startsWith("# ")) {
        flushParagraph();
        docLines.push({
          id: `line-init-${docLines.length}-${Date.now()}`,
          text: stripInlineMarkdown(trimmed.slice(2)),
          type: "h1",
        });
        continue;
      }

      // Bullet list detection
      if (/^[-*]\s+/.test(trimmed)) {
        flushParagraph();
        docLines.push({
          id: `line-init-${docLines.length}-${Date.now()}`,
          text: stripInlineMarkdown(trimmed.replace(/^[-*]\s+/, "")),
          type: "bullet",
        });
        continue;
      }

      // Numbered list detection
      if (/^\d+[.)]\s+/.test(trimmed)) {
        flushParagraph();
        docLines.push({
          id: `line-init-${docLines.length}-${Date.now()}`,
          text: stripInlineMarkdown(trimmed.replace(/^\d+[.)]\s+/, "")),
          type: "number",
        });
        continue;
      }

      // Blockquote detection
      if (trimmed.startsWith("> ")) {
        flushParagraph();
        docLines.push({
          id: `line-init-${docLines.length}-${Date.now()}`,
          text: stripInlineMarkdown(trimmed.slice(2)),
          type: "quote",
        });
        continue;
      }

      // Regular text — accumulate into a paragraph
      currentParagraph += (currentParagraph ? " " : "") + trimmed;
    }

    // Flush remaining paragraph
    flushParagraph();

    if (docLines.length === 0) {
      return [{ id: `line-1`, text: "Untitled Draft", type: "h1" }];
    }

    return docLines;
  };

  // Strip inline markdown formatting (bold, italic, strikethrough, code)
  const stripInlineMarkdown = (text: string): string => {
    return text
      .replace(/\*\*\*(.*?)\*\*\*/g, "$1")   // bold+italic ***text***
      .replace(/\*\*(.*?)\*\*/g, "$1")         // bold **text**
      .replace(/__(.*?)__/g, "$1")             // bold __text__
      .replace(/\*(.*?)\*/g, "$1")             // italic *text*
      .replace(/_(.*?)_/g, "$1")               // italic _text_
      .replace(/~~(.*?)~~/g, "$1")             // strikethrough ~~text~~
      .replace(/`(.*?)`/g, "$1")               // inline code `text`
      .replace(/\[(.*?)\]\(.*?\)/g, "$1");     // links [text](url)
  };

  // Load content: from initialDraft prop OR from database on refresh
  const [contentLoaded, setContentLoaded] = useState(false);
  useEffect(() => {
    if (contentLoaded) return;
    if (initialDraft) {
      const parsed = parseTextToLines(initialDraft);
      setLines(parsed);
      setHistory([parsed]);
      setHistoryIndex(0);
      setContentLoaded(true);
    } else if (spaceId && isConfigured) {
      // Load from DB on page refresh when initialDraft is empty
      fetchDocLines(spaceId)
        .then((dbLines) => {
          if (dbLines.length > 0) {
            const parsed = dbLines.map((l) => ({
              id: l.id,
              text: l.text,
              type: l.type as DocLine["type"],
              tableData: l.tableData as DocLine["tableData"],
            }));
            setLines(parsed);
            setHistory([parsed]);
            setHistoryIndex(0);
          }
          setContentLoaded(true);
        })
        .catch(() => setContentLoaded(true));
    } else {
      setContentLoaded(true);
    }
  }, [initialDraft, spaceId, isConfigured]);

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

  // Maintain line numeric indices for list rendering
  useEffect(() => {
    const nextMap: Record<string, number> = {};
    let currentNumber = 1;
    lines.forEach((line) => {
      if (line.type === "number") {
        nextMap[line.id] = currentNumber++;
      } else {
        currentNumber = 1;
      }
    });
    setLineIndexMap(nextMap);
  }, [lines]);

  // Sync window drag resizing for chat
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 280 && newWidth < 800) {
        setChatWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const commitLinesToHistory = (newLines: DocLine[]) => {
    if (historyIndex >= 0) {
      const currentHist = history[historyIndex];
      if (JSON.stringify(currentHist) === JSON.stringify(newLines)) {
        return;
      }
    }
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, newLines]);
    setHistoryIndex(newHistory.length);
  };

  // History state stack updater
  const updateLinesAndHistory = (newLines: DocLine[]) => {
    setLines(newLines);
    commitLinesToHistory(newLines);
  };

  // Undo / Redo Actions
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setLines(history[prevIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setLines(history[nextIdx]);
    }
  };

  // Form Methods
  const addResourceItem = (name: string, alreadyReady?: boolean) => {
    const newId = `res-${Date.now()}`;
    setResources((prev) => [...prev, { id: newId, name, loading: !alreadyReady }]);
    return newId;
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
        await pollAssetStatus(item.assetId, (status) => {
          if (status === "ready" || status === "failed") {
            setResources((prev) => prev.map((r) => r.id === resId ? { ...r, loading: false } : r));
          }
        });
      } catch {
        setResources((prev) => prev.map((r) => r.id === resId ? { ...r, loading: false } : r));
      }
    }
    if (e.target) e.target.value = "";
  };

  const handleAddLink = async () => {
    if (!linkUrl.trim() || !folderId) return;
    const rawUrl = linkUrl.trim().startsWith("http") ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    let label = rawUrl;
    try {
      const parsed = new URL(rawUrl);
      label = parsed.hostname + parsed.pathname;
      if (label.length > 25) label = label.slice(0, 25) + "...";
    } catch {}

    const resId = addResourceItem(`Link: ${label}`);
    setLinkUrl("");
    setShowLinkInput(false);
    setAddMenuOpen(false);

    try {
      const item = await addKnowledgeLink(folderId, rawUrl, label);
      await pollAssetStatus(item.assetId, (status) => {
        if (status === "ready" || status === "failed") {
          setResources((prev) => prev.map((r) => r.id === resId ? { ...r, loading: false } : r));
        }
      });
    } catch {
      setResources((prev) => prev.map((r) => r.id === resId ? { ...r, loading: false } : r));
    }
  };

  // Chat resources methods
  const addChatResourceItem = (name: string) => {
    const newId = `res-${Date.now()}`;
    setSpaceResources((prev) => [...prev, { id: newId, name, loading: true }]);
    setFocusedResourceIds((prev) => [...prev, newId]);
    setTimeout(() => {
      setSpaceResources((prev) => prev.map((r) => (r.id === newId ? { ...r, loading: false } : r)));
    }, 1500);
  };

  const handleChatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file) => addChatResourceItem(file.name));
    }
  };

  // Generate Draft Action
  const handleGenerate = async () => {
    if (!promptText.trim()) return;
    setGenerating(true);
    setGenerateError(null);

    if (spaceId) {
      try {
        const response = await streamWrite({
          spaceId,
          prompt: promptText.trim(),
          mode: "generate",
          tone: tone || undefined,
          length: lengthValue || undefined,
          lengthUnit: lengthUnit || undefined,
          tense: tense || undefined,
          perspective: perspective || undefined,
        });
        let fullText = "";
        await readStream(response, (chunk) => {
          fullText += chunk;
          const parsed = parseTextToLines(fullText);
          setLines(parsed);
        });
        setGenerating(false);
        const parsed = parseTextToLines(fullText);
        setLines(parsed);
        setHistory([parsed]);
        setHistoryIndex(0);
        if (onCompleteConfig) {
          onCompleteConfig(promptText.trim().slice(0, 32), fullText);
        }
        return;
      } catch (err: any) {
        console.error("Write generation failed:", err);
        setGenerating(false);
        setGenerateError(
          err?.status === 429
            ? "Daily AI limit reached. Please try again later or upgrade your plan."
            : "Failed to generate content. Please try again."
        );
        return;
      }
    }

    // Fallback: no spaceId available — show error
    setGenerating(false);
    setGenerateError("Unable to generate content. Space is not properly configured. Please go back and try again.");
  };

  // Continue Writing with AI Action
  const handleContinueWriting = async () => {
    setContinuingAI(true);
    const existingContent = lines.map((l) => l.text).join("\n");

    if (spaceId) {
      try {
        const response = await streamWrite({
          spaceId,
          prompt: "Continue writing naturally from where I left off.",
          mode: "continue",
          existingContent,
        });
        let newText = "";
        await readStream(response, (chunk) => {
          newText += chunk;
        });
        const additionalLine: DocLine = {
          id: `line-ai-cont-${Date.now()}`,
          text: newText.trim(),
          type: "plain",
        };
        const nextLines = [...lines, additionalLine];
        updateLinesAndHistory(nextLines);
        setContinuingAI(false);
        return;
      } catch (err) {
        console.error("Continue writing failed:", err);
      }
    }

    // Fallback
    setTimeout(() => {
      const additionalLine: DocLine = {
        id: `line-ai-cont-${Date.now()}`,
        text: `Expanding on the topic, the long-term regulation is heavily dependent on renal mechanisms. The kidneys dynamically adjust the rate of sodium excretion, which affects extracellular fluid volume and cardiac output.`,
        type: "plain"
      };
      const nextLines = [...lines, additionalLine];
      updateLinesAndHistory(nextLines);
      setContinuingAI(false);
    }, 1500);
  };

  // Selection Add To Chat Action
  const handleAddToChat = () => {
    if (selectedText.trim()) {
      setChatInput((prev) => (prev ? prev + ` "${selectedText.trim()}"` : `Regarding: "${selectedText.trim()}"`));
      setPopupCoords(null);
      // Open chat if collapsed
      setChatCollapsed(false);
      setTimeout(() => chatInputRef.current?.focus(), 80);
    }
  };

  const getAskEspadaLeft = () => {
    if (!popupCoords) return 0;
    const leftX = selectionRect ? selectionRect.left + selectionRect.width / 2 : popupCoords.x;
    if (typeof window !== "undefined") {
      return Math.max(160, Math.min(window.innerWidth - 160, leftX));
    }
    return leftX;
  };

  // Ask Espada Action handlers
  const getReplacementText = (option: string, originalText: string): string => {
    const clean = originalText.trim();
    
    // Check if the text matches the RAS topic
    const isRasTopic = clean.toLowerCase().includes("ras") || clean.toLowerCase().includes("renin") || clean.toLowerCase().includes("blood pressure") || clean.toLowerCase().includes("system");
    
    if (isRasTopic) {
      switch (option) {
        case "Improve writing":
          return `At the core of the RAS is the enzyme renin, which is released by the kidneys to regulate systemic blood pressure and fluid homeostasis.`;
        case "Fix spelling & grammar":
          return `At the core of the RAS is the enzyme renin, which is secreted by the kidneys in response to low blood pressure, low sodium concentration, or sympathetic nervous system stimulation.`;
        case "Improve fluency":
          return `The renin-angiotensin system (RAS) primarily relies on the renin enzyme, which is secreted by the kidneys in response to reduced blood pressure.`;
        case "Simplify":
          return `Renin is a kidney enzyme that helps control blood pressure.`;
        case "Make longer":
          return `At the core of the RAS is the enzyme renin, which is synthesized, stored, and secreted by the juxtaglomerular cells of the kidneys. Its release is triggered by low blood pressure, decreased sodium levels, or sympathetic nervous system activity, initiating a cascade that regulates blood volume and vascular resistance.`;
        case "Summarize":
          return `The Renin-Angiotensin System (RAS) uses the kidney enzyme renin to manage blood pressure and fluid balance.`;
        case "Continue":
          return `${clean} Consequently, this pathway serves as a primary clinical target for treating hypertension and heart failure.`;
        case "Write opposing argument":
          return `However, some studies argue that targeting the RAS alone is insufficient for long-term cardiovascular regulation, as compensatory pathways often bypass these blockades.`;
        default:
          return clean;
      }
    }

    // Generic fallback for any other selected text
    switch (option) {
      case "Improve writing":
        return `In a more refined manner, ${clean.charAt(0).toLowerCase()}${clean.slice(1)} serves as a key aspect of this study.`;
      case "Fix spelling & grammar":
        return clean;
      case "Improve fluency":
        return `Clearly, ${clean.charAt(0).toLowerCase()}${clean.slice(1)} plays a vital role in this process.`;
      case "Simplify":
        return `Simply put, it means that ${clean.toLowerCase()}`;
      case "Make longer":
        return `${clean} In addition to this, further research indicates that this phenomenon is heavily influenced by external variables and regulatory systems, which require deeper analysis.`;
      case "Summarize":
        return `In short, it refers to: ${clean}.`;
      case "Continue":
        return `${clean} Furthermore, this development opens up new possibilities for subsequent investigations.`;
      case "Write opposing argument":
        return `On the other hand, critics argue that ${clean.charAt(0).toLowerCase()}${clean.slice(1)} might have unintended side effects and limitations.`;
      default:
        return clean;
    }
  };

  const handleAskEspadaAction = (option: string) => {
    setIsGenerating(true);
    setTimeout(() => {
      // 1. Get replacement text
      let prompt = askEspadaPrompt;
      let textToUse = selectedText;
      let replacement = "";
      
      if (option === "custom") {
        const lowerPrompt = prompt.toLowerCase();
        if (lowerPrompt.includes("spanish")) {
          replacement = `En el núcleo del RAS se encuentra la enzima renina, que es secretada por los riñones en respuesta a una presión arterial baja.`;
        } else {
          replacement = `[Revised based on "${prompt}"]: ${textToUse}`;
        }
      } else {
        replacement = getReplacementText(option, textToUse);
      }

      // 2. Restore selection in the editor
      if (selectedRange) {
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(selectedRange);
      }

      // 3. Replace selection text
      document.execCommand("insertText", false, replacement);

      // 4. Reset states
      setIsGenerating(false);
      setShowAskEspadaInput(false);
      setPopupCoords(null);
      setAskEspadaPrompt("");
    }, 1200);
  };

  // Chat Actions
  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const newMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      sender: "user",
      text: chatInput,
    };
    setChatMessages((prev) => [...prev, newMsg]);
    const messageText = chatInput.trim();
    setChatInput("");
    setChatLoading(true);

    // Create placeholder AI message for streaming
    const aiMsgId = `chat-${Date.now() + 1}`;
    const aiMsg: ChatMessage = { id: aiMsgId, sender: "ai", text: "" };
    setChatMessages((prev) => [...prev, aiMsg]);

    if (spaceId) {
      try {
        // Include the current document content as context
        const docContent = lines.map((l) => l.text).join("\n");
        const contextPrefix = docContent.trim()
          ? `[Context: The student is working on a written document with this content:\n"${docContent.slice(0, 2000)}"]\n\n`
          : "";

        const response = await streamChat({
          spaceId,
          message: contextPrefix + messageText,
        });
        await readStream(response, (chunk) => {
          setChatMessages((prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, text: m.text + chunk } : m))
          );
        });
      } catch (err: any) {
        console.error("Chat error:", err);
        const errorText = err?.status === 429
          ? "Daily AI limit reached. Please try again later or upgrade your plan."
          : "Sorry, I couldn't process your request. Please try again.";
        setChatMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, text: errorText } : m))
        );
      } finally {
        setChatLoading(false);
      }
    } else {
      setChatMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, text: "Please generate content first to enable chat." } : m))
      );
      setChatLoading(false);
    }
  };

  // Helper Labels
  const getVisibilityLabel = (vis: "me" | "members" | "public") => {
    if (vis === "me") return "Just me";
    if (vis === "members") return "Folder Members";
    return "Public";
  };

  const handleToggleVisibility = (vis: "me" | "members" | "public") => {
    setVisibility(vis);
    setVisibilityOpen(false);
    if (onUpdateVisibility) {
      onUpdateVisibility(vis);
    }
  };

  // Inline Block Editor Helpers
  const handleUpdateText = (id: string, text: string) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, text } : l)));
  };

  const handleCommitHistory = () => {
    commitLinesToHistory(lines);
  };

  const handleInsertLine = (afterId: string) => {
    const index = lines.findIndex((l) => l.id === afterId);
    if (index === -1) return;
    const newLine: DocLine = {
      id: `line-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      text: "",
      type: "plain",
    };
    const nextLines = [...lines];
    nextLines.splice(index + 1, 0, newLine);
    updateLinesAndHistory(nextLines);
    setTimeout(() => {
      document.getElementById(`editable-${newLine.id}`)?.focus();
    }, 50);
  };

  const handleDeleteLine = (id: string, focusPrev?: boolean) => {
    if (lines.length <= 1) return;
    const index = lines.findIndex((l) => l.id === id);
    if (index === -1) return;
    const prevLine = lines[index - 1];
    const nextLines = lines.filter((l) => l.id !== id);
    updateLinesAndHistory(nextLines);
    if (focusPrev && index > 0 && prevLine) {
      setTimeout(() => {
        const prevEl = document.getElementById(`editable-${prevLine.id}`);
        if (prevEl) {
          prevEl.focus();
          // Move caret to end of text
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(prevEl);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }, 50);
    }
  };

  const handleDuplicateLine = (id: string) => {
    const index = lines.findIndex((l) => l.id === id);
    if (index === -1) return;
    const lineToCopy = lines[index];
    const newId = `line-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const newLine: DocLine = {
      ...lineToCopy,
      id: newId,
    };
    const nextLines = [...lines];
    nextLines.splice(index + 1, 0, newLine);
    updateLinesAndHistory(nextLines);
    setActiveMenuLineId(null);
  };

  const handleApplyFormat = (id: string, formatType: DocLine["type"]) => {
    const nextLines = lines.map((l) => {
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
            ["", ""],
            ["", ""]
          ],
          style: "default" as const
        } : undefined;
        return { ...l, type: formatType, text: cleanText, tableData };
      }
      return l;
    });
    updateLinesAndHistory(nextLines);
    setActiveSlashLineId(null);
    setActiveMenuLineId(null);

    // Re-focus the editor node to match state change updates
    setTimeout(() => {
      const element = document.getElementById(`editable-${id}`);
      element?.focus();
    }, 50);
  };

  const handleClearFormatting = (id: string) => {
    const nextLines = lines.map((l) => (l.id === id ? { ...l, type: "plain" as const } : l));
    updateLinesAndHistory(nextLines);
    setActiveMenuLineId(null);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setActiveMenuLineId(null);
  };

  const handlePlusClickOnLine = (lineId: string) => {
    const newId = `line-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const newBlock: DocLine = { id: newId, text: "/", type: "plain" };
    const index = lines.findIndex((l) => l.id === lineId);
    if (index === -1) return;
    const nextLines = [...lines];
    nextLines.splice(index + 1, 0, newBlock);
    updateLinesAndHistory(nextLines);

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

  const handleUpdateTableData = (id: string, tableData: DocLine["tableData"]) => {
    const nextLines = lines.map((l) => (l.id === id ? { ...l, tableData } : l));
    updateLinesAndHistory(nextLines);
  };

  // ── WIZARD MODE (UNCONFIGURED) ──
  if (!isConfigured) {
    return (
      <div className="flex h-full w-full bg-[#0c0c0d] text-left select-none relative overflow-hidden">
        {/* Placeholder background layout that fills the space panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0c0c0d]">
          {/* Workspace Top Header placeholder */}
          <div className="shrink-0 flex items-center justify-between px-8 py-4 border-b border-border/20 bg-[#0c0c0d]">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Folder size={13} />
              <span>My folder</span>
              <ChevronRight size={12} />
              <Pencil size={13} />
              <span className="font-semibold text-foreground truncate max-w-[300px]">{spaceName}</span>
            </div>
          </div>
          {/* Blurred background mockup representation */}
          <div className="flex-1 p-8 flex flex-col justify-start">
            <div className="max-w-[700px] w-full mx-auto flex-1 flex flex-col rounded-2xl border border-border bg-[#131315]/50 overflow-hidden shadow-sm filter blur-sm pointer-events-none opacity-40">
              <div className="h-[40px] border-b border-border bg-[#131315]/85 px-4" />
              <div className="flex-1" />
            </div>
          </div>
        </div>

        {/* Portaled Wizard Modal Overlay */}
        {mounted && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={onBack} />

            {/* Wizard Dialog Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative z-10 w-full max-w-[680px] rounded-2xl border border-border bg-[#1c1c1f] p-6 shadow-2xl overflow-hidden flex flex-col text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h2 className="text-base font-bold text-foreground">Get started with AI</h2>
                <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              {/* Loader Overlay */}
              {generating && (
                <div className="absolute inset-0 bg-[#1c1c1f]/95 z-50 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-10 h-10 border-4 border-foreground border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm font-semibold text-foreground">Generating draft...</p>
                  <p className="text-xs text-muted-foreground mt-1">Espada is processing your topic and materials</p>
                </div>
              )}

              {/* Grid Options Container */}
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Prompt Field */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Prompt</span>
                  <textarea
                    rows={5}
                    placeholder="What are you trying to write?"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    className="w-full h-[120px] rounded-xl bg-[#131315] border border-border p-3 text-xs text-foreground placeholder:text-muted-foreground/35 outline-none resize-none focus:border-border/80 transition-colors"
                  />
                </div>

                {/* Resources reference field */}
                <div className="space-y-2 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Resources to reference</span>
                    <div className="relative" ref={addMenuRef}>
                      <button
                        onClick={() => setAddMenuOpen(!addMenuOpen)}
                        className="flex items-center gap-1 bg-[#27272a] hover:bg-[#3f3f46] px-2 py-0.5 text-[10px] font-bold text-foreground transition-all rounded cursor-pointer border border-border/60"
                      >
                        <Plus size={10} /> Add
                      </button>

                      <AnimatePresence>
                        {addMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            className="absolute right-0 mt-1.5 w-[160px] rounded-xl border border-border bg-[#1c1c1f] p-1.5 shadow-2xl z-50 text-left"
                          >
                            <button
                              onClick={() => {
                                setKnowledgeOpen(true);
                                setAddMenuOpen(false);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-foreground hover:bg-[#27272a] transition-colors cursor-pointer"
                            >
                              <FolderHeart size={12} className="text-muted-foreground" />
                              From Knowledge
                            </button>
                            <button
                              onClick={() => {
                                setShowLinkInput(true);
                                setAddMenuOpen(false);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-foreground hover:bg-[#27272a] transition-colors cursor-pointer"
                            >
                              <Link2 size={12} className="text-muted-foreground" />
                              From link
                            </button>
                            <button
                              onClick={() => {
                                fileInputRef.current?.click();
                                setAddMenuOpen(false);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-foreground hover:bg-[#27272a] transition-colors cursor-pointer"
                            >
                              <FileUp size={12} className="text-muted-foreground" />
                              From computer
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Link Input Overlay (inline) */}
                  {showLinkInput && (
                    <div className="flex gap-1.5 bg-[#131315] p-1.5 rounded-lg border border-border mt-1 mb-1">
                      <input
                        type="text"
                        placeholder="Paste link here..."
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        className="flex-1 bg-transparent px-2 py-1 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/35"
                      />
                      <button
                        onClick={handleAddLink}
                        className="rounded bg-foreground text-background px-2.5 py-1 text-[10px] font-bold cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  )}

                  {/* resources display card container */}
                  <div className="flex-1 rounded-xl border border-border bg-[#131315] p-3 flex flex-col items-center justify-center min-h-[120px] max-h-[120px] overflow-y-auto">
                    {resources.length === 0 ? (
                      <div className="text-center">
                        <p className="text-[11px] font-semibold text-foreground">Nothing selected</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">Espada will reference the resources you select</p>
                      </div>
                    ) : (
                      <div className="w-full space-y-1.5 text-left">
                        {resources.map((res) => (
                          <div key={res.id} className="flex items-center justify-between rounded bg-[#1c1c1f] px-2.5 py-1.5 text-[10px] border border-border/40">
                            <span className="truncate text-foreground/80 max-w-[200px]">{res.name}</span>
                            <div className="flex items-center gap-1.5">
                              {res.loading ? (
                                <span className="text-[9px] text-muted-foreground animate-pulse">Embedding...</span>
                              ) : (
                                <Check size={11} className="text-emerald-500" />
                              )}
                              <button
                                onClick={() => setResources((prev) => prev.filter((r) => r.id !== res.id))}
                                className="text-muted-foreground/45 hover:text-destructive cursor-pointer"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tone Selector */}
                <div className="space-y-2" ref={toneRef}>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Tone</span>
                  <div className="relative">
                    <button
                      onClick={() => setToneOpen(!toneOpen)}
                      className="w-full flex items-center justify-between rounded-xl bg-[#131315] border border-border px-3 py-2.5 text-xs text-foreground/80 hover:border-border/80 transition-colors text-left"
                    >
                      <span>{tone || "Select a tone"}</span>
                      <ChevronRight size={12} className="rotate-90 text-muted-foreground" />
                    </button>

                    <AnimatePresence>
                      {toneOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="absolute left-0 right-0 mt-1 rounded-xl border border-border bg-[#1c1c1f] p-1 shadow-2xl z-50"
                        >
                          {["Academic", "Casual", "Professional", "Friendly"].map((t) => (
                            <button
                              key={t}
                              onClick={() => {
                                setTone(t);
                                setToneOpen(false);
                              }}
                              className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-foreground hover:bg-[#27272a] transition-colors cursor-pointer"
                            >
                              {t}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Length Selector (Text Input + Select Unit Dropdown) */}
                <div className="space-y-2" ref={lengthRef}>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Length</span>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max={lengthUnit === "words" ? 5000 : lengthUnit === "pages" ? 7 : 60}
                      value={lengthValue}
                      onChange={(e) => {
                        const val = e.target.value;
                        const num = parseInt(val, 10);
                        const max = lengthUnit === "words" ? 5000 : lengthUnit === "pages" ? 7 : 60;
                        if (val === "" || (num >= 1 && num <= max)) {
                          setLengthValue(val);
                        } else if (num > max) {
                          setLengthValue(String(max));
                        }
                      }}
                      className="w-[100px] rounded-xl bg-[#131315] border border-border px-3 py-2.5 text-xs text-foreground outline-none focus:border-border/80"
                    />
                    
                    <div className="flex-1 relative">
                      <button
                        onClick={() => setLengthUnitOpen(!lengthUnitOpen)}
                        className="w-full flex items-center justify-between rounded-xl bg-[#131315] border border-border px-3 py-2.5 text-xs text-foreground/80 hover:border-border/80 transition-colors text-left"
                      >
                        <span>{lengthUnit}</span>
                        <ChevronRight size={12} className="rotate-90 text-muted-foreground" />
                      </button>

                      <AnimatePresence>
                        {lengthUnitOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            className="absolute left-0 right-0 mt-1 rounded-xl border border-border bg-[#1c1c1f] p-1 shadow-2xl z-50"
                          >
                            {["words", "pages", "paragraphs"].map((u) => (
                              <button
                                key={u}
                                onClick={() => {
                                  const max = u === "words" ? 5000 : u === "pages" ? 7 : 60;
                                  const current = parseInt(lengthValue, 10);
                                  if (current > max) setLengthValue(String(max));
                                  setLengthUnit(u);
                                  setLengthUnitOpen(false);
                                }}
                                className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-foreground hover:bg-[#27272a] transition-colors cursor-pointer"
                              >
                                {u}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground/60">
                    Max: {lengthUnit === "words" ? "5,000 words" : lengthUnit === "pages" ? "7 pages" : "60 paragraphs"}
                  </p>
                </div>

                {/* Tense Selector */}
                <div className="space-y-2" ref={tenseRef}>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Tense</span>
                  <div className="relative">
                    <button
                      onClick={() => setTenseOpen(!tenseOpen)}
                      className="w-full flex items-center justify-between rounded-xl bg-[#131315] border border-border px-3 py-2.5 text-xs text-foreground/80 hover:border-border/80 transition-colors text-left"
                    >
                      <span>{tense || "Select a tense"}</span>
                      <ChevronRight size={12} className="rotate-90 text-muted-foreground" />
                    </button>

                    <AnimatePresence>
                      {tenseOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="absolute left-0 right-0 mt-1 rounded-xl border border-border bg-[#1c1c1f] p-1 shadow-2xl z-50"
                        >
                          {["Past", "Present", "Future"].map((ts) => (
                            <button
                              key={ts}
                              onClick={() => {
                                setTense(ts);
                                setTenseOpen(false);
                              }}
                              className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-foreground hover:bg-[#27272a] transition-colors cursor-pointer"
                            >
                              {ts}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Perspective Selector */}
                <div className="space-y-2" ref={perspectiveRef}>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Perspective</span>
                  <div className="relative">
                    <button
                      onClick={() => setPerspectiveOpen(!perspectiveOpen)}
                      className="w-full flex items-center justify-between rounded-xl bg-[#131315] border border-border px-3 py-2.5 text-xs text-foreground/80 hover:border-border/80 transition-colors text-left"
                    >
                      <span>{perspective || "Select a perspective"}</span>
                      <ChevronRight size={12} className="rotate-90 text-muted-foreground" />
                    </button>

                    <AnimatePresence>
                      {perspectiveOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="absolute left-0 right-0 mt-1 rounded-xl border border-border bg-[#1c1c1f] p-1 shadow-2xl z-50"
                        >
                          {["First Person", "Second Person", "Third Person"].map((p) => (
                            <button
                              key={p}
                              onClick={() => {
                                setPerspective(p);
                                setPerspectiveOpen(false);
                              }}
                              className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-foreground hover:bg-[#27272a] transition-colors cursor-pointer"
                            >
                              {p}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

              </div>

              {/* Action Buttons Row */}
              <div className="mt-8 pt-4 border-t border-border/40 flex flex-col items-end gap-2">
                {generateError && (
                  <p className="text-xs text-destructive font-medium w-full text-right">{generateError}</p>
                )}
                <div className="flex justify-end gap-2 w-full">
                <button
                  onClick={onBack}
                  className="rounded-xl border border-border bg-transparent hover:bg-[#27272a] px-5 py-2 text-xs font-semibold text-foreground transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={!promptText.trim() || generating}
                  onClick={handleGenerate}
                  className="rounded-xl bg-foreground text-background disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 px-5 py-2 text-xs font-bold transition-all cursor-pointer"
                >
                  {generating ? (
                    <span className="flex items-center gap-2">
                      <span className="size-3 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      Generating...
                    </span>
                  ) : (
                    "Generate"
                  )}
                </button>
                </div>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

        {/* Hidden File inputs & modals */}
        <KnowledgeSelectorModal
          isOpen={knowledgeOpen}
          onClose={() => setKnowledgeOpen(false)}
          folderId={folderId}
          onSelectMultiple={(fileNames) => {
            fileNames.forEach((name) => addResourceItem(name, true));
            setKnowledgeOpen(false);
          }}
        />
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" accept={ACCEPTED_FILE_TYPES} />
      </div>
    );
  }

  // ── WRITING WORKSPACE MODE (CONFIGURED) ──
  return (
    <div className="flex bg-[#0c0c0d] h-full w-full select-none text-left overflow-hidden relative">
      
      {/* ── LEFT EDITOR PANEL ── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border/40 bg-[#0d0d0e] relative h-full">
        
        {/* Workspace Top Header */}
        <div className="hidden md:flex shrink-0 items-center justify-between p-6 pb-4 border-b border-border/40 bg-[#0d0d0e] z-10">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Folder size={14} />
            <span>My folder</span>
            <ChevronRight size={12} />
            <Pencil size={14} />
            <span className="font-semibold text-foreground truncate max-w-[300px]">{spaceName}</span>
          </div>

          <div className="flex items-center gap-4">
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
                            Anyone with the link can view
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Collapse Chat toggle button */}
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

        {/* Scrollable editor content container */}
        <div className="flex-1 overflow-y-auto p-6 pb-28 relative">
          <div className="space-y-4 select-text max-w-2xl w-full mx-auto ml-0 md:ml-12 px-4 md:px-0 pr-0 md:pr-4">
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
                  onCommitHistory={handleCommitHistory}
                />
              );
            })}
          </div>
        </div>

        {/* FLOATING ACTION TOOLBAR AT THE BOTTOM CENTER OF THE EDITOR */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#1c1c1f] border border-border/80 rounded-xl px-3 py-2 flex items-center gap-2.5 shadow-2xl z-40">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[#27272a]/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Undo"
          >
            <Undo size={14} />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[#27272a]/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Redo"
          >
            <Redo size={14} />
          </button>
          
          <div className="h-4 w-[1px] bg-border/60" />

          <button
            onClick={handleContinueWriting}
            disabled={continuingAI}
            className="flex items-center gap-1.5 text-xs font-bold text-foreground hover:bg-[#27272a] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            {continuingAI ? (
              <div className="w-3.5 h-3.5 border-2 border-foreground border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <Sparkles size={13} className="text-foreground shrink-0" />
            )}
            <span>Continue writing with AI</span>
          </button>
        </div>
      </div>

      {/* SPLIT DRAG RESIZER LINE */}
      {!chatCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          className={`hidden md:block w-[3px] hover:w-[6px] cursor-col-resize self-stretch transition-all bg-border/60 hover:bg-primary z-45 ${
            isDragging ? "bg-primary w-[6px]" : ""
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

      {/* ── RIGHT PANEL (ESPADA CHAT PANEL) ── */}
      {!chatCollapsed && (
        <div
          style={typeof window !== "undefined" && window.innerWidth >= 768 ? { width: chatWidth } : undefined}
          className="fixed inset-y-0 right-0 z-40 w-full md:relative md:inset-auto md:z-auto h-full bg-[#151517] border-l border-border/40 flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 shrink-0"
        >
          <div className="flex items-center px-4 py-3 border-b border-border/40 shrink-0">
            <button
              onClick={() => setChatCollapsed(true)}
              className="p-1 rounded-lg text-muted-foreground hover:bg-[#27272a] hover:text-foreground transition-all cursor-pointer"
              title="Collapse chat"
            >
              <ChevronsRight size={16} />
            </button>
            <span className="text-xs font-bold text-muted-foreground ml-2.5 uppercase tracking-wider">Chat with Espada</span>
          </div>

          {/* Chat message threads */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center p-4">
                <p className="text-xs font-semibold text-foreground/80 leading-relaxed max-w-[220px]">
                  In this chat, I can help you write, conduct research, talk about a resource, or ask for feedback on anything that has been written in the editor!
                </p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col rounded-xl px-3.5 py-2.5 text-xs max-w-[85%] ${
                    msg.sender === "user"
                      ? "bg-secondary text-foreground ml-auto"
                      : "bg-[#1c1c1f] text-foreground/90 border border-border mr-auto"
                  }`}
                >
                  {msg.sender === "ai" && msg.text === "" ? (
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-muted-foreground/50 animate-pulse" />
                      <span className="size-2 rounded-full bg-muted-foreground/50 animate-pulse [animation-delay:150ms]" />
                      <span className="size-2 rounded-full bg-muted-foreground/50 animate-pulse [animation-delay:300ms]" />
                    </span>
                  ) : (
                    msg.text
                  )}
                </div>
              ))
            )}
          </div>

          {/* Chat input box at the bottom */}
          <div className="p-4 border-t border-border/20 bg-[#0c0c0d] space-y-2">
            
            {/* Inline Link Input popup */}
            {chatLinkOpen && (
              <div className="rounded-xl border border-border bg-[#18181b] p-3 flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Paste link here..."
                  value={chatLinkUrl}
                  onChange={(e) => setChatLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && chatLinkUrl.trim()) {
                      addChatResourceItem(chatLinkUrl.trim());
                      setChatLinkUrl("");
                      setChatLinkOpen(false);
                    }
                  }}
                  className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/35"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (chatLinkUrl.trim()) {
                      addChatResourceItem(chatLinkUrl.trim());
                      setChatLinkUrl("");
                      setChatLinkOpen(false);
                    }
                  }}
                  className="rounded-lg bg-foreground text-background px-3 py-1 text-[10px] font-bold"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setChatLinkUrl("");
                    setChatLinkOpen(false);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            <div className="relative rounded-xl border border-border bg-[#18181b] p-2 flex flex-col gap-2">
              <textarea
                ref={chatInputRef}
                rows={2}
                placeholder="Share with Espada..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChat();
                  }
                }}
                className="w-full bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground/35 resize-none"
              />
              <div className="flex items-center justify-between pt-1.5 border-t border-border/30">
                <div className="flex items-center gap-2">
                  
                  {/* Upload Button + Dropdown */}
                  <div className="relative" ref={chatUploadRef}>
                    <button
                      onClick={() => setChatUploadOpen(!chatUploadOpen)}
                      className="flex size-7 items-center justify-center rounded-lg bg-[#27272a]/60 hover:bg-[#27272a] text-foreground transition-all cursor-pointer border border-border/60"
                      title="Upload reference"
                    >
                      <Plus size={14} />
                    </button>

                    <AnimatePresence>
                      {chatUploadOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          className="absolute bottom-full left-0 mb-2 w-[160px] rounded-xl border border-border bg-[#1c1c1f] p-1.5 shadow-2xl z-50 text-left"
                        >
                          <button
                            onClick={() => {
                              setChatKnowledgeOpen(true);
                              setChatUploadOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-foreground hover:bg-[#27272a] transition-colors cursor-pointer"
                          >
                            <FolderHeart size={12} className="text-muted-foreground" />
                            From Knowledge
                          </button>
                          <button
                            onClick={() => {
                              setChatLinkOpen(true);
                              setChatUploadOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-foreground hover:bg-[#27272a] transition-colors cursor-pointer"
                          >
                            <Link2 size={12} className="text-muted-foreground" />
                            From link
                          </button>
                          <button
                            onClick={() => {
                              chatFileInputRef.current?.click();
                              setChatUploadOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-foreground hover:bg-[#27272a] transition-colors cursor-pointer"
                          >
                            <FileUp size={12} className="text-muted-foreground" />
                            From computer
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Focused sources dropdown checklist */}
                  <div className="relative" ref={chatFocusRef}>
                    <button
                      onClick={() => setChatFocusOpen(!chatFocusOpen)}
                      className="flex items-center gap-1.5 rounded-lg hover:bg-secondary/60 px-2 py-1 text-xs font-semibold text-foreground transition-all cursor-pointer border border-border/60"
                      title="Focused sources"
                    >
                      <Menu size={13} className="text-muted-foreground" />
                      <span className="flex size-4 items-center justify-center rounded bg-[#27272a] text-[9px] font-bold text-foreground">
                        {focusedResourceIds.length}
                      </span>
                    </button>

                    <AnimatePresence>
                      {chatFocusOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          className="absolute bottom-full left-0 mb-2 w-[240px] rounded-xl border border-border bg-[#1c1c1f] p-3 shadow-2xl z-50 text-left"
                        >
                          <div className="relative flex items-center mb-2">
                            <Search size={11} className="absolute left-2.5 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Search resources..."
                              value={chatSearchQuery}
                              onChange={(e) => setChatSearchQuery(e.target.value)}
                              className="w-full rounded-lg bg-[#18181b] pl-8 pr-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/35 outline-none border border-border/80"
                            />
                          </div>

                          <div className="max-h-[140px] overflow-y-auto space-y-1">
                            {spaceResources.filter(res => res.name.toLowerCase().includes(chatSearchQuery.toLowerCase())).length === 0 ? (
                              <p className="text-[10px] text-muted-foreground italic text-center py-2">
                                No resources found
                              </p>
                            ) : (
                              spaceResources.filter(res => res.name.toLowerCase().includes(chatSearchQuery.toLowerCase())).map((res) => {
                                const isChecked = focusedResourceIds.includes(res.id);
                                return (
                                  <div
                                    key={res.id}
                                    onClick={() => {
                                      if (isChecked) {
                                        setFocusedResourceIds(prev => prev.filter(id => id !== res.id));
                                      } else {
                                        setFocusedResourceIds(prev => [...prev, res.id]);
                                      }
                                    }}
                                    className="flex items-center justify-between rounded-lg p-1.5 hover:bg-[#27272a]/60 cursor-pointer select-none transition-colors"
                                  >
                                    <span className="text-[11px] font-semibold text-foreground truncate max-w-[170px]">
                                      {res.name}
                                    </span>
                                    <div className="flex size-3.5 items-center justify-center rounded border border-muted-foreground/60 shrink-0">
                                      {isChecked && <Check size={10} className="text-foreground" />}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>
                <button
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || chatLoading}
                  className="p-1.5 rounded-lg bg-foreground text-background disabled:opacity-30 transition-opacity cursor-pointer"
                >
                  <Send size={11} className="fill-current" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Buttons (visible only on mobile) */}
      <div className={`md:hidden fixed bottom-6 right-6 z-40 flex flex-col gap-3 ${!chatCollapsed ? "hidden" : ""}`}>
        {/* Visibility Selector Circle Button */}
        <div className="relative visibility-selector-container">
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
                          handleToggleVisibility(v);
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

      {/* TEXT SELECTION QUICK ACTIONS POPUP (floating) */}
      {!showAskEspadaInput && popupCoords && (
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
              setShowAskEspadaInput(true);
            }}
            className="quick-ask-espada-btn flex items-center gap-1.5 text-xs font-semibold text-foreground hover:bg-[#27272a] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-3 h-3 text-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3L2 22h4l2.5-6h7l2.5 6h4L12 3zm-2.5 10L12 6l2.5 7h-5z" />
            </svg>
            <span>Ask Espada</span>
          </button>

          <div className="h-4 w-[1px] bg-border/60 mx-1.5" />

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

      {/* ASK ESPADA POPUP CARD (Image 2 style) */}
      {showAskEspadaInput && popupCoords && (
        <div
          ref={askEspadaRef}
          style={{
            position: "fixed",
            left: getAskEspadaLeft(),
            top: selectionRect ? selectionRect.bottom + 8 : popupCoords.y + 46,
            transform: "translateX(-50%)",
            width: "300px",
          }}
          className="flex flex-col bg-[#1c1c1f] border border-border/85 rounded-xl p-2 shadow-2xl z-[9999] animate-in fade-in slide-in-from-top-2 duration-100"
        >
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2 text-xs font-medium text-foreground">
              <div className="flex items-center gap-1">
                <div className="size-1.5 bg-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="size-1.5 bg-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="size-1.5 bg-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-muted-foreground animate-pulse">Espada is writing...</span>
            </div>
          ) : (
            <>
              {/* Input Box */}
              <div className="flex items-center gap-2 bg-[#27272a]/30 border border-border/40 rounded-lg px-2.5 py-1.5 mb-1.5 focus-within:border-border transition-colors">
                <input
                  type="text"
                  placeholder="Ask Espada anything..."
                  value={askEspadaPrompt}
                  onChange={(e) => setAskEspadaPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAskEspadaAction("custom");
                    }
                  }}
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 outline-none"
                  autoFocus
                />
                <button
                  onClick={() => handleAskEspadaAction("custom")}
                  disabled={!askEspadaPrompt.trim()}
                  className="size-5 rounded-md flex items-center justify-center bg-foreground text-background hover:opacity-90 disabled:opacity-30 cursor-pointer transition-opacity"
                >
                  <ArrowUp size={12} />
                </button>
              </div>

              {/* Options list */}
              <div className="max-h-[220px] overflow-y-auto space-y-0.5">
                <button
                  onMouseDown={(e) => { e.preventDefault(); handleAskEspadaAction("Improve writing"); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground/90 hover:bg-[#27272a]/60 transition-colors text-left cursor-pointer"
                >
                  <Sparkles size={13} className="text-muted-foreground" />
                  <span>Improve writing</span>
                </button>
                <button
                  onMouseDown={(e) => { e.preventDefault(); handleAskEspadaAction("Fix spelling & grammar"); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground/90 hover:bg-[#27272a]/60 transition-colors text-left cursor-pointer"
                >
                  <CheckCircle size={13} className="text-muted-foreground" />
                  <span>Fix spelling & grammar</span>
                </button>

                <div className="text-[10px] font-bold text-muted-foreground/60 tracking-wider px-2 py-1 select-none">
                  Edit
                </div>

                <button
                  onMouseDown={(e) => { e.preventDefault(); handleAskEspadaAction("Improve fluency"); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground/90 hover:bg-[#27272a]/60 transition-colors text-left cursor-pointer"
                >
                  <FileText size={13} className="text-muted-foreground" />
                  <span>Improve fluency</span>
                </button>
                <button
                  onMouseDown={(e) => { e.preventDefault(); handleAskEspadaAction("Simplify"); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground/90 hover:bg-[#27272a]/60 transition-colors text-left cursor-pointer"
                >
                  <Minimize2 size={13} className="text-muted-foreground" />
                  <span>Simplify</span>
                </button>
                <button
                  onMouseDown={(e) => { e.preventDefault(); handleAskEspadaAction("Make longer"); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground/90 hover:bg-[#27272a]/60 transition-colors text-left cursor-pointer"
                >
                  <Maximize2 size={13} className="text-muted-foreground" />
                  <span>Make longer</span>
                </button>

                <div className="text-[10px] font-bold text-muted-foreground/60 tracking-wider px-2 py-1 select-none">
                  Write
                </div>

                <button
                  onMouseDown={(e) => { e.preventDefault(); handleAskEspadaAction("Summarize"); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground/90 hover:bg-[#27272a]/60 transition-colors text-left cursor-pointer"
                >
                  <AlignLeft size={13} className="text-muted-foreground" />
                  <span>Summarize</span>
                </button>
                <button
                  onMouseDown={(e) => { e.preventDefault(); handleAskEspadaAction("Continue"); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground/90 hover:bg-[#27272a]/60 transition-colors text-left cursor-pointer"
                >
                  <Play size={13} className="text-muted-foreground fill-muted-foreground/10" />
                  <span>Continue</span>
                </button>
                <button
                  onMouseDown={(e) => { e.preventDefault(); handleAskEspadaAction("Write opposing argument"); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground/90 hover:bg-[#27272a]/60 transition-colors text-left cursor-pointer"
                >
                  <Scale size={13} className="text-muted-foreground" />
                  <span>Write opposing argument</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Hidden file input for chat resource additions */}
      <input type="file" ref={chatFileInputRef} onChange={handleChatFileSelect} multiple className="hidden" />

      {/* Knowledge selector for chat */}
      <KnowledgeSelectorModal
        isOpen={chatKnowledgeOpen}
        onClose={() => setChatKnowledgeOpen(false)}
        folderId={folderId}
        onSelectMultiple={(fileNames) => {
          fileNames.forEach((name) => addChatResourceItem(name));
          setChatKnowledgeOpen(false);
        }}
      />
    </div>
  );
}

// ── BLOCK LINE INNER WRAPPER COMPONENT ──
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
  onCommitHistory,
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
  onCommitHistory?: () => void;
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

  const handleBlur = () => {
    onCommitHistory?.();
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
        return "text-sm text-[#e4e4e7] leading-relaxed outline-none py-0.5 w-full";
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
        onBlur={handleBlur}
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
        <div className="w-full border-l-4 border-[#3b82f6]/50 bg-[#27272a]/10 px-4 py-2 italic text-muted-foreground rounded-r-xl outline-none">
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
      
      {/* HOVER HELPER BUTTONS */}
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

      {/* SLASH COMMAND BLOCK MENU */}
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
                <span>Bulleted list</span>
              </button>

              <button
                onClick={() => onApplyFormat(line.id, "number")}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
              >
                <ListOrdered size={13} className="text-muted-foreground shrink-0" />
                <span>Numbered list</span>
              </button>

              <button
                onClick={() => onApplyFormat(line.id, "quote")}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
              >
                <Quote size={13} className="text-muted-foreground shrink-0" />
                <span>Quote</span>
              </button>

              <button
                onClick={() => {
                  const defaultTableData = {
                    headers: ["Col 1", "Col 2"],
                    rows: [
                      ["", ""],
                      ["", ""]
                    ],
                    style: "default" as const
                  };
                  if (onUpdateTableData) {
                    onUpdateTableData(line.id, defaultTableData);
                  }
                  onApplyFormat(line.id, "table");
                }}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
              >
                <Table size={13} className="text-muted-foreground shrink-0" />
                <span>Table</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LINE SETTINGS POP-UP */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute top-full left-6 mt-1 w-[180px] rounded-xl border border-border bg-[#1c1c1f] p-1.5 shadow-2xl z-[999] text-left animate-in fade-in"
          >
            <button
              onClick={() => onDuplicateLine(line.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-foreground hover:bg-[#27272a] transition-colors"
            >
              <Copy size={12} className="text-muted-foreground" />
              Duplicate
            </button>
            <button
              onClick={() => onDeleteLine(line.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-foreground hover:bg-[#27272a] transition-colors"
            >
              <Trash2 size={12} className="text-muted-foreground" />
              Delete
            </button>
            <button
              onClick={() => onClearFormatting(line.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-foreground hover:bg-[#27272a] transition-colors"
            >
              <Eraser size={12} className="text-muted-foreground" />
              Clear formatting
            </button>
            <button
              onClick={() => onCopyText(line.text)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-foreground hover:bg-[#27272a] transition-colors"
            >
              <Layers size={12} className="text-muted-foreground" />
              Copy text
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── DOC TABLE BLOCK IMPLEMENTATION ──
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
        <div className="flex items-center gap-1.5 mb-2 py-1 px-2.5 bg-[#18181b] border border-border/80 rounded-xl max-w-max select-none shadow-lg animate-in fade-in zoom-in-95 duration-100 z-[999] absolute -top-11 left-0">
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
                <TableCellEditable
                  key={`header-${line.id}-${colIndex}`}
                  tag="th"
                  value={header}
                  className={thClass}
                  style={{ width: colWidths[colIndex] || 180 }}
                  placeholder="Header"
                  onSave={(val) => handleHeaderBlur(colIndex, val)}
                >
                  {/* COLUMN RESIZER DRAG HANDLE */}
                  <div
                    onMouseDown={(e) => handleColResizeStart(e, colIndex)}
                    className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-[#3b82f6]/40 transition-colors z-20"
                    title="Drag to resize column"
                  />
                </TableCellEditable>
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
                  <TableCellEditable
                    key={`cell-${line.id}-${rowIndex}-${colIndex}`}
                    tag="td"
                    value={cell}
                    className={tdClass}
                    style={{
                      width: colWidths[colIndex] || 180,
                      height: rowHeights[rowIndex] || 42,
                    }}
                    placeholder="Type here..."
                    onSave={(val) => handleCellBlur(rowIndex, colIndex, val)}
                  >
                    {/* ROW RESIZER DRAG HANDLE */}
                    {colIndex === 0 && (
                      <div
                        onMouseDown={(e) => handleRowResizeStart(e, rowIndex)}
                        className="absolute left-0 bottom-0 w-full h-1.5 cursor-row-resize hover:bg-[#3b82f6]/40 transition-colors z-20"
                        title="Drag to resize row"
                      />
                    )}
                  </TableCellEditable>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── TABLE CELL EDITABLE COMPONENT ──
// Uses ref-based DOM sync (like DocLineWrapper) to prevent cursor jumping
function TableCellEditable({
  tag,
  value,
  className,
  style,
  placeholder,
  onSave,
  children,
}: {
  tag: "th" | "td";
  value: string;
  className: string;
  style: React.CSSProperties;
  placeholder?: string;
  onSave: (val: string) => void;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Sync value into DOM only on mount or when value changes externally
  useEffect(() => {
    if (ref.current) {
      const currentText = ref.current.innerText;
      if (currentText !== value) {
        ref.current.innerText = value;
      }
    }
  }, [value]);

  const handleBlur = () => {
    if (ref.current) {
      onSave(ref.current.innerText);
    }
  };

  const Tag = tag;

  return (
    <Tag className={`${className} relative`} style={style}>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        className="w-full h-full outline-none"
        data-placeholder={!value ? (placeholder || "") : ""}
      />
      {children}
    </Tag>
  );
}
