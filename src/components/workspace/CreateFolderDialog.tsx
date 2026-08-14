import { useState } from "react";
import { Brain, BookOpen, FolderOpen, Info, X } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export function CreateFolderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [showAbout, setShowAbout] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [name, setName] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] gap-0 rounded-3xl border-border bg-popover p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight">Create folder</DialogTitle>
        </DialogHeader>

        {showAbout ? (
          <div className="mt-6 rounded-2xl bg-secondary/60 p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm font-semibold text-foreground">About folders</p>
              <button
                onClick={() => setShowAbout(false)}
                aria-label="Dismiss"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X size={17} />
              </button>
            </div>
            <div className="mt-4 flex gap-3">
              <FolderOpen size={19} className="mt-0.5 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Folders help you organize the resources that you want Espada to carefully study.
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <Brain size={19} className="mt-0.5 shrink-0 text-muted-foreground" />
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
          className="mt-3 w-full rounded-xl bg-secondary/60 px-4 py-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
        />

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Theme</p>
            <button className="mt-3 flex w-full items-center gap-3 rounded-xl bg-secondary/60 px-4 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-card-hover">
              <span className="size-4 rounded-[5px] bg-highlight" />
              Apricot
            </button>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Icon</p>
            <button className="mt-3 flex w-full items-center gap-3 rounded-xl bg-secondary/60 px-4 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-card-hover">
              <BookOpen size={16} className="text-muted-foreground" />
              Book Pages
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            Public
            <Info size={14} className="text-muted-foreground" />
          </span>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </div>

        <button
          onClick={() => onOpenChange(false)}
          className="mt-7 w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Create
        </button>
      </DialogContent>
    </Dialog>
  );
}
