import { useState } from "react";
import { motion } from "framer-motion";
import { Check, RotateCcw, X } from "lucide-react";
import { Panel, ViewShell } from "./shared";

const CARDS = [
  { front: "Mitochondria", back: "Organelle that produces ATP via oxidative phosphorylation." },
  { front: "Osmosis", back: "Diffusion of water across a semi-permeable membrane." },
  { front: "Enzyme", back: "A protein catalyst that lowers activation energy of a reaction." },
  { front: "Homeostasis", back: "Maintenance of a stable internal environment." },
  { front: "Photosynthesis", back: "6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂" },
  { front: "Glycolysis", back: "Breakdown of glucose into 2 pyruvate, net 2 ATP." },
  { front: "Diffusion", back: "Passive movement of particles down a concentration gradient." },
  { front: "ATP", back: "Adenosine triphosphate — the cell's energy currency." },
  { front: "Ribosome", back: "Site of protein synthesis from mRNA." },
  { front: "Meiosis", back: "Division producing four haploid gametes." },
  { front: "Allele", back: "One of several forms of a gene at a given locus." },
  { front: "Phenotype", back: "Observable traits resulting from genotype and environment." },
];

export function FlashcardsView({ onBack }: { onBack: () => void }) {
  const [index, setIndex] = useState(2);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(7);
  const card = CARDS[index]!;

  const advance = (didKnow: boolean) => {
    if (didKnow) setKnown((k) => k + 1);
    setFlipped(false);
    setIndex((i) => (i + 1) % CARDS.length);
  };

  return (
    <ViewShell title="Flashcards" subtitle="Bite-sized studying · Cell Biology deck" onBack={onBack}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Card {index + 1} of {CARDS.length}
          </span>
          <span>{known} marked as known</span>
        </div>
        <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${((index + 1) / CARDS.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 160, damping: 22 }}
          />
        </div>

        <div
          className="[perspective:1400px] cursor-pointer select-none"
          onClick={() => setFlipped((f) => !f)}
        >
          <motion.div
            className="relative h-64 w-full [transform-style:preserve-3d]"
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center [backface-visibility:hidden]">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Term</span>
              <span className="mt-3 text-3xl font-semibold text-foreground">{card.front}</span>
              <span className="mt-6 text-xs text-muted-foreground">Click to flip</span>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-border bg-accent p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Definition
              </span>
              <span className="mt-3 text-lg leading-relaxed text-foreground">{card.back}</span>
            </div>
          </motion.div>
        </div>

        <div className="mt-7 flex items-center justify-center gap-3">
          <button
            onClick={() => advance(false)}
            className="inline-flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-destructive/20"
          >
            <X size={16} /> Don't know
          </button>
          <button
            onClick={() => setFlipped((f) => !f)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground"
          >
            <RotateCcw size={15} /> Flip
          </button>
          <button
            onClick={() => advance(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-success/40 bg-success/15 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-success/25"
          >
            <Check size={16} /> Know
          </button>
        </div>

        <Panel className="mt-8">
          <p className="text-sm text-muted-foreground">
            Deck generated from <span className="text-foreground">Lecture 4 — Cell Energetics</span>{" "}
            and your highlighted textbook pages.
          </p>
        </Panel>
      </div>
    </ViewShell>
  );
}
