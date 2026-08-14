import { useState } from "react";
import { motion } from "framer-motion";
import { Paperclip, SendHorizontal, Sigma } from "lucide-react";
import { Panel, ViewShell } from "./shared";

const STEPS = [
  {
    title: "Step 1 — Identify the given values",
    body: "A projectile is launched at v₀ = 24 m/s at θ = 35° above horizontal. Gravity g = 9.81 m/s². We want the maximum height.",
  },
  {
    title: "Step 2 — Resolve the vertical component",
    body: "v₀ᵥ = v₀ · sin θ = 24 · sin 35° = 13.76 m/s",
  },
  {
    title: "Step 3 — Apply the kinematic equation",
    body: "At the apex the vertical velocity is zero, so v² = v₀ᵥ² − 2g·h gives h = v₀ᵥ² / (2g).",
  },
  {
    title: "Step 4 — Substitute and evaluate",
    body: "h = (13.76)² / (2 · 9.81) = 189.3 / 19.62 = 9.65 m",
  },
];

export function SolveView({ onBack }: { onBack: () => void }) {
  const [value, setValue] = useState(
    "A ball is launched at 24 m/s at 35° above the horizontal. What is its maximum height?",
  );
  const [solved, setSolved] = useState(true);

  return (
    <ViewShell title="Solve" subtitle="Get answers and explanations" onBack={onBack}>
      <div className="mx-auto max-w-3xl">
        <Panel>
          <textarea
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSolved(false);
            }}
            rows={3}
            placeholder="Type or paste a homework problem…"
            className="w-full resize-none bg-transparent text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
            <button className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <Paperclip size={15} /> Upload a photo
            </button>
            <button
              onClick={() => setSolved(true)}
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Solve <SendHorizontal size={15} />
            </button>
          </div>
        </Panel>

        {solved ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mt-5 space-y-3">
              {STEPS.map((s, i) => (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <p className="text-sm font-semibold text-foreground">{s.title}</p>
                  <p className="mt-1.5 text-sm leading-7 text-muted-foreground">{s.body}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-success/40 bg-success/10 p-5">
              <div className="flex items-center gap-2">
                <Sigma size={16} className="text-foreground" />
                <p className="text-sm font-semibold text-foreground">Final answer</p>
              </div>
              <p className="mt-2 text-2xl font-semibold text-foreground">h ≈ 9.65 m</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Formula used: h = (v₀ sin θ)² / 2g
              </p>
            </div>
          </motion.div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">
            Press Solve to see a step-by-step breakdown.
          </p>
        )}
      </div>
    </ViewShell>
  );
}
