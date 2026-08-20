"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { streamPolish, readStream } from "@/lib/api";
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
  Mic,
  Pause,
  Square,
  AlignJustify,
  Underline,
  Strikethrough,
  MessageCirclePlus
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

// ── SIMULATION TRANSCIPT & NOTES DATA ──
// (Removed — replaced by real Web Speech API implementation below)

// Web Speech API type declarations for cross-browser support
interface SpeechRecognitionType extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventType) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventType) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventType {
  resultIndex: number;
  results: SpeechRecognitionResultListType;
}

interface SpeechRecognitionResultListType {
  length: number;
  [index: number]: SpeechRecognitionResultType;
}

interface SpeechRecognitionResultType {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionErrorEventType {
  error: string;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionType;


export function RecordingView({
  spaceName = "New notes",
  spaceId,
  folderId,
  visibility: initialVisibility = "members",
  initialDraft = "",
  onUpdateVisibility,
  onBack,
}: {
  spaceName?: string;
  spaceId?: string;
  folderId?: string;
  visibility?: "me" | "members" | "public";
  initialDraft?: string;
  onUpdateVisibility?: (vis: "me" | "members" | "public") => void;
  onBack: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Recording State & Variables
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "paused" | "stopping">("idle");
  const [seconds, setSeconds] = useState(0);
  const [liveTranscriptLines, setLiveTranscriptLines] = useState<string[]>([]);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [isPolishing, setIsPolishing] = useState(false);
  const [speechNotSupported, setSpeechNotSupported] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  // Track elapsed recording time (only counts while actively recording)
  const elapsedRef = useRef(0);
  // Track segment start time for each utterance
  const utteranceStartRef = useRef(0);
  // Accumulate raw transcript text since last Stop
  const segmentTranscriptRef = useRef("");
  // Track transcript segments for persistence
  const segmentEntriesRef = useRef<Array<{ startTime: string; endTime: string; text: string }>>([]);

  // Check browser support on mount
  useEffect(() => {
    const SR = (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor; SpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition || (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition;
    if (!SR) {
      setSpeechNotSupported(true);
    }
  }, []);

  // Document lines state & undo/redo stacks
  const [lines, setLines] = useState<DocLine[]>([
    { id: "line-title", text: "New Lecture Notes", type: "h1" },
    { id: "line-empty-1", text: "", type: "plain" }
  ]);
  const [history, setHistory] = useState<DocLine[][]>([
    [
      { id: "line-title", text: "New Lecture Notes", type: "h1" },
      { id: "line-empty-1", text: "", type: "plain" }
    ]
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
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

  // Visibility and Chat Panel States
  const [visibility, setVisibility] = useState(initialVisibility);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(420);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Chat Resources & Focus States
  const [chatUploadOpen, setChatUploadOpen] = useState(false);
  const [chatFocusOpen, setChatFocusOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [chatLinkOpen, setChatLinkOpen] = useState(false);
  const [chatLinkUrl, setChatLinkUrl] = useState("");
  const [chatKnowledgeOpen, setChatKnowledgeOpen] = useState(false);

  const [spaceResources, setSpaceResources] = useState<Resource[]>([
    { id: "res-rec-default", name: "Lecture Outline.pdf", loading: false }
  ]);
  const [focusedResourceIds, setFocusedResourceIds] = useState<string[]>(["res-rec-default"]);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const visibilityRef = useRef<HTMLDivElement>(null);
  const chatUploadRef = useRef<HTMLDivElement>(null);
  const chatFocusRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const askEspadaRef = useRef<HTMLDivElement>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (visibilityRef.current && !visibilityRef.current.contains(target)) {
        setVisibilityOpen(false);
      }
      if (chatUploadRef.current && !chatUploadRef.current.contains(target)) {
        setChatUploadOpen(false);
      }
      if (chatFocusRef.current && !chatFocusRef.current.contains(target)) {
        setChatFocusOpen(false);
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

  // Selection change handler for Ask Espada Popover
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

  // Parse draft text block helper
  const parseTextToLines = (rawText: string): DocLine[] => {
    const paragraphs = rawText.split("\n\n").filter(p => p.trim() !== "");
    if (paragraphs.length === 0) {
      return [{ id: `line-1`, text: "Untitled Notes", type: "h1" }];
    }
    return paragraphs.map((text, idx) => {
      let cleanText = text.trim();
      let type: DocLine["type"] = "plain";
      if (idx === 0) {
        type = "h1";
      }
      return {
        id: `line-init-${idx}-${Date.now()}`,
        text: cleanText,
        type
      };
    });
  };

  // Sync initial draft prop
  useEffect(() => {
    if (initialDraft) {
      const parsed = parseTextToLines(initialDraft);
      setLines(parsed);
      setHistory([parsed]);
      setHistoryIndex(0);
    }
  }, [initialDraft]);

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

  // Selection Add To Chat Action
  const handleAddToChat = () => {
    if (selectedText.trim()) {
      setChatInput((prev) => (prev ? prev + ` "${selectedText.trim()}"` : `Regarding: "${selectedText.trim()}"`));
      setPopupCoords(null);
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
    const isBiologyTopic = clean.toLowerCase().includes("respiration") || clean.toLowerCase().includes("atp") || clean.toLowerCase().includes("mitochondria");
    
    if (isBiologyTopic) {
      switch (option) {
        case "Improve writing":
          return `Cellular respiration primarily relies on mitochondria to synthesize ATP and regulate metabolic homeostasis.`;
        case "Fix spelling & grammar":
          return `Cellular respiration occurs in the mitochondria, which are the main energy powerhouses of the cell.`;
        case "Simplify":
          return `Mitochondria make energy for the cell.`;
        case "Make longer":
          return `Cellular respiration is a crucial metabolic pathway through which cells break down glucose molecules to produce ATP, utilizing glycolysis, the Krebs cycle, and electron transport phosphorylation.`;
        case "Summarize":
          return `Cellular respiration breaks down glucose to produce cellular ATP.`;
        default:
          return clean;
      }
    }

    switch (option) {
      case "Improve writing":
        return `Refined version: ${clean}`;
      case "Simplify":
        return `Simply: ${clean.toLowerCase()}`;
      case "Make longer":
        return `${clean} (Further analysis demonstrates that this process acts as a central hub for all biological operations, expanding on metabolic rates.)`;
      case "Summarize":
        return `Summary: ${clean}`;
      default:
        return clean;
    }
  };

  const handleAskEspadaAction = (option: string) => {
    setIsGenerating(true);
    setTimeout(() => {
      let prompt = askEspadaPrompt;
      let textToUse = selectedText;
      let replacement = "";
      
      if (option === "custom") {
        const lowerPrompt = prompt.toLowerCase();
        if (lowerPrompt.includes("spanish")) {
          replacement = `La respiración celular se produce en las mitocondrias, que producen ATP.`;
        } else {
          replacement = `[Revised based on "${prompt}"]: ${textToUse}`;
        }
      } else {
        replacement = getReplacementText(option, textToUse);
      }

      if (selectedRange) {
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(selectedRange);
      }

      document.execCommand("insertText", false, replacement);

      setIsGenerating(false);
      setShowAskEspadaInput(false);
      setPopupCoords(null);
      setAskEspadaPrompt("");
    }, 1200);
  };

  // Chat Actions
  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const newMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      sender: "user",
      text: chatInput,
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");

    setTimeout(() => {
      const response: ChatMessage = {
        id: `chat-${Date.now() + 1}`,
        sender: "ai",
        text: `Based on your request "${newMsg.text}" and the referenced sources, I recommend reviewing the ATP yield table in glycolysis and Krebs cycle. Let me know if you would like me to adjust it.`,
      };
      setChatMessages((prev) => [...prev, response]);
    }, 1500);
  };

  // Visibility switcher
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
    });
    updateLinesAndHistory(nextLines);
    setActiveSlashLineId(null);
    setActiveMenuLineId(null);

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

  const handleUpdateTableData = (id: string, tableData: DocLine["tableData"]) => {
    const nextLines = lines.map((l) => (l.id === id ? { ...l, tableData } : l));
    updateLinesAndHistory(nextLines);
  };

  // ── REAL WEB SPEECH API RECORDING LOGIC ──
  const formatTime = (totalSec: number) => {
    const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const ss = String(totalSec % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // Elapsed time counter — only counts while recording
  useEffect(() => {
    if (recordingState === "recording") {
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setSeconds(elapsedRef.current);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [recordingState]);

  // Start/Stop speech recognition based on recordingState
  const startRecognition = () => {
    const SR = (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor; SpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition || (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    utteranceStartRef.current = elapsedRef.current;

    recognition.onresult = (event: SpeechRecognitionEventType) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          // Final result — append with timestamp
          const startTime = formatTime(utteranceStartRef.current);
          const endTime = formatTime(elapsedRef.current);
          const timestamped = `${startTime}-${endTime}: ${transcript.trim()}`;
          setLiveTranscriptLines((prev) => [...prev, timestamped]);
          segmentTranscriptRef.current += transcript.trim() + " ";
          segmentEntriesRef.current.push({
            startTime,
            endTime,
            text: transcript.trim(),
          });
          // Reset utterance start for next segment
          utteranceStartRef.current = elapsedRef.current;
          setInterimText("");
        } else {
          interim += transcript;
        }
      }
      if (interim) {
        setInterimText(interim);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventType) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        // These are non-fatal — recognition continues or is expected to stop
        return;
      }
      console.error("[SpeechRecognition] Error:", event.error);
    };

    recognition.onend = () => {
      // Auto-restart if we're still supposed to be recording
      if (recognitionRef.current === recognition) {
        try {
          recognition.start();
        } catch {
          // Already started or disposed
        }
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped
      }
      recognitionRef.current = null;
    }
    setInterimText("");
  };

  // Handle recording state transitions
  const handleStartRecording = () => {
    if (speechNotSupported) return;
    // Reset segment accumulator for a new segment
    segmentTranscriptRef.current = "";
    segmentEntriesRef.current = [];
    setRecordingState("recording");
    startRecognition();
  };

  const handlePauseRecording = () => {
    setRecordingState("paused");
    stopRecognition();
  };

  const handleResumeRecording = () => {
    setRecordingState("recording");
    startRecognition();
  };

  const handleStopRecording = async () => {
    setRecordingState("stopping");
    stopRecognition();

    const rawTranscript = segmentTranscriptRef.current.trim();
    const segments = [...segmentEntriesRef.current];

    // Reset for next segment
    segmentTranscriptRef.current = "";
    segmentEntriesRef.current = [];

    if (!rawTranscript || !spaceId) {
      setRecordingState("idle");
      return;
    }

    // Use streaming polish endpoint for real-time display in editor
    try {
      const response = await fetch("/api/notes/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceId,
          rawText: rawTranscript,
        }),
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        // Add a placeholder line that we'll keep updating
        const placeholderId = `gen-stream-${Date.now()}`;
        setLines((prevLines) => {
          const isEmptyOnly =
            prevLines.length <= 2 &&
            prevLines.every((l) => !l.text.trim() || l.text === "New Lecture Notes");
          const placeholder: DocLine = { id: placeholderId, text: "...", type: "plain" };
          return isEmptyOnly ? [placeholder] : [...prevLines, placeholder];
        });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          // Parse streamed text into lines and update editor in real-time
          const streamedLines = fullText.split("\n").filter(Boolean);
          const parsedLines: DocLine[] = streamedLines.map((line, idx) => {
            let type: DocLine["type"] = "plain";
            let text = line;
            if (line.startsWith("### ")) { type = "h3"; text = line.slice(4); }
            else if (line.startsWith("## ")) { type = "h2"; text = line.slice(3); }
            else if (line.startsWith("# ")) { type = "h1"; text = line.slice(2); }
            else if (line.startsWith("- ") || line.startsWith("• ")) { type = "bullet"; text = line.slice(2); }
            else if (line.startsWith("> ")) { type = "quote"; text = line.slice(2); }
            return { id: `gen-${Date.now()}-${idx}`, text, type };
          });

          setLines((prevLines) => {
            // Remove the placeholder and previous generated lines from this stream
            const base = prevLines.filter(
              (l) => l.id !== placeholderId && !l.id.startsWith("gen-stream-line-")
            );
            const withGenerated = [
              ...base,
              ...parsedLines.map((l, i) => ({ ...l, id: `gen-stream-line-${i}` })),
            ];
            return withGenerated;
          });
        }

        // Final commit — replace stream IDs with stable IDs
        setLines((prevLines) => {
          const final = prevLines.map((l, i) =>
            l.id.startsWith("gen-stream-line-")
              ? { ...l, id: `gen-final-${Date.now()}-${i}` }
              : l
          );
          setTimeout(() => commitLinesToHistory(final), 50);
          return final;
        });

        // Also save transcript segments to the space
        if (segments.length > 0) {
          fetch(`/api/spaces/${spaceId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isConfigured: true }),
          }).catch(() => {});
        }
      } else {
        console.error("[Recording] LLM call failed:", response.status);
      }
    } catch (err) {
      console.error("[Recording] LLM call error:", err);
    }

    setRecordingState("idle");
  };

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      stopRecognition();
    };
  }, []);

  // Scroll transcript container to bottom when text is appended
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [liveTranscriptLines]);

  const handleCopyTranscript = () => {
    if (liveTranscriptLines.length === 0) return;
    const fullText = liveTranscriptLines.map(line => line.replace(/^\[\d{2}:\d{2}\]\s*/, "")).join(" ");
    navigator.clipboard.writeText(fullText);
  };

  const handlePolishNotes = async () => {
    setIsPolishing(true);
    if (recordingState === "recording") {
      handlePauseRecording();
    }

    const rawText = lines.map((l) => l.text).join("\n");

    if (spaceId && rawText.trim()) {
      try {
        // Call the structure endpoint (different from the recording cleaner)
        const response = await fetch("/api/notes/structure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spaceId, rawText }),
        });

        if (!response.ok || !response.body) {
          throw new Error("Polish request failed");
        }

        // Clear existing lines and stream new structured notes in real-time
        setLines([{ id: `polish-placeholder-${Date.now()}`, text: "", type: "plain" }]);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          // Parse and update editor in real-time
          const streamedLines = fullText.split("\n").filter(Boolean);
          const parsedLines: DocLine[] = streamedLines.map((line, idx) => {
            let type: DocLine["type"] = "plain";
            let text = line;
            if (line.startsWith("### ")) { type = "h3"; text = line.slice(4); }
            else if (line.startsWith("## ")) { type = "h2"; text = line.slice(3); }
            else if (line.startsWith("# ")) { type = "h1"; text = line.slice(2); }
            else if (line.startsWith("- ") || line.startsWith("• ")) { type = "bullet"; text = line.slice(2); }
            else if (line.startsWith("> ")) { type = "quote"; text = line.slice(2); }
            return { id: `polish-line-${idx}`, text, type };
          });

          setLines(parsedLines);
        }

        // Final commit with stable IDs
        const finalLines: DocLine[] = fullText.split("\n").filter(Boolean).map((line, idx) => {
          let type: DocLine["type"] = "plain";
          let text = line;
          if (line.startsWith("### ")) { type = "h3"; text = line.slice(4); }
          else if (line.startsWith("## ")) { type = "h2"; text = line.slice(3); }
          else if (line.startsWith("# ")) { type = "h1"; text = line.slice(2); }
          else if (line.startsWith("- ") || line.startsWith("• ")) { type = "bullet"; text = line.slice(2); }
          else if (line.startsWith("> ")) { type = "quote"; text = line.slice(2); }
          return { id: `p-${Date.now()}-${idx}`, text, type };
        });

        if (finalLines.length > 0) {
          updateLinesAndHistory(finalLines);
        }

        setIsPolishing(false);
        return;
      } catch (err) {
        console.error("Polish failed:", err);
      }
    }

    setIsPolishing(false);
  };

  return (
    <div className="flex bg-[#0c0c0d] h-full w-full select-none text-left overflow-hidden relative">

      {/* ── BROWSER SUPPORT CHECK ── */}
      {speechNotSupported && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0c0c0d] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
            <Mic size={28} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-3">Browser Not Supported</h2>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            The Web Speech API is not available in your browser. Please switch to <strong className="text-foreground">Google Chrome</strong> or <strong className="text-foreground">Microsoft Edge</strong> to use the recording feature.
          </p>
          <button
            onClick={onBack}
            className="mt-8 px-6 py-2.5 bg-[#27272a] border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-[#3f3f46] transition-colors cursor-pointer"
          >
            Go back
          </button>
        </div>
      )}

      {/* ── SELECTION POPUP PORTAL ── */}
      {mounted && popupCoords && !showAskEspadaInput && (
        createPortal(
          <div
            style={{
              position: "fixed",
              left: popupCoords.x,
              top: popupCoords.y,
              transform: "translateX(-50%)",
              zIndex: 9999,
              pointerEvents: "auto",
            }}
          >
            <div className="flex items-center bg-[#1c1c1f] border border-border/60 rounded-full shadow-2xl overflow-hidden px-1 py-1 gap-0.5">
              {/* Add to chat */}
              <button
                onMouseDown={(e) => { e.preventDefault(); handleAddToChat(); }}
                className="flex items-center gap-1.5 pl-2.5 pr-3 py-1 rounded-full text-[11px] font-semibold text-foreground/85 hover:bg-[#27272a] transition-colors cursor-pointer whitespace-nowrap"
              >
                <MessageCirclePlus size={13} className="text-foreground/70" />
                Add to chat
              </button>
              {/* Divider */}
              <div className="w-[1px] h-4 bg-border/50 mx-0.5" />
              {/* Bold */}
              <button
                onMouseDown={(e) => { e.preventDefault(); document.execCommand("bold"); }}
                className="w-7 h-7 flex items-center justify-center rounded-full text-foreground/70 hover:bg-[#27272a] hover:text-foreground transition-colors cursor-pointer font-bold text-[13px]"
                title="Bold"
              >
                B
              </button>
              {/* Italic */}
              <button
                onMouseDown={(e) => { e.preventDefault(); document.execCommand("italic"); }}
                className="w-7 h-7 flex items-center justify-center rounded-full text-foreground/70 hover:bg-[#27272a] hover:text-foreground transition-colors cursor-pointer italic text-[13px]"
                title="Italic"
              >
                I
              </button>
              {/* Underline */}
              <button
                onMouseDown={(e) => { e.preventDefault(); document.execCommand("underline"); }}
                className="w-7 h-7 flex items-center justify-center rounded-full text-foreground/70 hover:bg-[#27272a] hover:text-foreground transition-colors cursor-pointer underline text-[13px]"
                title="Underline"
              >
                U
              </button>
              {/* Strikethrough */}
              <button
                onMouseDown={(e) => { e.preventDefault(); document.execCommand("strikeThrough"); }}
                className="w-7 h-7 flex items-center justify-center rounded-full text-foreground/70 hover:bg-[#27272a] hover:text-foreground transition-colors cursor-pointer line-through text-[13px]"
                title="Strikethrough"
              >
                S
              </button>
            </div>
          </div>,
          document.body
        )
      )}
      
      {/* ── LEFT EDITOR PANEL ── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border/40 bg-[#0d0d0e] relative h-full">
        
        {/* Workspace Top Header */}
        <div className="shrink-0 flex items-center justify-between p-6 pb-4 border-b border-border/40 bg-[#0d0d0e] z-10">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Folder size={14} />
            <span>My folder</span>
            <ChevronRight size={12} />
            <Mic size={14} className="text-muted-foreground" />
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
                          <span className="text-xs font-bold text-foreground block">Public</span>
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

          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto p-8 relative" ref={containerRef}>
          {isPolishing && (
            <div className="absolute inset-0 bg-[#0d0d0e]/75 backdrop-blur-md z-30 flex flex-col justify-center items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-muted-foreground animate-pulse tracking-wider">POLISHING LECTURE NOTES...</p>
            </div>
          )}

          <div className="max-w-[700px] mx-auto space-y-4 pb-28">
            {lines.map((line, idx) => {
              const bulletIndex = line.type === "number" ? lineIndexMap[line.id] : undefined;
              return (
                <DocLineWrapper
                  key={line.id}
                  line={line}
                  lineIndex={bulletIndex}
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

        {/* "ESPADA IS TAKING NOTES" FLOATING PILL — shown when recording or processing */}
        <AnimatePresence>
          {(recordingState === "recording" || recordingState === "stopping") && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-[120px] left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#1c1c1f]/95 border border-border/60 rounded-full px-3.5 py-1.5 shadow-xl z-40 backdrop-blur-sm"
            >
              {/* Animated dots */}
              <div className="flex items-center gap-[3px]">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-foreground/70"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                    transition={{
                      duration: 1.1,
                      repeat: Infinity,
                      delay: i * 0.22,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
              <span className="text-[11px] font-semibold text-foreground/85 tracking-tight whitespace-nowrap">
                Espada is taking notes
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FLOATING ACTION TOOLBAR AT THE BOTTOM CENTER OF THE EDITOR */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-[#1c1c1f] border border-border/60 rounded-full px-3 py-2 flex items-center gap-1.5 shadow-2xl z-40">
          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[#27272a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Undo"
          >
            <Undo size={13} />
          </button>
          {/* Redo */}
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[#27272a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Redo"
          >
            <Redo size={13} />
          </button>

          <div className="h-4 w-[1px] bg-border/50 mx-0.5" />

          {/* Transcript Box Popover Toggle Button */}
          <div className="relative">
            <button
              onClick={() => setTranscriptOpen(!transcriptOpen)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full transition-colors cursor-pointer text-xs font-semibold ${
                transcriptOpen ? "bg-[#27272a] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-[#27272a]/60"
              }`}
              title="Toggle Transcript"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={recordingState === "recording" ? "text-red-400" : "text-current"}>
                <path d="M3 10v4M6 6v12M9 10v4M12 3v18M15 8v8M18 5v14M21 10v4" />
              </svg>
              <span className="text-[11px] font-bold opacity-50">^</span>
            </button>

            {/* Transcript Drawer Container */}
            <AnimatePresence>
              {transcriptOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-[380px] bg-[#1c1c1f] border border-border rounded-2xl shadow-2xl p-4 z-50 text-left flex flex-col max-h-[300px] overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2.5 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${recordingState === "recording" ? "bg-red-500 animate-ping" : "bg-muted-foreground"}`} />
                      <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                        {recordingState === "recording" ? `Live Transcription (${formatTime(seconds)})` : "Transcript Box"}
                      </span>
                    </div>
                    <button
                      onClick={handleCopyTranscript}
                      disabled={liveTranscriptLines.length === 0}
                      className="p-1 rounded-lg text-muted-foreground hover:bg-[#27272a] hover:text-foreground transition-colors disabled:opacity-40"
                      title="Copy full transcript"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                  <div ref={transcriptContainerRef} className="flex-1 overflow-y-auto pr-1 text-xs text-muted-foreground leading-relaxed space-y-2 max-h-[220px] select-text">
                    {liveTranscriptLines.length === 0 && !interimText ? (
                      <p className="italic text-center py-6 text-muted-foreground/60">No transcript yet. Press Start Recording below.</p>
                    ) : (
                      <>
                        {liveTranscriptLines.map((line, idx) => (
                          <p key={idx} className="animate-fade-in">{line}</p>
                        ))}
                        {interimText && (
                          <p className="text-muted-foreground/50 italic animate-pulse">{interimText}</p>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-4 w-[1px] bg-border/50 mx-0.5" />

          {/* Recording Control cycle: idle -> recording -> paused -> stopped */}
          {recordingState === "idle" && (
            <button
              onClick={handleStartRecording}
              className="flex items-center gap-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-foreground px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-colors cursor-pointer border border-border/50"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shrink-0 ring-2 ring-[#ef4444]/30" />
              <span>Start recording</span>
            </button>
          )}

          {recordingState === "recording" && (
            <>
              <button
                onClick={handlePauseRecording}
                className="flex items-center gap-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-foreground px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors cursor-pointer border border-border/50"
              >
                <Pause size={12} />
                <span>Pause</span>
              </button>
              <button
                onClick={handleStopRecording}
                className="flex items-center gap-1.5 bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444] px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors cursor-pointer border border-[#ef4444]/30"
              >
                <Square size={10} />
                <span>Stop</span>
              </button>
            </>
          )}

          {recordingState === "paused" && (
            <>
              <button
                onClick={handleResumeRecording}
                className="flex items-center gap-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-foreground px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors cursor-pointer border border-border/50"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shrink-0 ring-2 ring-[#ef4444]/30" />
                <span>Resume</span>
              </button>
              <button
                onClick={handleStopRecording}
                className="flex items-center gap-1.5 bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444] px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors cursor-pointer border border-[#ef4444]/30"
              >
                <Square size={10} />
                <span>Stop</span>
              </button>
            </>
          )}

          {recordingState === "stopping" && (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-semibold text-muted-foreground">
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
              <span>Processing...</span>
            </div>
          )}

          {/* Polish Notes Button */}
          <button
            onClick={handlePolishNotes}
            disabled={isPolishing}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-[#27272a]/60 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPolishing ? (
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <span className="text-[13px] leading-none shrink-0">✦</span>
            )}
            <span>Polish notes</span>
          </button>
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

      {/* ── RIGHT PANEL (ESPADA CHAT PANEL) ── */}
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
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-in fade-in-50 slide-in-from-bottom-2 duration-150`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-[#2f2f33] text-foreground font-medium"
                        : "bg-transparent text-muted-foreground"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat Inputs & File Attachments */}
          <div className="p-3 border-t border-border/40 bg-[#151517] shrink-0 space-y-2 relative">
            
            {/* Target focused resources tags bar */}
            {focusedResourceIds.length > 0 && (
              <div className="flex flex-wrap gap-1 px-1 py-0.5">
                {focusedResourceIds.map((resId) => {
                  const res = spaceResources.find((r) => r.id === resId);
                  if (!res) return null;
                  return (
                    <div
                      key={resId}
                      className="inline-flex items-center gap-1 bg-[#27272a] border border-border/60 text-[10px] text-foreground font-semibold px-2 py-0.5 rounded-lg"
                    >
                      <FileText size={10} className="text-muted-foreground" />
                      <span>{res.name}</span>
                      <button
                        onClick={() => setFocusedResourceIds((prev) => prev.filter((id) => id !== resId))}
                        className="text-muted-foreground hover:text-foreground ml-0.5"
                      >
                        <X size={8} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="relative flex items-end gap-2 bg-[#1c1c1f] border border-border/80 rounded-2xl p-2 focus-within:border-border transition-colors">
              
              {/* Attachment selector dropdown */}
              <div className="relative" ref={chatUploadRef}>
                <button
                  onClick={() => setChatUploadOpen(!chatUploadOpen)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:border-border hover:text-foreground transition-all cursor-pointer"
                  title="Attach references"
                >
                  <Plus size={14} />
                </button>

                <AnimatePresence>
                  {chatUploadOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute bottom-full left-0 mb-2 w-[180px] rounded-xl border border-border bg-[#1c1c1f] p-1 shadow-2xl z-50 text-left"
                    >
                      <button
                        onClick={() => {
                          setChatKnowledgeOpen(true);
                          setChatUploadOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-foreground hover:bg-[#27272a] transition-all"
                      >
                        <FolderHeart size={14} className="text-muted-foreground" />
                        From Knowledge
                      </button>
                      <button
                        onClick={() => {
                          setChatLinkOpen(true);
                          setChatUploadOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-foreground hover:bg-[#27272a] transition-all"
                      >
                        <Link2 size={14} className="text-muted-foreground" />
                        From Link
                      </button>
                      <button
                        onClick={() => {
                          chatFileInputRef.current?.click();
                          setChatUploadOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-foreground hover:bg-[#27272a] transition-all"
                      >
                        <FileUp size={14} className="text-muted-foreground" />
                        From Computer
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Chat Textarea input */}
              <textarea
                ref={chatInputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask Espada..."
                rows={1}
                className="flex-1 bg-transparent border-0 outline-none text-xs text-foreground placeholder-muted-foreground resize-none py-1.5 focus:ring-0 leading-relaxed max-h-[140px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChat();
                  }
                }}
              />

              {/* Target Focus select button */}
              <div className="relative" ref={chatFocusRef}>
                <button
                  onClick={() => setChatFocusOpen(!chatFocusOpen)}
                  className="relative w-7 h-7 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:border-border hover:text-foreground transition-all cursor-pointer"
                  title="Focus specific reference"
                >
                  <AlignJustify size={14} />
                  {focusedResourceIds.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-md bg-[#27272a] border border-border/60 text-[9px] font-bold text-foreground flex items-center justify-center">
                      {focusedResourceIds.length}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {chatFocusOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute bottom-full right-0 mb-2 w-[240px] rounded-xl border border-border bg-[#1c1c1f] p-3 shadow-2xl z-50 text-left"
                    >
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-2.5 px-1">
                        Focus references
                      </span>
                      
                      <div className="space-y-1 max-h-[180px] overflow-y-auto">
                        {spaceResources.map((res) => {
                          const isFocused = focusedResourceIds.includes(res.id);
                          return (
                            <div
                              key={res.id}
                              onClick={() => {
                                setFocusedResourceIds((prev) =>
                                  isFocused ? prev.filter((id) => id !== res.id) : [...prev, res.id]
                                );
                              }}
                              className={`flex items-center justify-between rounded-lg p-2 cursor-pointer transition-colors ${
                                isFocused ? "bg-[#27272a]" : "hover:bg-[#27272a]/40"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText size={13} className="text-muted-foreground shrink-0" />
                                <span className="text-xs text-foreground truncate">{res.name}</span>
                              </div>
                              {isFocused && <CheckCircle size={13} className="text-[#3b82f6] shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit button */}
              <button
                onClick={handleSendChat}
                disabled={!chatInput.trim()}
                className="p-1.5 rounded-lg bg-[#27272a] text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground transition-all cursor-pointer"
              >
                <ArrowUp size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COLLAPSED RIGHT CHAT TRIGGER */}
      {chatCollapsed && (
        <button
          onClick={() => setChatCollapsed(false)}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-[#1c1c1f] border border-border text-muted-foreground hover:text-foreground hover:bg-[#27272a] shadow-xl transition-all duration-150 z-40 cursor-pointer"
          title="Open chat"
        >
          <ChevronsLeft size={16} />
        </button>
      )}

      {/* Links & Modals */}
      <input type="file" ref={chatFileInputRef} onChange={handleChatFileSelect} multiple className="hidden" />

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

  useEffect(() => {
    if (ref.current && ref.current.innerText !== line.text) {
      ref.current.innerText = line.text;
    }
  }, [line.text]);

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
                      ["Value A", "Value B"],
                      ["Value C", "Value D"]
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

      {/* RENDER RESIZABLE TABLE */}
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
