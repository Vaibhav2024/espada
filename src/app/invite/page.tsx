"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  const referralCode = searchParams.get("u") || searchParams.get("code") || "";

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn && referralCode) {
      // Redirect to sign-up with referral code
      router.replace(`/sign-up?ref=${encodeURIComponent(referralCode)}`);
    } else if (isSignedIn) {
      // Already signed in — go to dashboard
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, referralCode, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 text-center">
      <div className="w-8 h-8 border-4 border-foreground border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm text-muted-foreground">
        {referralCode ? "Redirecting you to sign up..." : "Invalid invite link"}
      </p>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 text-center">
          <div className="w-8 h-8 border-4 border-foreground border-t-transparent rounded-full animate-spin mb-4" />
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
