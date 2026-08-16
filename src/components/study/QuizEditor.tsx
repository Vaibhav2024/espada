"use client";
import { useState } from "react";
import {
  Folder, ChevronRight, ChevronDown, ListChecks, Globe, User, Users,
  Plus, Play, Sparkles, Eye, EyeOff, Pencil, Trash2, X, Check, GripVertical, HelpCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { type VisibilityType } from "./SpaceWizard";

export type QuestionType = "multiple-choice" | "short-answer" | "true-false" | "fill-in-blank";

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctOptions?: number[];
  exampleAnswer?: string;
  matchMode?: string;
  answer?: string;
}

function makeDemoQuestions(name: string): QuizQuestion[] {
  return [
    {
      id: "q1", type: "multiple-choice",
      question: `What is the primary goal of ${name}?`,
      options: ["Option A — First possibility", "Option B — Second possibility", "Option C — Correct answer", "Option D — Another option"],
      correctOptions: [2],
    },
    {
      id: "q2", type: "short-answer",
      question: "Explain the key concepts covered in this topic and their real-world applications.",
      exampleAnswer: "A comprehensive answer covering the main points with clear examples.",
      matchMode: "Has exact same meaning, can be phrased differently",
    },
    {
      id: "q3", type: "true-false",
      question: "The fundamental principles discussed in this subject are universally applicable.",
      options: ["True", "False"], correctOptions: [0],
    },
    {
      id: "q4", type: "fill-in-blank",
      question: "The primary component of this system consists of _____ main elements.",
      answer: "four",
    },
    {
      id: "q5", type: "multiple-choice",
      question: "Which factors contribute to overall effectiveness? Select all that apply.",
      options: ["Factor A", "Factor B", "Factor C", "Factor D"],
      correctOptions: [0, 2],
    },
    {
      id: "q6", type: "true-false",
      question: "Modern implementations always require external dependencies to function.",
      options: ["True", "False"], correctOptions: [1],
    },
    {
      id: "q7", type: "fill-in-blank",
      question: "The process of optimizing performance involves reducing _____ while maximizing throughput.",
      answer: "latency",
    },
  ];
}

const MATCH_MODES = [
  "Has exact same meaning, can be phrased differently",
  "Exact wording required",
  "Contains key terms",
];

function typeLabel(t: QuestionType) {
  if (t === "multiple-choice") return "Multiple choice";
  if (t === "short-answer") return "Short response";
  if (t === "true-false") return "True or false";
  return "Fill in the blank";
}

// ── Question body (options / answer reveal) ─────────────────────────────────
function QuestionBody({ q, show }: { q: QuizQuestion; show: boolean }) {
  if (q.type === "multiple-choice") {
    return (
      <div className="mt-3 space-y-1.5">
        {(q.options ?? []).map((opt, i) => {
          const ok = (q.correctOptions ?? []).includes(i);
          return (
            <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${show && ok ? "bg-emerald-500/15 text-emerald-400 font-medium" : "text-foreground/80"}`}>
              <span className="shrink-0 text-xs text-muted-foreground w-4">{String.fromCharCode(65+i)})</span>
              <span className="flex-1">{opt}</span>
              {show && ok && <Check size={12} className="text-emerald-400 shrink-0" />}
            </div>
          );
        })}
      </div>
    );
  }
  if (q.type === "true-false") {
    return (
      <div className="mt-3 space-y-1.5">
        {["True","False"].map((lbl,i) => {
          const ok = (q.correctOptions ?? []).includes(i);
          return (
            <div key={lbl} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${show && ok ? "bg-emerald-500/15 text-emerald-400 font-medium" : "text-foreground/80"}`}>
              <span className="flex-1">{lbl}</span>
              {show && ok && <Check size={12} className="text-emerald-400 shrink-0" />}
            </div>
          );
        })}
      </div>
    );
  }
  if (q.type === "fill-in-blank" && show) {
    return (
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm font-semibold text-emerald-400">
        <Check size={12} />{q.answer}
      </div>
    );
  }
  if (q.type === "short-answer" && show && q.exampleAnswer) {
    return (
      <div className="mt-3 rounded-lg bg-secondary/50 px-3 py-2.5 text-sm text-foreground/80">
        <span className="text-xs font-semibold text-muted-foreground block mb-1">Example answer:</span>
        {q.exampleAnswer}
      </div>
    );
  }
  return null;
}

// ── Custom dark type selector ────────────────────────────────────────────────
const TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: "multiple-choice", label: "Multiple choice" },
  { value: "true-false",      label: "True or false" },
  { value: "short-answer",    label: "Short response" },
  { value: "fill-in-blank",   label: "Fill in the blank" },
];

function TypeSelect({ value, onChange }: { value: QuestionType; onChange: (t: QuestionType) => void }) {
  const [open, setOpen] = useState(false);
  const label = TYPE_OPTIONS.find(o => o.value === value)?.label ?? value;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between rounded-xl bg-secondary/60 border border-border px-3 py-2.5 text-sm text-foreground outline-none cursor-pointer hover:bg-secondary/80 transition-colors"
      >
        <span>{label}</span>
        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}/>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-[#1c1c1f] py-1 shadow-2xl"
          >
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors hover:bg-secondary/50 ${value === opt.value ? "text-foreground font-semibold" : "text-muted-foreground"}`}
              >
                {value === opt.value && <Check size={12} className="text-foreground shrink-0"/>}
                {value !== opt.value && <span className="w-3 shrink-0"/>}
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Edit / Add modal ────────────────────────────────────────────────────────

function EditModal({ question, onSave, onClose }: {
  question: QuizQuestion | null;
  onSave: (q: QuizQuestion) => void;
  onClose: () => void;
}) {
  const isNew = question === null;
  const [type, setType] = useState<QuestionType>(question?.type ?? "multiple-choice");
  const [text, setText] = useState(question?.question ?? "");
  const [opts, setOpts] = useState<string[]>(
    (question?.type === "true-false") ? ["True","False"] :
    (question?.options ?? ["",""]) 
  );
  const [correct, setCorrect] = useState<number[]>(question?.correctOptions ?? []);
  const [exAns, setExAns] = useState(question?.exampleAnswer ?? "");
  const [matchMode, setMatchMode] = useState(question?.matchMode ?? MATCH_MODES[0]);
  const [answer, setAnswer] = useState(question?.answer ?? "");

  const onTypeChange = (t: QuestionType) => {
    setType(t);
    setCorrect([]);
    if (t === "true-false") setOpts(["True","False"]);
    else if (t === "multiple-choice" && opts.length < 2) setOpts(["",""]);
  };

  const toggleCorrect = (i: number) => {
    if (type === "true-false") { setCorrect([i]); return; }
    setCorrect(p => p.includes(i) ? p.filter(c=>c!==i) : [...p,i]);
  };

  const addOpt = () => setOpts(p=>[...p,""]);
  const delOpt = (i: number) => {
    setOpts(p=>p.filter((_,x)=>x!==i));
    setCorrect(p=>p.filter(c=>c!==i).map(c=>c>i?c-1:c));
  };

  const handleSave = () => {
    if (!text.trim()) return;
    const id = question?.id ?? `q-${Date.now()}`;
    let q: QuizQuestion;
    if (type==="multiple-choice")  q = {id,type,question:text.trim(),options:opts.filter(Boolean),correctOptions:correct};
    else if (type==="true-false")  q = {id,type,question:text.trim(),options:["True","False"],correctOptions:correct};
    else if (type==="short-answer") q = {id,type,question:text.trim(),exampleAnswer:exAns,matchMode};
    else                            q = {id,type,question:text.trim(),answer};
    onSave(q);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <motion.div initial={{opacity:0,scale:0.96,y:8}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.96,y:8}}
        className="relative z-10 w-full max-w-[480px] rounded-2xl border border-border bg-[#1c1c1f] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">{isNew ? "Add question" : "Edit question"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={17}/></button>
        </div>
        <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Type — custom dark dropdown */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Type</p>
            <TypeSelect value={type} onChange={onTypeChange} />
          </div>
          {/* Question */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Question</p>
            <textarea value={text} onChange={e=>setText(e.target.value)} rows={3} placeholder="Enter your question..."
              className="w-full rounded-xl bg-secondary/60 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none resize-none"/>
          </div>
          {/* MC / TF options */}
          {(type==="multiple-choice"||type==="true-false") && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Options</p>
                {type==="multiple-choice" && (
                  <button onClick={addOpt} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <Plus size={12}/> Add
                  </button>
                )}
                <p className="text-[11px] text-muted-foreground ml-auto">Correct</p>
              </div>
              <div className="space-y-2">
                {(type==="true-false" ? ["True","False"] : opts).map((opt,i) => (
                  <div key={i} className="flex items-center gap-2">
                    {type==="multiple-choice" && <GripVertical size={13} className="text-muted-foreground/40 shrink-0"/>}
                    <input value={opt} readOnly={type==="true-false"} placeholder={`Option ${String.fromCharCode(65+i)}`}
                      onChange={e=>{const n=[...opts];n[i]=e.target.value;setOpts(n);}}
                      className="flex-1 rounded-lg bg-secondary/50 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"/>
                    {type==="multiple-choice" && opts.length>2 && (
                      <button onClick={()=>delOpt(i)} className="text-muted-foreground/40 hover:text-destructive"><Trash2 size={12}/></button>
                    )}
                    <button onClick={()=>toggleCorrect(i)}
                      className={`shrink-0 flex h-5 w-5 items-center justify-center rounded border transition-colors ${correct.includes(i) ? "bg-emerald-500 border-emerald-500 text-white" : "border-border bg-secondary/40 hover:border-emerald-400 text-transparent"}`}>
                      <Check size={10}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Short answer */}
          {type==="short-answer" && <>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Example answer</p>
              <input value={exAns} onChange={e=>setExAns(e.target.value)} placeholder="Enter answer..."
                className="w-full rounded-xl bg-secondary/60 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"/>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">How closely should an answer match the example?</p>
              <select value={matchMode} onChange={e=>setMatchMode(e.target.value)}
                className="w-full appearance-none rounded-xl bg-secondary/60 border border-border px-3 py-2.5 text-sm text-foreground outline-none cursor-pointer">
                {MATCH_MODES.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </>}
          {/* Fill in blank */}
          {type==="fill-in-blank" && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Answer <span className="normal-case font-normal">(replaces _____)</span></p>
              <input value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Answer word or phrase..."
                className="w-full rounded-xl bg-secondary/60 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"/>
            </div>
          )}
        </div>
        <div className="border-t border-border px-5 py-3 flex justify-end">
          <button onClick={handleSave} className="rounded-xl bg-foreground text-background hover:opacity-90 px-6 py-2 text-sm font-semibold">Save</button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Take Quiz modal ──────────────────────────────────────────────────────────
function TakeQuizModal({ onClose, onStart }: { onClose:()=>void; onStart:(shuffle:boolean)=>void }) {
  const [shuffle, setShuffle] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <motion.div initial={{opacity:0,scale:0.96,y:8}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.96,y:8}}
        className="relative z-10 w-full max-w-[360px] rounded-2xl border border-border bg-[#1c1c1f] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-foreground">Take quiz</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={17}/></button>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-secondary/40 border border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Shuffle questions</p>
            <p className="text-xs text-muted-foreground mt-0.5">Present questions in random order</p>
          </div>
          <button onClick={()=>setShuffle(s=>!s)}
            className={`relative h-6 w-11 rounded-full transition-colors ${shuffle?"bg-foreground":"bg-secondary"}`}>
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${shuffle?"translate-x-5":""}`}/>
          </button>
        </div>
        <button onClick={()=>{onClose();onStart(shuffle);}}
          className="mt-5 w-full rounded-xl bg-foreground text-background hover:opacity-90 py-2.5 text-sm font-semibold">
          Start
        </button>
      </motion.div>
    </div>
  );
}

// ── Question card ────────────────────────────────────────────────────────────
function QuestionCard({ q, index, onEdit, onDelete }: {
  q: QuizQuestion; index: number;
  onEdit:(q:QuizQuestion)=>void; onDelete:(id:string)=>void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-[#18181b] px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{index+1}</span>
          <span className="text-[10px] font-semibold text-muted-foreground/60 bg-secondary/50 px-2 py-0.5 rounded-full border border-border/40">{typeLabel(q.type)}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={()=>setShow(s=>!s)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
            {show ? <EyeOff size={12}/> : <Eye size={12}/>}
            {show ? "Hide" : "Show"}
          </button>
          <button onClick={()=>onEdit(q)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
            <Pencil size={12}/>
          </button>
          <button onClick={()=>onDelete(q.id)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 size={12}/>
          </button>
        </div>
      </div>
      <p className="mt-3 text-sm text-foreground leading-relaxed">{q.question}</p>
      <QuestionBody q={q} show={show}/>
    </div>
  );
}

// ── Quiz Player ──────────────────────────────────────────────────────────────
function QuizPlayer({ questions, spaceName, onExit, onSubmit }: {
  questions: QuizQuestion[]; spaceName: string; onExit:()=>void;
  onSubmit: (score: number, results: {
    mc: Record<string, number[]>;
    tf: Record<string, number>;
    sa: Record<string, string>;
    fib: Record<string, string>;
  }) => void;
}) {
  const [cur, setCur] = useState(0);
  const [mc, setMc] = useState<Record<string,number[]>>({});
  const [tf, setTf] = useState<Record<string,number>>({});
  const [sa, setSa] = useState<Record<string,string>>({});
  const [fib, setFib] = useState<Record<string,string>>({});
  // For multi-select MCQ, short-answer, and fill-in-blank, show explanation after Next is clicked
  const [showExplanation, setShowExplanation] = useState<Record<string,boolean>>({});
  const [jumpOpen, setJumpOpen] = useState(false);

  const q = questions[cur]!;
  const isLast = cur === questions.length - 1;

  const isAnswered = (idx: number) => {
    const qq = questions[idx]!;
    if (qq.type==="multiple-choice") return (mc[qq.id]??[]).length > 0;
    if (qq.type==="true-false")      return tf[qq.id] !== undefined;
    if (qq.type==="short-answer")    return (sa[qq.id]??"").trim().length > 0;
    return (fib[qq.id]??"").trim().length > 0;
  };

  const hasAnswered      = isAnswered(cur);
  const mcSel            = mc[q.id]??[];
  const isMultiSelect    = q.type === "multiple-choice" && (q.correctOptions ?? []).length > 1;

  // Revealed means styling correct/incorrect choices and displaying explanation
  const revealed = (q.type === "true-false" && tf[q.id] !== undefined)
    || (q.type === "multiple-choice" && !isMultiSelect && mcSel.length > 0)
    || (showExplanation[q.id] ?? false);

  const inExplanation    = (q.type === "short-answer" || q.type === "fill-in-blank") && (showExplanation[q.id] ?? false);
  const fibCorrect       = q.type==="fill-in-blank" && (fib[q.id]??"").trim().toLowerCase() === (q.answer??"").toLowerCase();

  const toggleMC = (i: number) => {
    if (revealed) return;
    if (isMultiSelect) {
      setMc(p => {
        const current = p[q.id] ?? [];
        const next = current.includes(i) ? current.filter(x => x !== i) : [...current, i];
        return { ...p, [q.id]: next };
      });
    } else {
      setMc(p => ({ ...p, [q.id]: [i] }));
    }
  };

  const calcScore = () => {
    let c = 0;
    questions.forEach(qq => {
      if (qq.type==="multiple-choice") {
        const a=mc[qq.id]??[]; const e=qq.correctOptions??[];
        if(a.length===e.length && e.every(x=>a.includes(x))) c++;
      } else if (qq.type==="true-false") {
        if((qq.correctOptions??[])[0]===(tf[qq.id]??-1)) c++;
      } else if (qq.type==="short-answer") {
        if((sa[qq.id]??"").trim().length>0) c++;
      } else {
        if((fib[qq.id]??"").trim().toLowerCase()===(qq.answer??"").toLowerCase()) c++;
      }
    });
    return c;
  };

  const handleNext = () => {
    // If it requires showing the explanation panel/screen first before moving on:
    if ((isMultiSelect || q.type === "short-answer" || q.type === "fill-in-blank") && hasAnswered && !revealed) {
      setShowExplanation(p => ({...p, [q.id]: true}));
      return;
    }
    // Proceed or submit
    if (isLast) {
      const finalScore = calcScore();
      onSubmit(finalScore, { mc, tf, sa, fib });
      return;
    }
    setCur(c => c + 1);
  };

  return (
    <div className="flex flex-col bg-[#0c0c0d] h-full w-full">

      {/* ── TOP BREADCRUMB ───────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Folder size={13} className="shrink-0"/>
          <span>My folder</span>
          <ChevronRight size={12}/>
          <ListChecks size={13} className="shrink-0"/>
          <span className="font-semibold text-foreground">{spaceName}</span>
        </div>
        <button onClick={onExit}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-[#1c1c1f] hover:bg-[#27272a] px-3 py-1.5 text-xs font-semibold text-foreground transition-colors">
          <X size={13}/> Close
        </button>
      </div>

      {/* ── SCROLLABLE CONTENT ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[600px] px-4 py-14">

          {/* Question label */}
          <p className="text-xs font-semibold text-muted-foreground mb-4">Question {cur+1}</p>

          {/* Question text */}
          <h2 className="text-2xl font-bold text-foreground leading-snug mb-8">{q.question}</h2>

          {/* ── ANSWER AREA (hidden during explanation screen) ──────────── */}
          {!inExplanation && (
            <>
              {/* Multiple choice */}
              {q.type==="multiple-choice" && (
                <div className="space-y-2.5">
                  {(q.options??[]).map((opt,i) => {
                    const sel     = mcSel.includes(i);
                    const correct = (q.correctOptions??[]).includes(i);
                    const isGreen = revealed && correct;
                    const isRed   = revealed && sel && !correct;
                    const isActive = !revealed && sel;
                    return (
                      <button key={i} onClick={() => toggleMC(i)}
                        className={[
                          "w-full flex items-center gap-3.5 rounded-xl border px-4 py-3.5 text-sm font-medium text-left transition-colors",
                          isGreen ? "border-emerald-500/60 bg-emerald-500/10 text-foreground"
                            : isRed ? "border-destructive/50 bg-destructive/10 text-foreground"
                            : isActive ? "border-foreground/40 bg-[#222225] text-foreground"
                            : "border-[#2a2a2d] bg-[#1a1a1d] hover:bg-[#222225] text-foreground",
                        ].join(" ")}>
                        <span className={[
                          "shrink-0 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
                          isGreen ? "border-emerald-500" : isRed ? "border-destructive/60" : isActive ? "border-white" : "border-[#555]",
                        ].join(" ")}>
                          {isGreen ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          ) : isRed ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                          ) : isActive ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-white" />
                          ) : null}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                  {/* Explain why / explanation directly below for single/revealed */}
                  {revealed && (
                    <div className="pt-4">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Explanation</p>
                      <div className="rounded-xl border border-[#2a2a2d] bg-[#1a1a1d] px-4 py-4 text-sm text-foreground/80 leading-relaxed">
                        {(q.correctOptions??[]).length > 0 ? (
                          <div>
                            <span className="font-bold text-foreground block mb-1">Correct Answer:</span>
                            {(q.correctOptions??[]).map(idx => (q.options??[])[idx]).join(", ")}
                          </div>
                        ) : (
                          "No explanation available."
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* True / False */}
              {q.type==="true-false" && (
                <div className="space-y-2.5">
                  {["True","False"].map((lbl,i) => {
                    const sel = tf[q.id] === i;
                    const correct = (q.correctOptions??[]).includes(i);
                    const isGreen = revealed && correct;
                    const isRed   = revealed && sel && !correct;
                    const isActive = !revealed && sel;
                    return (
                      <button key={lbl} onClick={() => !revealed && setTf(p=>({...p,[q.id]:i}))}
                        className={[
                          "w-full flex items-center gap-3.5 rounded-xl border px-4 py-3.5 text-sm font-semibold text-left transition-colors",
                          isGreen ? "border-emerald-500/60 bg-emerald-500/10 text-foreground"
                            : isRed ? "border-destructive/50 bg-destructive/10 text-foreground"
                            : isActive ? "border-foreground/40 bg-[#222225] text-foreground"
                            : "border-[#2a2a2d] bg-[#1a1a1d] hover:bg-[#222225] text-foreground",
                        ].join(" ")}>
                        <span className={[
                          "shrink-0 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
                          isGreen ? "border-emerald-500" : isRed ? "border-destructive/60" : isActive ? "border-white" : "border-[#555]",
                        ].join(" ")}>
                          {isGreen ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          ) : isRed ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                          ) : isActive ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-white" />
                          ) : null}
                        </span>
                        {lbl}
                      </button>
                    );
                  })}
                  {revealed && (
                    <div className="pt-4">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Explanation</p>
                      <div className="rounded-xl border border-[#2a2a2d] bg-[#1a1a1d] px-4 py-4 text-sm text-foreground/80 leading-relaxed">
                        {(q.correctOptions??[]).length > 0 ? (
                          <div>
                            <span className="font-bold text-foreground block mb-1">Correct Answer:</span>
                            {(q.correctOptions??[]).map(idx => (["True", "False"])[idx]).join(", ")}
                          </div>
                        ) : (
                          "No explanation available."
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Short answer */}
              {q.type==="short-answer" && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Short response</p>
                  <textarea rows={6} placeholder="Type your answer here"
                    value={sa[q.id]??""} onChange={e => setSa(p=>({...p,[q.id]:e.target.value}))}
                    className="w-full rounded-xl bg-[#1c1c1f] border border-[#2a2a2d] px-4 py-3 text-sm text-foreground placeholder:text-[#555] outline-none resize-none focus:border-[#444] transition-colors"/>
                  {q.matchMode && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {q.matchMode==="Has exact same meaning, can be phrased differently"
                        ? "Your answer must have similar meaning but can be phrased differently."
                        : q.matchMode==="Exact wording required"
                        ? "Your answer must match exactly."
                        : q.matchMode}
                    </p>
                  )}
                </div>
              )}

              {/* Fill in blank */}
              {q.type==="fill-in-blank" && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Fill in the blank</p>
                  <input placeholder="Type your answer here"
                    value={fib[q.id]??""} onChange={e => setFib(p=>({...p,[q.id]:e.target.value}))}
                    className="w-full rounded-xl bg-[#1c1c1f] border border-[#2a2a2d] px-4 py-3 text-sm text-foreground placeholder:text-[#555] outline-none focus:border-[#444] transition-colors"/>
                </div>
              )}
            </>
          )}

          {/* ── EXPLANATION SCREEN (Short / FIB after "Next") ──────────── */}
          {inExplanation && (
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-4">
              {/* User's answer readout */}
              {q.type==="fill-in-blank" && (
                <>
                  <input readOnly value={fib[q.id]??""}
                    className="w-full rounded-xl bg-[#1c1c1f] border border-[#2a2a2d] px-4 py-3 text-sm text-foreground outline-none"/>
                  <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${fibCorrect?"bg-emerald-500/15 text-emerald-400":"bg-red-500/15 text-red-400"}`}>
                    {fibCorrect
                      ? <><Check size={15}/> That&#39;s correct!</>
                      : <><X size={15}/> Oops, that&#39;s not correct.</>}
                  </div>
                </>
              )}
              {q.type==="short-answer" && (
                <div className="rounded-xl bg-[#1c1c1f] border border-[#2a2a2d] px-4 py-3 min-h-[48px] text-sm text-foreground">
                  {sa[q.id]??""}
                </div>
              )}

              {/* Explanation section */}
              <div className="pt-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-5">Explanation</p>
                <h3 className="text-base font-bold text-foreground mb-2">Correct Answer</h3>
                <p className="text-sm text-foreground/75 leading-relaxed mb-6">
                  {q.type==="fill-in-blank"
                    ? `"${q.answer}" is the correct answer because it completes the sentence accurately.`
                    : q.exampleAnswer ?? "See the correct answer above."}
                </p>
                {((q.type==="fill-in-blank" && !fibCorrect) || q.type==="short-answer") && (
                  <>
                    <h3 className="text-base font-bold text-foreground mb-2">Your Answer</h3>
                    <p className="text-sm text-foreground/60 leading-relaxed">
                      {q.type==="fill-in-blank"
                        ? `"${fib[q.id]??""}" is not the correct answer for this question.`
                        : `"${sa[q.id]??""}" — compare with the example answer above.`}
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── BOTTOM BAR ─────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-[#1e1e21] bg-[#0c0c0d] px-8 py-3.5">
        <div className="mx-auto max-w-[600px] flex items-center gap-4">

          {/* Question jump selector */}
          <div className="relative shrink-0">
            <button onClick={() => setJumpOpen(v => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-[#2a2a2d] bg-[#1a1a1d] hover:bg-[#222225] px-3 py-1.5 text-xs font-semibold text-foreground transition-colors whitespace-nowrap">
              {cur+1} of {questions.length}
              <ChevronDown size={12} className={`transition-transform ${jumpOpen?"rotate-180":""}`}/>
            </button>
            <AnimatePresence>
              {jumpOpen && (
                <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:6}}
                  className="absolute bottom-full mb-2 left-0 w-[190px] rounded-xl border border-[#2a2a2d] bg-[#151517] py-1.5 shadow-2xl z-50 max-h-[300px] overflow-y-auto">
                  {questions.map((_,i) => (
                    <button key={i} onClick={() => { setCur(i); setJumpOpen(false); setShowExplanation({}); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors hover:bg-[#222225] ${i===cur?"text-foreground":"text-muted-foreground"}`}>
                      <span className={`shrink-0 flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] transition-colors ${isAnswered(i)?"border-emerald-500":"border-[#444]"}`}>
                        {isAnswered(i) && <span className="h-2 w-2 rounded-full bg-emerald-500"/>}
                      </span>
                      Question {i+1}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="flex-1 h-[3px] bg-[#2a2a2d] rounded-full overflow-hidden">
            <div className="h-[3px] bg-foreground rounded-full transition-all duration-300"
              style={{width:`${((cur+1)/questions.length)*100}%`}}/>
          </div>

          {/* Next / Submit */}
          <button onClick={handleNext}
            className="shrink-0 rounded-xl bg-[#f4f4f5] text-[#18181b] hover:bg-white px-6 py-2 text-sm font-bold transition-colors">
            {isLast && revealed ? "Submit" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Results Scorecard Modal ──────────────────────────────────────────────────
function ResultsModal({ results, questions, onClose }: {
  results: {
    score: number;
    answers: {
      mc: Record<string, number[]>;
      tf: Record<string, number>;
      sa: Record<string, string>;
      fib: Record<string, string>;
    };
  };
  questions: QuizQuestion[];
  onClose: () => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const q = questions[selectedIdx]!;
  const answers = results.answers;

  const isCorrect = (currQ: QuizQuestion) => {
    if (currQ.type === "multiple-choice") {
      const a = answers.mc[currQ.id] ?? [];
      const e = currQ.correctOptions ?? [];
      return a.length === e.length && e.every(x => a.includes(x));
    }
    if (currQ.type === "true-false") {
      const a = answers.tf[currQ.id];
      const e = currQ.correctOptions ?? [];
      return e[0] === a;
    }
    if (currQ.type === "fill-in-blank") {
      const a = answers.fib[currQ.id] ?? "";
      return a.trim().toLowerCase() === (currQ.answer ?? "").trim().toLowerCase();
    }
    if (currQ.type === "short-answer") {
      const a = answers.sa[currQ.id] ?? "";
      return a.trim().length > 0;
    }
    return false;
  };

  const pct = Math.round((results.score / questions.length) * 100);
  const formattedDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose}/>
      <motion.div initial={{opacity:0,scale:0.96,y:8}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.96,y:8}}
        className="relative z-10 w-full max-w-[760px] h-[80vh] max-h-[620px] rounded-2xl border border-border bg-[#18181b] shadow-2xl overflow-hidden flex flex-col text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">Quiz results</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">Started {formattedDate}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={17}/></button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 px-6 py-4 border-b border-border bg-secondary/20">
          <div className="rounded-xl border border-border bg-[#1c1c1f] p-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Your score</p>
            <p className="text-2xl font-bold text-foreground">{pct}%</p>
          </div>
          <div className="rounded-xl border border-border bg-[#1c1c1f] p-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Correct</p>
            <p className="text-2xl font-bold text-foreground">{results.score} of {questions.length}</p>
          </div>
        </div>

        {/* Two Columns */}
        <div className="flex-1 flex min-h-0 divide-x divide-border">
          {/* Left Column: Questions List */}
          <div className="w-[200px] overflow-y-auto p-2 space-y-1 bg-[#1a1a1d]">
            {questions.map((currQ, i) => {
              const ok = isCorrect(currQ);
              const active = i === selectedIdx;
              return (
                <button key={currQ.id} onClick={() => setSelectedIdx(i)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                    active ? "bg-secondary/70 text-foreground" : "text-muted-foreground hover:bg-secondary/30 hover:text-foreground"
                  }`}>
                  <span className={`shrink-0 flex h-4.5 w-4.5 items-center justify-center rounded-full border ${
                    ok ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-destructive bg-destructive/10 text-destructive"
                  }`}>
                    {ok ? <Check size={11}/> : <X size={11}/>}
                  </span>
                  <span className="truncate">Question {i+1}</span>
                </button>
              );
            })}
          </div>

          {/* Right Column: Question Details */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <h3 className="text-lg font-bold text-foreground leading-snug">{q.question}</h3>

            {/* Answer Display */}
            <div className="space-y-3">
              {q.type === "multiple-choice" && (
                <div className="space-y-2">
                  {(q.options??[]).map((opt, i) => {
                    const sel = (answers.mc[q.id]??[]).includes(i);
                    const correct = (q.correctOptions??[]).includes(i);
                    const isGreen = correct;
                    const isRed = sel && !correct;
                    return (
                      <div key={i} className={`flex items-center gap-3.5 rounded-xl border px-4 py-3.5 text-sm font-medium ${
                        isGreen ? "border-emerald-500/60 bg-emerald-500/10 text-foreground"
                          : isRed ? "border-destructive/50 bg-destructive/10 text-foreground"
                          : "border-[#2a2a2d] bg-[#1a1a1d] text-muted-foreground"
                      }`}>
                        <span className={`shrink-0 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          isGreen ? "border-emerald-500" : isRed ? "border-destructive/60" : "border-[#555]"
                        }`}>
                          {isGreen ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          ) : isRed ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                          ) : null}
                        </span>
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {q.type === "true-false" && (
                <div className="space-y-2">
                  {["True","False"].map((lbl, i) => {
                    const sel = answers.tf[q.id] === i;
                    const correct = (q.correctOptions??[]).includes(i);
                    const isGreen = correct;
                    const isRed = sel && !correct;
                    return (
                      <div key={lbl} className={`flex items-center gap-3.5 rounded-xl border px-4 py-3.5 text-sm font-semibold ${
                        isGreen ? "border-emerald-500/60 bg-emerald-500/10 text-foreground"
                          : isRed ? "border-destructive/50 bg-destructive/10 text-foreground"
                          : "border-[#2a2a2d] bg-[#1a1a1d] text-muted-foreground"
                      }`}>
                        <span className={`shrink-0 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          isGreen ? "border-emerald-500" : isRed ? "border-destructive/60" : "border-[#555]"
                        }`}>
                          {isGreen ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          ) : isRed ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                          ) : null}
                        </span>
                        {lbl}
                      </div>
                    );
                  })}
                </div>
              )}

              {q.type === "short-answer" && (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Your Answer</span>
                    <div className="rounded-xl border border-border bg-[#1c1c1f] px-4 py-3 text-sm text-foreground">
                      {answers.sa[q.id] || <span className="text-muted-foreground/45 italic">No answer provided</span>}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Correct Answer</span>
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-foreground">
                      {q.exampleAnswer}
                    </div>
                  </div>
                </div>
              )}

              {q.type === "fill-in-blank" && (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Your Answer</span>
                    <div className="rounded-xl border border-border bg-[#1c1c1f] px-4 py-3 text-sm text-foreground">
                      {answers.fib[q.id] || <span className="text-muted-foreground/45 italic">No answer provided</span>}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Correct Answer</span>
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-foreground">
                      {q.answer}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Explanation panel */}
            <div className="pt-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Explanation</p>
              <div className="rounded-xl border border-[#2a2a2d] bg-[#1a1a1d] px-4 py-4 text-sm text-foreground/80 leading-relaxed">
                {q.type === "multiple-choice" || q.type === "true-false" ? (
                  (q.correctOptions??[]).length > 0 ? (
                    <div>
                      <span className="font-bold text-foreground block mb-1">Correct Answer:</span>
                      {q.type === "true-false"
                        ? (q.correctOptions??[]).map(idx => (["True", "False"])[idx]).join(", ")
                        : (q.correctOptions??[]).map(idx => (q.options??[])[idx]).join(", ")}
                    </div>
                  ) : (
                    "No explanation available."
                  )
                ) : q.type === "fill-in-blank" ? (
                  `"${q.answer}" is the correct answer because it completes the sentence accurately.`
                ) : (
                  q.exampleAnswer ?? "See the correct answer above."
                )}
              </div>
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
export function QuizEditor({
  spaceName, visibility: initialVisibility, initialQuestions, onTakeQuiz, onGenerateQuestions, onUpdateVisibility,
}: {
  spaceName: string; visibility: VisibilityType;
  initialQuestions?: QuizQuestion[];
  onTakeQuiz: () => void; onGenerateQuestions: () => void;
  onUpdateVisibility?: (vis: VisibilityType) => void;
}) {
  const [visibility, setVisibility] = useState<VisibilityType>(initialVisibility);
  const [visOpen, setVisOpen] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions ?? makeDemoQuestions(spaceName));
  const [editQ, setEditQ] = useState<QuizQuestion | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showTake, setShowTake] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [results, setResults] = useState<{
    score: number;
    answers: {
      mc: Record<string, number[]>;
      tf: Record<string, number>;
      sa: Record<string, string>;
      fib: Record<string, string>;
    };
  } | null>(null);

  const openEdit = (q: QuizQuestion) => { setEditQ(q); setShowEdit(true); };
  const openAdd  = () => { setEditQ(null); setShowEdit(true); };
  const saveQ = (q: QuizQuestion) => setQuestions(prev => {
    const i = prev.findIndex(p=>p.id===q.id);
    if(i>=0){const n=[...prev];n[i]=q;return n;} return [...prev,q];
  });
  const deleteQ = (id:string) => setQuestions(p=>p.filter(q=>q.id!==id));

  const handleSetVisibility = (vis: VisibilityType) => {
    setVisibility(vis);
    setVisOpen(false);
    onUpdateVisibility?.(vis);
  };

  const visLabel = visibility==="me"?"Just me":visibility==="members"?"Folder Members":"Public";

  if (playing) {
    const qs = shuffle ? [...questions].sort(()=>Math.random()-0.5) : questions;
    return (
      <QuizPlayer
        questions={qs}
        spaceName={spaceName}
        onExit={()=>setPlaying(false)}
        onSubmit={(score, answers) => {
          setResults({ score, answers });
          setPlaying(false);
        }}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 flex flex-col min-h-[calc(100vh-60px)]">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Folder size={14}/><span>My folder</span><ChevronRight size={13}/>
          <ListChecks size={14}/><span className="font-medium text-foreground">{spaceName}</span>
        </div>
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
                className="absolute right-0 mt-2 w-[260px] rounded-[18px] border border-border bg-[#1c1c1f] p-4 shadow-2xl z-50 text-left"
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

      {/* Title */}
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground shrink-0">{spaceName}</h1>

      {/* Questions */}
      <div className="mt-8 flex-1">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <span className="text-sm font-semibold text-foreground">Questions</span>
          <button onClick={openAdd} className="flex items-center gap-1.5 rounded-lg border border-border bg-[#27272a]/60 hover:bg-[#27272a] px-3 py-1.5 text-xs font-semibold text-foreground transition-colors">
            <Plus size={13}/>Add
          </button>
        </div>
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {questions.map((q,i)=>(
              <motion.div key={q.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.16}}>
                <QuestionCard q={q} index={i} onEdit={openEdit} onDelete={deleteQ}/>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={openAdd} className="rounded-xl border border-border bg-[#27272a]/60 hover:bg-[#27272a] px-4 py-3 text-sm font-semibold text-foreground transition-colors">Add question</button>
          <button onClick={onGenerateQuestions} className="rounded-xl border border-border bg-[#27272a]/60 hover:bg-[#27272a] px-4 py-3 text-sm font-semibold text-foreground transition-colors">Generate questions</button>
        </div>
      </div>

      {/* Floating pill */}
      <div className="sticky bottom-6 mt-8 flex justify-center pb-2 shrink-0">
        <div className="flex items-center rounded-full bg-[#18181b] border border-border p-1 shadow-xl">
          <button onClick={()=>setShowTake(true)} className="flex items-center gap-2 rounded-full bg-secondary/80 hover:bg-secondary px-5 py-2.5 text-xs font-semibold text-foreground transition-colors">
            <Play size={13} className="fill-current"/>Take quiz
          </button>
          <div className="mx-2 h-5 w-px bg-border"/>
          <button onClick={onGenerateQuestions} className="flex items-center gap-2 rounded-full hover:bg-secondary/40 px-5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <Sparkles size={13}/>Generate questions
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showEdit && <EditModal question={editQ} onSave={saveQ} onClose={()=>setShowEdit(false)}/>}
        {showTake && <TakeQuizModal onClose={()=>setShowTake(false)} onStart={(s)=>{setShuffle(s);setPlaying(true);}}/>}
        {results && <ResultsModal results={results} questions={questions} onClose={() => setResults(null)} />}
      </AnimatePresence>
    </div>
  );
}
