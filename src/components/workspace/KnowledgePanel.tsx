"use client";

import { useState, useEffect, useRef } from "react";
import { uploadKnowledge, addKnowledgeLink } from "@/lib/api";
import {
  FolderOpen,
  ChevronsLeft,
  Crosshair,
  BookOpen,
  Brain,
  Link2,
  Upload,
  Plus,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export interface KnowledgeItem {
  id: string;
  name: string;
  type: "link" | "file";
  folderId: string;
  status?: "queued" | "processing" | "ready" | "failed";
  assetId?: string;
}

export function KnowledgePanel({
  onClose,
  items = [],
  onAddItem,
  folderId,
  onUpdateItemStatus,
  onRefresh,
}: {
  onClose: () => void;
  items?: KnowledgeItem[];
  onAddItem?: (name: string, type: "link" | "file", assetId?: string, status?: string) => void;
  folderId?: string;
  onUpdateItemStatus?: (id: string, status: "queued" | "processing" | "ready" | "failed") => void;
  onRefresh?: () => void;
}) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [centerMenuOpen, setCenterMenuOpen] = useState(false);

  const headerMenuRef = useRef<HTMLDivElement>(null);
  const centerMenuRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLFormElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const addKnowledgeButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkValue.trim()) return;

    const url = linkValue.trim();
    onAddItem?.(url, "link", undefined, "queued");
    setLinkValue("");
    setShowLinkInput(false);

    if (folderId) {
      try {
        await addKnowledgeLink(folderId, url);
        onRefresh?.();
      } catch (err) {
        console.error("Failed to add link:", err);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    for (const file of Array.from(e.target.files)) {
      if (folderId) {
        // Add optimistic item
        onAddItem?.(file.name, "file", undefined, "queued");

        try {
          const result = await uploadKnowledge(folderId, file);

          // Replace the optimistic item with the real one (by refreshing the list)
          // The parent's useEffect on activeFolderId won't re-run, so call onRefresh
          onRefresh?.();

          // Poll for embedding completion
          const poll = async () => {
            for (let i = 0; i < 30; i++) {
              await new Promise((r) => setTimeout(r, 2000));
              try {
                const res = await fetch(`/api/assets/${result.asset.id}/status`);
                if (res.ok) {
                  const { status } = await res.json();
                  if (status === "ready" || status === "failed") {
                    onRefresh?.();
                    return;
                  }
                }
              } catch {}
            }
          };
          poll();
        } catch (err) {
          console.error("Upload failed:", err);
        }
      } else {
        onAddItem?.(file.name, "file", undefined, "queued");
      }
    }
    e.target.value = "";
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (
        headerMenuOpen &&
        headerMenuRef.current &&
        !headerMenuRef.current.contains(target) &&
        plusButtonRef.current &&
        !plusButtonRef.current.contains(target)
      ) {
        setHeaderMenuOpen(false);
      }

      if (
        centerMenuOpen &&
        centerMenuRef.current &&
        !centerMenuRef.current.contains(target) &&
        addKnowledgeButtonRef.current &&
        !addKnowledgeButtonRef.current.contains(target)
      ) {
        setCenterMenuOpen(false);
      }

      if (
        showLinkInput &&
        linkInputRef.current &&
        !linkInputRef.current.contains(target)
      ) {
        setShowLinkInput(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [headerMenuOpen, centerMenuOpen, showLinkInput]);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "queued":
      case "processing":
        return <Loader2 size={12} className="text-blue-400 animate-spin shrink-0" />;
      case "ready":
        return <CheckCircle2 size={12} className="text-green-400 shrink-0" />;
      case "failed":
        return <AlertCircle size={12} className="text-red-400 shrink-0" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "queued":
        return "Queued";
      case "processing":
        return "Embedding...";
      case "ready":
        return "Ready";
      case "failed":
        return "Failed";
      default:
        return "";
    }
  };

  return (
    <div className="relative flex h-full w-[350px] flex-col border-r border-border bg-[#0d0d0e] select-none">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4 gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-semibold text-foreground">Knowledge</span>
          <span className="text-xs font-semibold text-muted-foreground">{items.length}</span>
        </div>

        <div className="flex items-center gap-3 shrink-0 relative">
          <div className="relative">
            <button
              ref={plusButtonRef}
              onClick={() => setHeaderMenuOpen((prev) => !prev)}
              aria-label="Add resource"
              className="text-muted-foreground transition-colors hover:text-foreground cursor-pointer flex items-center justify-center p-1 rounded hover:bg-white/5"
            >
              <Plus size={16} />
            </button>

            {headerMenuOpen && (
              <div
                ref={headerMenuRef}
                className="absolute right-0 top-7 z-50 w-[180px] rounded-2xl border border-border bg-[#161617] p-2 shadow-2xl animate-[fadeIn_0.12s_ease-out]"
              >
                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground">
                  Add resource
                </div>
                <button
                  onClick={() => {
                    setShowLinkInput(true);
                    setHeaderMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary/60 text-left cursor-pointer transition-colors"
                >
                  <Link2 size={14} className="text-muted-foreground" />
                  From link
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setHeaderMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary/60 text-left cursor-pointer transition-colors"
                >
                  <Upload size={14} className="text-muted-foreground" />
                  From computer
                </button>
              </div>
            )}
          </div>

          {showLinkInput && (
            <form
              ref={linkInputRef}
              onSubmit={handleAddLink}
              className="absolute right-0 top-11 z-[60] flex items-center gap-2 rounded-2xl border border-[#2d2d30] bg-[#1e1e20] p-1.5 pl-3.5 shadow-2xl w-[260px] animate-[fadeIn_0.12s_ease-out]"
            >
              <input
                type="url"
                required
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                placeholder="Paste a link"
                className="flex-1 bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground focus:ring-0 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#2e2e30] border border-white/[0.04] hover:bg-zinc-800 px-4 py-2 text-xs font-semibold text-foreground transition active:scale-95 cursor-pointer"
              >
                Add
              </button>
            </form>
          )}

          <button
            onClick={onClose}
            aria-label="Collapse panel"
            className="text-muted-foreground transition-colors hover:text-foreground cursor-pointer flex items-center justify-center p-1 rounded hover:bg-white/5"
          >
            <ChevronsLeft size={16} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      {items.length === 0 ? (
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mt-12 flex flex-col items-center text-center">
            <div className="flex size-14 items-center justify-center rounded-xl bg-secondary/30 border border-border text-muted-foreground mb-6">
              <FolderOpen size={24} />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-6">Add more knowledge</h3>

            <div className="space-y-6 text-left w-full">
              <div className="flex gap-3 items-start">
                <Crosshair size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Knowledge allows Espada to provide specific and accurate answers about the contents of your folder.
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <BookOpen size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Espada learns the most from textbooks, lectures, readings, notes, assignments, and tests.
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <Brain size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  The more knowledge you can add, the better. Every resource added makes Espada smarter.
                </p>
              </div>
            </div>

            <div className="relative mt-8">
              <button
                ref={addKnowledgeButtonRef}
                onClick={() => setCenterMenuOpen((prev) => !prev)}
                className="rounded-xl bg-zinc-800 border border-white/[0.08] hover:bg-zinc-700 px-4 py-2.5 text-xs font-semibold text-foreground transition active:scale-[0.98] cursor-pointer"
              >
                Add knowledge
              </button>

              {centerMenuOpen && (
                <div
                  ref={centerMenuRef}
                  className="absolute left-1/2 -translate-x-1/2 top-11 z-50 w-[180px] rounded-2xl border border-border bg-[#161617] p-2 shadow-2xl animate-[fadeIn_0.12s_ease-out]"
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground">
                    Add resource
                  </div>
                  <button
                    onClick={() => {
                      setShowLinkInput(true);
                      setCenterMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary/60 text-left cursor-pointer transition-colors"
                  >
                    <Link2 size={14} className="text-muted-foreground" />
                    From link
                  </button>
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setCenterMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary/60 text-left cursor-pointer transition-colors"
                  >
                    <Upload size={14} className="text-muted-foreground" />
                    From computer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-2.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-border/80 bg-secondary/20 px-3.5 py-3 transition-colors hover:bg-secondary/40 animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <div className="flex items-center gap-3 text-xs font-semibold text-foreground min-w-0">
                {item.type === "link" ? (
                  <Link2 size={14} className="text-muted-foreground shrink-0" />
                ) : (
                  <FileText size={14} className="text-muted-foreground shrink-0" />
                )}
                <span className="truncate pr-2">{item.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {getStatusIcon(item.status)}
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded capitalize ${
                  item.status === "processing" || item.status === "queued"
                    ? "text-blue-400 bg-blue-400/10"
                    : item.status === "ready"
                    ? "text-green-400 bg-green-400/10"
                    : item.status === "failed"
                    ? "text-red-400 bg-red-400/10"
                    : "text-muted-foreground bg-secondary/80"
                }`}>
                  {getStatusLabel(item.status) || item.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
