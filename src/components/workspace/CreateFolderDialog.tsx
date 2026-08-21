import { useState, useRef, useEffect } from "react";
import * as Lucide from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";

const THEMES = [
  { name: "Lychee", color: "#f43f5e" },
  { name: "Mango", color: "#f97316" },
  { name: "Plum", color: "#a855f7" },
  { name: "Blueberry", color: "#3b82f6" },
  { name: "Kiwi", color: "#22c55e" },
  { name: "Pitaya", color: "#ec4899" },
  { name: "Smoothie", color: "#06b6d4" },
  { name: "Macaron", color: "#0891b2" },
  { name: "Acai", color: "#6366f1" },
  { name: "Grape", color: "#8b5cf6" },
  { name: "Apricot", color: "#eab308" },
  { name: "Lime", color: "#84cc16" },
];

const ICONS = [
  { name: "Graduation Cap", key: "GraduationCap" },
  { name: "Mail", key: "Mail" },
  { name: "Bolt", key: "Bolt" },
  { name: "Camera", key: "Camera" },
  { name: "Laptop Computer", key: "Laptop" },
  { name: "Book Pages", key: "BookOpen" },
  { name: "Book", key: "Book" },
  { name: "Eraser", key: "Eraser" },
  { name: "Test Tube", key: "TestTube" },
  { name: "Trash", key: "Trash" },
  { name: "Folder", key: "Folder" },
  { name: "Clipboard", key: "Clipboard" },
  { name: "Paperplane", key: "Send" },
  { name: "Tray", key: "Tray" },
  { name: "External Drive", key: "HardDrive" },
  { name: "Doc", key: "FileText" },
  { name: "Person", key: "User" },
  { name: "Dumbbell", key: "Dumbbell" },
  { name: "Flame", key: "Flame" },
  { name: "Cloud", key: "Cloud" },
  { name: "Mic", key: "Mic" },
  { name: "Play", key: "Play" },
  { name: "Triangle", key: "Triangle" },
  { name: "Octagon", key: "Octagon" },
  { name: "Hexagon", key: "Hexagon" },
  { name: "Pentagon", key: "Pentagon" },
  { name: "Heart", key: "Heart" },
  { name: "Star", key: "Star" },
];

export function CreateFolderDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate?: (name: string, themeName: string, themeColor: string, iconName: string, isPublic: boolean) => void;
}) {
  const [showAbout, setShowAbout] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [name, setName] = useState("");
  const [selectedTheme, setSelectedTheme] = useState(THEMES[10]); // Defaults to Apricot
  const [selectedIcon, setSelectedIcon] = useState(ICONS[5]); // Defaults to Book Pages
  
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [iconDropdownOpen, setIconDropdownOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState("");

  const themeRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setThemeDropdownOpen(false);
      }
      if (iconRef.current && !iconRef.current.contains(event.target as Node)) {
        setIconDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreate = () => {
    if (name.trim()) {
      if (onCreate) {
        onCreate(name.trim(), selectedTheme.name, selectedTheme.color, selectedIcon.key, isPublic);
      }
      setName("");
      setSelectedTheme(THEMES[10]);
      setSelectedIcon(ICONS[5]);
      onOpenChange(false);
    }
  };

  const filteredIcons = ICONS.filter((icon) =>
    icon.name.toLowerCase().includes(iconSearch.toLowerCase())
  );

  const SelectedIconComponent = (Lucide as any)[selectedIcon.key] || Lucide.BookOpen;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[500px] gap-0 sm:rounded-3xl rounded-2xl border-border bg-popover p-6 sm:p-8 z-50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight">Create folder</DialogTitle>
        </DialogHeader>

        {showAbout ? (
          <div className="mt-6 rounded-2xl bg-secondary/60 p-5 relative">
            <div className="flex items-start justify-between">
              <p className="text-sm font-semibold text-foreground">About folders</p>
              <button
                onClick={() => setShowAbout(false)}
                aria-label="Dismiss"
                className="text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              >
                <Lucide.X size={17} />
              </button>
            </div>
            <div className="mt-4 flex gap-3">
              <Lucide.FolderOpen size={19} className="mt-0.5 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Folders help you organize the resources that you want Espada to carefully study.
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <Lucide.Brain size={19} className="mt-0.5 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Spaces only use knowledge contained within the folder they were created in.
              </p>
            </div>
          </div>
        ) : null}

        <p className="mt-6 text-sm font-semibold text-foreground">Name</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="eg: CHEM 120-A, MCAT, Marketing Strategies"
          className="mt-3 w-full rounded-xl bg-[#27272a]/40 px-4 py-3.5 text-sm text-foreground outline-none border border-border focus:ring-1 focus:ring-ring"
        />

        <div className="mt-6 grid grid-cols-2 gap-4 relative">
          {/* THEME COLOR SELECTOR */}
          <div className="relative" ref={themeRef}>
            <p className="text-sm font-semibold text-foreground">Theme</p>
            <button
              onClick={() => {
                setThemeDropdownOpen(!themeDropdownOpen);
                setIconDropdownOpen(false);
              }}
              className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl bg-secondary/60 px-4 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-card-hover border border-border/80 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="size-3.5 rounded-full shrink-0" style={{ backgroundColor: selectedTheme.color }} />
                <span>{selectedTheme.name}</span>
              </div>
              <Lucide.ChevronDown size={14} className="text-muted-foreground" />
            </button>

            <AnimatePresence>
              {themeDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute left-0 right-0 mt-2 max-h-[220px] overflow-y-auto rounded-xl border border-border bg-[#1c1c1f] p-1.5 shadow-2xl z-50"
                >
                  {THEMES.map((theme) => (
                    <button
                      key={theme.name}
                      onClick={() => {
                        setSelectedTheme(theme);
                        setThemeDropdownOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors border-none bg-transparent text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: theme.color }} />
                        <span>{theme.name}</span>
                      </div>
                      {selectedTheme.name === theme.name && (
                        <Lucide.Check size={12} className="text-[#3b82f6]" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ICON SELECTOR */}
          <div className="relative" ref={iconRef}>
            <p className="text-sm font-semibold text-foreground">Icon</p>
            <button
              onClick={() => {
                setIconDropdownOpen(!iconDropdownOpen);
                setThemeDropdownOpen(false);
                setIconSearch("");
              }}
              className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl bg-secondary/60 px-4 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-card-hover border border-border/80 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 truncate">
                <SelectedIconComponent size={16} className="shrink-0 text-muted-foreground" />
                <span className="truncate">{selectedIcon.name}</span>
              </div>
              <Lucide.ChevronDown size={14} className="text-muted-foreground" />
            </button>

            <AnimatePresence>
              {iconDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute left-0 right-0 mt-2 w-[220px] max-h-[250px] overflow-y-auto rounded-xl border border-border bg-[#1c1c1f] p-1.5 shadow-2xl z-50"
                >
                  {/* Search box inside Icon selection dropdown */}
                  <div className="relative flex items-center mb-2 px-1 py-1">
                    <Lucide.Search size={12} className="absolute left-3 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search icons..."
                      value={iconSearch}
                      onChange={(e) => setIconSearch(e.target.value)}
                      className="w-full rounded-lg bg-[#18181b] pl-8 pr-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none border border-border/60"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-0.5 overflow-y-auto max-h-[180px]">
                    {filteredIcons.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic text-center py-2">
                        No icons found
                      </p>
                    ) : (
                      filteredIcons.map((icon) => {
                        const IconComponent = (Lucide as any)[icon.key] || Lucide.Folder;
                        return (
                          <button
                            key={icon.key}
                            onClick={() => {
                              setSelectedIcon(icon);
                              setIconDropdownOpen(false);
                            }}
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors border-none bg-transparent text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <IconComponent size={14} className="text-muted-foreground shrink-0" />
                              <span className="truncate">{icon.name}</span>
                            </div>
                            {selectedIcon.key === icon.key && (
                              <Lucide.Check size={12} className="text-[#3b82f6] shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            Public
            <Lucide.Info size={14} className="text-muted-foreground" />
          </span>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </div>

        <button
          onClick={handleCreate}
          disabled={!name.trim()}
          className="mt-7 w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-none outline-none"
        >
          Create
        </button>
      </DialogContent>
    </Dialog>
  );
}
