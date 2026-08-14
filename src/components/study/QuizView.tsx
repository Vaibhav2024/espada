import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Lightbulb, X } from "lucide-react";
import { Panel, ViewShell } from "./shared";

const QUESTIONS = [
  {
    q: "Which organelle is primarily responsible for ATP production in eukaryotic cells?",
    options: ["Ribosome", "Mitochondrion", "Golgi apparatus", "Lysosome"],
    correct: 1,
    explanation:
      "Mitochondria generate ATP through oxidative phosphorylation along the inner membrane's electron transport chain. Ribosomes build proteins, the Golgi packages them, and lysosomes handle degradation.",
  },
  {
    q: "Osmosis describes the movement of which molecule?",
    options: ["Glucose", "Sodium ions", "Water", "Oxygen"],
    correct: 2,
    explanation:
      "Osmosis is specifically the passive movement of water across a semi-permeable membrane, from lower to higher solute concentration.",
  },
  {
    q: "Net ATP yield of glycolysis per glucose molecule is:",
    options: ["2 ATP", "4 ATP", "32 ATP", "0 ATP"],
    correct: 0,
    explanation:
      "Glycolysis consumes 2 ATP and produces 4, leaving a net gain of 2 ATP plus 2 NADH and 2 pyruvate.",
  },
];

export function QuizView({ onBack }: { onBack: () => void }) {
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const item = QUESTIONS[qIndex]!;

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === item.correct) setScore((s) => s + 1);
  };

  const next = () => {
    setPicked(null);
    setQIndex((i) => (i + 1) % QUESTIONS.length);
  };

  return (
    <ViewShell title="Quiz" subtitle="Test your knowledge · Cell Biology" onBack={onBack}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Question {qIndex + 1} of {QUESTIONS.length}
          </span>
          <span>
            Score {score}/{QUESTIONS.length}
          </span>
        </div>
        <div className="mb-7 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${((qIndex + 1) / QUESTIONS.length) * 100}%` }}
          />
        </div>

        <Panel>
          <h2 className="text-lg font-semibold leading-relaxed text-foreground">{item.q}</h2>
          <div className="mt-5 space-y-3">
            {item.options.map((opt, i) => {
              const isCorrect = i === item.correct;
              const state =
                picked === null
                  ? "idle"
                  : isCorrect
                    ? "correct"
                    : picked === i
                      ? "wrong"
                      : "dim";
              return (
                <button
                  key={opt}
                  onClick={() => choose(i)}
                  className={[
                    "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                    state === "idle" &&
                      "border-border bg-secondary/60 text-foreground hover:bg-card-hover",
                    state === "correct" && "border-success/50 bg-success/15 text-foreground",
                    state === "wrong" && "border-destructive/50 bg-destructive/15 text-foreground",
                    state === "dim" && "border-border bg-secondary/30 text-muted-foreground",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span>{opt}</span>
                  {state === "correct" ? <Check size={16} /> : null}
                  {state === "wrong" ? <X size={16} /> : null}
                </button>
              );
            })}
          </div>
        </Panel>

        {picked !== null ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-2xl border border-border bg-accent/60 p-5"
          >
            <div className="flex items-start gap-3">
              <Lightbulb size={18} className="mt-0.5 shrink-0 text-highlight" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {picked === item.correct ? "Correct" : "Not quite"}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {item.explanation}
                </p>
              </div>
            </div>
            <button
              onClick={next}
              className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Next question
            </button>
          </motion.div>
        ) : null}
      </div>
    </ViewShell>
  );
}
