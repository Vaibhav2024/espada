import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, Pause, Play, Square } from "lucide-react";
import { Panel, ViewShell } from "./shared";

const TRANSCRIPT = [
  "So today we're picking up where we left off — the electron transport chain.",
  "Remember, the whole point of the chain is to build a proton gradient, not to make ATP directly.",
  "Complex I accepts electrons from NADH. Complex II takes them from FADH₂, which is why FADH₂ yields less ATP.",
  "ATP synthase is the turbine at the end. Protons flow back through it and drive phosphorylation.",
  "For the exam, be able to explain why cyanide is lethal: it blocks Complex IV, so the gradient collapses.",
];

const TAKEAWAYS = [
  "The chain's purpose is the proton gradient, not direct ATP synthesis",
  "FADH₂ enters at Complex II, so it yields fewer ATP than NADH",
  "ATP synthase converts the gradient into chemical energy",
  "Complex IV inhibitors (cyanide) halt respiration entirely",
];

const BARS = Array.from({ length: 44 }, (_, i) => 0.25 + ((i * 37) % 70) / 100);

export function RecordingView({ onBack }: { onBack: () => void }) {
  const [recording, setRecording] = useState(true);
  const [seconds, setSeconds] = useState(184);
  const [lines, setLines] = useState(3);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!recording) return;
    timer.current = setInterval(() => {
      setSeconds((s) => s + 1);
      setLines((l) => (l < TRANSCRIPT.length ? l + (Math.random() > 0.75 ? 1 : 0) : l));
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [recording]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <ViewShell title="Recording" subtitle="Automatic lecture notes" onBack={onBack}>
      <div className="mx-auto max-w-3xl">
        <Panel className="flex flex-col items-center">
          <div className="flex h-24 w-full items-center justify-center gap-1">
            {BARS.map((h, i) => (
              <motion.span
                key={i}
                className="w-1.5 rounded-full bg-muted-foreground/70"
                animate={
                  recording
                    ? { scaleY: [h, Math.min(1, h + 0.5), h * 0.6, h] }
                    : { scaleY: 0.15 }
                }
                transition={
                  recording
                    ? { duration: 1.1 + (i % 5) * 0.12, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.3 }
                }
                style={{ height: "100%", originY: 0.5 }}
              />
            ))}
          </div>

          <p className="mt-4 font-mono text-3xl font-semibold tabular-nums text-foreground">
            {mm}:{ss}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {recording ? "Recording — Biology 201, Lecture 12" : "Paused"}
          </p>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => setRecording((r) => !r)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {recording ? <Pause size={16} /> : <Play size={16} />}
              {recording ? "Pause" : "Resume"}
            </button>
            <button
              onClick={() => {
                setRecording(false);
                setSeconds(0);
                setLines(1);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground"
            >
              <Square size={14} /> Stop
            </button>
          </div>
        </Panel>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Panel>
            <div className="flex items-center gap-2">
              <Mic size={15} className="text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Live transcript</p>
            </div>
            <div className="mt-4 space-y-3">
              {TRANSCRIPT.slice(0, lines).map((t, i) => (
                <motion.p
                  key={t}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm leading-6 text-muted-foreground"
                >
                  <span className="mr-2 font-mono text-xs text-foreground/60">
                    {String(Math.floor(i * 0.7)).padStart(2, "0")}:
                    {String((i * 41) % 60).padStart(2, "0")}
                  </span>
                  {t}
                </motion.p>
              ))}
            </div>
          </Panel>

          <Panel>
            <p className="text-sm font-semibold text-foreground">Key takeaways</p>
            <ul className="mt-4 space-y-3">
              {TAKEAWAYS.map((t) => (
                <li key={t} className="flex gap-2.5 text-sm leading-6 text-muted-foreground">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-highlight" />
                  {t}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </ViewShell>
  );
}
