import { useState } from "react";
import { X, Check } from "lucide-react";
import { motion } from "framer-motion";
import { createSubscription } from "@/lib/api";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";

interface FeatureRow {
  category: string;
  detail: string;
  free: string | boolean;
  pro: string | boolean;
}

const COMPARISON_DATA: FeatureRow[] = [
  { category: "AI Document Chat", detail: "Daily / Monthly Query Limit", free: "30 AI queries / day", pro: "Unlimited (2,500 fast queries/mo)" },
  { category: "Document Ingestion", detail: "Max File Size", free: "15 MB per file", pro: "100 MB per file" },
  { category: "Document Ingestion", detail: "Total Active Documents", free: "10 documents", pro: "Unlimited" },
  { category: "Document Ingestion", detail: "Supported Formats", free: "PDF, PPTX, DOCX, TXT, MD", pro: "PDF, PPTX, DOCX, TXT, MD" },
  { category: "Document Ingestion", detail: "Image & Diagram OCR", free: "Included", pro: "High-Resolution OCR" },
  { category: "Web & Media", detail: "YouTube URL Ingestion", free: "Unlimited", pro: "Unlimited" },
  { category: "Web & Media", detail: "Webpage Article Scraping", free: "Unlimited", pro: "Unlimited" },
  { category: "Web & Media", detail: "Lecture MP3 / Audio Transcription", free: "—", pro: "20 Hours / month" },
  { category: "Workspace & Storage", detail: "Cloud File Storage", free: "200 MB SSD", pro: "10 GB SSD" },
  { category: "Workspace & Storage", detail: "Thesis / Research Formatter", free: "—", pro: "Included" },
  { category: "Code Runner", detail: "In-Browser Python (Pyodide)", free: "Unlimited", pro: "Unlimited" },
  { category: "Code Runner", detail: "Server Backend Sandbox", free: "—", pro: "Unlimited (C++, Java, JS, Go, Rust)" },
  { category: "Exams & Contests", detail: "Participate in MCQ Contests", free: "Free & Unlimited", pro: "Free & Unlimited" },
  { category: "Exams & Contests", detail: "AI Contest & Quiz Generator", free: "—", pro: "Unlimited AI generation" },
  { category: "Collaboration", detail: "Share Spaces & Invite Peers", free: "Unlimited", pro: "Unlimited" },
];

export function SubscriptionModal({
  isOpen,
  onClose,
  isPro = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  isPro?: boolean;
}) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">("annually");
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const { subscriptionId, keyId } = await createSubscription({ billingCycle });
      await openRazorpayCheckout({
        keyId,
        subscriptionId,
        name: "Espada Pro",
        description: billingCycle === "monthly" ? "$6.99/mo" : "$4.99/mo billed annually",
      });
      onClose();
    } catch (err) {
      if ((err as Error).message !== "Payment cancelled by user") {
        console.error("Upgrade failed:", err);
      }
    } finally {
      setUpgrading(false);
    }
  };

  if (!isOpen) return null;

  const proPrice = billingCycle === "annually" ? 4.99 : 6.99;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal Card wrapper */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="relative z-10 w-full max-w-[840px] sm:rounded-[24px] border border-border bg-[#0d0d0e] p-5 md:py-6 md:px-7 shadow-3xl max-h-[95dvh] flex flex-col overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full border border-border bg-secondary/40 p-2 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground cursor-pointer"
        >
          <X size={15} />
        </button>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto pr-1">
          {/* Header */}
          <div className="text-center mt-1">
            <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-0.5 text-[10px] font-bold tracking-wider text-foreground uppercase">
              Pricing Plans
            </span>
            <h2 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight mt-2.5">
              Supercharge Your Learning with Espada Pro
            </h2>
            <p className="text-xs text-muted-foreground max-w-lg mx-auto mt-1.5 leading-relaxed">
              Unlock advanced OCR tools, code sandboxes, unlimited AI queries, and massive cloud storage. Cancel anytime.
            </p>

            {/* Toggle Switch */}
            <div className="flex items-center justify-center gap-3.5 mt-5 mb-1">
              <span
                onClick={() => setBillingCycle("monthly")}
                className={`text-[11px] font-bold cursor-pointer select-none transition-colors ${billingCycle === "monthly" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Billed Monthly
              </span>

              {/* Slider Track */}
              <div
                onClick={() => setBillingCycle(billingCycle === "monthly" ? "annually" : "monthly")}
                className="relative h-5.5 w-10 cursor-pointer rounded-full bg-secondary transition-colors"
              >
                <div
                  className={`absolute top-0.5 size-4.5 rounded-full bg-foreground shadow-md transition-transform duration-200 ${billingCycle === "annually" ? "translate-x-5" : "translate-x-0.5"
                    }`}
                />
              </div>

              <div
                onClick={() => setBillingCycle("annually")}
                className="flex items-center gap-1.5 cursor-pointer select-none"
              >
                <span
                  className={`text-[11px] font-bold transition-colors ${billingCycle === "annually" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Billed Annually
                </span>
                <span className="rounded-full bg-[#10b981]/15 px-2 py-0.5 text-[9px] font-bold text-[#10b981] border border-[#10b981]/25">
                  Save 62%
                </span>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid md:grid-cols-2 gap-5 mt-5">

            {/* Free Plan Card */}
            <div className="rounded-2xl border border-border bg-[#18181b]/35 p-5 flex flex-col justify-between relative overflow-hidden">
              <div>
                <h3 className="text-base font-bold text-foreground">Free Plan</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Perfect for trying out Espada and basic study sessions.</p>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-foreground">$0</span>
                  <span className="text-[11px] text-muted-foreground font-medium">/ month</span>
                </div>
                <span className="text-[9px] text-muted-foreground font-semibold block mt-1">Free forever rate</span>

                {/* Bullet Highlights */}
                <div className="mt-5 space-y-2">
                  <div className="flex items-start gap-2.5 text-xs text-foreground font-semibold">
                    <Check size={13} className="text-foreground shrink-0 mt-0.5" />
                    <span>30 AI document chat queries / day</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground font-semibold">
                    <Check size={13} className="text-foreground shrink-0 mt-0.5" />
                    <span>15 MB max file size upload limit</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground font-semibold">
                    <Check size={13} className="text-foreground shrink-0 mt-0.5" />
                    <span>Up to 10 active files in your folder</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground font-semibold">
                    <Check size={13} className="text-foreground shrink-0 mt-0.5" />
                    <span>200 MB SSD cloud workspace storage</span>
                  </div>
                </div>
              </div>

              <button
                disabled
                className="w-full mt-6 rounded-xl bg-secondary/50 border border-border/85 py-2.5 text-xs font-bold text-muted-foreground cursor-not-allowed text-center transition-all"
              >
                Current Plan
              </button>
            </div>

            {/* Pro Plan Card */}
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.02] p-5 flex flex-col justify-between relative overflow-hidden">
              {/* Premium Glow effect */}
              <div className="absolute top-0 right-0 rounded-bl-2xl bg-primary/10 border-l border-b border-primary/25 px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground">
                Popular
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground">Pro Plan</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Accelerate your workflow with unlimited capabilities.</p>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-foreground">${proPrice}</span>
                  <span className="text-[11px] text-muted-foreground font-medium">/ month</span>
                </div>
                <span className="text-[9px] text-muted-foreground font-semibold block mt-1">
                  {billingCycle === "annually" ? "$59.88 billed annually ($4.99/mo)" : "Billed monthly ($6.99/mo)"}
                </span>

                {/* Bullet Highlights */}
                <div className="mt-5 space-y-2">
                  <div className="flex items-start gap-2.5 text-xs text-foreground font-semibold">
                    <Check size={13} className="text-foreground shrink-0 mt-0.5" />
                    <span>Unlimited AI queries (2,500 fast queries/mo)</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground font-semibold">
                    <Check size={13} className="text-foreground shrink-0 mt-0.5" />
                    <span>100 MB max file size upload limit</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground font-semibold">
                    <Check size={13} className="text-foreground shrink-0 mt-0.5" />
                    <span>Upload unlimited active documents</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground font-semibold">
                    <Check size={13} className="text-foreground shrink-0 mt-0.5" />
                    <span>20 hours lecture MP3 audio transcribing / mo</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground font-semibold">
                    <Check size={13} className="text-foreground shrink-0 mt-0.5" />
                    <span>10 GB SSD storage & Backend coding sandbox</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleUpgrade}
                disabled={upgrading || isPro}
                className={`w-full mt-6 rounded-xl py-2.5 text-xs font-bold text-center transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                  isPro
                    ? "bg-[#10b981]/20 border border-[#10b981]/30 text-[#10b981] cursor-default"
                    : "bg-foreground hover:opacity-90 text-background cursor-pointer shadow-foreground/5 hover:scale-[1.01]"
                }`}
              >
                {isPro ? "Already Subscribed" : upgrading ? "Processing..." : "Upgrade to Pro"}
              </button>
            </div>

          </div>

          {/* Feature Matrix Header */}
          <div className="mt-8 mb-4">
            <h3 className="text-sm font-extrabold text-foreground text-center">
              Compare Detailed Subscription Features
            </h3>
            <p className="text-[10px] text-muted-foreground text-center mt-0.5">
              A comprehensive breakdown of feature limits and format supports.
            </p>
          </div>

          {/* Feature Matrix Table */}
          <div className="rounded-xl border border-border/80 overflow-hidden bg-[#18181b]/15 mb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-[#1c1c1f]/40">
                    <th className="p-3 font-bold text-muted-foreground max-w-[180px]">Feature Details</th>
                    <th className="p-3 font-bold text-muted-foreground text-center">Free Plan</th>
                    <th className="p-3 font-bold text-muted-foreground text-center">Pro Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {COMPARISON_DATA.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#1f1f23]/25 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-foreground text-[11px]">{row.detail}</div>
                        <div className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                          {row.category}
                        </div>
                      </td>
                      <td className="p-3 text-center font-semibold text-muted-foreground text-[11px]">
                        {row.free}
                      </td>
                      <td className="p-3 text-center font-bold text-foreground text-[11px]">
                        {row.pro}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
