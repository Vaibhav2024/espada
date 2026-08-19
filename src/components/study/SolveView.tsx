"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { generateSolve, streamChat, readStream, uploadKnowledge, addKnowledgeLink, pollAssetStatus } from "@/lib/api";
import { ACCEPTED_FILE_TYPES } from "@/hooks/useResourceUpload";
import { motion, AnimatePresence } from "framer-motion";
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
  Sigma,
  Paperclip,
  ArrowRight,
  Play,
  RotateCcw,
  MessageSquare,
  HelpCircle,
  Hash,
  SendHorizontal,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Edit2,
  Search,
  Menu
} from "lucide-react";
import { KnowledgeSelectorModal } from "./KnowledgeSelector";

interface Resource {
  id: string;
  name: string;
  loading: boolean;
}

interface SolveProblem {
  id: string;
  title: string;
  question: string;
  answer: string;
  steps: string[];
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
}

export function SolveView({
  spaceName,
  spaceId,
  folderId,
  visibility: initialVisibility = "members",
  isConfigured = false,
  onCompleteConfig,
  onUpdateVisibility,
  onBack,
}: {
  spaceName: string;
  spaceId?: string;
  folderId?: string;
  visibility?: "me" | "members" | "public";
  isConfigured?: boolean;
  onCompleteConfig?: (problemName: string) => void;
  onUpdateVisibility?: (vis: "me" | "members" | "public") => void;
  onBack: () => void;
}) {
  // Config state
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const [problemText, setProblemText] = useState("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);

  // Visibility State
  const [visibility, setVisibility] = useState(initialVisibility);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const visibilityRef = useRef<HTMLDivElement>(null);

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

  // Chat Upload Menu and Focus Selector State
  const [chatUploadOpen, setChatUploadOpen] = useState(false);
  const [chatFocusOpen, setChatFocusOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [chatLinkOpen, setChatLinkOpen] = useState(false);
  const [chatLinkUrl, setChatLinkUrl] = useState("");
  const [chatKnowledgeOpen, setChatKnowledgeOpen] = useState(false);
  
  const chatUploadRef = useRef<HTMLDivElement>(null);
  const chatFocusRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Space/Solve resources state
  const [spaceResources, setSpaceResources] = useState<Resource[]>([]);
  const [focusedResourceIds, setFocusedResourceIds] = useState<string[]>([]);

  // Right-click Context Menu State for Problems
  const [problemContextMenu, setProblemContextMenu] = useState<{
    x: number;
    y: number;
    problemId: string;
  } | null>(null);

  const [renameProblemId, setRenameProblemId] = useState<string | null>(null);
  const [renameProblemName, setRenameProblemName] = useState("");
  const [deleteProblemId, setDeleteProblemId] = useState<string | null>(null);

  // Collapsible Chat State
  const [chatCollapsed, setChatCollapsed] = useState(false);
  
  // Problems database state
  const [problems, setProblems] = useState<SolveProblem[]>([]);
  const [activeProblemId, setActiveProblemId] = useState<string | null>(null);
  const [solving, setSolving] = useState(false);

  // Popup overlay to add more problems
  const [showAddPopup, setShowAddPopup] = useState(false);

  // Chat follow-up panel state (per-problem chat messages)
  const [chatMessagesByProblem, setChatMessagesByProblem] = useState<Record<string, ChatMessage[]>>({});
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [solveError, setSolveError] = useState<string | null>(null);

  // Derived: current problem's chat messages
  const chatMessages = activeProblemId ? (chatMessagesByProblem[activeProblemId] || []) : [];

  const addMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load existing problems from DB on mount
  useEffect(() => {
    if (spaceId && isConfigured && problems.length === 0) {
      fetch(`/api/spaces/${spaceId}/problems`)
        .then((res) => res.ok ? res.json() : [])
        .then((data: any[]) => {
          if (data.length > 0) {
            const mapped = data.map((p) => ({
              id: p.id,
              title: p.title,
              question: p.question,
              answer: p.answer || "",
              steps: (p.steps as string[]) || [],
            }));
            setProblems(mapped);
            setActiveProblemId(mapped[0].id);
          }
        })
        .catch(() => {});
    }
  }, [spaceId]);

  // Load chat history (load once when space is configured, assign to first problem)
  const [chatHistoryLoaded, setChatHistoryLoaded] = useState(false);
  useEffect(() => {
    if (spaceId && isConfigured && activeProblemId && !chatHistoryLoaded) {
      setChatHistoryLoaded(true);
      fetch(`/api/spaces/${spaceId}/messages`)
        .then((res) => res.ok ? res.json() : [])
        .then((data: any[]) => {
          if (data.length > 0) {
            const mapped = data.map((m: any) => ({
              id: m.id,
              sender: m.sender,
              text: m.text,
            }));
            setChatMessagesByProblem((prev) => ({
              ...prev,
              [activeProblemId]: mapped,
            }));
          }
        })
        .catch(() => {});
    }
  }, [spaceId, activeProblemId, chatHistoryLoaded]);

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setAddMenuOpen(false);
      }
      if (visibilityRef.current && !visibilityRef.current.contains(event.target as Node)) {
        setVisibilityOpen(false);
      }
      if (chatUploadRef.current && !chatUploadRef.current.contains(event.target as Node)) {
        setChatUploadOpen(false);
      }
      if (chatFocusRef.current && !chatFocusRef.current.contains(event.target as Node)) {
        setChatFocusOpen(false);
      }
      
      const target = event.target as HTMLElement;
      if (target && !target.closest(".problem-context-menu")) {
        setProblemContextMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProblemContextMenu = (e: React.MouseEvent, problemId: string) => {
    e.preventDefault();
    setProblemContextMenu({
      x: e.clientX,
      y: e.clientY,
      problemId
    });
  };

  const handleSaveRenameProblem = () => {
    if (renameProblemId && renameProblemName.trim()) {
      setProblems((prev) =>
        prev.map((p) => (p.id === renameProblemId ? { ...p, title: renameProblemName.trim() } : p))
      );
      setRenameProblemId(null);
      setRenameProblemName("");
    }
  };

  const handleDeleteProblemConfirm = () => {
    if (deleteProblemId) {
      setProblems((prev) => {
        const updated = prev.filter((p) => p.id !== deleteProblemId);
        if (activeProblemId === deleteProblemId) {
          setActiveProblemId(updated.length > 0 ? updated[0].id : null);
        }
        return updated;
      });
      setDeleteProblemId(null);
    }
  };

  const addResourceItem = (name: string) => {
    const newId = `res-${Date.now()}`;
    setResources((prev) => [...prev, { id: newId, name, loading: true }]);
    return newId;
  };

  const addChatResourceItem = (name: string) => {
    const newId = `res-${Date.now()}`;
    setSpaceResources((prev) => [...prev, { id: newId, name, loading: true }]);
    setFocusedResourceIds((prev) => [...prev, newId]);
    setTimeout(() => {
      setSpaceResources((prev) => prev.map((r) => (r.id === newId ? { ...r, loading: false } : r)));
    }, 2000);
  };

  const handleChatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file) => addChatResourceItem(file.name));
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

  // Helper to generate a realistic mockup solution based on the input text/resource
  const solveProblemContent = (textInput: string, resList: Resource[]): SolveProblem => {
    const isAppleQuestion = textInput.toLowerCase().includes("maya") || textInput.toLowerCase().includes("apple");
    
    if (isAppleQuestion || (!textInput.trim() && resList.length > 0)) {
      // Maya Apple Purchase default problem
      return {
        id: `prob-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: "Maya's Apple Purchase",
        question: "Maya buys 2.5 kg of apples at ₹180 per kg. If she gives the shopkeeper a ₹500 note, how much change does she get back?",
        answer: "50",
        steps: [
          "First, we need to calculate the total cost of the apples that Maya is buying. She is purchasing apples at a rate of ₹180 per kg and she buys 2.5 kg. To find the total price, we use the formula: Total Cost = Price per kg x Quantity (kg). Substituting the values: Total Cost = 180 x 2.5",
          "Now let's perform the multiplication to find the total cost. Calculating, we have: Total Cost = 180 x 2.5 = 450. So, the total cost of the apples is ₹450.",
          "Next, to find out how much change Maya receives from the shopkeeper after paying with a ₹500 note, we subtract the total cost from the amount given: Change = Amount given - Total Cost. Here, the amount given is ₹500, so: Change = 500 - 450",
          "Now we perform the subtraction to find the amount of change. Calculating, we have: Change = 500 - 450 = 50. Thus, Maya will receive ₹50 as change."
        ]
      };
    } else {
      // Custom dynamic response based on prompt
      const questionTitle = textInput.trim().slice(0, 24) + (textInput.trim().length > 24 ? "..." : "");
      return {
        id: `prob-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: questionTitle || "Homework Problem Solution",
        question: textInput.trim() || "Analyze the provided resources to calculate the target mathematical expression.",
        answer: "24.5",
        steps: [
          "Identify and extract the numerical coefficients and boundaries stated in the problem criteria.",
          "Model the physical kinematic system using the classic linear motion formulas: v = v_0 + a t or Distance = v_0 t + 1/2 a t^2",
          "Substitute the boundary variables into the expression and isolate the target parameter.",
          "Simplify the fractions to solve the system of equations. Our evaluation gives the final value of 24.5 units."
        ]
      };
    }
  };

  const handleSolveInitial = async () => {
    const isEnabled = activeTab === "upload" ? resources.length > 0 : problemText.trim().length > 0;
    if (!isEnabled || !spaceId) return;

    const sourceText = activeTab === "paste" ? problemText : resources.map(r => r.name).join(", ");
    setSolving(true);
    setSolveError(null);

    try {
      const result = await generateSolve({
        spaceId,
        question: sourceText,
        title: sourceText.slice(0, 60),
      });

      const newProb: SolveProblem = {
        id: result.id,
        title: result.title,
        question: result.question,
        answer: result.answer || "",
        steps: (result.steps as string[]) || [],
      };

      setProblems([newProb]);
      setActiveProblemId(newProb.id);
      setProblemText("");
      setResources([]);
      setSolving(false);

      if (onCompleteConfig) {
        onCompleteConfig(newProb.title);
      }
    } catch (err: any) {
      console.error("Solve failed:", err);
      setSolving(false);
      setSolveError(err?.status === 429 
        ? "Daily AI limit reached. Please try again later or upgrade your plan." 
        : "Failed to solve the problem. Please try again.");
    }
  };

  // State to temporarily hold values inside the "+ Add more problems" popup modal
  const [popupTab, setPopupTab] = useState<"upload" | "paste">("upload");
  const [popupText, setPopupText] = useState("");
  const [popupResources, setPopupResources] = useState<Resource[]>([]);
  const [popupLinkInput, setPopupLinkInput] = useState(false);
  const [popupLinkUrl, setPopupLinkUrl] = useState("");
  const [popupAddMenuOpen, setPopupAddMenuOpen] = useState(false);
  const [popupKnowledgeOpen, setPopupKnowledgeOpen] = useState(false);

  const addPopupResource = (name: string) => {
    const newId = `res-popup-${Date.now()}`;
    setPopupResources((prev) => [...prev, { id: newId, name, loading: true }]);
    setTimeout(() => {
      setPopupResources((prev) => prev.map((r) => (r.id === newId ? { ...r, loading: false } : r)));
    }, 2000);
  };

  const handleAddMoreProblemsSubmit = async () => {
    const isEnabled = popupTab === "upload" ? popupResources.length > 0 : popupText.trim().length > 0;
    if (!isEnabled || !spaceId) return;

    const sourceText = popupTab === "paste" ? popupText : popupResources.map(r => r.name).join(", ");
    setSolving(true);
    setSolveError(null);

    try {
      const result = await generateSolve({
        spaceId,
        question: sourceText,
        title: sourceText.slice(0, 60),
      });

      const newProb: SolveProblem = {
        id: result.id,
        title: result.title || `Problem ${problems.length + 1}`,
        question: result.question,
        answer: result.answer || "",
        steps: (result.steps as string[]) || [],
      };

      setProblems((prev) => [...prev, newProb]);
      setActiveProblemId(newProb.id);
      setPopupText("");
      setPopupResources([]);
      setPopupTab("upload");
      setShowAddPopup(false);
      setSolving(false);
    } catch (err: any) {
      console.error("Solve failed:", err);
      setSolving(false);
      setSolveError(err?.status === 429 
        ? "Daily AI limit reached. Please try again later or upgrade your plan." 
        : "Failed to solve the problem. Please try again.");
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading || !activeProblemId) return;

    const currentProblemId = activeProblemId;

    const userMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      sender: "user",
      text: chatInput.trim()
    };

    setChatMessagesByProblem((prev) => ({
      ...prev,
      [currentProblemId]: [...(prev[currentProblemId] || []), userMsg],
    }));
    const messageText = chatInput.trim();
    setChatInput("");
    setChatLoading(true);

    // Create placeholder AI message for streaming
    const aiMsgId = `chat-${Date.now() + 1}`;
    const aiMsg: ChatMessage = { id: aiMsgId, sender: "ai", text: "" };
    setChatMessagesByProblem((prev) => ({
      ...prev,
      [currentProblemId]: [...(prev[currentProblemId] || []), aiMsg],
    }));

    if (spaceId) {
      try {
        // Include the active problem context in the message for better answers
        const activeProblem = problems.find((p) => p.id === currentProblemId);
        const contextPrefix = activeProblem
          ? `[Context: The student is working on this problem: "${activeProblem.question}" with answer "${activeProblem.answer}"]\n\n`
          : "";

        const response = await streamChat({
          spaceId,
          message: contextPrefix + messageText,
        });
        await readStream(response, (chunk) => {
          setChatMessagesByProblem((prev) => ({
            ...prev,
            [currentProblemId]: (prev[currentProblemId] || []).map((m) =>
              m.id === aiMsgId ? { ...m, text: m.text + chunk } : m
            ),
          }));
        });
      } catch (err: any) {
        console.error("Chat error:", err);
        const errorText = err?.status === 429
          ? "Daily AI limit reached. Please try again later or upgrade your plan."
          : "Sorry, I couldn't process your request. Please try again.";
        setChatMessagesByProblem((prev) => ({
          ...prev,
          [currentProblemId]: (prev[currentProblemId] || []).map((m) =>
            m.id === aiMsgId ? { ...m, text: errorText } : m
          ),
        }));
      } finally {
        setChatLoading(false);
      }
    } else {
      setChatMessagesByProblem((prev) => ({
        ...prev,
        [currentProblemId]: (prev[currentProblemId] || []).map((m) =>
          m.id === aiMsgId ? { ...m, text: "Please solve a problem first to enable chat." } : m
        ),
      }));
      setChatLoading(false);
    }
  };

  // Flag sets if initial Solve setup button is clickable
  const isInitialSolveEnabled = activeTab === "upload" ? resources.length > 0 : problemText.trim().length > 0;

  // Render entry wizard screen
  if (!isConfigured) {
    return (
      <div className="flex flex-col bg-[#0c0c0d] h-full w-full select-none text-left">
        {/* Top Header */}
        <div className="shrink-0 flex items-center justify-between px-8 py-4 border-b border-border/20">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Folder size={13} className="shrink-0" />
            <span>My folder</span>
            <ChevronRight size={12} />
            <Sigma size={13} className="shrink-0" />
            <span className="font-semibold text-foreground">{spaceName}</span>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-[#1c1c1f] hover:bg-[#27272a] px-3 py-1.5 text-xs font-semibold text-foreground transition-colors"
          >
            <X size={13} /> Exit Space
          </button>
        </div>

        {/* Wizard Setup body */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center p-8">
          <div className="w-full max-w-[620px] mt-8">
            <h1 className="text-3xl font-bold text-foreground tracking-tight mb-6">Add a problem</h1>

            {/* Toggle Tabs (Upload / Paste text) */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab("upload")}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-all border ${
                  activeTab === "upload"
                    ? "bg-[#1c1c1f] border-border text-foreground shadow"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Upload
              </button>
              <button
                onClick={() => setActiveTab("paste")}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-all border ${
                  activeTab === "paste"
                    ? "bg-[#1c1c1f] border-border text-foreground shadow"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Paste text
              </button>
            </div>

            {/* Tab content 1: Upload */}
            {activeTab === "upload" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Problems</p>
                  <div className="relative" ref={addMenuRef}>
                    <button
                      onClick={() => setAddMenuOpen((prev) => !prev)}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition-colors"
                    >
                      <Plus size={12} /> Add
                    </button>
                    <AnimatePresence>
                      {addMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="absolute right-0 top-full mt-1.5 w-[170px] rounded-xl border border-border bg-[#1c1c1f] p-1.5 shadow-2xl z-50"
                        >
                          <button
                            onClick={() => {
                              setKnowledgeOpen(true);
                              setAddMenuOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                          >
                            <FolderHeart size={13} className="text-muted-foreground" />
                            From Knowledge
                          </button>
                          <div className="my-1 border-t border-border/40" />
                          <div className="text-[9px] font-bold text-muted-foreground px-2.5 py-0.5 uppercase tracking-wider">
                            Upload new
                          </div>
                          <button
                            onClick={() => {
                              setShowLinkInput(true);
                              setAddMenuOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                          >
                            <Link2 size={13} className="text-muted-foreground" />
                            From link
                          </button>
                          <button
                            onClick={() => {
                              fileInputRef.current?.click();
                              setAddMenuOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                          >
                            <FileUp size={13} className="text-muted-foreground" />
                            From computer
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Inline link input popover */}
                {showLinkInput && (
                  <div className="mb-3 flex gap-2 bg-secondary/20 p-2.5 rounded-xl border border-border">
                    <input
                      type="text"
                      placeholder="Paste link here..."
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
                      className="flex-1 rounded-lg bg-[#18181b] px-3 py-1.5 text-xs text-foreground outline-none border border-border"
                    />
                    <button onClick={handleAddLink} className="rounded-lg bg-foreground text-background px-3 py-1.5 text-xs font-bold">
                      Add
                    </button>
                  </div>
                )}

                {/* Upload display frame */}
                <div className="rounded-2xl border border-border bg-[#131315] p-8 flex flex-col items-center justify-center min-h-[220px] text-center">
                  {resources.length === 0 ? (
                    <div>
                      <p className="text-sm font-semibold text-foreground">Add notes, lectures, textbooks, etc.</p>
                      <p className="text-xs text-muted-foreground mt-1">Add new problems or select existing ones to get started</p>
                      <button
                        onClick={() => setAddMenuOpen(true)}
                        className="mt-4 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] px-4 py-2 text-xs font-semibold text-foreground transition-all"
                      >
                        Add problems
                      </button>
                    </div>
                  ) : (
                    <div className="w-full space-y-2 text-left">
                      {resources.map((res) => (
                        <div key={res.id} className="flex items-center justify-between rounded-xl bg-[#1c1c1f] px-4 py-3 text-xs border border-border/60">
                          <span className="truncate font-semibold text-foreground/85 max-w-[400px]">{res.name}</span>
                          <div className="flex items-center gap-2">
                            {res.loading ? (
                              <span className="text-[10px] text-muted-foreground animate-pulse">Processing...</span>
                            ) : (
                              <Check size={13} className="text-emerald-500" />
                            )}
                            <button
                              onClick={() => setResources((prev) => prev.filter((r) => r.id !== res.id))}
                              className="text-muted-foreground/45 hover:text-destructive transition-colors ml-1"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab content 2: Paste text */}
            {activeTab === "paste" && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Problem</p>
                <textarea
                  rows={8}
                  placeholder="Maya buys 2.5 kg of apples at ₹180 per kg. If she gives the shopkeeper a ₹500 note, how much change does she get back?"
                  value={problemText}
                  onChange={(e) => setProblemText(e.target.value)}
                  className="w-full rounded-2xl bg-[#131315] border border-border p-4 text-sm text-foreground placeholder:text-muted-foreground/35 outline-none resize-none focus:border-border/80 transition-colors"
                />
              </div>
            )}

            {/* Floating solve button on bottom right */}
            <div className="mt-8 flex flex-col items-end gap-2">
              {solveError && (
                <p className="text-xs text-destructive font-medium">{solveError}</p>
              )}
              <button
                disabled={!isInitialSolveEnabled || solving}
                onClick={handleSolveInitial}
                className="rounded-xl bg-foreground text-background px-6 py-2.5 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 cursor-pointer"
              >
                {solving ? (
                  <span className="flex items-center gap-2">
                    <span className="size-3.5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Solving...
                  </span>
                ) : (
                  "Solve"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Hidden inputs & Sub-modals */}
        <KnowledgeSelectorModal
          isOpen={knowledgeOpen}
          onClose={() => setKnowledgeOpen(false)}
          folderId={folderId}
          onSelectMultiple={(fileNames) => {
            fileNames.forEach((name) => addResourceItem(name));
            setKnowledgeOpen(false);
          }}
        />
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" accept={ACCEPTED_FILE_TYPES} />
      </div>
    );
  }

  // Active solution layout (problems list, solved step cards, followup and chat side panel)
  const activeProblem = problems.find((p) => p.id === activeProblemId) || problems[0];

  return (
    <div className="flex bg-[#0c0c0d] h-full w-full select-none text-left overflow-hidden">
      {/* ── LEFT SIDEBAR (PROBLEMS LIST) ── */}
      <div className="w-[220px] shrink-0 border-r border-border/40 flex flex-col bg-[#131315]/50">
        <div className="p-4 border-b border-border/20 flex items-center justify-between">
          <span className="text-xs font-bold text-foreground/80 uppercase tracking-wider">Problems</span>
          <button
            onClick={() => setShowAddPopup(true)}
            className="p-1 rounded-md hover:bg-[#27272a] text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            title="Add more problems"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {problems.map((prob, idx) => (
            <button
              key={prob.id}
              onClick={() => setActiveProblemId(prob.id)}
              onContextMenu={(e) => handleProblemContextMenu(e, prob.id)}
              className={`w-full text-left rounded-xl px-3 py-2 text-xs font-semibold transition-all relative ${
                activeProblem?.id === prob.id
                  ? "bg-[#27272a] text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-[#1c1c1f]"
              }`}
            >
              {prob.title.includes("Problem") ? prob.title : `Problem ${idx + 1}`}
            </button>
          ))}
        </div>
      </div>

      {/* ── CENTER WORKSPACE (ACTIVE PROBLEM DETAIL) ── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border/40 bg-[#0c0c0d]">
        {/* Top Header */}
        <div className="shrink-0 flex items-center justify-between px-8 py-4 border-b border-border/20 bg-[#0c0c0d]">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Folder size={13} />
            <span>My folder</span>
            <ChevronRight size={12} />
            <FileText size={13} />
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
            <button
              onClick={() => setChatCollapsed(!chatCollapsed)}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title={chatCollapsed ? "Expand chat" : "Collapse chat"}
            >
              {chatCollapsed ? <ChevronsLeft size={16} /> : <ChevronsRight size={16} />}
            </button>
          </div>
        </div>

        {/* Solved Steps Center Scroll Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {activeProblem ? (
            <div className="max-w-[620px] mx-auto space-y-6">
              <h2 className="text-2xl font-bold text-foreground">
                {activeProblem.title.includes("Problem") ? activeProblem.title : `Problem 1`}
              </h2>

              {/* Question card */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Question</p>
                <div className="rounded-xl border border-border bg-[#18181b] p-4 text-sm text-foreground/90 leading-relaxed shadow-sm">
                  {activeProblem.question}
                </div>
              </div>

              {/* Answer card */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Answer</p>
                <div className="rounded-xl border border-border bg-[#131315] px-4 py-3 text-base font-bold text-foreground shadow-sm">
                  {activeProblem.answer}
                </div>
              </div>

              {/* Steps card list */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Steps</p>
                <div className="space-y-3">
                  {activeProblem.steps.map((step, sIdx) => (
                    <div
                      key={`step-${sIdx}`}
                      className="rounded-xl border border-border bg-[#18181b]/50 p-4 text-xs text-foreground/90 leading-relaxed shadow-sm space-y-1.5 text-left"
                    >
                      <span className="font-bold text-foreground/75 block">Step {sIdx + 1}</span>
                      <p>{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ask follow up button */}
              <button
                onClick={() => {
                  setChatCollapsed(false);
                  setTimeout(() => {
                    chatInputRef.current?.focus();
                  }, 50);
                }}
                className="w-full mt-6 rounded-xl border border-border bg-[#27272a]/60 hover:bg-[#27272a] px-4 py-3 text-xs font-semibold text-foreground transition-all shadow-md text-center cursor-pointer"
              >
                Ask follow up
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <HelpCircle size={32} className="text-muted-foreground/35 mb-2" />
              <p className="text-sm font-semibold text-foreground">No problem selected</p>
              <p className="text-xs text-muted-foreground mt-0.5">Click the + button inside sidebar to add one</p>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL (ESPADA CHAT PANEL) ── */}
      {!chatCollapsed && (
        <div className="w-[300px] shrink-0 flex flex-col bg-[#131315]/30 border-l border-border/40">
          <div className="p-4 border-b border-border/20 flex items-center justify-between bg-[#131315]/40">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Chat with Espada</span>
          </div>

          {/* Chat message threads */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <MessageSquare size={24} className="text-muted-foreground/30 mb-2" />
                <p className="text-xs font-semibold text-foreground/70">No conversation yet</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Type follow up queries below to request assistance</p>
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

      {/* ── POPUP WIZARD OVERLAY: ADD MORE PROBLEMS ── */}
      {showAddPopup && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setShowAddPopup(false)}
          />

          {/* Dialog Container */}
          <div className="relative z-10 w-full max-w-[450px] rounded-2xl border border-border bg-[#1c1c1f] p-5 shadow-2xl overflow-hidden flex flex-col text-left">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h2 className="text-base font-bold text-foreground">Add more problems</h2>
              <button onClick={() => setShowAddPopup(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {/* Popup Tabs */}
            <div className="flex gap-2 my-4">
              <button
                onClick={() => setPopupTab("upload")}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all border ${
                  popupTab === "upload"
                    ? "bg-[#27272a] border-border text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Upload
              </button>
              <button
                onClick={() => setPopupTab("paste")}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all border ${
                  popupTab === "paste"
                    ? "bg-[#27272a] border-border text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Paste text
              </button>
            </div>

            {/* Popup Tab Content 1: Upload */}
            {popupTab === "upload" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Problems</span>
                  <div className="relative">
                    <button
                      onClick={() => setPopupAddMenuOpen((prev) => !prev)}
                      className="flex items-center gap-1 bg-[#27272a] hover:bg-[#3f3f46] px-2.5 py-1 text-[11px] font-semibold text-foreground transition-all rounded cursor-pointer"
                    >
                      <Plus size={11} /> Add
                    </button>
                    {popupAddMenuOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-[160px] rounded-lg border border-border bg-[#1c1c1f] p-1.5 shadow-2xl z-50">
                        <button
                          onClick={() => {
                            setPopupKnowledgeOpen(true);
                            setPopupAddMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-[#27272a] cursor-pointer"
                        >
                          <FolderHeart size={12} /> From Knowledge
                        </button>
                        <button
                          onClick={() => {
                            setPopupLinkInput(true);
                            setPopupAddMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-[#27272a] cursor-pointer"
                        >
                          <Link2 size={12} /> From link
                        </button>
                        <button
                          onClick={() => {
                            fileInputRef.current?.click();
                            setPopupAddMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-[#27272a] cursor-pointer"
                        >
                          <FileUp size={12} /> From computer
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {popupLinkInput && (
                  <div className="flex gap-1.5 bg-[#131315] p-2 rounded-lg border border-border">
                    <input
                      type="text"
                      placeholder="Paste link here..."
                      value={popupLinkUrl}
                      onChange={(e) => setPopupLinkUrl(e.target.value)}
                      className="flex-1 rounded bg-secondary px-2.5 py-1 text-xs text-foreground outline-none border border-border"
                    />
                    <button
                      onClick={() => {
                        if (popupLinkUrl.trim()) {
                          addPopupResource(popupLinkUrl.trim());
                          setPopupLinkUrl("");
                          setPopupLinkInput(false);
                        }
                      }}
                      className="rounded bg-foreground text-background px-2.5 py-1 text-xs font-bold"
                    >
                      Add
                    </button>
                  </div>
                )}

                <div className="rounded-xl border border-border bg-[#131315] p-4 flex flex-col items-center justify-center min-h-[140px] text-center">
                  {popupResources.length === 0 ? (
                    <div>
                      <p className="text-xs font-semibold text-foreground">Nothing selected</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Upload a PDF, photo, Word document, or Powerpoint presentation</p>
                    </div>
                  ) : (
                    <div className="w-full space-y-1.5 text-left">
                      {popupResources.map((res) => (
                        <div key={res.id} className="flex items-center justify-between rounded bg-[#1c1c1f] px-3 py-2 text-xs border border-border/40">
                          <span className="truncate text-foreground/80 max-w-[280px]">{res.name}</span>
                          <button
                            onClick={() => setPopupResources((prev) => prev.filter((r) => r.id !== res.id))}
                            className="text-muted-foreground/45 hover:text-destructive cursor-pointer"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Popup Tab Content 2: Paste Text */}
            {popupTab === "paste" && (
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Problem</p>
                <textarea
                  rows={4}
                  placeholder="Paste problem content..."
                  value={popupText}
                  onChange={(e) => setPopupText(e.target.value)}
                  className="w-full rounded-xl bg-[#131315] border border-border p-3 text-xs text-foreground placeholder:text-muted-foreground/35 outline-none resize-none focus:border-border/80 transition-colors"
                />
              </div>
            )}

            {/* Popup Action Buttons */}
            <div className="border-t border-border/40 pt-3 mt-4 flex flex-col items-end gap-2">
              {solveError && (
                <p className="text-xs text-destructive font-medium w-full text-right">{solveError}</p>
              )}
              <div className="flex justify-end gap-2 w-full">
              <button
                onClick={() => setShowAddPopup(false)}
                className="rounded-lg border border-border bg-transparent hover:bg-[#27272a] px-4 py-2 text-xs font-semibold text-foreground transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={solving || (popupTab === "upload" ? popupResources.length === 0 : !popupText.trim())}
                onClick={handleAddMoreProblemsSubmit}
                className="rounded-lg bg-foreground hover:opacity-90 px-4 py-2 text-xs font-semibold text-background transition-opacity disabled:opacity-40 cursor-pointer"
              >
                {solving ? (
                  <span className="flex items-center gap-2">
                    <span className="size-3 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Solving...
                  </span>
                ) : (
                  "Solve"
                )}
              </button>
              </div>
            </div>
          </div>

          <KnowledgeSelectorModal
            isOpen={popupKnowledgeOpen}
            onClose={() => setPopupKnowledgeOpen(false)}
            folderId={folderId}
            onSelectMultiple={(fileNames) => {
              fileNames.forEach((name) => addPopupResource(name));
              setPopupKnowledgeOpen(false);
            }}
          />
        </div>,
        document.body
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

      {/* Floating Context Menu for Problems */}
      <AnimatePresence>
        {problemContextMenu && mounted && createPortal(
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{ top: problemContextMenu.y, left: problemContextMenu.x }}
            className="problem-context-menu fixed z-[100] w-[140px] rounded-xl border border-border bg-[#1c1c1f] p-1.5 shadow-2xl text-left"
          >
            <button
              onClick={() => {
                const prob = problems.find((p) => p.id === problemContextMenu.problemId);
                if (prob) {
                  setRenameProblemId(prob.id);
                  setRenameProblemName(prob.title);
                }
                setProblemContextMenu(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors cursor-pointer"
            >
              <Edit2 size={13} className="text-muted-foreground" />
              Rename
            </button>
            <button
              onClick={() => {
                setDeleteProblemId(problemContextMenu.problemId);
                setProblemContextMenu(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              Delete
            </button>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>

      {/* Rename Problem Dialog Modal */}
      <AnimatePresence>
        {renameProblemId && mounted && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRenameProblemId(null)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-[360px] rounded-2xl border border-border bg-[#18181b] p-5 shadow-2xl text-left"
            >
              <h3 className="text-sm font-bold text-foreground">Rename Problem</h3>
              <input
                value={renameProblemName}
                onChange={(e) => setRenameProblemName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveRenameProblem()}
                className="mt-3 w-full rounded-xl bg-secondary/60 border border-border px-3.5 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setRenameProblemId(null)}
                  className="flex-1 rounded-xl bg-secondary/60 hover:bg-secondary px-4 py-2 text-xs font-semibold text-foreground border border-border transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRenameProblem}
                  className="flex-1 rounded-xl bg-foreground text-background hover:opacity-90 px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>

      {/* Delete Problem Confirmation Dialog Modal */}
      <AnimatePresence>
        {deleteProblemId && mounted && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteProblemId(null)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-[360px] rounded-2xl border border-border bg-[#18181b] p-5 shadow-2xl text-left"
            >
              <h3 className="text-sm font-bold text-foreground">Delete Problem</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-normal">
                Are you sure you want to delete this problem?
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setDeleteProblemId(null)}
                  className="flex-1 rounded-xl bg-secondary/60 hover:bg-secondary px-4 py-2 text-xs font-semibold text-foreground border border-border transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProblemConfirm}
                  className="flex-1 rounded-xl bg-destructive hover:bg-destructive/90 px-4 py-2 text-xs font-bold text-destructive-foreground transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
}
