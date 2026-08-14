"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";

const GRADIENT_TEXT: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(90deg,#3b82f6 0%,#8b5cf6 35%,#ec4899 65%,#f97316 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

const BRAND_GRADIENT =
  "linear-gradient(135deg,#3b82f6 0%,#a855f7 45%,#ef4444 75%,#f97316 100%)";

function EspadaLogo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
      <img src="/espada-logo.png" alt="Espada" className="h-[28px] w-auto object-contain" />
      <span className="text-[19px] font-medium tracking-tight text-white">Espada</span>
    </Link>
  );
}

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.04]">
      <div className="mx-auto flex h-14 max-w-[1180px] items-center justify-between px-5">
        <EspadaLogo />
        <nav className="flex items-center gap-6 text-[14px] text-white/85">
          <Link href="/sign-in" className="hover:text-white transition-colors">
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-white px-3.5 py-1.5 text-[14px] font-medium text-black transition hover:bg-white/90"
          >
            Sign up free
          </Link>
        </nav>
      </div>
    </header>
  );
}

function FloatIcon({
  src,
  alt,
  className,
  glow,
  delay = 0,
  size = 132,
}: {
  src: string;
  alt: string;
  className: string;
  glow: string;
  delay?: number;
  size?: number;
}) {
  return (
    <div className={`pointer-events-none absolute hidden md:block ${className}`}>
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="animate-[atlasfloat_7s_ease-in-out_infinite]"
        style={{ filter: `drop-shadow(0 0 34px ${glow})`, animationDelay: `${delay}s` }}
      />
    </div>
  );
}

function Hero() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  const handleCta = () => {
    router.push(isSignedIn ? "/dashboard" : "/sign-up");
  };

  return (
    <section className="relative overflow-hidden px-5 pt-40 pb-28">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[560px] w-[900px] -translate-x-1/2 opacity-40"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 40%, rgba(120,80,255,.25), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-[1000px] py-10 text-center">
        <FloatIcon src="/star.png" alt="Star" className="left-[4%] top-[-10px]" glow="rgba(59,130,246,.5)" />
        <FloatIcon src="/arrow.png" alt="Arrow" className="right-[5%] top-[-20px]" glow="rgba(168,85,247,.5)" delay={1.2} />
        <FloatIcon src="/check.png" alt="Check" className="bottom-[-10px] left-[7%]" glow="rgba(249,115,22,.45)" delay={0.6} />
        <FloatIcon src="/bolt.png" alt="Bolt" className="bottom-[-20px] right-[8%]" glow="rgba(239,68,68,.45)" delay={1.8} />

        <h1 className="text-[54px] font-bold leading-[1.03] tracking-[-0.03em] text-white sm:text-[76px]">
          <span style={GRADIENT_TEXT}>Supercharge</span>
          <br />
          your grades
        </h1>
        <p className="mx-auto mt-6 max-w-[420px] text-[17px] leading-relaxed text-white/70">
          Study, write, and solve faster with the most accurate AI for school.
        </p>
        <div className="mt-9">
          <button
            onClick={handleCta}
            className="inline-flex rounded-xl bg-[#ececec] px-6 py-3.5 text-[16px] font-medium text-black transition hover:bg-white"
          >
            Use Espada for free
          </button>
        </div>
      </div>
    </section>
  );
}

const TOOLS = [
  {
    title: "Solve",
    sub: "Generate step-by-step answers",
    body: (
      <div className="space-y-3">
        <div className="rounded-lg bg-[#1e1e21] p-3 text-[11px] text-white/75">
          <p className="mb-2 text-white/90">What might arise from thread interference?</p>
          {["A) Increased usability", "B) Unpredictable behavior", "C) Enhanced processing speed"].map(
            (o, i) => (
              <p key={o} className="animate-[atlasrise_6s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.25}s` }}>
                {o}
              </p>
            ),
          )}
        </div>
        <div className="rounded-lg p-[1px]" style={{ background: BRAND_GRADIENT }}>
          <div className="animate-[atlasreveal_6s_ease-in-out_infinite] rounded-[7px] bg-[#1e1e21] p-3 text-[11px]">
            <p className="text-white/55">Correct answer</p>
            <p className="mt-1 text-white/90">B) Unpredictable behavior</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Write",
    sub: "Generate A+ essays",
    body: (
      <div className="rounded-lg bg-[#1e1e21] p-3 text-[11px] leading-relaxed">
        <p className="mb-2 text-[13px] font-medium text-white">Social Panopticons</p>
        <p className="text-white/70">
          In an age where surveillance technologies infiltrate every facet of daily life, social
          panopticons emerge as invisible architectures of control.
        </p>
        <p
          className="mt-2 animate-[atlastype_6s_steps(60)_infinite] overflow-hidden whitespace-nowrap italic"
          style={GRADIENT_TEXT}
        >
          In an age where surveillance technologies infiltrate every facet…
        </p>
      </div>
    ),
  },
  {
    title: "Record",
    sub: "Automatic lecture notes",
    body: (
      <div className="space-y-3">
        <div className="mx-auto flex h-8 w-36 items-center justify-center gap-[3px] rounded-full border border-white/10 bg-[#1e1e21] px-3 py-2">
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              className="w-[2px] animate-[atlaswave_1.1s_ease-in-out_infinite] rounded-full"
              style={{ height: `${6 + ((i * 7) % 14)}px`, background: BRAND_GRADIENT, animationDelay: `${(i % 8) * 0.09}s` }}
            />
          ))}
        </div>
        <div className="rounded-lg bg-[#1e1e21] p-3 text-[11px] text-white/70">
          <p className="text-[12px] font-semibold text-white">Lecture Sept. 25: Civic Engagement</p>
          <p className="mt-2 animate-[atlasrise_6s_ease-in-out_infinite] font-semibold text-white/85">
            Declaration of Independence
          </p>
          <ul className="mt-1 list-disc pl-4">
            <li className="animate-[atlasrise_6s_ease-in-out_infinite]" style={{ animationDelay: "0.4s" }}>
              Natural Rights: asserts that all men are endowed with certain unalienable rights.
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    title: "Memorize",
    sub: "Generate flashcards",
    body: (
      <div className="relative h-[150px]" style={{ perspective: "800px" }}>
        <div className="absolute inset-x-4 top-3 h-[110px] rotate-[-3deg] rounded-lg bg-[#191a1c]" />
        <div
          className="absolute inset-x-2 top-6 flex h-[110px] animate-[atlasflip_5s_ease-in-out_infinite] items-center justify-center rounded-lg bg-[#1e1e21] text-[13px] text-white/85"
          style={{ transformStyle: "preserve-3d" }}
        >
          Chirality
        </div>
      </div>
    ),
  },
];

function Tools() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  const handleToolClick = () => {
    router.push(isSignedIn ? "/dashboard" : "/sign-in");
  };

  return (
    <section className="relative px-5 py-24">
      <style>{`
        @keyframes atlasreveal{0%,25%{opacity:0;transform:translateY(8px)}40%,100%{opacity:1;transform:translateY(0)}}
        @keyframes atlasrise{0%,8%{opacity:0;transform:translateY(6px)}22%,100%{opacity:1;transform:translateY(0)}}
        @keyframes atlaswave{0%,100%{transform:scaleY(.45)}50%{transform:scaleY(1.5)}}
        @keyframes atlastype{0%{max-width:0}55%,100%{max-width:100%}}
        @keyframes atlasflip{0%,45%{transform:rotateY(0)}55%,95%{transform:rotateY(180deg)}100%{transform:rotateY(360deg)}}
      `}</style>
      <div className="mx-auto max-w-[1180px]">
        <h2 className="text-[36px] font-bold tracking-[-0.02em] text-white sm:text-[46px]">
          <span style={GRADIENT_TEXT}>Score higher</span> with powerful tools.
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((t) => (
            <article key={t.title} className="group flex flex-col justify-between">
              <div>
                <h3 className="text-[22px] font-semibold text-white">{t.title}</h3>
                <p className="mt-1 text-[14px] text-white/60">{t.sub}</p>
                <div className="mt-5 overflow-hidden rounded-2xl border border-white/8 bg-[#161618] p-4 transition duration-300 group-hover:-translate-y-1 group-hover:border-white/20">
                  {t.body}
                </div>
              </div>
              <button
                onClick={handleToolClick}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#222225] py-3 text-xs font-semibold text-white transition-colors hover:bg-white hover:text-black"
              >
                {t.title} with Espada
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function KnowsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0);
  const router = useRouter();
  const { isSignedIn } = useAuth();

  const handleCta = () => {
    router.push(isSignedIn ? "/dashboard" : "/sign-up");
  };

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = 1 - Math.abs(r.top + r.height / 2 - vh / 2) / (vh * 0.9);
      setT(Math.min(1, Math.max(0, p)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const docs = [
    { label: "▶ Lecture video", cls: "left-[6%] top-[6%]", rot: -12, dx: -170, dy: -90 },
    { label: "2024 Syllabus", cls: "left-[36%] top-[2%]", rot: 3, dx: -20, dy: -140 },
    { label: "Reading PDF", cls: "right-[10%] top-[10%]", rot: 12, dx: 180, dy: -90 },
    { label: "Chemistry", cls: "left-[16%] bottom-[6%]", rot: -6, dx: -160, dy: 110 },
    { label: "Atomic Structures", cls: "right-[22%] bottom-[4%]", rot: 6, dx: 150, dy: 120 },
  ];

  return (
    <section ref={ref} className="relative overflow-hidden px-5 py-28">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 60% at 20% 40%, rgba(45,70,190,.35), transparent 65%), radial-gradient(60% 60% at 82% 45%, rgba(190,70,40,.32), transparent 65%)",
        }}
      />
      <div className="relative mx-auto h-[520px] max-w-[1000px]">
        {docs.map((d) => {
          const k = 1 - t;
          return (
            <div
              key={d.label}
              className={`absolute hidden w-[120px] rounded-lg border border-white/15 bg-white/10 p-3 text-[10px] text-white/70 backdrop-blur-sm md:block ${d.cls}`}
              style={{
                transform: `translate3d(${d.dx * k}px, ${d.dy * k}px, 0) rotate(${d.rot}deg) scale(${0.8 + 0.2 * t})`,
                opacity: 0.35 + 0.65 * t,
                transition: "transform .25s ease-out, opacity .25s ease-out",
                willChange: "transform",
              }}
            >
              <div className="mb-6 h-10 rounded bg-white/10" />
              {d.label}
            </div>
          );
        })}
        <div className="relative flex h-full flex-col items-center justify-center text-center">
          <h2 className="text-[40px] font-bold leading-tight tracking-[-0.02em] text-white sm:text-[56px]">
            Other tools guess.
            <br />
            <span style={GRADIENT_TEXT}>Espada knows.</span>
          </h2>
          <p className="mt-5 max-w-[420px] text-[17px] text-white/75">
            Espada studies all of your course materials, not just a single lecture or textbook.
          </p>
          <button
            onClick={handleCta}
            className="mt-9 inline-flex rounded-xl bg-[#ececec] px-6 py-3.5 text-[16px] font-medium text-black transition hover:bg-white"
          >
            Use Espada for free
          </button>
        </div>
      </div>
    </section>
  );
}

const REVIEWS = [
  ["The Knowledge feature, in particular, is outstanding; its in-depth information from trusted sources has been incredibly useful to me. 👍", "Jaz from Australia"],
  ["I saw it on TikTok and decided to give it a try. In less than 20 minutes I thought it was the best study AI tool I had ever seen.", "Sene from United States"],
  ["I absolutely love using Espada because it integrates directly with the materials from my courses. It really simplifies my study process.", "Arwa from Canada"],
  ["I was a great student in high school, but college was a tough transition for me. Espada has been a big help. 10/10 recommend trying it out.", "Tim from United States"],
  ["I must say it is significantly better than ChatGPT 😱 In some questions I asked ChatGPT, the answers were inaccurate, while Espada responded accurately.", "Lucia from Spain"],
  ["So easy to use.", "Asriel from France"],
  ["I say there is not a single student that walks on this planet who wouldn't benefit from Espada.", "Mira from Germany"],
  ["This is the best app ever I swear, and I've tried them all.", "Kai from Singapore"],
  ["ChatGPT could never 😭 I think Espada actually understands my classes.", "Nora from Ireland"],
];

function Reviews() {
  return (
    <section className="px-5 py-24">
      <div className="mx-auto max-w-[1180px]">
        <h2 className="text-center text-[34px] font-bold tracking-[-0.02em] text-white sm:text-[44px]">
          Try the <span style={GRADIENT_TEXT}>most loved</span> assistant for school.
        </h2>
        <div className="mt-14 columns-1 gap-6 sm:columns-2 lg:columns-3">
          {REVIEWS.map(([text, author]) => (
            <div key={author} className="mb-6 break-inside-avoid rounded-2xl bg-[#161618] p-5">
              <div className="mb-3 flex gap-1 text-white/85">
                {Array.from({ length: 5 }).map((_, i) => <span key={i}>★</span>)}
              </div>
              <p className="text-[14px] leading-relaxed text-white/70">{text}</p>
              <p className="mt-4 text-[12px] text-white/45">{author}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  const handleCta = () => {
    router.push(isSignedIn ? "/dashboard" : "/sign-up");
  };

  return (
    <section className="px-5 py-16">
      <div
        className="mx-auto max-w-[1000px] rounded-[28px] px-6 py-24 text-center"
        style={{ background: BRAND_GRADIENT }}
      >
        <h2 className="text-[40px] font-bold leading-[1.08] tracking-[-0.02em] text-white/70 sm:text-[58px]">
          <span className="text-white/60">Less stress.</span>
          <br />
          <span className="text-white/75">Better grades.</span>
          <br />
          <span className="text-white">Free for students.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-[360px] text-[16px] text-white/90">
          Start setting the curve with the most accurate AI for school.
        </p>
        <button
          onClick={handleCta}
          className="mt-10 inline-flex rounded-xl bg-[#ececec] px-6 py-3.5 text-[16px] font-medium text-black transition hover:bg-white"
        >
          Use Espada for free
        </button>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    ["Discord", "TikTok", "Twitter", "Instagram", "LinkedIn"],
    ["Changelog", "Blog", "Contact", "iOS App", "Android App"],
    ["Resources", "Privacy", "Terms", "Affiliate Program", "AI Detector"],
  ];
  return (
    <footer className="px-5 pb-16 pt-28">
      <div className="mx-auto grid max-w-[1180px] gap-10 md:grid-cols-[1.2fr_repeat(3,1fr)]">
        <div>
          <p className="max-w-[240px] text-[13px] leading-relaxed text-white/45">
            We&apos;re a team of current and former students and teachers on a mission to make
            learning accessible and engaging for everyone.
          </p>
          <p className="mt-12 text-[12px] text-white/35">© Espada Labs · LA &amp; NYC</p>
        </div>
        {cols.map((col, i) => (
          <ul key={i} className="space-y-4 text-[13px] text-white/70">
            {col.map((l) => (
              <li key={l}>
                <a href="#" className="hover:text-white">{l}</a>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div
      className="min-h-screen bg-[#0a0a0a] antialiased selection:bg-white/20 selection:text-white"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif" }}
    >
      <style>{`@keyframes atlasfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}`}</style>
      <Nav />
      <main>
        <Hero />
        <Tools />
        <KnowsSection />
        <Reviews />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
