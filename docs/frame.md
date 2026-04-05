# FRAME.md — Demo Framing & Showcase Strategy

## The One-Line Pitch

> "What if the entire engineering team — from analyst to developer to tech lead — was one AI agent, and the whole workflow finished before your coffee cooled?"

---

## 1. Why This Demo Is Different

Every AI demo in the market right now shows the same thing: **vibe coding** — an
AI writing code in an editor. Copilot writes a function. Cursor completes a file.
Devin opens a PR. The audience has seen this 50 times. It no longer impresses.

This demo does something fundamentally different.

**We are not showing AI writing code. We are showing AI replacing an entire
cross-functional engineering team's workflow — end to end — with zero human
handoffs, in under a minute.**

The shift in framing:

| What others demo | What we demo |
|---|---|
| AI as a coding assistant | AI as an autonomous engineering organisation |
| One role augmented (developer) | Seven roles displaced simultaneously |
| "AI helps you code faster" | "AI executes the entire pipeline — you only watch" |
| Output: code in an editor | Output: requirements, code, tests, infra, scoring, triage, report |
| The human is still in the loop | The human is the audience, not the operator |

The message is not "AI helps engineers." The message is:

> **"The roles are replaceable. The pipeline runs itself. The human intervention required is zero."**

---

## 2. The Seven Roles Being Displaced

Each pipeline stage maps to a named engineering role with a real job title, real
daily responsibilities, and a real salary cost. The audience must feel that each
stage represents a person they know — someone on their team.

| Stage | Role Displaced | What They Do Today | What the AI Does in Seconds |
|-------|---------------|--------------------|-----------------------------|
| 1. Spec Ingestion | **Business Analyst** | Reads specs, writes requirement docs, hosts clarification meetings | Parses the spec, extracts every FR, NFR, contract constraint, risk flag, and open question — exhaustively |
| 2. Code Generation | **Software Developer (Frontend & Backend)** | Designs component architecture, writes API handlers, builds UI components, wires up state management | Generates production-grade application code — backend API routes with validation, error handling, and database queries; frontend React components with state management, data fetching, and responsive UI |
| 3. Test Generation | **Test Engineer** | Writes test suites, covers edge cases, maps requirements to test cases | Produces a complete pytest suite with 15+ test cases, boundary conditions, contract tests, and risk coverage markers |
| 4. Harness Configuration | **Pipeline Engineer** | Writes Kubernetes manifests, configures CI/CD, manages infrastructure | Generates deployment-ready standalone K8s manifests — production-grade YAML |
| 5. Evaluation Scoring | **QA Analyst** | Reviews test quality, scores coverage, identifies gaps in test suites | Scores the test suite using Ragas-inspired metrics with honest, uninflated scoring and a PASS/FAIL verdict |
| 6. Defect Triage | **Support Engineer** | Triages defects, identifies root causes, writes remediation steps | Produces a structured defect log with severity ratings, root cause analysis, and actual remediation code |
| 7. Report Synthesis | **Tech Lead** | Synthesises all work into executive summaries, makes go/no-go calls | Generates a complete pipeline execution report with impact metrics and prioritised next steps |

### Why 7 Roles Matters

- It is not 1 role (that is augmentation, not displacement)
- It is not just "coding" (that is what every other demo shows)
- **It includes developers** — the role the audience identifies with most. They see themselves displaced. That is the visceral moment.
- It is the **entire value chain** from raw input to final decision
- Each role feeds into the next — the AI maintains context across all 7 stages
- Zero handoff meetings. Zero Jira tickets. Zero Slack threads between stages

### The Developer Stage Is the Knife Twist

Every other demo stops at "AI writes code for a developer." We go further.
The developer is just one of seven roles displaced. The AI writes the code
(Stage 2) and then immediately moves on to test it (Stage 3), deploy it
(Stage 4), evaluate it (Stage 5), triage it (Stage 6), and report on it
(Stage 7) — without pausing. The developer is not special. The developer
is just another node in the pipeline that the AI replaces.

This is the framing that separates this demo from every Copilot/Cursor/Devin
showcase: **the developer is not the hero of the story. The developer is one
of seven roles that the pipeline no longer needs.**

---

## 3. Demo Components & Architecture

### 3.1 The Input (Left Panel)

A pre-loaded service specification for the **Security Observability Dashboard
(SecObsDash)** — a real-time security monitoring platform with alert ingestion,
vulnerability tracking, compliance monitoring, incident management, and
WebSocket-based live feeds. The spec follows IEEE 830 / ISO 29148 standards
with 25+ API endpoints, 7 known failure modes, and comprehensive data models.

**Why this spec:** Security is universally understood and immediately
compelling. Every engineering team has a SOC. Every CISO worries about alert
fatigue, vulnerability backlogs, and compliance gaps. The audience does not
need domain expertise to understand what is being built — and they know exactly
how long it would take a real team to deliver it.

The spec is pre-loaded. The presenter does not type anything. They click one
button.

### 3.2 The Pipeline (Right Panel)

Seven stage cards visible from the moment the page loads. The audience sees the
entire pipeline structure before it runs — this is intentional framing. They see
the 7 roles listed. They understand the scope of what is about to happen.

When the pipeline runs:
- Each card activates sequentially (violet border, pulsing indicator)
- Output streams in real-time, character by character (SSE streaming)
- A blinking cursor shows the AI "typing" — the audience sees it think
- Role displacement badges are visible on every card at all times
- Each stage completes with a checkmark and elapsed time

### 3.3 The Verdict (End State)

When all 7 stages complete, a verdict card appears:

```
7 roles automated · 0 human handoffs · ~60 seconds
```

Below it: the list of all displaced roles.

This is the moment the demo lands. The audience reads those three numbers and
processes the implication.

### 3.4 Supporting UI Elements

| Element | Purpose | Wow Contribution |
|---------|---------|------------------|
| **Elapsed Timer** | Live-counting clock in the header | Creates urgency; audience watches seconds tick by and realises "this would take weeks manually" |
| **Progress Bar** | Fills across the top as stages complete | Visual momentum — the audience sees the pipeline advancing |
| **Role Badges** | Orange badges on every stage card showing the displaced role | Constant reminder: this is about people, not code |
| **Streaming Output** | JetBrains Mono font, character-by-character streaming | The AI is visibly working — this is not pre-rendered, it is live |
| **Inter-stage Pauses** | 600ms pause between stages | Gives the audience time to absorb each output before the next stage fires |

---

## 4. Elements That Deliver the "Wow" Factor

### 4.1 The Artifacts Are Real

This is the single most important differentiator. Every stage produces a **real,
usable artifact** — not a summary, not a description, not a paragraph of prose.

- Stage 1 produces structured requirements a PM could sign off on
- Stage 2 produces application code — backend API handlers and frontend React components — that could be committed to a repo
- Stage 3 produces a pytest suite that could be dropped into a repo and run
- Stage 4 produces Kubernetes YAML that would pass `kubectl apply --dry-run`
- Stage 5 produces a scored evaluation report with quantified metrics
- Stage 6 produces defect entries with actual Python remediation code
- Stage 7 produces an executive report with data pulled from all prior stages

**The audience can verify this.** If someone in the room knows React, they can
look at Stage 2's frontend components and confirm the code is structurally
sound. If someone knows Express.js, they can read the API handlers and see
proper validation, error handling, and middleware patterns. If someone knows
Kubernetes, they can verify Stage 4's YAML. The artifacts are not theoretical.

### 4.2 The Chain of Context

Each stage receives the outputs of all prior stages. This is not 7 independent
AI calls — it is a single coherent pipeline where:

- Stage 2 generates code that implements the requirements from Stage 1
- Stage 3 tests the code from Stage 2 against the requirements from Stage 1
- Stage 4 deploys the code from Stage 2 and the test suite from Stage 3
- Stage 5 evaluates the test suite from Stage 3 against the requirements from Stage 1
- Stage 6 triages the gaps identified by Stage 5
- Stage 7 synthesises everything from Stages 1-6

The AI maintains context across the full pipeline. This is what makes it an
**engineering organisation**, not a chatbot.

### 4.3 The Speed Contrast

The implicit contrast the audience computes in their heads:

| Metric | Traditional (Human Team) | This Demo (AI Pipeline) |
|--------|--------------------------|-------------------------|
| **Elapsed time** | 2-4 weeks (for a security dashboard) | ~60 seconds |
| **People required** | 7 specialists | 0 |
| **Handoff meetings** | 6 (between each stage) | 0 |
| **Jira tickets created** | 10+ (one per stage, plus sub-tasks) | 0 |
| **Slack threads** | Dozens | 0 |
| **Context lost in handoffs** | Significant | None — full context carried forward |
| **Sprint planning ceremonies** | 2-3 | 0 |
| **Code review cycles** | 4-6 PRs | 0 |

The presenter should NOT show this table. The audience should compute it
themselves. That is more powerful than being told.

### 4.4 The Live Streaming Effect

The output streams in real-time. The audience watches the AI write React
components and Express handlers character by character. They see pytest code
materialise. They see Kubernetes YAML generated line by line. They see
evaluation scores being calculated in front of them.

This is not a pre-recorded demo. This is not a slide deck. This is live. And
it works every time (with replay mode as the safety net for network failures).

### 4.5 The Developer Stage Moment

When Stage 2 fires — **Code Generation** — the room shifts. This is the stage
that hits closest to home for a technical audience. They watch the AI write the
code they would write. Backend route handlers with proper middleware chains.
Frontend components with state management hooks. Input validation with Zod
schemas. Error handling with proper HTTP status codes.

And then it completes — in seconds — and the pipeline moves on without pausing.
The AI does not celebrate. It does not ask for a code review. It moves to
testing. The developer role is handled. Next.

### 4.6 The Silence After the Verdict

When the verdict card appears — "7 roles automated · 0 human handoffs · ~60
seconds" — the presenter should say nothing for 3-5 seconds. Let the room
process what they just watched. The silence is the wow factor.

---

## 5. Demo Flow (Presenter Script Outline)

### Opening (30 seconds)

"This is a requirements specification for a Security Observability Dashboard.
Twenty-five API endpoints. Alert ingestion, vulnerability tracking, compliance
monitoring, incident management, real-time WebSocket feeds. The spec follows
IEEE 830 standards — complete with data models, failure modes, and SLA
constraints.

If I handed this to an engineering team today, here is what would happen:

A business analyst would spend a day writing structured requirements. A
development team — frontend and backend — would spend one to two weeks building
the application. A test engineer would spend days writing the test suite. A
pipeline engineer would configure the deployment infrastructure. QA would score
the test quality. Support would triage the gaps. And a tech lead would write the
final report.

That is 7 roles, 2 to 4 weeks, and at least 6 handoff meetings where context
gets lost.

Watch what happens when an AI agent does all of it."

### Execution (50-70 seconds)

Click "Run Pipeline." Say nothing. Let the audience watch.

Optional callouts during execution (keep brief):
- When Stage 1 completes: "Requirements extracted. That was the analyst's job."
- When Stage 2 streams: "Now it is writing the application code. Backend API handlers. Frontend React components. This is the developer's job."
- When Stage 2 completes: "Done. The developer is displaced. Moving on."
- When Stage 3 streams: "Full pytest suite. 15+ test cases, boundary conditions, contract tests."
- When Stage 4 completes: "Production-grade Kubernetes YAML. Ready to deploy."
- When Stage 5 scores: "It is grading its own work. Honest scoring."
- When Stage 7 fires: "Now it is the tech lead. Writing the executive summary."

### Landing (15 seconds)

Point to the verdict card. Read it aloud:

"Seven roles automated. Zero human handoffs. About sixty seconds."

Pause.

"The application code is real — you could commit it. The test suite is real —
you could run it. The Kubernetes YAML is valid — you could deploy it. The
evaluation scores are honest — it found its own gaps. And the defect triage
includes actual remediation code."

Pause.

"The developer was one of seven roles. Not the hero. Just another stage."

---

## 6. Technical Components Inventory

### Frontend Application (React + TypeScript)

| Component | File | Role in Demo |
|-----------|------|-------------|
| App | `App.tsx` | Root layout, state machine, mode switching |
| InputPanel | `InputPanel.tsx` | Service spec textarea + control buttons |
| PipelinePanel | `PipelinePanel.tsx` | Container for all stage cards |
| StageCard | `StageCard.tsx` | Individual stage with streaming output + role badge |
| VerdictCard | `VerdictCard.tsx` | Final impact summary — the closer |
| ProgressBar | `ProgressBar.tsx` | Visual pipeline progress indicator |
| ElapsedTimer | `ElapsedTimer.tsx` | Live-counting elapsed time |

### Hooks (Pipeline Orchestration)

| Hook | File | Role |
|------|------|------|
| usePipeline | `usePipeline.ts` | Live API orchestration — sequential stage execution with SSE streaming |
| useReplay | `useReplay.ts` | Offline replay — plays pre-baked outputs with simulated streaming |

### Constants (Content)

| File | Content | Modifiable? |
|------|---------|-------------|
| `prompts.ts` | 7 system prompts — one per stage, format-critical | **No** — output formatting depends on exact prompt wording |
| `defaultSpec.ts` | Pre-loaded Security Observability Dashboard specification | **No** — all stages are tuned against this spec |
| `replayData.ts` | Pre-captured outputs for offline replay | **Yes** — must be refreshed before each demo |

### Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Build tool | Vite 5 | Fast builds, HMR in dev, static production build |
| Styling | Tailwind CSS 3 | Dark mode UI, consistent design system |
| AI Backend | Anthropic API (Claude Sonnet) | All 7 stages, direct browser calls, SSE streaming |
| Font | JetBrains Mono | Monospace output — makes AI output feel like real engineering artifacts |

---

## 7. What "Complete Harness Engineering" Means

Harness engineering is not one task. It is the full lifecycle of taking a service
specification and producing everything needed to build, deploy, test, evaluate,
and maintain it. This demo covers the complete pipeline:

```
Raw Spec (Security Observability Dashboard — IEEE 830 SRS)
  |
  v
[1] Requirement Analysis         --> Structured FRs, NFRs, risks, constraints
  |
  v
[2] Application Code Generation  --> Backend API handlers + Frontend React components
  |
  v
[3] Test Suite Generation         --> Executable test code with full coverage
  |
  v
[4] Infrastructure Config         --> Standalone Kubernetes manifests
  |
  v
[5] Quality Evaluation            --> Quantified test quality scoring
  |
  v
[6] Defect Triage                 --> Root cause analysis + remediation code
  |
  v
[7] Executive Reporting           --> Final verdict with prioritised actions
  |
  v
Deployment-Ready Package (Code + Tests + Infra + Quality Report)
```

Each stage is a **complete, standalone deliverable** — not a sketch or a
suggestion. Together, they form a deployment-ready package that a team would
normally spend weeks producing.

### The Key Insight for the Audience

The demo does not show AI doing one person's job faster. It shows AI doing
**everyone's job** — in sequence, with full context, producing real artifacts,
with zero coordination overhead.

The coordination overhead — the meetings, the handoffs, the tickets, the context
loss — is where most engineering time actually goes. The AI eliminates all of it
because it carries full context from stage to stage.

### Why the Developer Role Changes Everything

Previous iterations of this demo showed 6 roles — analyst through tech lead —
but conspicuously omitted the developer. That omission weakened the message
because it allowed the audience to think: "Sure, AI can do the support work
around coding, but you still need developers to build the actual thing."

By adding the developer as Stage 2, we close that escape hatch. The AI writes
the code, then tests it, then deploys it, then evaluates it. The audience cannot
dismiss this as "AI doing paperwork." The AI is doing the core engineering work
AND the surrounding workflow. There is nowhere left to hide.

---

## 8. Risk Mitigation for Demo Day

| Risk | Mitigation |
|------|------------|
| API rate limit hit (429) | Run 2-3 test calls 30 min before demo to confirm headroom |
| Network failure during live demo | Switch to replay mode (offline fallback with pre-captured outputs) |
| Stage produces malformed output | Use replay mode; pre-validate all replay data |
| Audience questions prompt format | All prompts are in `prompts.ts` — can show them if asked |
| "Is this just pre-recorded?" question | Run it live first, offer to change the spec and re-run |
| Browser compatibility issue | Use Chrome 95+; test on demo machine day before |
| API key exposure concern | Acknowledge upfront: "This is direct browser access for demo purposes only" |
| Code generation stage output too long | Max tokens set to 2048 — produces focused, representative code (key handlers + components, not the full application) |
| "Could the generated code actually work?" challenge | Acknowledge: the code is structurally sound and production-patterned, but it is a representative scaffold — not a complete build. The point is that the AI performs the developer's design and implementation work. |

---

## 9. What We Are NOT Demoing (And Why)

| What we skip | Why |
|---|---|
| Chat-based interaction | We are showing autonomous execution, not conversation. The AI does not ask questions — it acts. |
| Multi-turn iteration | The pipeline runs once, correctly, end to end. No "try again" loops. |
| Human-in-the-loop approval gates | The point is zero handoffs. Adding approval gates weakens the message. |
| Integration with external tools | The demo is self-contained. No Jira, no Slack, no GitHub. Pure pipeline. |
| Cost analysis slides | The audience can compute the cost implication themselves. Showing a slide cheapens it. |
| IDE-based code generation | Every competitor demos AI in an IDE. We demo AI replacing the entire team — the IDE is irrelevant when there is no developer to sit in front of it. |
| Full working application deployment | The demo produces deployable artifacts, not a running app. The point is the pipeline speed, not a working product. |

---

## 10. Success Criteria

The demo succeeds if the audience walks away thinking:

1. "That pipeline replaced 7 people's work in about a minute."
2. "The outputs were real — I could actually use that code / test suite / YAML / report."
3. "This is not the same AI coding demo I have seen 20 times before."
4. "It did not just write code — it wrote the requirements, the code, the tests, the infrastructure, the evaluation, the triage, and the report. The entire chain."
5. "The developer was just one of seven roles displaced. Not even the most important one."
6. "If this works for harness engineering, what else can it replace?"

That last question is the one we want them asking. The demo is the proof point.
The implication is the message.
