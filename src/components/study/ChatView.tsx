import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Folder,
  ChevronRight,
  Plus,
  Send,
  Globe,
  User,
  Users,
  X,
  FileText,
  Search,
  Check,
  Sparkles,
  Link2,
  FileUp,
  FolderHeart,
  ListChecks,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { KnowledgeSelectorModal } from "./KnowledgeSelector";

interface Resource {
  id: string;
  name: string;
  loading: boolean;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export function ChatView({
  spaceName,
  resources = [],
  focusedResourceIds = [],
  onAddResource,
  onRemoveResource,
  onToggleFocusResource,
  onUpdateResourceLoading,
  hideHeader = false,
  initialMessages,
}: {
  spaceName: string;
  resources: Resource[];
  focusedResourceIds: string[];
  onAddResource: (res: { id: string; name: string; loading: boolean }) => void;
  onRemoveResource: (id: string) => void;
  onToggleFocusResource: (id: string) => void;
  onUpdateResourceLoading: (id: string, loading: boolean) => void;
  hideHeader?: boolean;
  initialMessages?: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [inputText, setInputText] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const uploadRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (uploadRef.current && !uploadRef.current.contains(event.target as Node)) {
        setUploadOpen(false);
      }
      if (focusRef.current && !focusRef.current.contains(event.target as Node)) {
        setFocusOpen(false);
      }
      if (mentionRef.current && !mentionRef.current.contains(event.target as Node)) {
        setMentionOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Monitor "@" character typing
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputText(value);

    // Show mention dropdown if user typed '@'
    if (value.endsWith("@")) {
      setMentionOpen(true);
    } else if (!value.includes("@") || value.endsWith(" ")) {
      setMentionOpen(false);
    }
  };

  // Add resource helper with simulated 3s loader
  const triggerAddResource = (name: string) => {
    const newId = `res-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    onAddResource({ id: newId, name, loading: true });
    
    // Simulate 3s RAG loader
    setTimeout(() => {
      onUpdateResourceLoading(newId, false);
      // Auto focus newly added resource
      onToggleFocusResource(newId);
    }, 3000);
  };

  const handleSelectMultipleKnowledge = (fileNames: string[]) => {
    fileNames.forEach((fileName) => {
      triggerAddResource(fileName);
    });
    setUploadOpen(false);
  };

  const handleAddLink = () => {
    if (linkUrl.trim()) {
      let label = linkUrl.trim();
      try {
        const url = new URL(label.startsWith("http") ? label : `https://${label}`);
        label = url.hostname + url.pathname;
        if (label.length > 25) label = label.slice(0, 25) + "...";
      } catch (e) {}
      triggerAddResource(`Link: ${label}`);
      setLinkUrl("");
      setLinkOpen(false);
      setUploadOpen(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file) => {
        triggerAddResource(file.name);
      });
      setUploadOpen(false);
    }
  };

  const handleSelectMention = (resourceName: string) => {
    // Replace the trailing @ with the mentioned resource name as a pill or styled text
    if (inputText.endsWith("@")) {
      setInputText((prev) => prev.slice(0, -1) + `@${resourceName} `);
    } else {
      setInputText((prev) => prev + `@${resourceName} `);
    }
    setMentionOpen(false);
    textareaRef.current?.focus();
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");

    // Simulate AI response
    setTimeout(() => {
      const aiMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: "ai",
        text: `I've analyzed your prompt referencing your focused resources. What else can I assist you with in this workspace?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 1000);
  };

  const filteredResources = resources.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`flex flex-col h-full overflow-hidden ${hideHeader ? "w-full p-2" : "mx-auto w-full max-w-4xl px-6 py-4"}`}>
      {/* Breadcrumb Path */}
      {!hideHeader && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Folder size={15} />
          <span>My folder</span>
          <ChevronRight size={14} />
          <MessageSquare size={15} />
          <span className="font-medium text-foreground">{spaceName}</span>
        </div>
      )}

      {/* Main Chat Screen Area */}
      <div className={`flex-1 flex flex-col min-h-0 justify-between overflow-hidden ${!hideHeader ? "mt-6" : "mt-2"}`}>
        {messages.length === 0 ? (
          /* Welcome messaging block matching Image 1 */
          <div className="max-w-2xl mt-4 space-y-6 overflow-y-auto flex-1 pr-2">
            <h1 className="text-base font-medium leading-relaxed text-foreground">
              Hi! I'm here to help you with anything you need for <span className="inline-flex items-center gap-1.5 font-bold"><Folder size={14} /> My folder</span>. Some examples of what I can do:
            </h1>
            <ul className="list-disc pl-5 space-y-3.5 text-sm text-muted-foreground">
              <li>
                Solve any questions related to <span className="inline-flex items-center gap-1.5 font-bold text-foreground"><Folder size={13} /> My folder</span> using your resources
              </li>
              <li>
                Assist in any writing tasks, including essays, discussion posts, and more
              </li>
              <li>
                Help you learn, study, or research <span className="inline-flex items-center gap-1.5 font-bold text-foreground"><Folder size={13} /> My folder</span> concepts
              </li>
            </ul>

            <div>
              <p className="text-sm font-semibold text-foreground">Helpful tips:</p>
              <ul className="list-disc pl-5 mt-3 space-y-2 text-sm text-muted-foreground">
                <li>Mention any resources you want me to refer to</li>
                <li>Be as specific as possible in your request</li>
                <li>Breakdown tasks for me so I can work through them one by one</li>
              </ul>
            </div>

            <p className="text-sm font-semibold text-foreground pt-2">How can I help?</p>
          </div>
        ) : (
          /* Conversation messages block */
          <div className="flex-1 space-y-5 py-4 overflow-y-auto pr-2 min-h-0">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${
                  msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
                }`}
              >
                {msg.sender === "user" && (
                  <div className="size-8 rounded-full flex items-center justify-center text-xs font-semibold bg-primary text-primary-foreground shrink-0">
                    U
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-primary/10 border border-primary/20 text-foreground rounded-tr-none"
                      : "bg-secondary/40 border border-border text-foreground rounded-tl-none"
                  }`}
                >
                  <p>{msg.text}</p>
                  <span className="text-[10px] text-muted-foreground block mt-1.5 text-right">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input & RAG Options Controls Bar */}
        <div className="mt-8 relative">
          
          {/* Mentions dropdown list (Image 5) */}
          <AnimatePresence>
            {mentionOpen && resources.length > 0 && (
              <motion.div
                ref={mentionRef}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute bottom-full left-0 mb-3 w-[260px] rounded-xl border border-border bg-[#1c1c1f] p-1.5 shadow-2xl z-50"
              >
                <div className="text-[10px] font-semibold text-muted-foreground px-2 py-1 border-b border-border/40 mb-1">
                  Resources
                </div>
                <div className="max-h-[180px] overflow-y-auto space-y-0.5">
                  {resources.map((res) => (
                    <button
                      key={res.id}
                      onClick={() => handleSelectMention(res.name)}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors truncate"
                    >
                      <FileText size={13} className="text-muted-foreground shrink-0" />
                      <span className="truncate">{res.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Link paste input block inside chat */}
          {linkOpen && (
            <div className="mb-3 flex gap-2 bg-[#27272a]/30 p-2.5 rounded-xl border border-border">
              <input
                type="text"
                placeholder="Paste URL link here..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
                className="flex-1 rounded-lg bg-[#18181b] px-3.5 py-1.5 text-xs text-foreground outline-none border border-border focus:ring-1 focus:ring-ring"
                autoFocus
              />
              <button
                onClick={handleAddLink}
                className="rounded-lg bg-primary hover:opacity-90 px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all"
              >
                Add
              </button>
              <button
                onClick={() => setLinkOpen(false)}
                className="rounded-lg bg-secondary hover:bg-secondary-hover px-2 py-1 text-xs font-semibold text-foreground border border-border"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* Hidden File input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
          />

          {/* Textbox Container */}
          <div className="rounded-2xl border border-border bg-[#18181b]/50 p-3 shadow-lg">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Share with Atlas..."
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[60px]"
            />

            {/* Bottom Actions Row */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                
                {/* Upload Button with Dropdown (Image 2) */}
                <div className="relative" ref={uploadRef}>
                  <button
                    onClick={() => setUploadOpen(!uploadOpen)}
                    className="flex items-center gap-1.5 rounded-xl bg-secondary/60 hover:bg-secondary px-3.5 py-2 text-xs font-semibold text-foreground transition-all cursor-pointer border border-border"
                  >
                    <Plus size={13} />
                    Upload
                  </button>

                  <AnimatePresence>
                    {uploadOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        className="absolute bottom-full left-0 mb-2 w-[190px] rounded-xl border border-border bg-[#1c1c1f] p-1.5 shadow-xl z-50"
                      >
                        <button
                          onClick={() => {
                            setKnowledgeOpen(true);
                            setUploadOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
                        >
                          <FolderHeart size={13} className="text-muted-foreground" />
                          From Knowledge
                        </button>
                        
                        <div className="my-1 border-t border-border/40" />
                        <div className="text-[10px] font-semibold text-muted-foreground px-2.5 py-1">
                          Upload new
                        </div>

                        <button
                          onClick={() => {
                            setLinkOpen(true);
                            setUploadOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
                        >
                          <Link2 size={13} className="text-muted-foreground" />
                          From link
                        </button>

                        <button
                          onClick={() => {
                            fileInputRef.current?.click();
                            setUploadOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-[#27272a] transition-colors"
                        >
                          <FileUp size={13} className="text-muted-foreground" />
                          From computer
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Focused button and Checklist Dropdown (Image 4) */}
                <div className="relative" ref={focusRef}>
                  <button
                    onClick={() => setFocusOpen(!focusOpen)}
                    className="flex items-center gap-1.5 rounded-xl bg-secondary/60 hover:bg-secondary px-3.5 py-2 text-xs font-semibold text-foreground transition-all cursor-pointer border border-border"
                  >
                    <ListChecks size={13} />
                    Focused {focusedResourceIds.length}
                  </button>

                  <AnimatePresence>
                    {focusOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        className="absolute bottom-full left-0 mb-2 w-[280px] rounded-xl border border-border bg-[#1c1c1f] p-3 shadow-xl z-50"
                      >
                        {/* Search input inside Focused box */}
                        <div className="relative flex items-center mb-2.5">
                          <Search size={12} className="absolute left-2.5 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Search resources..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg bg-[#18181b] pl-8 pr-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none border border-border/80 focus:ring-1 focus:ring-ring"
                          />
                        </div>

                        {/* Checklist */}
                        <div className="max-h-[180px] overflow-y-auto space-y-1">
                          {filteredResources.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic text-center py-2">
                              No resources available
                            </p>
                          ) : (
                            filteredResources.map((res) => {
                              const isChecked = focusedResourceIds.includes(res.id);
                              return (
                                <div
                                  key={res.id}
                                  onClick={() => onToggleFocusResource(res.id)}
                                  className="flex items-center justify-between rounded-lg p-2 hover:bg-[#27272a]/60 cursor-pointer select-none transition-colors"
                                >
                                  <span className="text-xs font-semibold text-foreground truncate max-w-[200px]">
                                    {res.name}
                                  </span>
                                  <div className="flex size-4 items-center justify-center rounded border border-muted-foreground shrink-0">
                                    {isChecked && <Check size={11} className="text-foreground" />}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <span className="text-[10px] text-muted-foreground/60 select-none">
                  Type @ to reference resources
                </span>
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                className="flex size-8 items-center justify-center rounded-full bg-primary hover:opacity-90 text-primary-foreground transition-opacity"
              >
                <Send size={14} className="fill-current" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Knowledge Selector Popup Modal */}
      <KnowledgeSelectorModal
        isOpen={knowledgeOpen}
        onClose={() => setKnowledgeOpen(false)}
        onSelectMultiple={handleSelectMultipleKnowledge}
      />
    </div>
  );
}
