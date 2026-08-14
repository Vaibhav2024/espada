"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function JoinPage() {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const setDigit = (i: number, v: string) => {
    const c = v.replace(/\D/g, "").slice(-1);
    setDigits((prev) => prev.map((d, idx) => (idx === i ? c : d)));
    if (c && i < 5) refs.current[i + 1]?.focus();
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

      <div className="mt-12 flex gap-3">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={d}
            inputMode="numeric"
            aria-label={`Digit ${i + 1}`}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
            }}
            placeholder="0"
            className="size-[68px] rounded-2xl bg-secondary text-center text-2xl font-semibold text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring"
          />
        ))}
      </div>
    </div>
  );
}
