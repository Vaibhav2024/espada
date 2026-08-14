# AI Study Hub

Build a pixel-perfect, dark-mode frontend prototype of this AI Study Workspace hub (Atlas.org style) matching the attached screenshot.

### 🎨 Visual & Theme Specifications:

- **Theme:** Dark mode only. Deep charcoal/matte dark background (`bg-zinc-950` / `bg-[#121214]`) with card surfaces (`bg-zinc-800/70` / `border border-zinc-700/40`), smooth hover states, and rounded corners (`rounded-2xl`).

- **Typography:** Crisp white headings (`text-white text-base font-semibold`) and muted grey sub-labels (`text-zinc-400 text-sm`).

- **Icons:** Use Lucide React icons matching each card in the screenshot.

---

### 🧩 1. Main Dashboard Hub (Grid as shown in image):

#### A. Section: "Studying" (3-column responsive grid)

1. **Study guide** (Icon: `BookOpen`) – Subtitle: *"Prepare for a test"*

2. **Quiz** (Icon: `ListChecks`) – Subtitle: *"Test your knowledge"*

3. **Flashcards** (Icon: `Layers` or `Copy`) – Subtitle: *"Bite-sized studying"*

#### B. Section: "Homework" (Grid layout)

4. **Solve** (Icon: `ListOrdered`) – Subtitle: *"Get answers and explanations"*

5. **Write** (Icon: `PenTool` / `Edit3`) – Subtitle: *"Draft paragraphs or papers"*

#### C. Section: "Notes" (Grid layout)

6. **Recording** (Icon: `Mic`) – Subtitle: *"Automatic lecture notes"*

7. **Notes** (Icon: `FileText` or `List`) – Subtitle: *"Detailed notes for any resource"*

---

### ⚡ 2. Interactive Mock Views (Clicking any card opens its workspace):

Make each card clickable to open an interactive view with a "← Back to Hub" button:

- **Flashcards View:** Interactive card that flips on click (front/back 3D flip) with "Know" / "Don't Know" buttons and a progress bar (Card 3 of 12).

- **Quiz View:** 4-option multiple-choice question with instant green/red highlight feedback when an option is clicked, plus an explanation callout.

- **Study Guide View:** Clean split-screen document viewer on the left and a structured key-concepts summary outline on the right.

- **Solve View:** Input box to type or mock-upload a homework problem, displaying a step-by-step breakdown and final answer with formulas.

- **Write View:** Text editor workspace with prompt shortcuts ("Summarize", "Expand", "Tone adjustment") and an AI drafting sidebar.

- **Recording View:** Mock audio recorder with simulated pulsating waveforms, timer, and live generated lecture transcript with bulleted takeaways.

- **Notes View:** Markdown-style rich document editor with checklist items, tags, and highlight colors.

---

### 🛠️ Scope & Implementation Rules:

- **Frontend only:** Use React state (`useState`, `activeTool` state switch), Tailwind CSS, Lucide React icons, and Framer Motion for smooth transitions.

- **Zero backend required:** Pre-populate realistic mock data for each tool so the app feels completely alive immediately.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cd2d847a-7206-4484-8538-0074a06df9fc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
