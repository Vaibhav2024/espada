"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { generateFlashcards, fetchKnowledgeItems, addSpaceResource, fetchFlashcards } from "@/lib/api";
import {
  Layers, ChevronRight, X, Play, Sparkles, Pencil, Trash2, Check, Plus, Folder, Globe,
  GripVertical, FileText, Link2, FileUp, FolderHeart, ChevronDown, User, Users, RotateCcw,
  ArrowLeft, ArrowRight, Shuffle
} from "lucide-react";
import { KnowledgeSelectorModal } from "./KnowledgeSelector";
import { type VisibilityType } from "./SpaceWizard";

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface Resource {
  id: string;
  name: string;
  loading: boolean;
}

function makeDemoCards(topic: string, count: number): Flashcard[] {
  const t = topic.trim().toLowerCase();
  const res: Flashcard[] = [];
  const templates = [
    { front: "What is the primary role of a Co-Founder?", back: "Leading product strategy, engineering operations, and aligning technical milestones with business growth." },
    { front: "MERN Stack Components", back: "MongoDB (Database), Express.js (Backend), React.js (Frontend), and Node.js (Runtime environment)." },
    { front: "Next.js rendering methods", back: "Server-side rendering (SSR), Static Site Generation (SSG), Incremental Static Regeneration (ISR), and Client-side rendering (CSR)." },
    { front: "State vs Props", back: "State is local mutable data managed within the component; props are read-only inputs passed by parents." },
    { front: "What role does Vaibhav Patil serve at Lanzzer?", back: "Co-Founder & Tech Lead" },
    { front: "In the Urban Loom project, which payment gateways were integrated?", back: "Stripe and Razorpay" },
    { front: "What is a core concept Vaibhav understands related to programming?", back: "Async Programming" },
    { front: "LaTeX Equation example", back: "To use LaTeX, start and end with $$ like this: $$E=mc^2$$" }
  ];

  for (let i = 0; i < count; i++) {
    const tmpl = templates[i % templates.length]!;
    res.push({
      id: `fc-${Date.now()}-${i}`,
      front: tmpl.front,
      back: tmpl.back
    });
  }
  return res;
}

export function FlashcardsView({
  spaceName,
  spaceId,
  folderId,
  visibility: initialVisibility = "public",
  isConfigured: initialConfigured = false,
  onCompleteConfig,
  onUpdateVisibility,
  onBack,
}: {
  spaceName: string;
  spaceId?: string;
  folderId?: string;
  visibility?: VisibilityType;
  isConfigured?: boolean;
  onCompleteConfig: () => void;
  onUpdateVisibility?: (vis: VisibilityType) => void;
  onBack: () => void;
}) {
  const [isConfigured, setIsConfigured] = useState(initialConfigured);
  const [visibility, setVisibility] = useState<VisibilityType>(initialVisibility);
  const [visOpen, setVisOpen] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);

  // AI Generator Modal State
  const [showWizard, setShowWizard] = useState(!initialConfigured);
  const [resources, setResources] = useState<Resource[]>([]);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [maxAmount, setMaxAmount] = useState("10");
  const [topic, setTopic] = useState("");
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Practice State
  const [playing, setPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [practiceCards, setPracticeCards] = useState<Flashcard[]>([]);
  const [knowCards, setKnowCards] = useState<Record<string, boolean>>({});

  // Drag & Drop State
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load existing flashcards from DB on mount (for configured spaces on page refresh)
  useEffect(() => {
    if (spaceId && initialConfigured && cards.length === 0) {
      fetchFlashcards(spaceId)
        .then((result) => {
          if (result.length > 0) {
            setCards(result.map((c) => ({ id: c.id, front: c.front, back: c.back })));
          }
        })
        .catch(() => {});
    }
  }, [spaceId]);

  const addMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setAddMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSetVisibility = (vis: VisibilityType) => {
    setVisibility(vis);
    setVisOpen(false);
    onUpdateVisibility?.(vis);
  };

  // Add referenced resource items
  const addResourceItem = (name: string) => {
    const id = `res-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const newRes: Resource = { id, name, loading: true };
    setResources((prev) => [...prev, newRes]);
    setTimeout(() => {
      setResources((prev) =>
        prev.map((r) => (r.id === id ? { ...r, loading: false } : r))
      );
    }, 2000);
  };

  const handleAddLink = () => {
    if (linkUrl.trim()) {
      addResourceItem(`Link: ${linkUrl.trim()}`);
      setLinkUrl("");
      setShowLinkInput(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file) => addResourceItem(file.name));
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const count = Math.min(parseInt(maxAmount) || 10, 100);

    if (spaceId) {
      try {
        const result = await generateFlashcards({
          spaceId,
          folderId,
          count,
          topic: topic || undefined,
        });
        setCards(result.map((c) => ({ id: c.id, front: c.front, back: c.back })));
        setGenerating(false);
        setShowWizard(false);
        setIsConfigured(true);
        onCompleteConfig();
        return;
      } catch (err) {
        console.error("Failed to generate flashcards:", err);
        setGenerating(false);
      }
    } else {
      // Fallback if no spaceId
      setGenerating(false);
    }
  };

  // Drag and Drop Logic
  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDrop = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    setCards((prev) => {
      const next = [...prev];
      const [removed] = next.splice(draggedIdx, 1);
      next.splice(targetIdx, 0, removed);
      return next;
    });
    setDraggedIdx(null);
  };

  // CRUD Actions
  const handleAddBlankCard = () => {
    const newCard: Flashcard = {
      id: `fc-blank-${Date.now()}`,
      front: "",
      back: ""
    };
    setCards((prev) => [...prev, newCard]);
  };

  const handleDeleteCard = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const handleCardChange = (id: string, field: "front" | "back", val: string) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: val } : c)));
  };

  const visLabel = visibility === "me" ? "Just me" : visibility === "members" ? "Folder Members" : "Public";

  // ── STUDY SLIDE PLAYER VIEW ──────────────────────────────────────────────────
  if (playing && practiceCards.length > 0) {
    const card = practiceCards[currentIndex]!;
    const hasNext = currentIndex < practiceCards.length - 1;

    const knowCount = Object.values(knowCards).filter(v => v === true).length;
    const dontKnowCount = Object.values(knowCards).filter(v => v === false).length;
    const attemptedCount = Object.keys(knowCards).length;

    const advance = (known: boolean) => {
      setKnowCards(p => ({ ...p, [card.id]: known }));
      setFlipped(false);
      if (hasNext) {
        setCurrentIndex((prev) => prev + 1);
      }
    };

    const handlePrevCard = () => {
      if (currentIndex > 0) {
        setFlipped(false);
        setCurrentIndex(prev => prev - 1);
      }
    };

    const handleNextCard = () => {
      if (hasNext) {
        setFlipped(false);
        setCurrentIndex(prev => prev + 1);
      }
    };

    const handleShuffle = () => {
      const shuffled = [...practiceCards].sort(() => Math.random() - 0.5);
      setPracticeCards(shuffled);
      setCurrentIndex(0);
      setFlipped(false);
      setKnowCards({});
    };

    return (
      <div className="flex flex-col bg-[#0c0c0d] h-full w-full select-none text-left">
        {/* Top Header */}
        <div className="shrink-0 flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Folder size={13} className="shrink-0"/>
            <span>My folder</span>
            <ChevronRight size={12}/>
            <Layers size={13} className="shrink-0"/>
            <span className="font-semibold text-foreground">{spaceName}</span>
          </div>
          <button onClick={() => setPlaying(false)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-[#1c1c1f] hover:bg-[#27272a] px-3 py-1.5 text-xs font-semibold text-foreground transition-colors">
            <X size={13}/> Exit Practice
          </button>
        </div>

        {/* Card Flip Body */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-[500px]">
            
            {/* Live attempted counts badges */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400 border border-emerald-500/15">
                  <Check size={11}/> Know: {knowCount}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-400 border border-red-500/15">
                  <X size={11}/> Don&#39;t Know: {dontKnowCount}
                </span>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">Attempted: {attemptedCount} / {practiceCards.length}</span>
            </div>

            {/* Flip container */}
            <div
              className="[perspective:1400px] cursor-pointer select-none h-64 w-full"
              onClick={() => setFlipped((f) => !f)}
            >
              <motion.div
                className="relative h-full w-full [transform-style:preserve-3d]"
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Front Side */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl border bg-[#18181b] p-8 text-center [backface-visibility:hidden] transition-colors duration-300 ${
                  knowCards[card.id] === true ? "border-emerald-500/60" : knowCards[card.id] === false ? "border-destructive/60" : "border-border"
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Term</span>
                  <span className="mt-4 text-xl font-bold text-foreground leading-snug">{card.front || "Empty Term"}</span>
                  <span className="mt-6 text-[10px] text-muted-foreground font-semibold">Click card to reveal definition</span>
                </div>
                {/* Back Side */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl border bg-[#27272a]/30 p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)] transition-colors duration-300 ${
                  knowCards[card.id] === true ? "border-emerald-500/60" : knowCards[card.id] === false ? "border-destructive/60" : "border-border"
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Definition</span>
                  <span className="mt-4 text-base leading-relaxed text-foreground/90">{card.back || "Empty Definition"}</span>
                </div>
              </motion.div>
            </div>

            {/* Player Controls */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={() => advance(false)}
                className="inline-flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 hover:bg-destructive/20 px-6 py-3 text-sm font-semibold text-foreground transition-colors"
              >
                <X size={15} /> Don&#39;t know
              </button>
              <button
                onClick={() => setFlipped((f) => !f)}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-[#1c1c1f] hover:bg-[#27272a] px-5 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw size={14} /> Flip
              </button>
              <button
                onClick={() => advance(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-6 py-3 text-sm font-semibold text-emerald-400 transition-colors"
              >
                <Check size={15} /> Know
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Navigation & Shuffle Bar Block */}
        <div className="shrink-0 border-t border-[#1e1e21] bg-[#0c0c0d] px-8 py-5 flex flex-col items-center">
          <div className="flex items-center rounded-xl bg-[#18181b] border border-border p-1.5 shadow-xl text-sm font-semibold">
            {/* Prev Arrow */}
            <button
              onClick={handlePrevCard}
              disabled={currentIndex === 0}
              className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
            >
              <ArrowLeft size={16}/>
            </button>
            
            {/* Page Count Info */}
            <span className="mx-4 text-xs font-bold text-foreground min-w-[60px] text-center">
              {currentIndex + 1} of {practiceCards.length}
            </span>

            {/* Next Arrow */}
            <button
              onClick={handleNextCard}
              disabled={!hasNext}
              className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
            >
              <ArrowRight size={16}/>
            </button>

            {/* Separator line */}
            <div className="mx-2.5 w-px h-4 bg-border"/>

            {/* Shuffle button */}
            <button
              onClick={handleShuffle}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              title="Shuffle flashcards"
            >
              <Shuffle size={15}/>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN FLASHCARDS VIEW (EDITOR STATE) ──────────────────────────────────────
  return (
    <div className="flex flex-col bg-[#0c0c0d] h-full w-full select-none text-left">
      {/* ── TOP BREADCRUMB ── */}
      <div className="shrink-0 flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Folder size={13} className="shrink-0"/>
          <span>My folder</span>
          <ChevronRight size={12}/>
          <Layers size={13} className="shrink-0"/>
          <span className="font-semibold text-foreground truncate max-w-[200px]">{spaceName}</span>
        </div>
        
        {/* Interactive Visibility Button */}
        <div className="relative">
          <button
            onClick={() => setVisOpen(v => !v)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider cursor-pointer"
          >
            <Globe size={12}/>
            <span>{visLabel}</span>
            <ChevronDown size={10}/>
          </button>
          <AnimatePresence>
            {visOpen && (
              <motion.div
                initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                className="absolute right-0 mt-2 w-[260px] rounded-[18px] border border-border bg-[#1c1c1f] p-4 shadow-2xl z-50"
              >
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-3">Who can access this space?</span>
                <div className="space-y-2">
                  {(["me","members","public"] as VisibilityType[]).map((v) => {
                    const label = v==="me"?"Just me":v==="members"?"Members in this folder":"Anyone on the web";
                    const sub = v==="me"?"Only you can view and edit":v==="members"?"1 member can view and edit":"Anyone can view, only you can edit";
                    return (
                      <div key={v} onClick={()=>handleSetVisibility(v)}
                        className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-colors ${
                          visibility===v?"border-foreground bg-[#27272a]/40":"border-border/80 hover:bg-[#27272a]/20"
                        }`}>
                        <div className="flex size-4 items-center justify-center rounded-full border border-muted-foreground shrink-0 mt-0.5">
                          {visibility===v && <div className="size-1.5 rounded-full bg-foreground"/>}
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
      </div>

      {/* ── SCROLLABLE LIST OF CARDS ── */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-[720px] pb-24">
          <h1 className="text-3xl font-semibold text-foreground mb-8 tracking-tight">{spaceName}</h1>

          {cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border/80 bg-secondary/10">
              <Layers size={36} className="text-muted-foreground/40 mb-3"/>
              <p className="text-sm font-semibold text-foreground">No flashcards yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Click below to add a blank card or generate with AI</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cards.map((c, i) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(i)}
                  className={`rounded-2xl border border-border bg-[#18181b] overflow-hidden transition-shadow ${
                    draggedIdx === i ? "opacity-40 border-dashed" : ""
                  }`}
                >
                  {/* Card Header Row */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-secondary/20">
                    <div className="flex items-center gap-2">
                      <div className="cursor-grab active:cursor-grabbing text-muted-foreground/45 hover:text-foreground">
                        <GripVertical size={13}/>
                      </div>
                      <span className="text-xs font-bold text-foreground">{i + 1}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteCard(c.id)}
                      className="text-muted-foreground/40 hover:text-destructive transition-colors"
                    >
                      <Trash2 size={12}/>
                    </button>
                  </div>

                  {/* Card Columns */}
                  <div className="grid grid-cols-2 divide-x divide-border/60">
                    {/* Front Column */}
                    <div className="p-4">
                      <textarea
                        rows={4}
                        placeholder="Enter term"
                        value={c.front}
                        onChange={(e) => handleCardChange(c.id, "front", e.target.value)}
                        className="w-full h-full bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground/35 resize-none"
                      />
                    </div>
                    {/* Back Column */}
                    <div className="p-4">
                      <textarea
                        rows={4}
                        placeholder="Enter definition. To use LaTeX, start and end with $$ like this: $$E=mc^2$$"
                        value={c.back}
                        onChange={(e) => handleCardChange(c.id, "back", e.target.value)}
                        className="w-full h-full bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground/35 resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add flashcard button */}
          <button
            onClick={handleAddBlankCard}
            className="w-full mt-5 rounded-xl border border-border bg-[#27272a]/60 hover:bg-[#27272a] px-4 py-3 text-xs font-semibold text-foreground transition-colors"
          >
            Add flashcard
          </button>
        </div>
      </div>

      {/* ── FLOATING PILL BUTTONS (FIXED AT THE BOTTOM) ── */}
      <div className="sticky bottom-6 mt-8 flex justify-center pb-2 shrink-0 z-40">
        <div className="flex items-center rounded-full bg-[#18181b] border border-border p-1 shadow-2xl">
          <button
            onClick={() => {
              if (cards.length > 0) {
                setPracticeCards([...cards]);
                setKnowCards({});
                setCurrentIndex(0);
                setFlipped(false);
                setPlaying(true);
              }
            }}
            disabled={cards.length === 0}
            className="flex items-center gap-2 rounded-full bg-secondary/80 hover:bg-secondary disabled:opacity-50 disabled:hover:bg-secondary/80 px-5 py-2.5 text-xs font-semibold text-foreground transition-colors"
          >
            <Play size={13} className="fill-current"/>Practice
          </button>
          <div className="mx-2 h-5 w-px bg-border"/>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 rounded-full hover:bg-secondary/40 px-5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <Sparkles size={13}/>Generate with AI
          </button>
        </div>
      </div>

      {/* ── GENERATE AI MODAL OVERLAY ── */}
      {mounted && createPortal(
        <AnimatePresence>
          {showWizard && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/75 backdrop-blur-sm"
                onClick={() => {
                  if (isConfigured) setShowWizard(false);
                  else onBack();
                }}
              />
              
              <motion.div
                initial={{opacity:0,scale:0.96,y:8}}
                animate={{opacity:1,scale:1,y:0}}
                exit={{opacity:0,scale:0.96,y:8}}
                className="relative z-10 w-full max-w-[420px] rounded-2xl border border-border bg-[#1c1c1f] p-5 shadow-2xl overflow-hidden flex flex-col text-left"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <h2 className="text-base font-bold text-foreground">Generate flashcards with AI</h2>
                  <button
                    onClick={() => {
                      if (isConfigured) setShowWizard(false);
                      else onBack();
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X size={16}/>
                  </button>
                </div>

                {/* Loader overlay during generation */}
                {generating && (
                  <div className="absolute inset-0 bg-[#1c1c1f]/95 z-50 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-10 h-10 border-4 border-foreground border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-sm font-semibold text-foreground">Generating deck...</p>
                    <p className="text-xs text-muted-foreground mt-1">Espada is processing your topic and materials</p>
                  </div>
                )}

                {/* Modal Scrollable Contents */}
                <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {/* Resources Panel */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5" ref={addMenuRef}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Resources to reference</p>
                      <div className="relative">
                        <button
                          onClick={() => setAddMenuOpen(prev => !prev)}
                          className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition-colors"
                        >
                          <Plus size={12}/> Add
                        </button>
                        <AnimatePresence>
                          {addMenuOpen && (
                            <motion.div
                              initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:4}}
                              className="absolute right-0 top-full mt-1.5 w-[170px] rounded-xl border border-border bg-[#1c1c1f] p-1.5 shadow-2xl z-50"
                            >
                              <button
                                onClick={() => { setKnowledgeOpen(true); setAddMenuOpen(false); }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                              >
                                <FolderHeart size={13} className="text-muted-foreground" />
                                From Knowledge
                              </button>
                              <div className="my-1 border-t border-border/40" />
                              <div className="text-[9px] font-bold text-muted-foreground px-2.5 py-0.5 uppercase tracking-wider">Upload new</div>
                              <button
                                onClick={() => { setShowLinkInput(true); setAddMenuOpen(false); }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                              >
                                <Link2 size={13} className="text-muted-foreground" />
                                From link
                              </button>
                              <button
                                onClick={() => { fileInputRef.current?.click(); setAddMenuOpen(false); }}
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
                          placeholder="Paste link link here..."
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
                          className="flex-1 rounded-lg bg-[#18181b] px-3 py-1.5 text-xs text-foreground outline-none border border-border focus:ring-1 focus:ring-ring"
                        />
                        <button onClick={handleAddLink} className="rounded-lg bg-foreground text-background px-3 py-1.5 text-xs font-bold">Add</button>
                      </div>
                    )}

                    {/* Resources display container */}
                    <div className="rounded-xl border border-border bg-[#131315] p-4 flex flex-col items-center justify-center min-h-[120px]">
                      {resources.length === 0 ? (
                        <div className="text-center">
                          <p className="text-xs font-semibold text-foreground">Nothing selected</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Espada will reference the resources you select</p>
                        </div>
                      ) : (
                        <div className="w-full space-y-1.5">
                          {resources.map(res => (
                            <div key={res.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2 text-xs">
                              <span className="truncate font-semibold text-foreground/80 max-w-[280px]">{res.name}</span>
                              <div className="flex items-center gap-2">
                                {res.loading ? (
                                  <span className="text-[10px] text-muted-foreground animate-pulse">Embedding...</span>
                                ) : (
                                  <Check size={12} className="text-emerald-500"/>
                                )}
                                <button onClick={() => setResources(prev => prev.filter(r => r.id !== res.id))} className="text-muted-foreground/40 hover:text-destructive transition-colors">
                                  <Trash2 size={11}/>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Max Amount */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Max Amount</p>
                    <input
                      type="number"
                      value={maxAmount}
                      min={1}
                      max={100}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="w-full rounded-xl bg-secondary/60 border border-border px-3.5 py-2.5 text-sm text-foreground outline-none focus:bg-secondary/80 transition-colors"
                    />
                    <p className="text-[9px] text-muted-foreground mt-1">Maximum 100 flashcards per generation.</p>
                  </div>

                  {/* Topic Text box */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Topic</p>
                    <textarea
                      rows={3}
                      placeholder="What should your flashcards be about?"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full rounded-xl bg-secondary/60 border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/35 outline-none resize-none focus:bg-secondary/80 transition-colors"
                    />
                  </div>
                </div>

                {/* Generate Button */}
                <div className="border-t border-border/40 pt-3 mt-4 flex justify-end">
                  <button
                    onClick={handleGenerate}
                    disabled={generating || resources.length === 0 || resources.some(r => r.loading)}
                    className="rounded-xl bg-foreground hover:opacity-90 px-6 py-2.5 text-xs font-semibold text-background transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
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
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <KnowledgeSelectorModal
        isOpen={knowledgeOpen}
        onClose={() => setKnowledgeOpen(false)}
        folderId={folderId}
        onSelectMultiple={async (fileNames) => {
          // Mark as ready immediately (already embedded)
          fileNames.forEach((name) => {
            const newId = `res-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
            setResources((prev) => [...prev, { id: newId, name, loading: false }]);
          });
          setKnowledgeOpen(false);

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
              console.error("Failed to link resources:", err);
            }
          }
        }}
      />

      {/* Hidden file input for file upload selector */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        className="hidden"
      />
    </div>
  );
}
