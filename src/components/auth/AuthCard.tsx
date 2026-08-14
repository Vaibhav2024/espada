"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn, useSignUp, useUser } from "@clerk/nextjs";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

interface AuthCardProps {
  mode?: "sign-in" | "sign-up";
  redirectTo?: string;
}

export function AuthCard({ mode = "sign-in", redirectTo = "/dashboard" }: AuthCardProps) {
  const router = useRouter();

  // Clerk hooks — these REQUIRE ClerkProvider to be set up
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { isSignedIn, isLoaded: userLoaded } = useUser();

  // If user is already signed in, redirect to dashboard
  useEffect(() => {
    if (userLoaded && isSignedIn) {
      router.replace(redirectTo);
    }
  }, [userLoaded, isSignedIn, router, redirectTo]);

  const isLoaded = mode === "sign-in" ? signInLoaded : signUpLoaded;

  const handleGoogleOAuth = async () => {
    if (!isLoaded) return;
    try {
      if (mode === "sign-in" && signIn) {
        await signIn.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: `${window.location.origin}/sso-callback`,
          redirectUrlComplete: `${window.location.origin}/dashboard`,
        });
      } else if (mode === "sign-up" && signUp) {
        await signUp.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: `${window.location.origin}/sso-callback`,
          redirectUrlComplete: `${window.location.origin}/dashboard`,
        });
      }
    } catch (err: any) {
      console.error("Google OAuth error:", err);
    }
  };

  const handleAppleOAuth = async () => {
    if (!isLoaded) return;
    try {
      if (mode === "sign-in" && signIn) {
        await signIn.authenticateWithRedirect({
          strategy: "oauth_apple",
          redirectUrl: `${window.location.origin}/sso-callback`,
          redirectUrlComplete: `${window.location.origin}/dashboard`,
        });
      } else if (mode === "sign-up" && signUp) {
        await signUp.authenticateWithRedirect({
          strategy: "oauth_apple",
          redirectUrl: `${window.location.origin}/sso-callback`,
          redirectUrlComplete: `${window.location.origin}/dashboard`,
        });
      }
    } catch (err: any) {
      console.error("Apple OAuth error:", err);
    }
  };

  // Show loading state until Clerk is ready
  if (!isLoaded || !userLoaded) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#111112]">
        <Loader2 className="size-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#111112] px-4 py-8 text-foreground selection:bg-primary/20">
      {/* Top back button */}
      <Link
        href="/"
        className="fixed left-6 top-6 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-zinc-400 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white"
      >
        <ArrowLeft size={14} />
        Back to Home
      </Link>

      <div className="w-full max-w-[420px] flex flex-col items-center">
        {/* Espada Logo */}
        <Link href="/" className="mb-9 transition-transform hover:scale-105">
          <img
            src="/espada-logo.png"
            alt="Espada Logo"
            className="h-16 w-auto object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]"
          />
        </Link>

        <div className="flex w-full flex-col gap-3">
          {/* Continue with Google */}
          <button
            type="button"
            onClick={handleGoogleOAuth}
            className="group relative flex h-[52px] w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 text-[15px] font-semibold text-zinc-900 transition-all hover:bg-zinc-100 active:scale-[0.99] shadow-sm"
          >
            <svg className="size-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Continue with Apple */}
          <button
            type="button"
            onClick={handleAppleOAuth}
            className="group relative flex h-[52px] w-full items-center justify-center gap-3 rounded-2xl bg-[#28282b] px-4 text-[15px] font-semibold text-white transition-all hover:bg-[#343438] active:scale-[0.99] border border-white/5"
          >
            <svg className="size-5 shrink-0 fill-current" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.98.6-2.62 1.35-.57.65-1.06 1.71-.93 2.73 1.01.08 2.02-.51 2.63-1.23z" />
            </svg>
            <span>Continue with Apple</span>
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-zinc-500">
          {mode === "sign-in" ? (
            <>
              Don't have an account?{" "}
              <Link href="/sign-up" className="text-zinc-300 hover:text-white underline underline-offset-2">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/sign-in" className="text-zinc-300 hover:text-white underline underline-offset-2">
                Sign in
              </Link>
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-zinc-500 flex items-center justify-center gap-1.5">
          <Sparkles size={13} className="text-zinc-400" />
          <span>Secured by Espada Auth &amp; Clerk</span>
        </div>
      </div>
    </div>
  );
}
