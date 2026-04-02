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
