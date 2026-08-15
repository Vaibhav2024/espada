import { useState } from "react";
import { FileText, X, Check } from "lucide-react";
import { motion } from "framer-motion";

export const PRE_UPLOADED_DOCUMENTS = [
  "Vaibhav_Patil_Resume.docx",
  "Indus_Combined_Final_Quotation.docx",
  "biology_lecture_ch4.pdf",
];

export function KnowledgeSelectorModal({
  isOpen,
  onClose,
  onSelectMultiple,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectMultiple: (fileNames: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelect = (fileName: string) => {
    setSelected((prev) =>
      prev.includes(fileName)
        ? prev.filter((f) => f !== fileName)
        : [...prev, fileName]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-[420px] rounded-2xl border border-border bg-[#18181b] p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <h3 className="text-sm font-semibold text-foreground">Select from Knowledge</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X size={15} />
          </button>
        </div>

        <div className="mt-4 space-y-2 max-h-[250px] overflow-y-auto">
          {PRE_UPLOADED_DOCUMENTS.map((doc) => {
            const isChecked = selected.includes(doc);
            return (
              <div
                key={doc}
                onClick={() => toggleSelect(doc)}
                className="flex items-center justify-between rounded-xl border border-border bg-[#27272a]/20 px-3.5 py-3 cursor-pointer hover:bg-[#27272a] transition-colors"
              >
                <div className="flex items-center gap-3 text-xs font-semibold text-foreground">
                  <FileText size={15} className="text-muted-foreground" />
                  <span>{doc}</span>
                </div>
                <div className="flex size-4 items-center justify-center rounded border border-muted-foreground shrink-0 bg-transparent">
                  {isChecked && <Check size={11} className="text-foreground" />}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => {
            onSelectMultiple(selected);
            setSelected([]);
            onClose();
          }}
          disabled={selected.length === 0}
          className={`w-full mt-5 rounded-xl py-2.5 text-xs font-semibold transition-all ${
            selected.length === 0
              ? "bg-[#27272a] text-muted-foreground cursor-not-allowed border border-border"
              : "bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
          }`}
        >
          Add Selected ({selected.length})
        </button>
      </motion.div>
    </div>
  );
}
