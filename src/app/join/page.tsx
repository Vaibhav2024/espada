"use client";

import { Suspense, useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { joinFolderByCode } from "@/lib/api";

function JoinContent() {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const hasSubmittedRef = useRef(false);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = useCallback(async (code: string) => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
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
      hasSubmittedRef.current = false;
      setSubmitting(false);
    }
  }, [router]);

  // Pre-fill from URL param if present (e.g. /join?code=ABC123)
  useEffect(() => {
    const codeParam = searchParams.get("code");
    if (codeParam && codeParam.length >= 6) {
      // If code came from URL (copy link), submit it directly — it may be longer than 6 chars for legacy codes
      const upperCode = codeParam.toUpperCase();
      if (upperCode.length === 6) {
        const chars = upperCode.split("");
        setDigits(chars);
      } else {
        // For longer codes (legacy 8-char), show first 6 in UI but submit full code
        const chars = upperCode.slice(0, 6).split("");
        setDigits(chars);
      }
      // Auto-submit the full code from URL
      setTimeout(() => {
        handleSubmit(codeParam);
      }, 300);
    }
  }, [searchParams, handleSubmit]);

  // Auto-submit when all 6 digits are manually filled
  useEffect(() => {
    const code = digits.join("");
    if (code.length === 6 && digits.every((d) => d !== "") && !submitting && !hasSubmittedRef.current) {
      handleSubmit(code);
    }
  }, [digits, handleSubmit, submitting]);

  const setDigit = (i: number, v: string) => {
    const c = v.replace(/[^a-zA-Z0-9]/g, "").slice(-1).toUpperCase();
    setDigits((prev) => prev.map((d, idx) => (idx === i ? c : d)));
    setError("");
    hasSubmittedRef.current = false; // Allow re-submit on new input
    if (c && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
    if (pasted.length > 0) {
      const newDigits = ["", "", "", "", "", ""];
      for (let i = 0; i < pasted.length && i < 6; i++) {
        newDigits[i] = pasted[i];
      }
      setDigits(newDigits);
      hasSubmittedRef.current = false;
      const nextEmpty = newDigits.findIndex((d) => !d);
      const focusIdx = nextEmpty === -1 ? 5 : nextEmpty;
      refs.current[focusIdx]?.focus();
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

      {/* Error message */}
      {error && (
        <p className="mt-4 text-sm font-semibold text-red-400 animate-in fade-in slide-in-from-bottom-2">
          {error}
        </p>
      )}

      {/* Loading indicator */}
      {submitting && (
        <div className="mt-6 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Joining folder...</span>
        </div>
      )}
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
