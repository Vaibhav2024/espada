import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Espada — Supercharge your grades with AI",
  description:
    "Study on the web and everywhere with the most accurate AI for school.",
  openGraph: {
    title: "Espada — Supercharge your grades with AI",
    description:
      "Study, write, and solve faster with the most accurate AI for school.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/espada-logo.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <html lang="en">
        <body className="antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
