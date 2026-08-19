"use client";
import { useState, useEffect } from "react";
import { FileText, X, Check, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { fetchKnowledgeItems, type KnowledgeItemData } from "@/lib/api";

export function KnowledgeSelectorModal({
  isOpen,
  onClose,
  onSelectMultiple,
  onSelectWithAssets,
  folderId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectMultiple: (fileNames: string[]) => void;
  onSelectWithAssets?: (items: { name: string; assetId: string }[]) => void;
  folderId?: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [documents, setDocuments] = useState<{ name: string; status: string; assetId: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Load knowledge items from API when modal opens
  useEffect(() => {
    if (isOpen && folderId) {
      setLoading(true);
      fetchKnowledgeItems(folderId)
        .then((items) => {
          setDocuments(
            items
              .filter((item) => item.asset.status === "ready")
              .map((item) => ({ name: item.asset.name, status: item.asset.status, assetId: item.assetId }))
          );
        })
        .catch(() => setDocuments([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, folderId]);

  const toggleSelect = (fileName: string) => {
    setSelected((prev) =>
      prev.includes(fileName)
        ? prev.filter((f) => f !== fileName)
        : [...prev, fileName]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="text-muted-foreground animate-spin" />
              <span className="ml-2 text-xs text-muted-foreground">Loading knowledge...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <FileText size={24} className="text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">
                No documents ready yet. Upload files to the Knowledge section first.
              </p>
            </div>
          ) : (
            documents.map((doc) => {
              const isChecked = selected.includes(doc.name);
              return (
                <div
                  key={doc.name}
                  onClick={() => toggleSelect(doc.name)}
                  className="flex items-center justify-between rounded-xl border border-border bg-[#27272a]/20 px-3.5 py-3 cursor-pointer hover:bg-[#27272a] transition-colors"
                >
                  <div className="flex items-center gap-3 text-xs font-semibold text-foreground">
                    <FileText size={15} className="text-muted-foreground" />
                    <span>{doc.name}</span>
                  </div>
                  <div className="flex size-4 items-center justify-center rounded border border-muted-foreground shrink-0 bg-transparent">
                    {isChecked && <Check size={11} className="text-foreground" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          onClick={() => {
            onSelectMultiple(selected);
            if (onSelectWithAssets) {
              const selectedItems = documents
                .filter((d) => selected.includes(d.name))
                .map((d) => ({ name: d.name, assetId: d.assetId }));
              onSelectWithAssets(selectedItems);
            }
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
