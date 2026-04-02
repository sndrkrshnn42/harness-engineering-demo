# Harness Engineering Demo

Single-page application that demonstrates an AI agent autonomously executing a
6-stage harness engineering pipeline. Paste a service specification, click
**Run Pipeline**, and watch each stage stream its AI-generated output in
real time.

## Pipeline Stages

| Stage | Name              | Role Displaced                      | Output                                |
|-------|-------------------|-------------------------------------|---------------------------------------|
| 1     | Spec ingestion    | BA / Analyst                        | Structured requirement breakdown      |
| 2     | Code generation   | Software Developer + Test Engineer  | Application code + pytest test suite  |
| 3     | Infra generation  | Platform Engineer                   | Helm chart + Kubernetes manifests     |
| 4     | Push to Git       | DevOps Engineer                     | Git commit + push to remote           |
| 5     | Defect triage     | Support Engineer                    | Root cause + remediation              |
| 6     | Report synthesis  | Tech Lead                           | Verdict card + impact summary         |

## Prerequisites

### Runtime

- **Node.js 18.17 or later** (required by Next.js 14)
- **npm** (ships with Node.js)

### Azure AD Application

Stages 1, 3, 5, and 6 call a Qwen 2.5 Coder 14B inference endpoint that is
secured with Azure AD. You need an Azure AD app registration with the
**client credentials** grant type:

1. Register an application in your Azure AD tenant (Microsoft Entra ID).
2. Create a client secret under **Certificates & secrets**.
3. Note the **Tenant ID**, **Application (client) ID**, and the generated
   **Client secret value**.
4. Ensure the app has the API permission scope `api://<client_id>/.default`.

### Inference Endpoint

You need access to an OpenAI-compatible chat completions endpoint serving
**Qwen 2.5 Coder 14B**. The app calls `<INFERENCE_URL>/v1/chat/completions`
with Bearer token authentication (the Azure AD token acquired above).

### OpenCode CLI (optional -- for OpenCode codegen mode)

Stage 2 supports two codegen engines, selectable via a toggle in the UI:

- **Qwen mode** -- uses the same Qwen inference endpoint with an agentic
  tool-calling loop. No extra setup required.
- **OpenCode mode** -- spawns a local [OpenCode](https://opencode.ai) server
  via the `@opencode-ai/sdk`. Requires the `opencode` CLI to be installed
  globally:

  ```bash
  npm install -g opencode
  ```

  The OpenCode server listens on port 4096 by default (configurable via
  `OPENCODE_PORT`).

### GitHub PAT (optional -- for Stage 4 git push)

Stage 4 can push the generated code to a GitHub repository. This is optional
and configured at runtime through the UI. If no credentials are provided,
Stage 4 completes immediately with a skip message.

To enable git push:

1. Create a GitHub **Personal Access Token (classic)** with the `repo` scope,
   or a **fine-grained token** with **Contents: Read and write** permission on
   the target repository.
2. Enter the token and target repository (`owner/repo` or full URL) in the
   input panel before running the pipeline.

The PAT is sent only to the Next.js server-side API route (`/api/git-push`)
and is never logged or persisted.

## Environment Setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in the values in `.env.local`:

   ```
   AZURE_TENANT_ID=<your Azure AD tenant ID>
   AZURE_CLIENT_ID=<your Azure AD application (client) ID>
   AZURE_CLIENT_SECRET=<your Azure AD client secret value>
   INFERENCE_URL=<your Qwen inference endpoint base URL>
   OPENCODE_PORT=4096
   ```

   | Variable              | Required | Description                                                       |
   |-----------------------|----------|-------------------------------------------------------------------|
   | `AZURE_TENANT_ID`     | Yes      | Azure AD tenant ID for OAuth2 token acquisition                   |
   | `AZURE_CLIENT_ID`     | Yes      | Azure AD application (client) ID                                  |
   | `AZURE_CLIENT_SECRET` | Yes      | Azure AD client secret for the client credentials flow            |
   | `INFERENCE_URL`       | Yes      | Base URL of the Qwen 2.5 Coder 14B inference endpoint             |
   | `OPENCODE_PORT`       | No       | Port for the OpenCode server (default: `4096`)                    |

   All environment variables are server-only (no `NEXT_PUBLIC_` prefix). They
   are never sent to the browser.

> **Warning:** `.env.local` contains secrets. It is gitignored by default.
> Never commit this file.

## Install Dependencies

```bash
npm install
```

## Running the Demo

### Development (with hot reload)

```bash
npm run dev
```

The app starts at [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm run start
```

Use the production build for live demos to avoid HMR overhead.

## Using the Application

1. **Paste a service specification** in the left panel textarea. A default spec
   (RAGaaS Planner Agent API v2.1.0) is pre-loaded.
2. **Select the codegen engine** using the Qwen/OpenCode toggle below the
   textarea. Qwen works out of the box; OpenCode requires the CLI (see
   prerequisites).
3. **(Optional) Configure GitHub push** by entering a target repository and
   PAT in the GitHub Push fields. Leave empty to skip Stage 4.
4. Click **Run Pipeline**. All 6 stages execute sequentially with streaming
   output visible in the right panel.
5. After completion, a **verdict card** and **per-stage timing chart** are
   displayed. Click **Reset** to run again.

### Replay Mode

Click **Replay mode (offline fallback)** in the input panel to run a pre-baked
demo without any network calls. This is useful for offline presentations.

> Note: Replay data in `src/constants/replayData.ts` must be populated with
> captured output from a real pipeline run for this mode to produce output.

### Aborting a Run

Click **Abort** at any time during execution. All in-flight requests are
cancelled and stages are reset to idle.

## Browser Requirements

The application requires `ReadableStream` support for SSE streaming
(Chrome 95+, Firefox 102+, Safari 15.4+, Edge 95+).

## Tech Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript** (strict mode)
- **Tailwind CSS 3** (dark mode, `class` strategy)
- **Qwen 2.5 Coder 14B** via OpenAI-compatible endpoint
- **@opencode-ai/sdk** for OpenCode codegen mode
- **@octokit/rest** for GitHub git push (no git CLI dependency)
- **react-markdown** + **react-syntax-highlighter** + **remark-gfm** for
  markdown rendering
- **recharts** for per-stage timing visualization
- **JetBrains Mono** font for agent output panels
