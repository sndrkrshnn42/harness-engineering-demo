/**
 * Agent skill definitions for the dual-agent code generation stage.
 * Adrian (API Agent) generates FastAPI Python backends.
 * Rocky (Frontend Agent) generates React.js frontends with INGKA Skapa components.
 */

/**
 * Adrian's skill: FastAPI API development standards for INGKA.
 * Injected into ADRIAN_CODEGEN_PROMPT as embedded knowledge.
 */
export const ADRIAN_SKILL = `## Adrian — API Agent Skill (FastAPI Python)

### Project Structure
\`\`\`
pyproject.toml          — Poetry project config with all dependencies
poetry.lock             — Locked dependency versions (auto-generated)
main.py                 — FastAPI app entry point with CORS, middleware, lifespan
Dockerfile              — Production Docker image (Poetry-based install)
.env.example            — Environment variable placeholders
app/
  __init__.py
  config.py             — Settings via pydantic-settings (BaseSettings)
  models/               — SQLAlchemy ORM models (one file per domain entity)
  schemas/              — Pydantic v2 request/response schemas
  routes/               — APIRouter modules (one file per resource)
  middleware/
    auth.py             — Authentication middleware (Bearer token validation)
    error_handler.py    — Global exception handlers
  services/             — Business logic layer (one file per domain)
  database.py           — Async SQLAlchemy engine + session factory
tests/
  conftest.py           — pytest fixtures (async client, test DB, auth headers)
  test_*.py             — One test module per route module
\`\`\`

### FastAPI Standards
- Use \`async def\` for all route handlers
- Pydantic v2 models for ALL request/response validation (use \`model_validator\`, \`field_validator\`)
- Dependency injection via \`Depends()\` for auth, DB sessions, pagination
- Proper HTTP status codes: 201 for creation, 204 for deletion, 422 for validation errors
- Health check endpoints: \`GET /health\` (liveness) and \`GET /ready\` (readiness with DB ping)
- OpenAPI auto-documentation at \`/docs\` (Swagger) and \`/redoc\`
- Structured JSON logging via \`structlog\`
- CORS middleware configured for frontend origin (\`http://localhost:5173\` dev, configurable via env)

### Error Handling
- Custom exception classes inheriting from a base \`AppError\`
- Global exception handler returning consistent error schema:
  \`\`\`json
  { "detail": "Human-readable message", "code": "ERROR_CODE", "status": 400 }
  \`\`\`
- Never expose stack traces in production

### Database Patterns
- SQLAlchemy 2.0 async ORM with \`AsyncSession\`
- Alembic for migrations (generate initial migration)
- UUID primary keys
- \`created_at\` / \`updated_at\` timestamps on all models
- Soft delete via \`deleted_at\` column where applicable

### Test Standards
- pytest with \`pytest-asyncio\` and \`httpx.AsyncClient\`
- Test database with fixtures (SQLite in-memory for speed)
- Minimum 15 test cases covering:
  - Happy path for every endpoint
  - Validation errors (missing fields, wrong types, boundary values)
  - Auth failures (missing token, invalid token)
  - Not found (404) scenarios
  - Contract tests (assert response JSON schema)
- Each test has a descriptive docstring

### Dockerfile
\`\`\`dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir poetry && poetry config virtualenvs.create false
COPY pyproject.toml poetry.lock ./
RUN poetry install --no-interaction --no-ansi --only main
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
\`\`\`

### Dependencies (managed via Poetry — pyproject.toml)
\`\`\`toml
[tool.poetry]
name = "app"
version = "0.1.0"
description = ""
authors = ["Adrian <adrian@ingka.com>"]

[tool.poetry.dependencies]
python = "^3.11"
fastapi = ">=0.115.0"
uvicorn = {version = ">=0.30.0", extras = ["standard"]}
pydantic = ">=2.9.0"
pydantic-settings = ">=2.5.0"
sqlalchemy = {version = ">=2.0.0", extras = ["asyncio"]}
alembic = ">=1.13.0"
httpx = ">=0.27.0"
structlog = ">=24.0.0"
python-jose = {version = ">=3.3.0", extras = ["cryptography"]}

[tool.poetry.group.dev.dependencies]
pytest = ">=8.0.0"
pytest-asyncio = ">=0.24.0"
\`\`\`
`;


/**
 * Rocky's skill: React frontend development with INGKA Skapa Design System.
 * Injected into ROCKY_CODEGEN_PROMPT as embedded knowledge.
 */
export const ROCKY_SKILL = `## Rocky — Frontend Agent Skill (React + INGKA Skapa)

### Project Structure
\`\`\`
package.json            — Dependencies including @ingka/* packages
tsconfig.json           — TypeScript strict mode
vite.config.ts          — Vite build configuration
Dockerfile              — Multi-stage build (Node build + nginx serve)
.npmrc                  — INGKA private registry config
.env.example            — Environment variable placeholders
src/
  main.tsx              — React entry point
  App.tsx               — Root component with router
  globals.scss          — @ingka/base + @ingka/variables foundation
  api/                  — Typed API client layer (fetch-based)
  components/           — Reusable UI components (Skapa compositions)
  pages/                — Page-level components (one per route)
  hooks/                — Custom hooks (data fetching, form state)
  types.ts              — Shared TypeScript types/interfaces
tests/
  *.test.tsx            — Component tests with Vitest
\`\`\`

### INGKA Skapa Design System — CRITICAL

**Registry Setup** — Rocky MUST generate a \`.npmrc\` file:
\`\`\`
@ingka:registry=https://npm.m2.blue.cdtapps.com
\`\`\`

**Foundation packages** (always required):
\`\`\`bash
npm install @ingka/core@latest @ingka/variables@latest @ingka/base@latest
\`\`\`

**SCSS Foundation** — Rocky MUST generate a \`globals.scss\`:
\`\`\`scss
@use '@ingka/base' as base;
@use '@ingka/variables' as tokens;
\`\`\`

**Component imports** — each component is a SEPARATE scoped package:
\`\`\`typescript
// CORRECT — import from individual @ingka/* packages
import Button from '@ingka/button';
import Card, { CardHeader, CardBody } from '@ingka/card';
import InputField from '@ingka/input-field';
import Accordion, { AccordionItem } from '@ingka/accordion';

// WRONG — never import from a monolithic bundle
// import { Button, Card } from 'ingvar-skapa-components'; // NO!
\`\`\`

### Component Selection Guide

**Actions:**
| Use Case | Component | Package |
|----------|-----------|---------|
| Primary/secondary/danger action | Button (variant="primary"/"secondary"/"danger") | @ingka/button |
| Icon-only action | IconButton | @ingka/button |
| Toggle option | Pill | @ingka/pill |
| Expandable action | ExpandingButton | @ingka/button |

**Content Display:**
| Use Case | Component | Package |
|----------|-----------|---------|
| Card layout | Card + CardHeader + CardBody | @ingka/card |
| Collapsible sections | Accordion + AccordionItem | @ingka/accordion |
| Data list | List + ListItem | @ingka/list |
| Tab navigation | Tabs + TabPanel | @ingka/tabs |
| Image display | Image | @ingka/image |
| Scrolling content | Carousel | @ingka/carousel |

**Form Inputs:**
| Use Case | Component | Package |
|----------|-----------|---------|
| Text input | InputField | @ingka/input-field |
| Dropdown | Select | @ingka/select |
| Checkbox | Checkbox | @ingka/checkbox |
| Radio group | RadioButton | @ingka/radio-button |
| Toggle switch | Switch | @ingka/switch |
| Search | Search | @ingka/search |
| Autocomplete | Combobox | @ingka/combobox |
| Number input | QuantityStepper | @ingka/quantity-stepper |

**Status & Feedback:**
| Use Case | Component | Package |
|----------|-----------|---------|
| Count/notification | Badge | @ingka/badge |
| Loading state | Loading / Skeleton | @ingka/loading / @ingka/skeleton |
| Status indicator | Status | @ingka/status |
| Success/error message | InlineMessage | @ingka/inline-message |
| Toast notification | Toast | @ingka/toast |
| Banner alert | Banner | @ingka/banner |
| Form help text | HelperText | @ingka/helper-text |

**Overlays:**
| Use Case | Component | Package |
|----------|-----------|---------|
| Dialog/modal | Modal | @ingka/modal |
| Tooltip | Tooltip | @ingka/tooltip |
| Expandable panel | Expander / Collapsible | @ingka/expander |

### Design Token System — MANDATORY (never hardcode values)

**Colors** (via \`@ingka/variables\`):
\`\`\`scss
@use '@ingka/variables' as tokens;
tokens.$colour-text-and-icon-1     // Primary text
tokens.$colour-text-and-icon-2     // Secondary text
tokens.$colour-text-and-icon-3     // Tertiary/disabled
tokens.$colour-neutral-1           // Primary background
tokens.$colour-neutral-2           // Secondary background
tokens.$colour-neutral-3           // Tertiary background
tokens.$colour-static-ikea-brand-blue    // #0051BA
tokens.$colour-static-ikea-brand-yellow  // #FFDA1A
tokens.$colour-semantic-positive   // Success
tokens.$colour-semantic-negative   // Error
tokens.$colour-semantic-caution    // Warning
tokens.$colour-semantic-informative // Info
\`\`\`

**Spacing** (8px grid):
\`\`\`scss
tokens.$space-25    // 4px
tokens.$space-50    // 8px
tokens.$space-75    // 12px
tokens.$space-100   // 16px
tokens.$space-125   // 20px
tokens.$space-150   // 24px
tokens.$space-200   // 32px
tokens.$space-300   // 48px
\`\`\`

**Typography** (SCSS mixins):
\`\`\`scss
@use '@ingka/typography-shared/_mixins.scss' as typography;
@include typography.heading-xl;   // Page titles
@include typography.heading-l;    // Section titles
@include typography.heading-m;    // Subsection titles
@include typography.heading-s;    // Card titles
@include typography.body-l;       // Large body
@include typography.body-m;       // Standard body
@include typography.body-s;       // Small body
@include typography.label-l;      // Large labels
@include typography.label-m;      // Button labels
@include typography.label-s;      // Badge labels
\`\`\`

**Border Radius:**
\`\`\`scss
tokens.$radius-s     // Small — tags, badges
tokens.$radius-m     // Medium — cards, inputs
tokens.$radius-l     // Large — modals, panels
tokens.$radius-cap   // Capsule — pills
\`\`\`

**Breakpoints:**
\`\`\`scss
tokens.$breakpoint-m     // Tablet
tokens.$breakpoint-l     // Desktop
tokens.$breakpoint-xl    // Wide desktop
\`\`\`

### Accessibility Requirements (WCAG 2.1 AA)
- Color contrast >= 4.5:1 for text (>= 3:1 for large text)
- All interactive elements keyboard accessible
- Visible focus indicators (Skapa components handle this)
- \`aria-label\` on all icon-only buttons
- \`aria-expanded\` on toggleable elements
- \`aria-live\` regions for dynamic content updates
- Descriptive error messages on form fields
- Skip navigation link for page-level layouts

### State Coverage — MANDATORY for every view
1. **Loading** — use \`@ingka/loading\` or \`@ingka/skeleton\`
2. **Empty** — illustration + heading + CTA button
3. **Populated** — normal data display
4. **Error** — use \`@ingka/inline-message\` type="error" + retry button

### API Client Layer
- Typed fetch wrapper with base URL from env (\`VITE_API_URL\`)
- Request/response types matching FastAPI Pydantic schemas
- Error handling with user-friendly messages
- Loading state management via custom hooks

### Dockerfile (multi-stage)
\`\`\`dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY .npmrc package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
\`\`\`

### Design Validation Protocol (self-check before completing)
1. Every UI component from Skapa catalog — no custom buttons, cards, or inputs
2. Every style value is a token — no hardcoded px, hex, or font-size
3. WCAG 2.1 AA checklist passed
4. All four states (loading/empty/populated/error) implemented for each view
5. Responsive at all breakpoints
6. .npmrc file present with @ingka registry
`;


/**
 * DevOps agent skill: Kubernetes deployment, Kaniko builds, cluster operations.
 * Injected context for the DevOps deploy agent in Stage 5.
 */
export const DEVOPS_SKILL = `## DevOps — Deploy Agent Skill (Kubernetes + Kaniko)

### Operational Context
- **Cluster:** GKE (gke_ingka-genai-platform-dev_europe-west4_dev-europe-west4-genai-gke)
- **Namespace:** mlops-1775309721
- **Registry:** europe-west4-docker.pkg.dev/ingka-genai-platform-dev/genai-platform/
- **Kaniko image:** gcr.io/kaniko-project/executor:latest
- **Build SA:** harness-builder (Workload Identity → roles/artifactregistry.writer)

### Kaniko Build Workflow
1. Package build context into tar.gz from the service directory
2. Create/update a ConfigMap with the tar.gz (\`--from-file\` + \`--dry-run=client -o yaml | kubectl apply -f -\`)
3. Write a Kaniko Job YAML manifest with:
   - \`serviceAccountName: harness-builder\` for Artifact Registry access
   - busybox init container to unpack the tar.gz into /workspace
   - Kaniko executor with \`--destination\` pointing to the full AR image path
   - \`--cache=true\` for layer caching
4. \`kubectl apply -f\` the Job manifest
5. \`kubectl wait --for=condition=complete\` with 180s timeout
6. On failure: read pod logs, describe pod, check init container status
7. Clean up Job + ConfigMap after completion

### K8s Manifest Application
- Apply all manifests: \`kubectl apply -f k8s/ -n mlops-1775309721\`
- Monitor rollouts: \`kubectl rollout status deployment/<name> --timeout=120s\`
- Verify pods: \`kubectl get pods -l app.kubernetes.io/name=<name>\`
- Check events: \`kubectl get events --sort-by='.lastTimestamp' | tail -20\`

### Troubleshooting Playbook

| Symptom | Diagnosis Command | Common Fix |
|---------|-------------------|------------|
| ImagePullBackOff | \`kubectl describe pod <pod>\` | Verify image name, check SA/WI, rebuild |
| CrashLoopBackOff | \`kubectl logs <pod> --previous\` | Fix app config, env vars, or entrypoint |
| Pending | \`kubectl describe pod <pod>\` | Check resource requests vs node capacity |
| Init:Error | \`kubectl logs <pod> -c <init>\` | Check configmap mount, tar integrity |
| CreateContainerConfigError | \`kubectl describe pod <pod>\` | Fix configmap/secret references |
| Job deadline exceeded | \`kubectl logs job/<name> -c kaniko\` | Increase timeout, check Dockerfile |

### Image Naming Convention
- API: \`europe-west4-docker.pkg.dev/ingka-genai-platform-dev/genai-platform/harness-demo-api:latest\`
- Frontend: \`europe-west4-docker.pkg.dev/ingka-genai-platform-dev/genai-platform/harness-demo-frontend:latest\`

### Cleanup Protocol
Always clean up after operations:
\`\`\`bash
kubectl delete job kaniko-build-<service> -n mlops-1775309721 --ignore-not-found
kubectl delete configmap kaniko-context-<service> -n mlops-1775309721 --ignore-not-found
\`\`\`
`;
