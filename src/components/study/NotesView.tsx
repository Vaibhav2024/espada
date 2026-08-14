import { useState } from "react";
import { Hash, Highlighter } from "lucide-react";
import { Panel, ViewShell } from "./shared";

const TAGS = ["biology-201", "midterm", "chapter-4", "lecture"];

const CHECKS = [
  { text: "Re-read section 4.4 on oxidative phosphorylation", done: true },
  { text: "Draw the electron transport chain from memory", done: true },
  { text: "Practice 10 stoichiometry problems", done: false },
  { text: "Compare aerobic and anaerobic ATP yields", done: false },
];

const HIGHLIGHTS = [
  { color: "bg-highlight/25", text: "The proton gradient — not the chain itself — powers ATP synthase." },
  { color: "bg-success/20", text: "Net ATP per glucose ≈ 32 under ideal aerobic conditions." },
  { color: "bg-destructive/20", text: "Common mistake: crediting glycolysis with 4 net ATP instead of 2." },
];

export function NotesView({ onBack }: { onBack: () => void }) {
  const [checks, setChecks] = useState(CHECKS);

  const toggle = (i: number) =>
    setChecks((c) => c.map((item, idx) => (idx === i ? { ...item, done: !item.done } : item)));

  return (
    <ViewShell title="Notes" subtitle="Detailed notes for any resource" onBack={onBack}>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-border bg-card px-6 py-6">
          <h2 className="text-xl font-semibold text-foreground"># Cell Energetics — Chapter 4</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
              >
                <Hash size={11} />
                {t}
              </span>
            ))}
          </div>

          <h3 className="mt-7 text-base font-semibold text-foreground">## Summary</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            Respiration converts glucose into ATP across three stages. Most of the yield comes from
            oxidative phosphorylation, which depends entirely on an intact proton gradient across
            the inner mitochondrial membrane.
          </p>

          <h3 className="mt-6 text-base font-semibold text-foreground">## Highlights</h3>
          <div className="mt-3 space-y-2.5">
            {HIGHLIGHTS.map((h) => (
              <p
                key={h.text}
                className={`rounded-lg ${h.color} px-3 py-2 text-sm leading-6 text-foreground`}
              >
                {h.text}
              </p>
            ))}
          </div>

          <h3 className="mt-6 text-base font-semibold text-foreground">## Revision checklist</h3>
          <div className="mt-3 space-y-2">
            {checks.map((c, i) => (
              <button
                key={c.text}
                onClick={() => toggle(i)}
                className="flex w-full items-start gap-3 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-secondary/50"
              >
                <span
                  className={[
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border text-[10px]",
                    c.done
                      ? "border-success/60 bg-success/25 text-foreground"
                      : "border-border text-transparent",
                  ].join(" ")}
                >
                  ✓
                </span>
                <span
                  className={`text-sm leading-6 ${
                    c.done ? "text-muted-foreground line-through" : "text-foreground"
                  }`}
                >
                  {c.text}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <Panel>
            <div className="flex items-center gap-2">
              <Highlighter size={15} className="text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Source</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Generated from <span className="text-foreground">biology_ch4_lecture.pdf</span> and
              your 12 September recording.
            </p>
          </Panel>
          <Panel>
            <p className="text-sm font-semibold text-foreground">Outline</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {["Summary", "Highlights", "Revision checklist"].map((s) => (
                <li key={s} className="rounded-lg bg-secondary/60 px-3 py-2">
                  {s}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </ViewShell>
  );
}
