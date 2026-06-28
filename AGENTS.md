# Agent Instructions & Project Context (AGENTS.md)

Welcome Agent! This document outlines the codebase rules, architecture, development workflow, and conventions used in this project. Read this thoroughly to coordinate edits and run tasks.

## 🛠️ Technology Stack
- **Monorepo Manager**: `pnpm` workspaces
- **Frontend**: Vite SPA + React + TypeScript + TailwindCSS v4 + TanStack Router (File-based router config in `App.tsx`)
- **Backend API**: Hono framework (Running on Deno/Bun/Node compatible endpoints)
- **Database**: PostgreSQL database queried via Drizzle ORM
- **AI/Vision integrations**: Tesseract OCR for exam text scanning + Vercel AI SDK for generation logic (supporting DeepSeek, Alibaba Qwen, OpenAI, Anthropic)

---

## 📂 Project Architecture

```
/
├── apps/
│   ├── web/                     # React Frontend Single Page App
│   │   ├── src/
│   │   │   ├── components/      # UI components (JSONEditor, AIGenerator, QuizPlayer)
│   │   │   ├── locales/         # i18n dictionaries (en.json / vi.json)
│   │   │   ├── App.tsx          # Router tree, layout shell & main app state
│   │   │   ├── main.tsx         # Mount node
│   │   │   └── i18n.ts          # i18n hook settings setup
│   │   └── package.json
│   │
│   └── api/                     # Hono Backend JSON API
│       ├── src/
│       │   ├── db/              # Drizzle configuration & DB Schema definitions
│       │   ├── routes/          # Controller modules (AI generator, Quiz actions, Guest Attempts)
│       │   └── index.ts         # Entry file & server bindings
│       └── package.json
│
├── docker-compose.yml           # Database and infrastructure setup
└── pnpm-workspace.yaml          # Monorepo mappings
```

---

## 📋 Critical Coding Rules & Standards

### 1. Localization (i18n)
- **NO hardcoded strings** in Vietnamese or English for user interface actions, messages, tooltips, or toast notifications.
- All translations must be declared as keys in:
  - Frontend English dictionary: [en.json](file:///Users/quantranlehai/.gemini/antigravity/scratch/quiz-generator-spa/apps/web/src/locales/en.json)
  - Frontend Vietnamese dictionary: [vi.json](file:///Users/quantranlehai/.gemini/antigravity/scratch/quiz-generator-spa/apps/web/src/locales/vi.json)
- Retrieve messages using the hook translator function `t('key')` inside UI components.

### 2. AI Quiz Generation Language (Explicit Selection)
- Do not restrict output quiz generation to the current user interface language state.
- Keep the generated language decoupled: users can specify generation output language parameters (`vi` or `en`) via target selections (`targetLang`) in the [AIGenerator component](file:///Users/quantranlehai/.gemini/antigravity/scratch/quiz-generator-spa/apps/web/src/components/AIGenerator.tsx).

### 3. Database Updates
- Schemas are defined in [schema.ts](file:///Users/quantranlehai/.gemini/antigravity/scratch/quiz-generator-spa/apps/api/src/db/schema.ts).
- Run database migration workflows through Drizzle's script utilities inside `apps/api`.

---

## 💻 Development Commands

From the workspace root directory:

### Install dependencies
```bash
pnpm install
```

### Build frontend SPA
```bash
pnpm --filter @aeroquiz/web build
```

### Run local database & infrastructure
```bash
docker compose -f docker-compose.dev.yml up -d
```
