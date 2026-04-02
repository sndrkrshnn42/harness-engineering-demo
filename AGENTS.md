# AGENTS.md — Autonomous Harness Engineering Demo

## Project Overview

Single-page React application demonstrating an AI agent autonomously executing a
7-stage harness engineering pipeline in ~60 seconds. User pastes a service spec,
clicks "Run Pipeline", and watches sequential AI-powered stages stream output.
Stage 2 (Code Generation) uses OpenCode SDK or Qwen agentic mode to produce
multi-file application code. All other stages stream via a Qwen inference proxy
with Azure AD authentication handled server-side. Includes a replay mode for
offline demos.

## Tech Stack

- **Framework:** React 18 + TypeScript (strict mode)
- **Build tool:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS 3 (dark mode via `class` strategy)
- **AI inference:** Qwen 2.5 Coder 14B via OpenAI-compatible endpoint (server-side proxy)
- **Stage 2 codegen:** `@opencode-ai/sdk` (v1.3.13) — spawns OpenCode server, creates sessions, streams events
- **Auth:** Azure AD OAuth2 client credentials flow (server-side only, never exposed to browser)
- **Font:** JetBrains Mono (agent output panels)
- **State:** `useReducer` + `useRef` — no Redux, no external state libraries
- **Env vars:** Next.js env vars (server-only, no `NEXT_PUBLIC_` prefix)

No external component libraries. No Redux. Single page rendered via Next.js App Router.

## Build / Dev / Start Commands

```bash
# Install dependencies
npm install

# Development server (with HMR)
npm run dev

# Production build
npm run build

# Serve production build locally (use this for demos)
npm run start
```

There is no test framework configured for this project. The application itself
generates pytest test suites as AI output (Stage 3), but the React app has no
unit/integration tests.

## Environment Setup

Create `.env.local` at project root (never commit this file):
```
AZURE_TENANT_ID=your_tenant_id
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
INFERENCE_URL=https://qwen25-coder-14b-tenant-coding-assistant.dev.g.inference.genai.mlops.ingka.com
OPENCODE_PORT=4096
```

`.env.local` is gitignored by default with Next.js. An `.env.example` with empty
values exists for reference.

## File Structure

```
src/
  App.tsx                       — Root layout, state machine, mode switching
  types.ts                      — All shared types, stage definitions, reducer
  app/
    layout.tsx                  — Next.js root layout (html/body, fonts, globals.css)
    page.tsx                    — Next.js page entry (renders App)
    globals.css                 — Tailwind imports + JetBrains Mono
    api/
      inference/route.ts        — SSE proxy to Qwen (Azure AD auth)
      codegen/route.ts          — OpenCode SDK codegen SSE endpoint
      workspace/route.ts        — Temp workspace create/destroy
      tools/
        write-file/route.ts     — Write file to workspace
        read-file/route.ts      — Read file from workspace
        list-files/route.ts     — List workspace files
        execute/route.ts        — Execute command in workspace (sandboxed)
  lib/
    auth.ts                     — Azure AD token acquisition + caching
    opencode.ts                 — OpenCode server singleton (globalThis persistence)
    workspace.ts                — Workspace Map management (globalThis persistence)
  constants/
    prompts.ts                  — All 7 system prompts + OpenCode codegen prompt
    defaultSpec.ts              — Default input spec (do not change)
    replayData.ts               — Pre-baked outputs for replay mode (currently empty)
  hooks/
    usePipeline.ts              — Pipeline orchestration + streaming logic
    useReplay.ts                — Replay mode hook
  components/
    InputPanel.tsx              — Spec textarea + Run/Abort/Reset buttons + codegen mode toggle
    PipelinePanel.tsx           — Stage cards container + FileTree after Stage 2
    StageCard.tsx               — Individual stage card with streaming output
    VerdictCard.tsx             — Final verdict card with impact summary
    ProgressBar.tsx             — Pipeline progress bar
    ElapsedTimer.tsx            — Live elapsed time counter
    MetricsBar.tsx              — Live stage/token/line/role counts
    FileTree.tsx                — Tree view of generated files (Stage 2 output)
```

## The 7 Pipeline Stages

| ID | Stage Name | Role Displaced | Expected Output |
|----|-----------|---------------|-----------------|
| 1 | Spec ingestion | BA / Analyst | Structured requirement breakdown |
| 2 | Code generation | Software Developer | Backend API handlers + Frontend React components |
| 3 | Test case generation | Test Engineer | Full pytest test suite |
| 4 | Harness configuration | Pipeline Engineer | Deployment-ready Kubernetes YAML |
| 5 | Evaluation scoring | QA Analyst | Ragas-style quality metrics |
| 6 | Defect triage | Support Engineer | Root cause + remediation |
| 7 | Report synthesis | Tech Lead | Verdict card + impact summary |

## Code Style Guidelines

### TypeScript

- **Strict mode** is enabled. Do not use `any` unless absolutely necessary.
- Use explicit type annotations for function parameters and return types.
- Use `interface` for object shapes (e.g., `Props` interfaces for components).
- Use `type` for unions and aliases (`type StageStatus = 'idle' | 'running' | ...`).
- Discriminated union pattern for reducer actions (`PipelineAction`).

### Naming Conventions

| Category | Convention | Examples |
|----------|-----------|----------|
| Components | PascalCase | `StageCard`, `VerdictCard`, `InputPanel` |
| Hooks | camelCase with `use` prefix | `usePipeline`, `useReplay` |
| Constants | UPPER_SNAKE_CASE | `STAGE_DEFINITIONS`, `INFERENCE_PATH`, `MAX_TOKENS` |
| Types/Interfaces | PascalCase | `StageState`, `PipelineAction`, `StageId` |
| Variables/functions | camelCase | `stageStart`, `buildUserMessage` |
| Files — components | PascalCase `.tsx` | `StageCard.tsx` |
| Files — hooks | camelCase `.ts` | `usePipeline.ts` |
| Files — constants | camelCase `.ts` | `prompts.ts`, `defaultSpec.ts` |
| Files — lib | camelCase `.ts` | `auth.ts`, `opencode.ts` |
| Files — API routes | `route.ts` in named dirs | `api/inference/route.ts` |

### Imports

- Named imports from React: `import { useState, useCallback } from 'react'`
- Relative path imports for local modules: `import { pipelineReducer } from '../types'`
- No barrel files. Import directly from the source module.
- Do not use `React.FC` for component types. Use explicit `Props` interfaces:
  ```tsx
  interface Props { title: string; status: StageStatus }
  export default function StageCard({ title, status }: Props) { ... }
  ```

### Exports

- `App` uses default export.
- Everything else uses named exports.
- Types, interfaces, and constants are all named exports.

### Error Handling

- Use `try/catch` in async pipeline logic.
- Type-narrow errors with `err instanceof Error ? err.message : 'Unknown error'`.
- Dispatch error states via reducer actions (`STAGE_ERROR`).
- Empty `catch` blocks are acceptable only for malformed SSE line parsing.

### State Management

- All pipeline state goes through `useReducer` with the `pipelineReducer`.
- Mutable refs (`useRef`) for abort controllers, accumulated stage outputs, and agent files.
- Wrap callbacks in `useCallback`.
- No `useState` for pipeline state — the reducer is the single source of truth.

### Components

- Functional components only. No class components.
- Explicit `Props` interface per component (not inline).
- No `React.FC`. Declare props as function parameters with destructuring.
- Keep components focused — one component per file.

## Styling Rules (non-negotiable)

- Background: `bg-zinc-950` (near-black, not pure black)
- Cards/surfaces: `bg-zinc-900` (active), `bg-zinc-950` (output areas)
- Borders: `border-zinc-800` (default), `border-violet-500/60` (active), `border-emerald-700/40` (verdict)
- Text: `text-white` (primary), `text-zinc-300` (secondary), `text-zinc-500` (muted)
- Accent: `violet-500` (running state, CTA, progress bar)
- Success: `emerald-500` (complete state, verdict card)
- Error: `red-500`
- Role badge: `border-orange-800/60 text-orange-400 bg-orange-950/30`
- Agent output text: `font-mono text-xs` (JetBrains Mono)
- UI chrome: system sans-serif via Tailwind default
- No gradients. No shadows on containers. No `border-radius` > `rounded-lg`.

## Key Architecture Decisions

- **Server-side API proxy:** All LLM inference goes through Next.js API routes.
  Azure AD credentials (client_id, client_secret, tenant_id) are server-only env
  vars. The browser never sees secrets.
- **Auth flow:** `src/lib/auth.ts` acquires OAuth2 tokens via Azure AD client
  credentials grant. Tokens are cached in-memory with expiry tracking.
- **Model:** Qwen 2.5 Coder 14B for stages 1, 3-7. OpenCode SDK (with its
  configured model) for Stage 2 codegen.
- **Stage 2 codegen modes:** Toggle between `opencode` (default) and `qwen`:
  - **OpenCode mode:** `@opencode-ai/sdk` spawns a server, creates a session
    pointed at the workspace temp dir, sends prompt async, streams events
    (text/file/tool/complete/error) back via SSE.
  - **Qwen mode:** Agentic tool-calling loop with tools (write_file, read_file,
    list_files, execute_command). Falls back to standard streaming if the
    endpoint rejects tool calls.
- **globalThis singletons:** `workspace.ts` and `opencode.ts` use `globalThis`
  for Map/server state persistence across Next.js HMR re-evaluations in dev mode.
- **Workspace management:** Each pipeline run creates a temp directory
  (`os.tmpdir() + '/harness-run-' + id`). Files are written there during Stage 2.
  Workspace is destroyed on reset. Path traversal protection enforced.
- **Max tokens:** 2048 per stage. Do not reduce — Stage 3 (test generation)
  regularly uses 1800+ tokens.
- **Inter-stage pause:** 600ms between stages for visual rhythm. Intentional.
- **No streaming fallback:** Requires `ReadableStream` support (Chrome 95+).
- **No retry on 429:** Pipeline errors on rate limit. Ensure headroom before demos.

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/inference` | POST | SSE proxy to Qwen. Acquires Azure AD token, forwards messages, streams response. |
| `/api/codegen` | POST | OpenCode SDK codegen. Creates session, sends prompt, relays events as SSE. |
| `/api/workspace` | POST | Creates temp workspace directory. Returns `{ workspaceId }`. |
| `/api/workspace` | DELETE | Destroys workspace by ID (`?id=...`). |
| `/api/tools/write-file` | POST | Writes file to workspace. Body: `{ workspaceId, filePath, content }`. |
| `/api/tools/read-file` | POST | Reads file from workspace. Body: `{ workspaceId, filePath }`. |
| `/api/tools/list-files` | POST | Lists files in workspace. Body: `{ workspaceId }`. |
| `/api/tools/execute` | POST | Executes command in workspace (30s timeout, sandboxed). Body: `{ workspaceId, command }`. |

## Behavior Notes for Implementation

- All 7 stage cards visible on load in idle state (shows pipeline structure).
- Run button disabled when textarea empty; becomes "Abort" during execution,
  "Reset" after completion.
- Codegen mode toggle (Qwen / OpenCode) shown in InputPanel, disabled during run.
- Stage output max-height: 256px while running (scrollable), 320px when complete.
- Auto-scroll output to bottom while streaming; stop on stage completion.
- FileTree component renders after Stage 2 card, showing generated file structure.
- On error: pipeline halts, show error + "Retry" button in failed card.
- Abort: call `abortRef.current?.abort()`, reset all stages to idle.
- VerdictCard shows "7 Tasks completed", lists all 7 displaced roles with
  strikethrough, and displays a timeline comparison bar chart.
