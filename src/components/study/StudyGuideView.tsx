import { FileText, Sparkles } from "lucide-react";
import { ViewShell } from "./shared";

const DOC = [
  {
    heading: "4.1 Cellular Respiration Overview",
    body: "Cellular respiration is the set of metabolic reactions that convert biochemical energy from nutrients into adenosine triphosphate (ATP), releasing waste products. In eukaryotes, the process is divided across the cytosol and the mitochondria.",
  },
  {
    heading: "4.2 Glycolysis",
    body: "Glycolysis occurs in the cytosol and splits one glucose molecule into two pyruvate molecules. The pathway consumes 2 ATP in its investment phase and yields 4 ATP plus 2 NADH, for a net gain of 2 ATP. No oxygen is required.",
  },
  {
    heading: "4.3 The Krebs Cycle",
    body: "Pyruvate is oxidised to acetyl-CoA, which enters the citric acid cycle in the mitochondrial matrix. Each turn releases 2 CO₂ and reduces 3 NAD⁺ and 1 FAD, feeding electrons into the transport chain.",
  },
  {
    heading: "4.4 Oxidative Phosphorylation",
    body: "Electrons pass along four complexes of the inner membrane, pumping protons into the intermembrane space. ATP synthase harnesses the resulting gradient to phosphorylate ADP, producing roughly 26–28 ATP per glucose.",
  },
];

const CONCEPTS = [
  {
    title: "Energy currency",
    points: ["ATP stores energy in phosphate bonds", "Hydrolysis of ATP → ADP + Pi releases ~30 kJ/mol"],
  },
  {
    title: "Three stages",
    points: ["Glycolysis (cytosol)", "Krebs cycle (matrix)", "Electron transport (inner membrane)"],
  },
  {
    title: "Key numbers",
    points: ["Net 2 ATP from glycolysis", "~32 ATP total per glucose", "2 CO₂ released per Krebs turn"],
  },
  {
    title: "Likely exam questions",
    points: ["Compare aerobic vs anaerobic yield", "Trace one electron from NADH to O₂"],
  },
];

export function StudyGuideView({ onBack }: { onBack: () => void }) {
  return (
    <ViewShell
      title="Study guide"
      subtitle="Prepare for a test · Chapter 4 — Cell Energetics"
      onBack={onBack}
    >
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
            <FileText size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">biology_ch4_lecture.pdf</span>
            <span className="ml-auto text-xs text-muted-foreground">Page 3 of 18</span>
          </div>
          <div className="max-h-[30rem] space-y-6 overflow-y-auto px-6 py-6">
            {DOC.map((s) => (
              <section key={s.heading}>
                <h3 className="text-base font-semibold text-foreground">{s.heading}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{s.body}</p>
              </section>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
            <Sparkles size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Key concepts</span>
          </div>
          <div className="max-h-[30rem] space-y-5 overflow-y-auto px-5 py-5">
            {CONCEPTS.map((c) => (
              <div key={c.title} className="rounded-xl bg-secondary/60 p-4">
                <p className="text-sm font-semibold text-foreground">{c.title}</p>
                <ul className="mt-2 space-y-1.5">
                  {c.points.map((p) => (
                    <li key={p} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
                      <span className="leading-6">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ViewShell>
  );
}
