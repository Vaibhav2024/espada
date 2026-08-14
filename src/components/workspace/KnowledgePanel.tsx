"use client";

import { useState, useEffect, useRef } from "react";
import {
  FolderOpen,
  ChevronsLeft,
  Crosshair,
  BookOpen,
  Brain,
  Link2,
  Upload,
  Plus,
} from "lucide-react";

export function KnowledgePanel({ onClose }: { onClose: () => void }) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [centerMenuOpen, setCenterMenuOpen] = useState(false);

  const headerMenuRef = useRef<HTMLDivElement>(null);
  const centerMenuRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLFormElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const addKnowledgeButtonRef = useRef<HTMLButtonElement>(null);

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (linkValue.trim()) {
      setKnowledgeCount((prev) => prev + 1);
      setLinkValue("");
      setShowLinkInput(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Close header menu if clicked outside
      if (
        headerMenuOpen &&
        headerMenuRef.current &&
        !headerMenuRef.current.contains(target) &&
        plusButtonRef.current &&
        !plusButtonRef.current.contains(target)
      ) {
        setHeaderMenuOpen(false);
      }

      // Close center menu if clicked outside
      if (
        centerMenuOpen &&
        centerMenuRef.current &&
        !centerMenuRef.current.contains(target) &&
        addKnowledgeButtonRef.current &&
        !addKnowledgeButtonRef.current.contains(target)
      ) {
        setCenterMenuOpen(false);
      }

      // Close link input popover if clicked outside input box/form
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

  return (
    <div className="relative flex h-full w-[350px] flex-col border-r border-border bg-[#0d0d0e]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4 gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-semibold text-foreground">Knowledge</span>
          <span className="text-xs font-semibold text-muted-foreground">{knowledgeCount}</span>
        </div>

        {/* Header Action Buttons */}
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

            {/* Custom Header Dropdown Menu (Image 2 style) */}
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
                  onClick={() => setHeaderMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary/60 text-left cursor-pointer transition-colors"
                >
                  <Upload size={14} className="text-muted-foreground" />
                  From computer
                </button>
              </div>
            )}
          </div>

          {/* Paste Link Popover overlay aligned below the Plus Button (Image 3 style) */}
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

      {/* Main Content / Empty Promo Center */}
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
                Knowledge allows Atlas to provide specific and accurate answers about the contents of your folder.
              </p>
            </div>
            <div className="flex gap-3 items-start">
              <BookOpen size={16} className="text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Atlas learns the most from textbooks, lectures, readings, notes, assignments, and tests.
              </p>
            </div>
            <div className="flex gap-3 items-start">
              <Brain size={16} className="text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                The more knowledge you can add, the better. Every resource added makes Atlas smarter.
              </p>
            </div>
          </div>

          {/* Center Add Knowledge CTA Button */}
          <div className="relative mt-8">
            <button
              ref={addKnowledgeButtonRef}
              onClick={() => setCenterMenuOpen((prev) => !prev)}
              className="rounded-xl bg-zinc-800 border border-white/[0.08] hover:bg-zinc-700 px-4 py-2.5 text-xs font-semibold text-foreground transition active:scale-[0.98] cursor-pointer"
            >
              Add knowledge
            </button>

            {/* Custom Center Dropdown Menu */}
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
                  onClick={() => setCenterMenuOpen(false)}
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
    </div>
  );
}
