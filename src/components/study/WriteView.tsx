import { useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { ViewShell } from "./shared";

const SHORTCUTS = ["Summarize", "Expand", "Tone adjustment", "Make concise", "Add citation"];

const SUGGESTIONS = [
  {
    label: "Thesis suggestion",
    text: "Consider stating your claim in the first two sentences: urban green space measurably reduces heat-island effects.",
  },
  {
    label: "Evidence gap",
    text: "Paragraph 2 asserts a 4°C difference but has no source. Cite Oke (1982) or your lecture notes.",
  },
  {
    label: "Transition",
    text: "Bridge paragraphs 2 and 3 with a sentence on cost, so the policy argument lands naturally.",
  },
];

const DRAFT = `Urban green space is no longer a decorative afterthought — it is climate infrastructure.

Across dense districts, tree canopy and permeable parkland lower ambient surface temperatures by several degrees during peak summer afternoons, easing both energy demand and heat-related illness.

Critics argue that land in the core is too valuable to leave unbuilt. Yet the cost of retrofitting cooling into existing buildings routinely exceeds the cost of planting and maintaining a comparable canopy.`;

export function WriteView({ onBack }: { onBack: () => void }) {
  const [text, setText] = useState(DRAFT);
  const [active, setActive] = useState<string | null>(null);

  return (
    <ViewShell title="Write" subtitle="Draft paragraphs or papers" onBack={onBack}>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            {SHORTCUTS.map((s) => (
              <button
                key={s}
                onClick={() => setActive(s)}
                className={[
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  active === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {s}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="h-[26rem] w-full resize-none bg-transparent px-6 py-5 text-sm leading-8 text-foreground outline-none"
          />
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <span>{text.trim().split(/\s+/).length} words</span>
            <span>{active ? `${active} applied to selection` : "Draft saved locally"}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
            <Sparkles size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">AI drafting</span>
          </div>
          <div className="space-y-4 px-5 py-5">
            {SUGGESTIONS.map((s) => (
              <div key={s.label} className="rounded-xl bg-secondary/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground">{s.text}</p>
                <button className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                  <Wand2 size={13} /> Apply
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ViewShell>
  );
}
