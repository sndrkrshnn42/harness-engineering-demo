# AGENTS.md — Autonomous Harness Engineering Demo

## Project Overview

Single-page React application demonstrating AI agents autonomously executing a
7-stage harness engineering pipeline in ~90 seconds. User types a short prompt
describing their application, clicks "Run Pipeline", and watches sequential
AI-powered stages stream output. Stage 1 generates a full PRD + Architecture
document from the prompt. Stage 2 (Code Generation) runs two OpenCode SDK agents
in parallel — Adrian (FastAPI backend) and Rocky (React + INGKA Skapa frontend).
Stage 4 (Push to Git) uses `@octokit/rest` to commit and push generated files to
GitHub. Stage 5 (Docker Build & Deploy) uses the OpenCode SDK DevOps deploy agent to
autonomously build images with Kaniko and deploy to Kubernetes. All other
stages stream via a Qwen inference proxy with Azure AD authentication handled
server-side. Includes a replay mode for offline demos.

## Tech Stack

- **Framework:** React 18 + TypeScript (strict mode)
- **Build tool:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS 3 (dark mode via `class` strategy)
- **AI inference:** Qwen 2.5 Coder 14B via OpenAI-compatible endpoint (server-side proxy)
- **Stage 2 codegen:** `@opencode-ai/sdk` (v1.3.13) — dual-agent mode, spawns OpenCode server, creates parallel sessions for Adrian (api/) and Rocky (frontend/), streams events
- **Stage 4 git push:** `@octokit/rest` — Git Data API (create blobs, trees, commits, update refs)
- **Stage 5 docker/k8s:** `@opencode-ai/sdk` — DevOps deploy agent autonomously runs Kaniko builds and kubectl commands via the execute tool
- **Markdown rendering:** `react-markdown` + `remark-gfm` + `react-syntax-highlighter` (stage output)
- **Charting:** `recharts` (per-stage elapsed time bar chart)
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
generates pytest test suites as AI output (Stage 2), but the React app has no
unit/integration tests.

## Environment Setup

Create `.env.local` at project root (never commit this file):
```
AZURE_TENANT_ID=your_tenant_id
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
INFERENCE_URL=https://qwen25-coder-14b-tenant-coding-assistant.dev.g.inference.genai.mlops.ingka.com
OPENCODE_PORT=4096
KUBECONFIG_PATH=~/.kube/config
K8S_NAMESPACE=mlops-1775309721
```

`.env.local` is gitignored by default with Next.js. An `.env.example` with empty
values exists for reference.

## File Structure

```
src/
  App.tsx                       — Root layout, state machine, mode switching
  types.ts                      — All shared types, 7 stage definitions, reducer
  app/
    layout.tsx                  — Next.js root layout (html/body, fonts, globals.css)
    page.tsx                    — Next.js page entry (renders App)
    globals.css                 — Tailwind imports + JetBrains Mono
    api/
      inference/route.ts        — SSE proxy to Qwen (Azure AD auth)
      codegen/route.ts          — OpenCode SDK dual-agent codegen SSE endpoint
      git-push/route.ts         — Git push via @octokit/rest Git Data API (SSE)
      deploy/route.ts              — OpenCode SDK DevOps deploy agent (SSE)
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
    prompts.ts                  — All 7 system prompts + Adrian/Rocky codegen prompts
    agentSkills.ts              — Adrian (FastAPI) and Rocky (React/INGKA Skapa) skill definitions
    defaultPrompt.ts            — Default user prompt (short application description)
    replayData.ts               — Pre-baked outputs for replay mode (currently empty)
  hooks/
    usePipeline.ts              — Pipeline orchestration + dual-agent streaming logic
    useReplay.ts                — Replay mode hook
  components/
    InputPanel.tsx              — Prompt textarea + Run/Abort/Reset buttons + GitHub push inputs
    PipelinePanel.tsx           — Stage cards container + FileTree after Stage 2
    StageCard.tsx               — Individual stage card with streaming output
    MarkdownOutput.tsx          — Markdown renderer for stage output (react-markdown + remark-gfm)
    VerdictCard.tsx             — Final verdict card with impact summary (9 roles)
    PipelineChart.tsx           — Per-stage elapsed time bar chart (recharts)
    ProgressBar.tsx             — Pipeline progress bar
    ElapsedTimer.tsx            — Live elapsed time counter
    MetricsBar.tsx              — Live stage/token/line/role counts
    FileTree.tsx                — Tree view of generated files (Stage 2 output)
```

## The 7 Pipeline Stages

| ID | Stage Name | Role Displaced | Expected Output |
|----|-----------|---------------|-----------------|
| 1 | PRD & Architecture generation | BA / Analyst + Solution Architect | PRD + system architecture + API contract |
| 2 | Code generation | Software Developer + Test Engineer | FastAPI backend (api/) + React/Skapa frontend (frontend/) + tests |
| 3 | Infra generation | Platform Engineer | Standalone Kubernetes manifests (k8s/) |
| 4 | Push to Git | DevOps Engineer | Git commit + push to remote |
| 5 | Docker build & deploy | Release Engineer / SRE | Docker images (Kaniko) + K8s deployment to mlops-1775309721 |
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
| Files — constants | camelCase `.ts` | `prompts.ts`, `agentSkills.ts` |
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
- **Model:** Qwen 2.5 Coder 14B for stages 1, 3, 6-7. OpenCode SDK (with its
  configured model) for Stage 2 codegen. Stage 4 (Push to Git) and Stage 5
  (Docker Build & Deploy) are non-AI.
- **Stage 1 PRD generation:** Takes a short user prompt and generates a complete
  PRD + Architecture + API Contract document. Replaces the old "spec ingestion"
  that merely analyzed a pasted spec.
- **Stage 2 codegen — dual-agent mode:** Two OpenCode agents run in parallel:
  - **Adrian:** FastAPI Python backend, writes to `api/` subdirectory
  - **Rocky:** React + INGKA Skapa Design System frontend, writes to `frontend/`
  - Each agent gets its own OpenCode session scoped to its subdirectory
  - After both agents complete, a testing sub-step validates syntax and structure
  - The `usePipeline` hook accepts a `codegenMode` parameter internally for
    branching, but the App always passes `'opencode'`.
  - **Qwen mode (internal fallback):** Agentic tool-calling loop with tools
    (write_file, read_file, list_files, execute_command). Falls back to standard
    streaming if the endpoint rejects tool calls.
  - **Stage 5 uses a third OpenCode agent (DevOps)** in addition to Adrian and
    Rocky. This agent autonomously handles Docker image builds (Kaniko) and
    Kubernetes deployments without manual orchestration code.
- **Stage 5 Docker Build & Deploy:**
  - Uses a DevOps deploy agent (`@opencode-ai/sdk`) that autonomously handles
    the full build-and-deploy lifecycle — no imperative orchestration code
  - **Kaniko builds:** The agent creates Kaniko K8s Jobs
    (`gcr.io/kaniko-project/executor`) to build container images in-cluster,
    monitors Job completion, and cleans up resources (ConfigMap + Job) afterward
  - **Image push:** Pushes images to Artifact Registry at
    `europe-west4-docker.pkg.dev/ingka-genai-platform-dev/genai-platform/`
  - Uses K8s service account `harness-builder` with Workload Identity for
    Artifact Registry access (no static credentials)
  - **K8s deployment:** Applies manifests via `kubectl apply` commands, monitors
    rollout status, and diagnoses errors autonomously
  - Uses the execute tool to run kubectl commands (180s timeout)
  - Authenticates via kubeconfig file (`~/.kube/config` or `KUBECONFIG_PATH` env)
  - Auto-creates Dockerfiles if none exist but api/ or frontend/ dirs are present
- **INGKA Skapa Design System:** Rocky agent uses INGKA Skapa components via
  `@ingka/*` scoped packages (e.g., `import Button from '@ingka/button'`). Each
  component is a separate npm package from IKEA's private registry. The full
  skill reference is in `docs/skapa/SKILL.md` and embedded in the Rocky prompt
  via `src/constants/agentSkills.ts`.
- **globalThis singletons:** `workspace.ts` and `opencode.ts` use `globalThis`
  for Map/server state persistence across Next.js HMR re-evaluations in dev mode.
- **Workspace management:** Each pipeline run creates a temp directory
  (`os.tmpdir() + '/harness-run-' + id`). Files are written there during Stage 2.
  Workspace is destroyed on reset. Path traversal protection enforced.
- **Max tokens:** 2048 per stage. Do not reduce — Stage 3 (infra generation)
  regularly uses 1800+ tokens.
- **Inter-stage pause:** 600ms between stages for visual rhythm. Intentional.
- **No streaming fallback:** Requires `ReadableStream` support (Chrome 95+).
- **No retry on 429:** Pipeline errors on rate limit. Ensure headroom before demos.

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/inference` | POST | SSE proxy to Qwen. Acquires Azure AD token, forwards messages, streams response. |
| `/api/codegen` | POST | OpenCode SDK dual-agent codegen. Accepts `agent` and `subdir` params for scoped sessions. SSE events. |
| `/api/git-push` | POST | Git push via @octokit/rest Git Data API. Reads workspace files, creates blobs/tree/commit, updates ref. SSE progress stream. |
| `/api/deploy` | POST | OpenCode SDK DevOps deploy agent. Creates session, sends deploy prompt, relays SSE events. |
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
- Stage output max-height: 256px while running (scrollable), 320px when complete.
- Auto-scroll output to bottom while streaming; stop on stage completion.
- FileTree component renders after Stage 2 card, showing generated file structure.
- On error: pipeline halts, show error + "Retry" button in failed card.
- Abort: call `abortRef.current?.abort()`, reset all stages to idle.
- VerdictCard shows "7 Tasks completed", lists all 9 displaced roles with
  strikethrough, and displays a timeline comparison bar chart.
