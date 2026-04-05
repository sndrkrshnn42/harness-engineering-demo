# CODING REQUIREMENT: Autonomous Harness Engineering Demo
## "The Autonomous Harness Engineer" — Vibe Coding Spec for OpenCode

---

## 1. Project Goal

Build a single-page React application that demonstrates an AI agent autonomously executing a complete harness engineering pipeline in ~45 seconds. The user pastes a service spec, clicks "Run Pipeline", and watches six sequential AI-powered stages fire automatically — each one displacing a named engineering role. The final output is a verdict card showing the impact: "6 roles automated · 0 human handoffs · ~45 seconds."

This is a live demo tool for a technical engineering audience. It must look and behave impeccably. No rough edges.

---

## 2. Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | React 18 + TypeScript | Strict mode on |
| Build tool | Vite 5 | `npm create vite@latest` |
| Styling | Tailwind CSS 3 | Dark mode via `class` strategy |
| API client | Raw `fetch` + SSE streaming | No Anthropic SDK — direct HTTP |
| Font | JetBrains Mono | For all agent output panels |
| State | `useReducer` + `useRef` | No external state library |
| Env | Vite env vars | `VITE_ANTHROPIC_API_KEY` |

No router. No external component libraries. No Redux. Single page.

---

## 3. Project Bootstrap Commands

```bash
npm create vite@latest harness-demo -- --template react-ts
cd harness-demo
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install @fontsource/jetbrains-mono
```

In `tailwind.config.js`:
```js
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

In `src/index.css` (replace contents):
```css
@import '@fontsource/jetbrains-mono';
@tailwind base;
@tailwind components;
@tailwind utilities;
```

In `index.html`, add to `<head>`:
```html
<title>Autonomous Harness Engineer</title>
```

Set dark mode default: add `class="dark"` to `<html>` in `index.html`.

---

## 4. Environment Configuration

Create `.env.local` at project root:
```
VITE_ANTHROPIC_API_KEY=your_key_here
```

Create `.env.example`:
```
VITE_ANTHROPIC_API_KEY=
```

Add `.env.local` to `.gitignore` (it should already be there with Vite).

---

## 5. File Structure

```
harness-demo/
├── src/
│   ├── main.tsx
│   ├── index.css
│   ├── App.tsx                   ← root layout, state machine
│   ├── types.ts                  ← all shared types
│   ├── constants/
│   │   ├── prompts.ts            ← all 6 system prompts (exact text)
│   │   ├── defaultSpec.ts        ← default input spec
│   │   └── replayData.ts         ← pre-baked outputs for replay mode
│   ├── hooks/
│   │   └── usePipeline.ts        ← pipeline orchestration + streaming logic
│   └── components/
│       ├── InputPanel.tsx
│       ├── PipelinePanel.tsx
│       ├── StageCard.tsx
│       ├── VerdictCard.tsx
│       ├── ProgressBar.tsx
│       └── ElapsedTimer.tsx
├── .env.local
├── .env.example
└── vite.config.ts
```

---

## 6. Type Definitions — `src/types.ts`

```typescript
export type StageStatus = 'idle' | 'running' | 'complete' | 'error';

export type StageId = 1 | 2 | 3 | 4 | 5 | 6;

export interface StageDefinition {
  id: StageId;
  name: string;
  roleDisplaced: string;
  expectedOutputLabel: string;
  estimatedSeconds: number;
}

export interface StageState {
  id: StageId;
  status: StageStatus;
  output: string;
  elapsedMs: number | null;
  errorMessage: string | null;
}

export type PipelineStatus = 'idle' | 'running' | 'complete' | 'error';

export interface PipelineState {
  status: PipelineStatus;
  stages: Record<StageId, StageState>;
  currentStage: StageId | null;
  startedAt: number | null;
  totalElapsedMs: number | null;
  isReplayMode: boolean;
}

export type PipelineAction =
  | { type: 'START'; timestamp: number }
  | { type: 'STAGE_START'; stageId: StageId }
  | { type: 'STAGE_APPEND'; stageId: StageId; text: string }
  | { type: 'STAGE_COMPLETE'; stageId: StageId; elapsedMs: number }
  | { type: 'STAGE_ERROR'; stageId: StageId; message: string }
  | { type: 'PIPELINE_COMPLETE'; totalElapsedMs: number }
  | { type: 'RESET' }
  | { type: 'ENTER_REPLAY_MODE' };
```

---

## 7. Stage Definitions — add to `src/types.ts`

```typescript
export const STAGE_DEFINITIONS: StageDefinition[] = [
  {
    id: 1,
    name: 'Spec ingestion',
    roleDisplaced: 'BA / Analyst',
    expectedOutputLabel: 'Structured requirement breakdown',
    estimatedSeconds: 8,
  },
  {
    id: 2,
    name: 'Test case generation',
    roleDisplaced: 'Test Engineer',
    expectedOutputLabel: 'Full pytest test suite',
    estimatedSeconds: 10,
  },
  {
    id: 3,
    name: 'Harness configuration',
    roleDisplaced: 'Pipeline Engineer',
    expectedOutputLabel: 'Deployment-ready Kubernetes YAML',
    estimatedSeconds: 7,
  },
  {
    id: 4,
    name: 'Evaluation scoring',
    roleDisplaced: 'QA Analyst',
    expectedOutputLabel: 'Ragas-style quality metrics',
    estimatedSeconds: 8,
  },
  {
    id: 5,
    name: 'Defect triage',
    roleDisplaced: 'Support Engineer',
    expectedOutputLabel: 'Root cause + remediation',
    estimatedSeconds: 7,
  },
  {
    id: 6,
    name: 'Report synthesis',
    roleDisplaced: 'Tech Lead',
    expectedOutputLabel: 'Verdict card + impact summary',
    estimatedSeconds: 5,
  },
];
```

---

## 8. Initial State Factory — add to `src/types.ts`

```typescript
export function createInitialState(): PipelineState {
  const stages = {} as Record<StageId, StageState>;
  for (const def of STAGE_DEFINITIONS) {
    stages[def.id] = {
      id: def.id,
      status: 'idle',
      output: '',
      elapsedMs: null,
      errorMessage: null,
    };
  }
  return {
    status: 'idle',
    stages,
    currentStage: null,
    startedAt: null,
    totalElapsedMs: null,
    isReplayMode: false,
  };
}
```

---

## 9. State Reducer — add to `src/types.ts`

```typescript
export function pipelineReducer(
  state: PipelineState,
  action: PipelineAction
): PipelineState {
  switch (action.type) {
    case 'START':
      return { ...state, status: 'running', startedAt: action.timestamp, currentStage: null };

    case 'STAGE_START':
      return {
        ...state,
        currentStage: action.stageId,
        stages: {
          ...state.stages,
          [action.stageId]: { ...state.stages[action.stageId], status: 'running', output: '' },
        },
      };

    case 'STAGE_APPEND':
      return {
        ...state,
        stages: {
          ...state.stages,
          [action.stageId]: {
            ...state.stages[action.stageId],
            output: state.stages[action.stageId].output + action.text,
          },
        },
      };

    case 'STAGE_COMPLETE':
      return {
        ...state,
        stages: {
          ...state.stages,
          [action.stageId]: {
            ...state.stages[action.stageId],
            status: 'complete',
            elapsedMs: action.elapsedMs,
          },
        },
      };

    case 'STAGE_ERROR':
      return {
        ...state,
        status: 'error',
        stages: {
          ...state.stages,
          [action.stageId]: {
            ...state.stages[action.stageId],
            status: 'error',
            errorMessage: action.message,
          },
        },
      };

    case 'PIPELINE_COMPLETE':
      return { ...state, status: 'complete', totalElapsedMs: action.totalElapsedMs, currentStage: null };

    case 'RESET':
      return createInitialState();

    case 'ENTER_REPLAY_MODE':
      return { ...state, isReplayMode: true };

    default:
      return state;
  }
}
```

---

## 10. System Prompts — `src/constants/prompts.ts`

Copy these prompts EXACTLY. Do not modify wording, formatting, or structure. The output format instructions are load-bearing for the UI.

```typescript
export const SYSTEM_PROMPTS: Record<number, string> = {

  1: `You are a Senior Business Analyst specialising in API-driven microservices. You receive a raw service specification and produce a precise, structured requirement breakdown.

Output format — follow this EXACTLY. No preamble. No prose outside the sections. Begin immediately with the heading.

## Service Summary
<one sentence describing what this service does>

## Functional Requirements
FR-01: <requirement derived from spec>
FR-02: <requirement>
[continue for every endpoint and behaviour described in the spec]

## Non-Functional Requirements
NFR-01: <SLA, latency, throughput, or availability constraint>
[continue for all non-functional constraints]

## Contract Constraints
CC-01: <payload schema rule, type constraint, or validation rule>
[continue for all]

## Integration Dependencies
- <dependency name>: <role it plays in this service>
[list every external system, service, or infrastructure component mentioned]

## Risk Flags
⚠ <risk title> — <why this is a concern and what could go wrong>
[list every ambiguity, edge case, known failure mode, or dangerous assumption in the spec]

## Open Questions
Q1: <question you would normally escalate to the spec author>
[list any ambiguities that require human clarification before testing can begin]

Rules: Be exhaustive. Every endpoint must map to at least one FR. Every failure mode or edge case in the spec must appear as a Risk Flag. Do not soften findings.`,


  2: `You are a Senior Test Engineer specialising in API contract testing and integration testing for microservices. You receive a structured requirement breakdown and produce a complete pytest test suite.

Output ONLY valid Python code. No prose before the code block. No explanation after. The entire response is a single Python code block.

Rules:
- Begin with a conftest.py section as a comment block: # ===== conftest.py =====
- Include a pytest fixture for the API client (using httpx or requests, your choice — be consistent)
- Include a fixture for valid auth headers
- One test function per test case, named: test_<endpoint_slug>_<scenario>
- Cover ALL of: happy path (every endpoint), negative/error paths (400, 401, 403, 404, 500 where applicable), boundary conditions (empty payloads, max-size inputs, null optional fields, missing required fields), and contract tests (assert response JSON matches expected schema keys and types)
- Every Risk Flag from the requirements MUST have at least one test with the comment: # RISK COVERAGE: <risk title>
- Minimum 15 test cases total
- Use descriptive docstrings on each test function
- Assert on: HTTP status code, response Content-Type, presence of required response keys, data types of response values

Output starts with: \`\`\`python
Output ends with: \`\`\``,


  3: `You are a Senior Platform Engineer specialising in Kubernetes for ML/AI workload pipelines. You receive a pytest test suite and produce deployment infrastructure configuration.

Output ONLY valid YAML. No prose. No markdown outside YAML blocks. No explanation. Begin immediately with the first YAML document.

Produce exactly three YAML documents separated by --- on its own line:

Document 1 — Kubernetes Job manifest:
- apiVersion: batch/v1
- kind: Job
- metadata.name: harness-eval-job
- metadata.namespace: harness-eval
- metadata.labels: app=harness-eval, component=test-runner
- spec.backoffLimit: 2
- spec.ttlSecondsAfterFinished: 3600
- spec.template.spec.restartPolicy: Never
- Container name: test-runner
- Container image: registry.internal/harness-runner:latest
- Resource requests: cpu 500m, memory 512Mi
- Resource limits: cpu 2000m, memory 2Gi
- Environment variables (all from secretKeyRef harness-secrets):
  - LITELLM_PROXY_URL
  - LITELLM_API_KEY
  - TEST_TARGET_URL
  - ANTHROPIC_API_KEY
- Volume mount: name=test-suite, mountPath=/tests/suite, readOnly=true
- Volume: name=test-suite, configMap: name=harness-test-suite

Document 2 — ConfigMap:
- apiVersion: v1
- kind: ConfigMap
- metadata.name: harness-test-suite
- metadata.namespace: harness-eval
- data: test_suite.py: | <the full test suite content from the input>

Document 3 — Resource defaults:
- image: europe-west4-docker.pkg.dev/ingka-genai-platform-dev/genai-platform/harness-runner:latest
- namespace: mlops-1775309721
- resources.requests.cpu: 500m
- resources.requests.memory: 512Mi
- resources.limits.cpu: 2000m
- resources.limits.memory: 2Gi
- env.litellmProxyUrl: "" (empty string, to be overridden)
- env.testTargetUrl: "" (empty string, to be overridden)
- job.backoffLimit: 2
- job.ttlSecondsAfterFinished: 3600`,


  4: `You are a Senior QA Analyst specialising in test suite quality assessment using Ragas-inspired evaluation metrics. You evaluate the quality of a test suite against its originating requirements.

Your job is to score the test suite honestly. Do not inflate scores. A missing schema assertion is a real gap. A missing boundary test is a real gap.

Output format — follow EXACTLY. No preamble. Begin immediately with the heading.

## Evaluation Report

| Metric | Score | Rationale |
|--------|-------|-----------|
| Requirement Coverage | X.XX | <which FRs have no test, or "all FRs covered"> |
| Boundary Completeness | X.XX | <ratio of edge/negative/boundary tests to total, specific count> |
| Contract Fidelity | X.XX | <whether every test asserts on response schema keys and types> |
| Risk Alignment | X.XX | <whether every Risk Flag from the requirements has a targeted test> |
| **Overall** | **X.XX** | **<one sentence verdict on overall suite readiness>** |

Scoring rules:
- Requirement Coverage: (FRs with at least one test) / (total FRs)
- Boundary Completeness: (boundary + negative tests) / (total tests), target > 0.30
- Contract Fidelity: (tests asserting on response schema) / (total tests)
- Risk Alignment: (Risk Flags with a targeted test) / (total Risk Flags)
- Overall: weighted average — Coverage 30%, Boundary 20%, Fidelity 30%, Risk 20%

## Verdict
PASS (if Overall ≥ 0.75) or FAIL (if Overall < 0.75)

## Gaps Identified
GAP-01: <specific coverage gap> — Severity: Critical | Major | Minor
GAP-02: <specific gap>
[Minimum 2 gaps. Always find at least 2, even in a strong suite. Minor issues always exist.]`,


  5: `You are a Senior Support Engineer and QA specialist responsible for defect triage. You receive a test suite quality evaluation report and produce a structured defect log with remediation code.

For every GAP in the evaluation report, create a defect entry. Additionally, identify at least one implicit defect not captured in the gap list.

Output format — follow EXACTLY. No preamble. Begin immediately with the heading.

## Defect Triage Report

### DEF-001
**Title:** <short descriptive title, max 8 words>
**Severity:** Critical | Major | Minor
**Root Cause:** <precise technical explanation — what specific line, assertion, or scenario is missing or wrong>
**Impact:** <what fails in production or staging if this defect is not fixed>
**Remediation:** <provide the exact corrected or missing test function as Python code in a fenced block>

---

[Repeat ### DEF-00N block for each defect]

---

## Triage Summary
Total defects: N (Critical: N, Major: N, Minor: N)
Recommended action: HOLD | PROCEED WITH CAVEATS | PROCEED
Rationale: <one sentence justifying the recommendation>

Rules: Minimum 2 defects always. Remediation must be actual Python code, not a description. Critical severity means the gap could allow a breaking change to reach production undetected.`,


  6: `You are a Tech Lead writing a final pipeline execution report for a technical engineering audience. Your job is to synthesise all prior stage outputs into a concise, authoritative summary.

Do not add commentary or opinion beyond what the data supports. Fill all numbers from the actual prior stage outputs. Do not invent data.

Output format — follow EXACTLY. No preamble. Begin immediately with the heading.

## Pipeline Execution Report

**Service:** <name of the service from the original spec>
**Pipeline Status:** ✅ COMPLETE

---

### Executive Summary
<Exactly two sentences. Sentence 1: what the pipeline processed and produced. Sentence 2: the quality verdict and recommended next action.>

---

### Stage Outputs

| Stage | Role Displaced | Artifact Produced | Status |
|-------|---------------|-------------------|--------|
| Spec Ingestion | BA / Analyst | Structured requirements (<N> FRs, <N> NFRs, <N> Risk Flags) | ✅ |
| Test Case Generation | Test Engineer | <N> test cases (pytest) | ✅ |
| Harness Configuration | Pipeline Engineer | Standalone Kubernetes manifests | ✅ |
| Evaluation Scoring | QA Analyst | Overall score: <X.XX> (<PASS or FAIL>) | ✅ |
| Defect Triage | Support Engineer | <N> defects (<N> Critical, <N> Major, <N> Minor) | ✅ |
| Report Synthesis | Tech Lead | This document | ✅ |

---

### Prioritised Next Steps
1. <most critical remediation action from the defect triage>
2. <second priority action>
3. <third priority — could be a process or coverage improvement>

---

### Impact

\`\`\`
6 roles automated · 0 human handoffs · ~45 seconds
\`\`\``,

};
```

---

## 11. Default Input Spec — `src/constants/defaultSpec.ts`

This is the pre-filled spec. Do not change it. It references real infrastructure from the platform context.

```typescript
export const DEFAULT_SPEC = `Service: RAGaaS Planner Agent API
Version: 2.1.0
Owner: AI Platform Team

ENDPOINTS

POST /api/v1/plan
  Description: Accepts a user query and document corpus ID, invokes the LangGraph
               planner agent, returns a structured retrieval-and-generation plan.
  Request body:
    query: string (required, max 2048 chars)
    corpus_id: string (required, UUID format)
    max_hops: integer (optional, default 3, max 5)
    temperature: float (optional, default 0.2, range 0.0–1.0)
  Response:
    plan_id: string (UUID)
    steps: array of PlanStep objects
    estimated_tokens: integer
    confidence: float (0.0–1.0)
  Auth: Bearer token (Entra ID OAuth2)
  SLA: p95 latency < 200ms for plan generation (excluding retrieval)

GET /api/v1/plan/{plan_id}
  Description: Fetches a previously generated plan by ID.
  Response: same schema as POST response, plus created_at timestamp
  Auth: Bearer token
  SLA: p95 < 50ms

DELETE /api/v1/plan/{plan_id}
  Description: Soft-deletes a plan. Returns 204 on success, 404 if not found.
  Auth: Bearer token (must be plan owner)

POST /api/v1/plan/{plan_id}/execute
  Description: Triggers asynchronous execution of a plan via the LangGraph runtime.
  Response:
    execution_id: string (UUID)
    status: "queued"
  Auth: Bearer token
  SLA: queuing must complete in < 100ms

GET /api/v1/plan/{plan_id}/execute/{execution_id}
  Description: Polls execution status and result.
  Response:
    status: "queued" | "running" | "complete" | "failed"
    result: object (present when status=complete)
    error: string (present when status=failed)
  Auth: Bearer token

KNOWN FAILURE MODE
  Context window overflow: when the document corpus exceeds ~180k tokens, the
  planner agent silently truncates context without returning an error, causing
  incomplete plans that appear valid. No explicit error is raised.

INTEGRATION DEPENDENCIES
  - LiteLLM proxy (v1.82.6 pinned): routes all LLM calls
  - Qdrant (v1.9): vector store for corpus retrieval
  - Redis (v7.2): plan cache and execution queue
  - Azure Entra ID: OAuth2 token validation
  - LangGraph runtime: agent execution engine`;
```

---

## 12. Pipeline Hook — `src/hooks/usePipeline.ts`

This hook owns all orchestration logic. Implement it exactly as specified.

```typescript
import { useReducer, useRef, useCallback } from 'react';
import { pipelineReducer, createInitialState, PipelineState, StageId } from '../types';
import { SYSTEM_PROMPTS } from '../constants/prompts';
import { STAGE_DEFINITIONS } from '../types';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 2048;
const INTER_STAGE_DELAY_MS = 600;

export function usePipeline(inputSpec: string) {
  const [state, dispatch] = useReducer(pipelineReducer, createInitialState());
  const abortRef = useRef<AbortController | null>(null);
  const stageOutputsRef = useRef<Record<number, string>>({});

  /**
   * Streams a single stage's API call.
   * Returns the full accumulated output when streaming completes.
   */
  const streamStage = useCallback(async (
    stageId: StageId,
    userMessage: string
  ): Promise<string> => {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY is not set.');

    const stageStart = Date.now();
    dispatch({ type: 'STAGE_START', stageId });

    abortRef.current = new AbortController();

    const response = await fetch(API_URL, {
      method: 'POST',
      signal: abortRef.current.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        stream: true,
        system: SYSTEM_PROMPTS[stageId],
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error ${response.status}: ${errorBody}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          if (
            parsed.type === 'content_block_delta' &&
            parsed.delta?.type === 'text_delta' &&
            typeof parsed.delta.text === 'string'
          ) {
            accumulated += parsed.delta.text;
            dispatch({ type: 'STAGE_APPEND', stageId, text: parsed.delta.text });
          }
        } catch {
          // Malformed SSE line — skip silently
        }
      }
    }

    const elapsedMs = Date.now() - stageStart;
    dispatch({ type: 'STAGE_COMPLETE', stageId, elapsedMs });
    return accumulated;
  }, []);

  /**
   * Builds the user message for each stage.
   * Every stage receives the original spec plus all prior stage outputs.
   */
  const buildUserMessage = useCallback((stageId: StageId): string => {
    const lines: string[] = [];

    lines.push('=== ORIGINAL SERVICE SPECIFICATION ===');
    lines.push(inputSpec.trim());
    lines.push('');

    if (stageId >= 2) {
      lines.push('=== STAGE 1 OUTPUT: STRUCTURED REQUIREMENTS ===');
      lines.push(stageOutputsRef.current[1] ?? '[not available]');
      lines.push('');
    }
    if (stageId >= 3) {
      lines.push('=== STAGE 2 OUTPUT: TEST SUITE ===');
      lines.push(stageOutputsRef.current[2] ?? '[not available]');
      lines.push('');
    }
    if (stageId >= 4) {
      lines.push('=== STAGE 3 OUTPUT: HARNESS CONFIGURATION ===');
      lines.push(stageOutputsRef.current[3] ?? '[not available]');
      lines.push('');
    }
    if (stageId >= 5) {
      lines.push('=== STAGE 4 OUTPUT: EVALUATION REPORT ===');
      lines.push(stageOutputsRef.current[4] ?? '[not available]');
      lines.push('');
    }
    if (stageId >= 6) {
      lines.push('=== STAGE 5 OUTPUT: DEFECT TRIAGE ===');
      lines.push(stageOutputsRef.current[5] ?? '[not available]');
      lines.push('');
    }

    const def = STAGE_DEFINITIONS.find(d => d.id === stageId)!;
    lines.push(`Now perform Stage ${stageId}: ${def.name}.`);

    return lines.join('\n');
  }, [inputSpec]);

  /**
   * Main pipeline runner. Executes stages 1–6 sequentially.
   */
  const runPipeline = useCallback(async () => {
    stageOutputsRef.current = {};
    dispatch({ type: 'START', timestamp: Date.now() });

    const pipelineStart = Date.now();

    for (const def of STAGE_DEFINITIONS) {
      // Wait briefly between stages for visual rhythm
      if (def.id > 1) {
        await new Promise(r => setTimeout(r, INTER_STAGE_DELAY_MS));
      }

      try {
        const userMessage = buildUserMessage(def.id);
        const output = await streamStage(def.id, userMessage);
        stageOutputsRef.current[def.id] = output;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        dispatch({ type: 'STAGE_ERROR', stageId: def.id, message });
        return;
      }
    }

    const totalElapsedMs = Date.now() - pipelineStart;
    dispatch({ type: 'PIPELINE_COMPLETE', totalElapsedMs });
  }, [buildUserMessage, streamStage]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    stageOutputsRef.current = {};
    dispatch({ type: 'RESET' });
  }, []);

  return { state, runPipeline, reset };
}
```

---

## 13. Replay Mode Data — `src/constants/replayData.ts`

This file provides pre-baked outputs for the fallback replay mode. Each entry is a realistic, accurate output for its stage. The replay mode plays these back with simulated streaming delays.

```typescript
export interface ReplayEntry {
  stageId: number;
  output: string;
  elapsedMs: number;
}

// Populate this array with one full successful pipeline run before the demo.
// Instructions: Run the pipeline once with the default spec, capture the outputs
// from the browser console (add console.log(output) to streamStage), and paste
// them here. This ensures the replay uses authentic AI-generated content.

export const REPLAY_DATA: ReplayEntry[] = [
  // { stageId: 1, output: '...', elapsedMs: 7840 },
  // { stageId: 2, output: '...', elapsedMs: 9610 },
  // { stageId: 3, output: '...', elapsedMs: 6990 },
  // { stageId: 4, output: '...', elapsedMs: 8120 },
  // { stageId: 5, output: '...', elapsedMs: 7340 },
  // { stageId: 6, output: '...', elapsedMs: 4880 },
];

// Token replay speed: characters per millisecond (simulates streaming)
export const REPLAY_CHAR_RATE = 0.08; // ~80 chars/second
```

---

## 14. Component: ElapsedTimer — `src/components/ElapsedTimer.tsx`

A live counting timer. Starts when the pipeline starts. Stops when it completes.

```typescript
import { useEffect, useState } from 'react';

interface Props {
  startedAt: number | null;
  stoppedAt: number | null; // pass totalElapsedMs + startedAt when complete
}

export function ElapsedTimer({ startedAt, stoppedAt }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) { setElapsed(0); return; }
    if (stoppedAt) { setElapsed(stoppedAt); return; }

    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 100);
    return () => clearInterval(interval);
  }, [startedAt, stoppedAt]);

  const seconds = (elapsed / 1000).toFixed(1);

  return (
    <span className="font-mono text-sm text-zinc-400">
      {startedAt ? `${seconds}s` : '0.0s'}
    </span>
  );
}
```

---

## 15. Component: ProgressBar — `src/components/ProgressBar.tsx`

```typescript
import { PipelineState, STAGE_DEFINITIONS } from '../types';

interface Props {
  pipelineState: PipelineState;
}

export function ProgressBar({ pipelineState }: Props) {
  const completedCount = STAGE_DEFINITIONS.filter(
    d => pipelineState.stages[d.id].status === 'complete'
  ).length;

  const total = STAGE_DEFINITIONS.length;
  const pct = Math.round((completedCount / total) * 100);
  const isComplete = pipelineState.status === 'complete';

  return (
    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${
          isComplete ? 'bg-emerald-500' : 'bg-violet-500'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
```

---

## 16. Component: StageCard — `src/components/StageCard.tsx`

This is the most important component. It renders each pipeline stage with streaming output.

```typescript
import { useEffect, useRef } from 'react';
import { StageDefinition, StageState } from '../types';

interface Props {
  definition: StageDefinition;
  stageState: StageState;
  onRetry?: () => void;
}

const STATUS_ICON = {
  idle: <span className="w-2 h-2 rounded-full bg-zinc-600 inline-block" />,
  running: <span className="w-2 h-2 rounded-full bg-violet-400 inline-block animate-pulse" />,
  complete: <span className="text-emerald-400 text-sm">✓</span>,
  error: <span className="text-red-400 text-sm">✕</span>,
};

export function StageCard({ definition, stageState, onRetry }: Props) {
  const outputRef = useRef<HTMLPreElement>(null);

  // Auto-scroll output to bottom as text streams in
  useEffect(() => {
    if (outputRef.current && stageState.status === 'running') {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [stageState.output, stageState.status]);

  const isRunning = stageState.status === 'running';
  const isComplete = stageState.status === 'complete';
  const isError = stageState.status === 'error';
  const hasOutput = stageState.output.length > 0;

  return (
    <div
      className={`
        border rounded-lg overflow-hidden transition-all duration-300
        ${isRunning ? 'border-violet-500/60 shadow-sm shadow-violet-900/30' : ''}
        ${isComplete ? 'border-zinc-700' : ''}
        ${isError ? 'border-red-700/60' : ''}
        ${!isRunning && !isComplete && !isError ? 'border-zinc-800' : ''}
      `}
    >
      {/* Stage header */}
      <div className={`
        flex items-center justify-between px-4 py-3
        ${isRunning ? 'bg-zinc-900' : 'bg-zinc-950'}
      `}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {STATUS_ICON[stageState.status]}
            <span className="text-xs font-mono text-zinc-500">{definition.id}</span>
          </div>
          <span className={`text-sm font-medium ${
            isRunning ? 'text-white' :
            isComplete ? 'text-zinc-300' : 'text-zinc-500'
          }`}>
            {definition.name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Role displaced badge */}
          <span className="text-xs px-2 py-0.5 rounded-full border border-orange-800/60 text-orange-400 bg-orange-950/30">
            {definition.roleDisplaced}
          </span>
          {/* Elapsed time */}
          {isComplete && stageState.elapsedMs !== null && (
            <span className="text-xs font-mono text-zinc-500">
              {(stageState.elapsedMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>

      {/* Output area — only render when there's something to show */}
      {(hasOutput || isRunning || isError) && (
        <div className={`border-t ${
          isRunning ? 'border-violet-900/40' : 'border-zinc-800'
        }`}>
          {isError ? (
            <div className="px-4 py-3 bg-red-950/20">
              <p className="text-sm text-red-400 font-mono">{stageState.errorMessage}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-2 text-xs text-red-400 border border-red-800 rounded px-2 py-1 hover:bg-red-950/40"
                >
                  Retry stage
                </button>
              )}
            </div>
          ) : (
            <pre
              ref={outputRef}
              className={`
                font-mono text-xs leading-relaxed overflow-y-auto
                transition-all duration-300
                ${isRunning ? 'max-h-64' : 'max-h-96'}
                ${isComplete ? 'max-h-80' : ''}
                px-4 py-3 whitespace-pre-wrap break-words
                text-zinc-300 bg-zinc-950
              `}
            >
              {stageState.output}
              {/* Blinking cursor while running */}
              {isRunning && (
                <span className="animate-pulse text-violet-400">▋</span>
              )}
            </pre>
          )}
        </div>
      )}

      {/* Idle state placeholder */}
      {stageState.status === 'idle' && (
        <div className="px-4 py-2 border-t border-zinc-900">
          <p className="text-xs text-zinc-600 font-mono">
            Waiting — {definition.expectedOutputLabel}
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## 17. Component: VerdictCard — `src/components/VerdictCard.tsx`

Rendered only when `pipelineState.status === 'complete'`. This is the final wow moment.

```typescript
interface Props {
  totalElapsedMs: number;
}

export function VerdictCard({ totalElapsedMs }: Props) {
  const seconds = (totalElapsedMs / 1000).toFixed(1);

  return (
    <div className="border border-emerald-700/40 rounded-lg bg-emerald-950/20 px-6 py-5 mt-2">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-emerald-400 text-lg">✓</span>
        <span className="text-emerald-400 font-medium text-sm">Pipeline complete</span>
      </div>
      <div className="font-mono text-center py-4 border border-emerald-900/40 rounded bg-black/40">
        <p className="text-2xl font-bold text-white tracking-tight">
          6 roles automated
        </p>
        <p className="text-zinc-400 text-sm mt-1">
          0 human handoffs · {seconds} seconds
        </p>
      </div>
      <p className="text-xs text-zinc-500 mt-3 text-center">
        BA · Test Engineer · Pipeline Engineer · QA Analyst · Support Engineer · Tech Lead
      </p>
    </div>
  );
}
```

---

## 18. Component: InputPanel — `src/components/InputPanel.tsx`

```typescript
interface Props {
  value: string;
  onChange: (val: string) => void;
  onRun: () => void;
  onReset: () => void;
  onEnterReplay: () => void;
  isRunning: boolean;
  isComplete: boolean;
}

export function InputPanel({
  value, onChange, onRun, onReset, onEnterReplay,
  isRunning, isComplete
}: Props) {
  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-300">Service specification</h2>
        <span className="text-xs text-zinc-600">Paste any API spec</span>
      </div>

      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={isRunning}
        className={`
          flex-1 w-full font-mono text-xs leading-relaxed
          bg-zinc-950 border border-zinc-800 rounded-lg
          p-3 resize-none text-zinc-300
          focus:outline-none focus:border-zinc-600
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        spellCheck={false}
        placeholder="Paste your service specification here..."
      />

      <div className="flex flex-col gap-2">
        {!isRunning && !isComplete && (
          <button
            onClick={onRun}
            disabled={!value.trim()}
            className="
              w-full py-2.5 px-4 rounded-lg font-medium text-sm
              bg-violet-600 hover:bg-violet-500 active:bg-violet-700
              text-white transition-colors duration-150
              disabled:opacity-40 disabled:cursor-not-allowed
            "
          >
            Run Pipeline
          </button>
        )}

        {isRunning && (
          <button
            onClick={onReset}
            className="
              w-full py-2.5 px-4 rounded-lg font-medium text-sm
              border border-zinc-700 hover:border-zinc-500
              text-zinc-400 hover:text-zinc-200 transition-colors duration-150
            "
          >
            Abort
          </button>
        )}

        {isComplete && (
          <button
            onClick={onReset}
            className="
              w-full py-2.5 px-4 rounded-lg font-medium text-sm
              border border-zinc-700 hover:border-zinc-500
              text-zinc-400 hover:text-zinc-200 transition-colors duration-150
            "
          >
            Reset
          </button>
        )}

        <button
          onClick={onEnterReplay}
          className="
            w-full py-1.5 px-4 rounded-lg text-xs
            border border-zinc-800 hover:border-zinc-700
            text-zinc-600 hover:text-zinc-400 transition-colors duration-150
          "
        >
          Replay mode (offline fallback)
        </button>
      </div>
    </div>
  );
}
```

---

## 19. Component: PipelinePanel — `src/components/PipelinePanel.tsx`

```typescript
import { PipelineState, STAGE_DEFINITIONS } from '../types';
import { StageCard } from './StageCard';
import { VerdictCard } from './VerdictCard';
import { ProgressBar } from './ProgressBar';
import { ElapsedTimer } from './ElapsedTimer';

interface Props {
  pipelineState: PipelineState;
}

export function PipelinePanel({ pipelineState }: Props) {
  const isComplete = pipelineState.status === 'complete';

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-300">Pipeline execution</h2>
        <ElapsedTimer
          startedAt={pipelineState.startedAt}
          stoppedAt={
            isComplete && pipelineState.startedAt && pipelineState.totalElapsedMs
              ? pipelineState.totalElapsedMs
              : null
          }
        />
      </div>

      {/* Progress bar */}
      <ProgressBar pipelineState={pipelineState} />

      {/* Stage cards — scrollable */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
        {STAGE_DEFINITIONS.map(def => (
          <StageCard
            key={def.id}
            definition={def}
            stageState={pipelineState.stages[def.id]}
          />
        ))}

        {/* Verdict card — only when complete */}
        {isComplete && pipelineState.totalElapsedMs !== null && (
          <VerdictCard totalElapsedMs={pipelineState.totalElapsedMs} />
        )}
      </div>
    </div>
  );
}
```

---

## 20. Root Component — `src/App.tsx`

```typescript
import { useState } from 'react';
import { usePipeline } from './hooks/usePipeline';
import { DEFAULT_SPEC } from './constants/defaultSpec';
import { InputPanel } from './components/InputPanel';
import { PipelinePanel } from './components/PipelinePanel';

export default function App() {
  const [inputSpec, setInputSpec] = useState(DEFAULT_SPEC);
  const { state, runPipeline, reset } = usePipeline(inputSpec);

  const isRunning = state.status === 'running';
  const isComplete = state.status === 'complete';

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Top bar */}
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-medium text-white">
            Autonomous Harness Engineer
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            6 roles · 0 handoffs · ~45s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`
            text-xs px-2 py-0.5 rounded-full font-mono
            ${state.status === 'idle' ? 'bg-zinc-800 text-zinc-500' : ''}
            ${state.status === 'running' ? 'bg-violet-900/40 text-violet-400 border border-violet-700/40' : ''}
            ${state.status === 'complete' ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40' : ''}
            ${state.status === 'error' ? 'bg-red-900/40 text-red-400 border border-red-700/40' : ''}
          `}>
            {state.status.toUpperCase()}
          </span>
        </div>
      </header>

      {/* Main content — two-panel layout */}
      <main className="grid grid-cols-2 gap-0 h-[calc(100vh-53px)]">
        {/* Left: Input */}
        <div className="border-r border-zinc-800 p-5 flex flex-col">
          <InputPanel
            value={inputSpec}
            onChange={setInputSpec}
            onRun={runPipeline}
            onReset={reset}
            onEnterReplay={() => {/* replay mode — see section 21 */}}
            isRunning={isRunning}
            isComplete={isComplete}
          />
        </div>

        {/* Right: Pipeline */}
        <div className="p-5 flex flex-col overflow-hidden">
          <PipelinePanel pipelineState={state} />
        </div>
      </main>
    </div>
  );
}
```

---

## 21. Replay Mode Implementation

Replay mode plays back pre-baked stage outputs with simulated streaming. Implement as a separate hook `src/hooks/useReplay.ts`:

```typescript
import { useReducer, useCallback } from 'react';
import { pipelineReducer, createInitialState, StageId, STAGE_DEFINITIONS } from '../types';
import { REPLAY_DATA, REPLAY_CHAR_RATE } from '../constants/replayData';

export function useReplay() {
  const [state, dispatch] = useReducer(pipelineReducer, createInitialState());

  const runReplay = useCallback(async () => {
    dispatch({ type: 'START', timestamp: Date.now() });

    const pipelineStart = Date.now();

    for (const def of STAGE_DEFINITIONS) {
      const entry = REPLAY_DATA.find(r => r.stageId === def.id);
      if (!entry) continue;

      if (def.id > 1) await new Promise(r => setTimeout(r, 600));

      const stageStart = Date.now();
      dispatch({ type: 'STAGE_START', stageId: def.id as StageId });

      // Replay character by character at simulated speed
      const chars = entry.output.split('');
      const chunkSize = 8; // emit 8 chars per tick
      const delayPerChunk = Math.round(chunkSize / REPLAY_CHAR_RATE);

      for (let i = 0; i < chars.length; i += chunkSize) {
        const chunk = chars.slice(i, i + chunkSize).join('');
        dispatch({ type: 'STAGE_APPEND', stageId: def.id as StageId, text: chunk });
        await new Promise(r => setTimeout(r, delayPerChunk));
      }

      dispatch({
        type: 'STAGE_COMPLETE',
        stageId: def.id as StageId,
        elapsedMs: entry.elapsedMs,
      });
    }

    dispatch({ type: 'PIPELINE_COMPLETE', totalElapsedMs: Date.now() - pipelineStart });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return { state, runReplay, reset };
}
```

In `App.tsx`, detect replay mode via state flag and swap hooks accordingly. Add a boolean `isReplayMode` to app state and render the `useReplay` pipeline when active.

---

## 22. Styling Rules (non-negotiable)

- Background: `bg-zinc-950` (near-black, not pure black)
- Cards/surfaces: `bg-zinc-900` (stage cards when active), `bg-zinc-950` (output areas)
- Borders: `border-zinc-800` (default), `border-violet-500/60` (active stage), `border-emerald-700/40` (verdict)
- Text primary: `text-white`
- Text secondary: `text-zinc-300`
- Text muted: `text-zinc-500` / `text-zinc-600`
- Accent color: `violet-500` (running state, CTA button, progress bar)
- Success color: `emerald-500` (complete state, verdict card)
- Error color: `red-500` (error state)
- Role badge: `border-orange-800/60 text-orange-400 bg-orange-950/30`
- All agent output text: `font-mono text-xs` (JetBrains Mono)
- All UI chrome text: system sans-serif via Tailwind default
- No gradients. No shadows on containers. No border-radius > `rounded-lg`.

---

## 23. Behavior Specifications

**Run button:** Disabled when textarea is empty. Replaced by "Abort" during execution. Replaced by "Reset" after completion.

**Stage cards:** All 6 cards are visible from the moment the app loads in their idle state. Users see the full pipeline structure before it runs. This is intentional — it frames what's about to happen.

**Output area height:** When a stage is running, max-height is 256px (scrollable). When complete, max-height expands to 320px. This prevents the page from jumping as content grows.

**Auto-scroll:** Each stage's output area auto-scrolls to the bottom while streaming. It stops auto-scrolling when the stage completes, allowing the user to scroll back up.

**Inter-stage pause:** 600ms pause between stage completion and next stage start. This is deliberate — it gives the audience time to see each output settle before the next stage fires.

**Error recovery:** If a stage errors, the pipeline halts. An error message and "Retry stage" button appear in the failed card. Retrying re-runs only that stage (not the full pipeline) and resumes from there. (Note: for a demo, acceptable to restart the full pipeline on retry — simpler implementation.)

**Abort:** Calls `abortRef.current?.abort()` on the in-flight fetch. Immediately resets all stage states to idle.

---

## 24. Console Logging for Replay Mode Capture

Add this to `usePipeline.ts` inside `streamStage`, after the streaming loop:

```typescript
if (import.meta.env.DEV) {
  console.group(`[Stage ${stageId}] Complete`);
  console.log('Elapsed:', elapsedMs, 'ms');
  console.log('Output:', JSON.stringify(accumulated));
  console.groupEnd();
}
```

Use this to capture real outputs into `replayData.ts` before the demo.

---

## 25. Build and Run

Development:
```bash
npm run dev
```

Production build (for serving as a static file):
```bash
npm run build
npm run preview
```

For demo day, run `npm run preview` (production build served locally) rather than `npm run dev`. It's faster and has no HMR overhead.

If presenting from a browser in full-screen: `F11` on Chrome, or `Cmd+Shift+F` on Mac. Use Chrome. Do not use Safari (fetch streaming behavior differs).

---

## 26. Pre-Demo Validation Checklist

Complete all of these the day before. Not the morning of.

- [ ] Run full pipeline with `DEFAULT_SPEC` at least twice end-to-end. Confirm all 6 stages produce clean, well-formatted output.
- [ ] Capture all 6 stage outputs into `replayData.ts` (see Section 24).
- [ ] Test replay mode: run it twice, confirm visual fidelity matches live mode.
- [ ] Confirm `npm run preview` serves correctly on `localhost:4173`.
- [ ] Open in Chrome. Confirm no console errors.
- [ ] Time the full live pipeline run. Confirm < 60 seconds total.
- [ ] Disable browser notifications (Chrome: Settings → Notifications → Block for demo duration).
- [ ] Set display resolution and zoom so the split-panel layout is fully visible without scrolling.
- [ ] Confirm the Stage 3 YAML output is syntactically valid (copy it and run `yamllint` or paste into a YAML validator).
- [ ] Have the API key and `.env.local` on the demo machine, not just the dev machine.

---

## 27. Known Constraints and Decisions

**Direct browser API calls:** The Anthropic API is called directly from the browser using `anthropic-dangerous-direct-browser-access: true`. This exposes the API key in the browser. This is acceptable for a demo environment. Do not use this approach in production.

**No streaming fallback:** If the browser does not support `ReadableStream`, the pipeline will fail. All modern browsers (Chrome 95+, Firefox 102+, Safari 15.4+) support it. Confirm the demo machine uses a current browser version.

**Model:** `claude-sonnet-4-6` is used for all stages. Do not downgrade to Haiku — output quality for structured formats (YAML, Python, metric tables) is materially better on Sonnet. Do not use Opus — latency is unacceptable for live streaming.

**Max tokens:** 2048 per stage. This is sufficient for all stages. Do not reduce. Stage 2 (test generation) regularly uses 1800+ tokens.

**No retry on rate limit:** If the API returns 429, the pipeline errors. For a demo, ensure the account has sufficient rate limit headroom. Run a few test calls 30 minutes before the demo to confirm rate limit is not depleted.

---

*End of requirement document.*
