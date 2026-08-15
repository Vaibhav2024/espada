"use client";
import { useState } from "react";
import {
  Folder, ChevronRight, ListChecks, Globe, User, Users,
  Plus, Play, Sparkles, Eye, EyeOff, Pencil, Trash2, X, Check, GripVertical,
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
          {/* Type */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Type</p>
            <select value={type} onChange={e=>onTypeChange(e.target.value as QuestionType)}
              className="w-full appearance-none rounded-xl bg-secondary/60 border border-border px-3 py-2.5 text-sm text-foreground outline-none cursor-pointer">
              <option value="multiple-choice">Multiple choice</option>
              <option value="true-false">True or false</option>
              <option value="short-answer">Short response</option>
              <option value="fill-in-blank">Fill in the blank</option>
            </select>
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
function QuizPlayer({ questions, spaceName, onExit }: {
  questions: QuizQuestion[]; spaceName: string; onExit:()=>void;
}) {
  const [cur, setCur] = useState(0);
  const [mc, setMc] = useState<Record<string,number[]>>({});
  const [tf, setTf] = useState<Record<string,number>>({});
  const [sa, setSa] = useState<Record<string,string>>({});
  const [fib, setFib] = useState<Record<string,string>>({});
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);

  const q = questions[cur];
  const isLast = cur === questions.length - 1;

  const submit = () => {
    let c = 0;
    questions.forEach(q => {
      if (q.type==="multiple-choice") {
        const a=mc[q.id]??[]; const e=q.correctOptions??[];
        if(a.length===e.length && e.every(x=>a.includes(x))) c++;
      } else if (q.type==="true-false") {
        if((q.correctOptions??[])[0]===(tf[q.id]??-1)) c++;
      } else if (q.type==="short-answer") {
        if((sa[q.id]??"").trim().length>0) c++;
      } else {
        if((fib[q.id]??"").trim().toLowerCase()===(q.answer??"").toLowerCase()) c++;
      }
    });
    setScore(c); setDone(true);
  };

  if (done) {
    const pct = Math.round((score/questions.length)*100);
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-20 flex flex-col items-center gap-5">
        <div className="text-7xl font-bold text-foreground">{pct}%</div>
        <p className="text-lg font-semibold text-foreground">{score} / {questions.length} correct</p>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          {pct>=80?"Great job! You have a strong grasp of this material.":pct>=50?"Good effort! Review the missed questions to improve.":"Keep practicing — you will get there!"}
        </p>
        <button onClick={onExit} className="mt-4 rounded-xl bg-foreground text-background hover:opacity-90 px-8 py-2.5 text-sm font-semibold">
          Back to questions
        </button>
      </div>
    );
  }

  const toggleMC = (i:number) => setMc(p=>({...p,[q.id]:(p[q.id]??[]).includes(i)?(p[q.id]??[]).filter(x=>x!==i):[...(p[q.id]??[]),i]}));

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8 flex flex-col min-h-[calc(100vh-60px)]">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <button onClick={onExit} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <X size={14}/> Exit
        </button>
        <span className="text-xs font-semibold text-muted-foreground">{cur+1} / {questions.length}</span>
        <span className="text-xs font-semibold text-foreground">{spaceName}</span>
      </div>
      <div className="h-1 w-full bg-secondary/60 rounded-full mb-8 shrink-0">
        <div className="h-1 bg-foreground rounded-full transition-all" style={{width:`${((cur+1)/questions.length)*100}%`}}/>
      </div>
      <div className="flex-1">
        <p className="text-lg font-semibold text-foreground leading-relaxed mb-6">{q.question}</p>
        {q.type==="multiple-choice" && (
          <div className="space-y-2.5">
            {(q.options??[]).map((opt,i)=>(
              <button key={i} onClick={()=>toggleMC(i)}
                className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${(mc[q.id]??[]).includes(i)?"border-foreground bg-secondary text-foreground":"border-border bg-[#18181b] text-foreground/70 hover:bg-secondary/40"}`}>
                <span className="font-semibold mr-2">{String.fromCharCode(65+i)}.</span>{opt}
              </button>
            ))}
          </div>
        )}
        {q.type==="true-false" && (
          <div className="flex gap-3">
            {["True","False"].map((lbl,i)=>(
              <button key={lbl} onClick={()=>setTf(p=>({...p,[q.id]:i}))}
                className={`flex-1 rounded-xl border px-4 py-3.5 text-sm font-semibold transition-colors ${tf[q.id]===i?"border-foreground bg-secondary text-foreground":"border-border bg-[#18181b] text-foreground/70 hover:bg-secondary/40"}`}>
                {lbl}
              </button>
            ))}
          </div>
        )}
        {q.type==="short-answer" && (
          <textarea rows={5} placeholder="Write your answer here..." value={sa[q.id]??""} onChange={e=>setSa(p=>({...p,[q.id]:e.target.value}))}
            className="w-full rounded-xl bg-[#18181b] border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none resize-none"/>
        )}
        {q.type==="fill-in-blank" && (
          <input placeholder="Fill in the blank..." value={fib[q.id]??""} onChange={e=>setFib(p=>({...p,[q.id]:e.target.value}))}
            className="w-full rounded-xl bg-[#18181b] border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"/>
        )}
      </div>
      <div className="flex gap-3 mt-8 shrink-0">
        {cur>0 && <button onClick={()=>setCur(c=>c-1)} className="flex-1 rounded-xl border border-border bg-[#27272a]/60 hover:bg-[#27272a] py-2.5 text-sm font-semibold text-foreground">Previous</button>}
        {!isLast
          ? <button onClick={()=>setCur(c=>c+1)} className="flex-1 rounded-xl bg-foreground text-background hover:opacity-90 py-2.5 text-sm font-semibold">Next</button>
          : <button onClick={submit} className="flex-1 rounded-xl bg-foreground text-background hover:opacity-90 py-2.5 text-sm font-semibold">Submit</button>
        }
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
export function QuizEditor({
  spaceName, visibility, initialQuestions, onTakeQuiz, onGenerateQuestions,
}: {
  spaceName: string; visibility: VisibilityType;
  initialQuestions?: QuizQuestion[];
  onTakeQuiz: () => void; onGenerateQuestions: () => void;
}) {
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions ?? makeDemoQuestions(spaceName));
  const [editQ, setEditQ] = useState<QuizQuestion | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showTake, setShowTake] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);

  const openEdit = (q: QuizQuestion) => { setEditQ(q); setShowEdit(true); };
  const openAdd  = () => { setEditQ(null); setShowEdit(true); };
  const saveQ = (q: QuizQuestion) => setQuestions(prev => {
    const i = prev.findIndex(p=>p.id===q.id);
    if(i>=0){const n=[...prev];n[i]=q;return n;} return [...prev,q];
  });
  const deleteQ = (id:string) => setQuestions(p=>p.filter(q=>q.id!==id));

  const visIcon = visibility==="me"?<User size={13}/>:visibility==="members"?<Users size={13}/>:<Globe size={13}/>;
  const visLabel = visibility==="me"?"Just me":visibility==="members"?"Folder Members":"Public";

  if (playing) {
    const qs = shuffle ? [...questions].sort(()=>Math.random()-0.5) : questions;
    return <QuizPlayer questions={qs} spaceName={spaceName} onExit={()=>setPlaying(false)}/>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 flex flex-col min-h-[calc(100vh-60px)]">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Folder size={14}/><span>My folder</span><ChevronRight size={13}/>
          <ListChecks size={14}/><span className="font-medium text-foreground">{spaceName}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">{visIcon}<span>{visLabel}</span></div>
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
      </AnimatePresence>
    </div>
  );
}
