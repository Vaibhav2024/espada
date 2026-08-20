"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { joinFolderByCode } from "@/lib/api";

export default function JoinPage() {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const submittedCodeRef = useRef<string>("");

  // Handle the actual submission
  async function doSubmit(code: string) {
    // Don't re-submit the same code
    if (submittedCodeRef.current === code) return;
    submittedCodeRef.current = code;
    
    setSubmitting(true);
    setError("");

    try {
      const { folderId } = await joinFolderByCode(code);
      router.push(`/dashboard?folder=${folderId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      if (message.includes("Invalid") || message.includes("404")) {
        setError("Invalid code");
      } else if (message.includes("Unauthorized") || message.includes("401")) {
        setError("Please sign in first");
      } else {
        setError(message || "Failed to join folder");
      }
      setSubmitting(false);
      // Don't clear submittedCodeRef here — prevents re-submission of same bad code
    }
  }

  // Auto-submit from URL param on mount
  useEffect(() => {
    const codeParam = searchParams.get("code");
    if (codeParam && codeParam.length >= 6) {
      const displayChars = codeParam.slice(0, 6).toUpperCase().split("");
      setDigits(displayChars);
      doSubmit(codeParam);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDigit = (i: number, v: string) => {
    const c = v.replace(/[^a-zA-Z0-9]/g, "").slice(-1).toUpperCase();
    const newDigits = digits.map((d, idx) => (idx === i ? c : d));
    setDigits(newDigits);
    setError("");
    // Allow re-submit with new code
    submittedCodeRef.current = "";

    if (c && i < 5) {
      refs.current[i + 1]?.focus();
    }

    // Check if all 6 are filled and auto-submit
    const code = newDigits.join("");
    if (code.length === 6 && newDigits.every((d) => d !== "")) {
      doSubmit(code);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
    if (pasted.length === 6) {
      const newDigits = pasted.split("");
      setDigits(newDigits);
      setError("");
      submittedCodeRef.current = "";
      doSubmit(pasted);
    } else if (pasted.length > 0) {
      const newDigits = ["", "", "", "", "", ""];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setDigits(newDigits);
      setError("");
      submittedCodeRef.current = "";
      const nextEmpty = newDigits.findIndex((d) => !d);
      if (nextEmpty !== -1) refs.current[nextEmpty]?.focus();
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-5">
      <Link
        href="/dashboard"
        className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={15} />
        Back
      </Link>

      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Join a folder</h1>
      <p className="mt-3 text-base text-muted-foreground">
        Enter the invite code you received from a friend
      </p>

      <div className="mt-12 flex gap-3" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={d}
            inputMode="text"
            autoComplete="off"
            aria-label={`Character ${i + 1}`}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
            }}
            disabled={submitting}
            placeholder="—"
            className={`size-[68px] rounded-2xl bg-secondary text-center text-2xl font-semibold text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring disabled:opacity-50 transition-colors ${
              error ? "ring-2 ring-red-500" : ""
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="mt-4 text-sm font-semibold text-red-400">
          {error}
        </p>
      )}

      {submitting && !error && (
        <div className="mt-6 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Joining folder...</span>
        </div>
      )}
    </div>
  );
}
