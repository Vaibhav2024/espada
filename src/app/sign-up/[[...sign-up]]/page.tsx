"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  // Read referral code from URL — set by /invite?u=CODE redirect
  const referralCode = searchParams.get("ref") || searchParams.get("u") || "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#111112]">
      <SignUp
        unsafeMetadata={referralCode ? { referralCode } : undefined}
      />
    </div>
  );
}
