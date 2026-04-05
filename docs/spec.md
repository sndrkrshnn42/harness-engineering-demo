# Software Requirements Specification

## Security Observability Dashboard (SecObsDash)

**Document ID:** SRS-SECOBSDASH-2026-001
**Version:** 1.0.0
**Status:** Approved
**Classification:** Internal — Engineering
**Owner:** Security Engineering Team
**Last Updated:** 2026-04-02

**Standards Compliance:**
- IEEE 830-1998 (IEEE Recommended Practice for Software Requirements Specifications)
- ISO/IEC/IEEE 29148:2018 (Systems and Software Engineering — Life Cycle Processes — Requirements Engineering)
- OWASP Application Security Verification Standard (ASVS) v4.0
- NIST Cybersecurity Framework (CSF) v2.0

---

## 1. Introduction

### 1.1 Purpose

This document specifies the functional and non-functional requirements for the
Security Observability Dashboard (SecObsDash) — a real-time security monitoring
platform that aggregates threat intelligence, alert streams, vulnerability data,
and compliance posture into a unified operational view for Security Operations
Centre (SOC) teams.

This SRS is intended for use by:
- Software engineers implementing the frontend and backend systems
- Test engineers designing validation suites
- Platform engineers configuring deployment infrastructure
- QA analysts evaluating deliverable quality
- Security architects reviewing compliance alignment

### 1.2 Scope

SecObsDash provides:
- Real-time ingestion and correlation of security alerts from multiple SIEM/SOAR sources
- Interactive dashboard with threat severity heatmaps, alert timelines, and attack vector distribution
- Vulnerability tracking with CVSS v3.1 scoring and remediation prioritisation
- Compliance posture monitoring against CIS Benchmarks and SOC 2 Type II controls
- Incident response workflow with full audit trail
- WebSocket-based real-time threat feed for live operational monitoring
- RESTful API for integration with external SOC tooling and automation platforms

SecObsDash does NOT provide:
- SIEM log collection or raw log storage (upstream responsibility)
- Endpoint detection and response (EDR) capabilities
- Automated threat remediation or containment (out of scope for v1.0)
- Identity and access management (delegated to Azure Entra ID)

### 1.3 Definitions and Acronyms

| Term | Definition |
|------|-----------|
| SOC | Security Operations Centre |
| SIEM | Security Information and Event Management |
| SOAR | Security Orchestration, Automation, and Response |
| CVSS | Common Vulnerability Scoring System |
| CIS | Centre for Internet Security |
| IOC | Indicator of Compromise |
| TTI | Time to Investigate (mean time from alert to analyst acknowledgement) |
| MTTD | Mean Time to Detect |
| MTTR | Mean Time to Respond |
| TLP | Traffic Light Protocol (threat intelligence sharing classification) |

### 1.4 References

| Reference | Description |
|-----------|-------------|
| NIST SP 800-61r2 | Computer Security Incident Handling Guide |
| NIST CSF v2.0 | Cybersecurity Framework |
| OWASP ASVS v4.0 | Application Security Verification Standard |
| CIS Controls v8 | Centre for Internet Security Critical Security Controls |
| CVSS v3.1 Specification | Common Vulnerability Scoring System |
| RFC 7519 | JSON Web Token (JWT) specification |
| RFC 6455 | The WebSocket Protocol |
| OpenAPI 3.1.0 | API specification standard |

---

## 2. Overall Description

### 2.1 Product Perspective

SecObsDash operates as the presentation and correlation layer within a broader
security operations architecture:

```
[SIEM/SOAR Sources]          [Vulnerability Scanners]      [Compliance Engines]
  Splunk, Sentinel,            Qualys, Tenable,              CIS-CAT, Prowler,
  CrowdStrike Falcon           Trivy, Grype                  ScoutSuite
        |                            |                            |
        v                            v                            v
  +---------------------------------------------------------------------+
  |                    SecObsDash Backend (API Layer)                    |
  |   Alert Ingestion | Correlation Engine | Vuln Aggregator | Compliance|
  +---------------------------------------------------------------------+
        |                            |                            |
        v                            v                            v
  +---------------------------------------------------------------------+
  |                  SecObsDash Frontend (Dashboard)                     |
  |   Threat Map | Alert Timeline | Vuln Matrix | Compliance Heatmap    |
  +---------------------------------------------------------------------+
        |
        v
  [SOC Analysts & Incident Responders]
```

SecObsDash depends on upstream data providers but does not control them. It
consumes normalised alert data via its ingestion API and must handle upstream
failures gracefully.

### 2.2 Product Functions (High-Level)

1. **Alert Ingestion & Correlation** — Receive, normalise, deduplicate, and correlate security alerts from multiple sources
2. **Real-Time Dashboard** — Render interactive visualisations of current threat posture
3. **Vulnerability Management** — Track, score, and prioritise vulnerabilities across the asset inventory
4. **Compliance Monitoring** — Continuous compliance posture assessment against defined frameworks
5. **Incident Management** — Create, track, and resolve security incidents with full audit trail
6. **Real-Time Feed** — WebSocket-based live stream of security events for operational monitoring
7. **API Integration** — RESTful API for external tool integration and automation

### 2.3 User Classes and Characteristics

| User Class | Description | Access Level |
|-----------|-------------|-------------|
| SOC Analyst (L1) | First-line alert triage and escalation | Read alerts, create incidents, view dashboard |
| SOC Analyst (L2/L3) | Deep investigation and incident response | Full incident management, vulnerability triage |
| Security Engineer | Configuration, integration, and tuning | Full API access, admin dashboard settings |
| CISO / Security Manager | Strategic oversight and reporting | Read-only dashboard, compliance reports, executive summaries |
| External System (API) | Automated integrations (SOAR playbooks, ticketing) | API-only, scoped by API key permissions |

### 2.4 Operating Environment

- **Frontend:** Single-page application (React 18 + TypeScript), served as static assets
- **Backend:** Node.js 20 LTS with Express.js, deployed as containerised microservices
- **Database:** PostgreSQL 16 (primary data store), Redis 7.2 (caching, pub/sub for WebSocket fan-out)
- **Search:** Elasticsearch 8.x (alert indexing and full-text search)
- **Deployment:** Kubernetes 1.29+ (GKE), standalone K8s manifests
- **Authentication:** Azure Entra ID (OAuth 2.0 / OIDC), JWT bearer tokens
- **Observability:** OpenTelemetry SDK, Prometheus metrics, Grafana dashboards

### 2.5 Design and Implementation Constraints

- C-01: All API responses must conform to JSON:API specification (RFC 7159)
- C-02: All timestamps must be ISO 8601 format in UTC (no local time zones)
- C-03: All PII fields must be encrypted at rest (AES-256) and in transit (TLS 1.3)
- C-04: Frontend must support Chrome 100+, Firefox 115+, Edge 100+ (no IE support)
- C-05: Backend must be stateless; all session state stored in Redis
- C-06: Maximum payload size for alert ingestion: 1 MB per request
- C-07: WebSocket connections must support reconnection with exponential backoff
- C-08: All database migrations must be backward-compatible (zero-downtime deployments)
- C-09: API versioning via URL path prefix (`/api/v1/`)
- C-10: All source code must pass ESLint (strict config), Prettier, and TypeScript strict mode

### 2.6 Assumptions and Dependencies

| ID | Assumption |
|----|-----------|
| A-01 | Upstream SIEM/SOAR systems deliver alerts in a normalised JSON format conforming to the SecObsDash Alert Schema (Section 5.1) |
| A-02 | Azure Entra ID is pre-configured with appropriate app registrations and role assignments |
| A-03 | Kubernetes cluster has sufficient resources: minimum 4 vCPU, 8 GB RAM per backend replica |
| A-04 | Elasticsearch cluster is provisioned and accessible from the backend namespace |
| A-05 | Network policies permit ingress on ports 443 (HTTPS) and 8443 (WSS) |
| A-06 | Vulnerability scanner APIs (Qualys, Tenable) provide CVSS v3.1 base scores |
| A-07 | SOC team operates 24/7 and requires sub-second dashboard refresh rates during active incidents |

---

## 3. Specific Requirements

### 3.1 Functional Requirements — Alert Management

**FR-ALT-01: Alert Ingestion**
The system shall accept security alerts via `POST /api/v1/alerts` with the
following request schema:

```json
{
  "source": "string (required, enum: splunk|sentinel|crowdstrike|custom)",
  "severity": "string (required, enum: critical|high|medium|low|informational)",
  "title": "string (required, max 256 chars)",
  "description": "string (required, max 4096 chars)",
  "timestamp": "string (required, ISO 8601 UTC)",
  "indicators": [
    {
      "type": "string (enum: ip|domain|hash|url|email|cve)",
      "value": "string (required)"
    }
  ],
  "raw_event": "object (optional, max 64 KB)",
  "tags": ["string (optional, max 20 tags, max 64 chars each)"],
  "tlp": "string (optional, enum: white|green|amber|red, default: green)",
  "asset_id": "string (optional, UUID format)"
}
```

Response (201 Created):
```json
{
  "alert_id": "string (UUID)",
  "correlation_id": "string (UUID, null if no correlation found)",
  "ingested_at": "string (ISO 8601 UTC)",
  "deduplicated": "boolean"
}
```

**FR-ALT-02: Alert Deduplication**
The system shall deduplicate alerts based on a composite key of `source` +
`title` + `indicators[].value` within a configurable time window (default: 15
minutes). Duplicate alerts shall increment a `count` field on the existing
alert rather than creating a new record.

**FR-ALT-03: Alert Correlation**
The system shall correlate alerts sharing at least 2 common IOCs within a 1-hour
window and assign them a shared `correlation_id`. Correlated alerts shall be
grouped in the dashboard view.

**FR-ALT-04: Alert Query**
The system shall support querying alerts via `GET /api/v1/alerts` with the
following query parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| severity | string (enum) | Filter by severity level |
| source | string (enum) | Filter by alert source |
| status | string (enum: open, acknowledged, resolved, false_positive) | Filter by status |
| from | string (ISO 8601) | Start of time range |
| to | string (ISO 8601) | End of time range |
| indicator | string | Search by IOC value (partial match) |
| tag | string | Filter by tag (exact match) |
| page | integer (default: 1) | Pagination page number |
| per_page | integer (default: 50, max: 200) | Results per page |
| sort | string (default: -timestamp) | Sort field and direction |

Response (200 OK):
```json
{
  "data": [{ "...alert objects..." }],
  "meta": {
    "total": "integer",
    "page": "integer",
    "per_page": "integer",
    "total_pages": "integer"
  }
}
```

**FR-ALT-05: Alert Status Update**
The system shall support updating alert status via `PATCH /api/v1/alerts/{alert_id}`
with the following request body:

```json
{
  "status": "string (required, enum: open|acknowledged|resolved|false_positive)",
  "assignee": "string (optional, email format)",
  "notes": "string (optional, max 2048 chars)"
}
```

All status transitions shall be recorded in an immutable audit log with the
authenticated user's identity and timestamp.

**FR-ALT-06: Alert Bulk Operations**
The system shall support bulk status updates via `POST /api/v1/alerts/bulk` for
up to 100 alert IDs per request. Partial failures shall return 207 Multi-Status
with per-alert success/failure details.

### 3.2 Functional Requirements — Dashboard

**FR-DSH-01: Overview Endpoint**
The system shall provide `GET /api/v1/dashboard/overview` returning aggregated
metrics:

```json
{
  "alerts": {
    "total_24h": "integer",
    "by_severity": {
      "critical": "integer",
      "high": "integer",
      "medium": "integer",
      "low": "integer",
      "informational": "integer"
    },
    "by_status": {
      "open": "integer",
      "acknowledged": "integer",
      "resolved": "integer",
      "false_positive": "integer"
    },
    "trend_7d": [{ "date": "string", "count": "integer" }]
  },
  "incidents": {
    "active": "integer",
    "resolved_24h": "integer",
    "mean_time_to_respond_ms": "integer"
  },
  "vulnerabilities": {
    "critical_unpatched": "integer",
    "high_unpatched": "integer",
    "patch_compliance_pct": "float (0.0-100.0)"
  },
  "compliance": {
    "overall_score": "float (0.0-100.0)",
    "failing_controls": "integer"
  },
  "generated_at": "string (ISO 8601 UTC)"
}
```

**FR-DSH-02: Threat Severity Heatmap**
The frontend shall render a severity heatmap displaying alert density by hour
(x-axis) and day of week (y-axis), colour-coded by aggregate severity. Data
sourced from `GET /api/v1/dashboard/heatmap?range=7d|30d|90d`.

**FR-DSH-03: Alert Timeline**
The frontend shall render a scrollable timeline of the most recent 500 alerts
with real-time updates via WebSocket. Each alert entry shall display: severity
badge, title (truncated to 80 chars), source icon, timestamp (relative format),
and status indicator.

**FR-DSH-04: Attack Vector Distribution**
The frontend shall render a donut chart showing the distribution of alert types
by attack vector category (MITRE ATT&CK tactic). Data sourced from
`GET /api/v1/dashboard/attack-vectors?range=24h|7d|30d`.

**FR-DSH-05: Top IOC Panel**
The frontend shall display the top 10 most frequently observed IOCs in the last
24 hours, grouped by type (IP, domain, hash). Each IOC entry shall link to a
filtered alert view.

**FR-DSH-06: Auto-Refresh**
The dashboard shall auto-refresh overview metrics every 30 seconds. The refresh
interval shall be configurable by the user (minimum 10 seconds, maximum 300
seconds). Active incident views shall refresh every 5 seconds.

### 3.3 Functional Requirements — Vulnerability Management

**FR-VLN-01: Vulnerability Listing**
The system shall provide `GET /api/v1/vulnerabilities` returning paginated
vulnerability records with the following fields:

```json
{
  "vuln_id": "string (UUID)",
  "cve_id": "string (CVE-YYYY-NNNNN format, nullable)",
  "title": "string",
  "description": "string",
  "cvss_score": "float (0.0-10.0)",
  "cvss_vector": "string (CVSS v3.1 vector string)",
  "severity": "string (enum: critical|high|medium|low|none)",
  "status": "string (enum: open|in_progress|patched|accepted_risk|false_positive)",
  "affected_assets": ["string (asset identifiers)"],
  "discovered_at": "string (ISO 8601 UTC)",
  "patch_available": "boolean",
  "remediation_deadline": "string (ISO 8601 UTC, nullable)",
  "scanner_source": "string (enum: qualys|tenable|trivy|grype|manual)"
}
```

Query parameters: `severity`, `status`, `cve_id`, `asset_id`, `scanner_source`,
`patch_available`, `page`, `per_page`, `sort`.

**FR-VLN-02: Vulnerability Detail**
The system shall provide `GET /api/v1/vulnerabilities/{vuln_id}` returning the
full vulnerability record plus:
- Remediation guidance (text, max 8192 chars)
- Related alerts (alerts referencing the same CVE)
- Asset impact list with risk scores
- Timeline of status changes (audit log)

**FR-VLN-03: Vulnerability Status Update**
The system shall support `PATCH /api/v1/vulnerabilities/{vuln_id}` to update
status, assignee, and remediation notes. All transitions shall be audit-logged.

**FR-VLN-04: CVSS Score Validation**
The system shall validate that all ingested CVSS scores conform to CVSS v3.1
specification. Scores outside the 0.0-10.0 range or with invalid vector strings
shall be rejected with 422 Unprocessable Entity.

**FR-VLN-05: Remediation SLA Enforcement**
The system shall enforce remediation deadlines based on severity:
- Critical: 72 hours
- High: 7 days
- Medium: 30 days
- Low: 90 days

Overdue vulnerabilities shall be flagged in the dashboard and trigger webhook
notifications to configured endpoints.

### 3.4 Functional Requirements — Compliance Monitoring

**FR-CMP-01: Compliance Scan Trigger**
The system shall provide `POST /api/v1/compliance/scan` to trigger an on-demand
compliance assessment against a specified framework:

```json
{
  "framework": "string (required, enum: cis_k8s_1.8|soc2_type2|nist_csf_2.0|pci_dss_4.0)",
  "scope": "string (optional, asset group identifier)",
  "notify_on_complete": "boolean (optional, default: true)"
}
```

Response (202 Accepted):
```json
{
  "scan_id": "string (UUID)",
  "status": "queued",
  "estimated_duration_seconds": "integer"
}
```

**FR-CMP-02: Compliance Posture**
The system shall provide `GET /api/v1/compliance/posture` returning:

```json
{
  "frameworks": [
    {
      "framework_id": "string",
      "framework_name": "string",
      "total_controls": "integer",
      "passing": "integer",
      "failing": "integer",
      "not_applicable": "integer",
      "compliance_pct": "float (0.0-100.0)",
      "last_scan_at": "string (ISO 8601 UTC)",
      "trend_30d": [{ "date": "string", "compliance_pct": "float" }]
    }
  ],
  "overall_compliance_pct": "float (0.0-100.0)"
}
```

**FR-CMP-03: Control Detail**
The system shall provide `GET /api/v1/compliance/controls/{control_id}` returning
the control description, current status (pass/fail/not_applicable), evidence
collected, remediation steps, and history of status changes.

**FR-CMP-04: Compliance Report Export**
The system shall support `GET /api/v1/compliance/report?framework={id}&format={pdf|csv|json}`
to export compliance reports. PDF reports shall include executive summary,
control-by-control results, and remediation recommendations.

### 3.5 Functional Requirements — Incident Management

**FR-INC-01: Incident Creation**
The system shall provide `POST /api/v1/incidents` to create a security incident:

```json
{
  "title": "string (required, max 256 chars)",
  "description": "string (required, max 8192 chars)",
  "severity": "string (required, enum: critical|high|medium|low)",
  "alert_ids": ["string (UUID, optional — link related alerts)"],
  "assignee": "string (optional, email format)",
  "tags": ["string (optional)"],
  "playbook_id": "string (optional, UUID — link to response playbook)"
}
```

Response (201 Created):
```json
{
  "incident_id": "string (UUID)",
  "incident_number": "string (INC-YYYYMMDD-NNNN format)",
  "status": "open",
  "created_at": "string (ISO 8601 UTC)",
  "created_by": "string (authenticated user email)"
}
```

**FR-INC-02: Incident Retrieval**
The system shall provide `GET /api/v1/incidents/{incident_id}` returning the full
incident record including:
- All linked alerts (expanded, not just IDs)
- Activity timeline (comments, status changes, escalations)
- Assigned playbook steps with completion status
- Affected assets
- IOCs extracted from linked alerts

**FR-INC-03: Incident Update**
The system shall provide `PATCH /api/v1/incidents/{incident_id}` to update:
- status (open, investigating, contained, eradicated, recovered, closed, false_positive)
- severity (escalation/de-escalation)
- assignee
- tags

All updates shall be recorded in the incident activity timeline with user
identity and timestamp. Status transitions shall follow the defined state
machine (see Section 5.3).

**FR-INC-04: Incident Comments**
The system shall provide `POST /api/v1/incidents/{incident_id}/comments` to add
timestamped comments to an incident. Comments support markdown formatting and
file attachments (max 10 MB per file, max 5 files per comment).

**FR-INC-05: Incident Listing**
The system shall provide `GET /api/v1/incidents` with filtering by status,
severity, assignee, date range, and tag. Results shall be paginated and sortable
by created_at, updated_at, and severity.

**FR-INC-06: Incident Metrics**
The system shall track and expose the following metrics per incident:
- Time to Acknowledge (TTA): time from creation to first status change
- Time to Contain (TTC): time from creation to status=contained
- Time to Resolve (TTR): time from creation to status=closed
- Number of linked alerts
- Number of affected assets

### 3.6 Functional Requirements — Real-Time Feed

**FR-WSS-01: WebSocket Connection**
The system shall provide a WebSocket endpoint at `wss://{host}/ws/v1/feed` for
real-time event streaming. Authentication shall be performed via JWT token
passed as a query parameter (`?token={jwt}`).

**FR-WSS-02: Event Types**
The WebSocket feed shall support the following event types:

| Event Type | Payload | Trigger |
|-----------|---------|---------|
| `alert.new` | Alert object | New alert ingested |
| `alert.updated` | Alert diff | Alert status changed |
| `alert.correlated` | Correlation group | New correlation detected |
| `incident.created` | Incident summary | New incident created |
| `incident.updated` | Incident diff | Incident status changed |
| `vulnerability.new` | Vulnerability summary | New vulnerability discovered |
| `compliance.scan_complete` | Scan result summary | Compliance scan finished |

**FR-WSS-03: Channel Subscription**
Clients shall subscribe to specific event channels by sending a subscription
message after connection:

```json
{
  "action": "subscribe",
  "channels": ["alerts", "incidents", "vulnerabilities", "compliance"]
}
```

Clients receiving events only for subscribed channels. Default (no subscription
message): all channels.

**FR-WSS-04: Connection Health**
The server shall send a ping frame every 30 seconds. Clients that do not respond
with a pong within 10 seconds shall be disconnected. Clients shall implement
reconnection with exponential backoff (initial: 1s, max: 30s, jitter: +/- 500ms).

**FR-WSS-05: Backpressure Handling**
If a client's message queue exceeds 1000 undelivered messages, the server shall
drop the oldest messages and send a `feed.backpressure` event indicating the
number of dropped messages.

### 3.7 Functional Requirements — API Integration

**FR-API-01: API Key Management**
The system shall provide `POST /api/v1/api-keys` and `DELETE /api/v1/api-keys/{key_id}`
for managing API keys. API keys shall have configurable scopes (read, write,
admin) and optional expiration dates.

**FR-API-02: Webhook Configuration**
The system shall provide `POST /api/v1/webhooks` to register webhook endpoints
that receive event notifications. Webhooks shall support configurable event
filters, HMAC-SHA256 signature verification, and automatic retry (3 attempts
with exponential backoff).

**FR-API-03: Rate Limiting**
All API endpoints shall enforce rate limiting:
- Alert ingestion: 1000 requests/minute per source
- Query endpoints: 300 requests/minute per user
- Administrative endpoints: 60 requests/minute per user

Rate limit headers shall be included in all responses:
`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**FR-API-04: Health Check**
The system shall provide `GET /api/v1/health` returning system health status:

```json
{
  "status": "string (enum: healthy|degraded|unhealthy)",
  "version": "string (semver)",
  "uptime_seconds": "integer",
  "dependencies": {
    "database": "string (enum: up|down)",
    "redis": "string (enum: up|down)",
    "elasticsearch": "string (enum: up|down)"
  },
  "checked_at": "string (ISO 8601 UTC)"
}
```

---

## 4. Non-Functional Requirements

### 4.1 Performance

| ID | Requirement | Target |
|----|------------|--------|
| NFR-PERF-01 | Alert ingestion throughput | >= 500 alerts/second sustained |
| NFR-PERF-02 | Alert ingestion latency (p95) | < 100ms (ingestion to database commit) |
| NFR-PERF-03 | Dashboard overview API latency (p95) | < 200ms |
| NFR-PERF-04 | Alert query API latency (p95) | < 500ms for queries returning <= 200 results |
| NFR-PERF-05 | WebSocket message delivery latency (p95) | < 50ms from event to client receipt |
| NFR-PERF-06 | Dashboard frontend initial load time | < 2 seconds (LCP) on 4G connection |
| NFR-PERF-07 | Compliance scan completion time | < 5 minutes for full CIS Kubernetes benchmark |
| NFR-PERF-08 | Concurrent WebSocket connections | >= 500 per backend replica |

### 4.2 Availability and Reliability

| ID | Requirement |
|----|------------|
| NFR-AVL-01 | System uptime: 99.9% (< 8.76 hours downtime per year) |
| NFR-AVL-02 | Zero-downtime deployments via rolling updates |
| NFR-AVL-03 | Automatic failover for database (PostgreSQL HA with Patroni) |
| NFR-AVL-04 | Redis Sentinel for cache/pub-sub failover |
| NFR-AVL-05 | Graceful degradation: dashboard must render with cached data if backend is temporarily unreachable (stale data indicator shown) |

### 4.3 Security

| ID | Requirement |
|----|------------|
| NFR-SEC-01 | All API endpoints require authentication (JWT bearer token via Azure Entra ID) |
| NFR-SEC-02 | Role-based access control (RBAC) with roles: viewer, analyst, engineer, admin |
| NFR-SEC-03 | All data in transit encrypted via TLS 1.3 (TLS 1.2 accepted, TLS 1.1 and below rejected) |
| NFR-SEC-04 | All sensitive fields (PII, IOC values, alert descriptions) encrypted at rest (AES-256-GCM) |
| NFR-SEC-05 | Immutable audit log for all state-changing operations (write-once, never delete) |
| NFR-SEC-06 | API keys hashed with bcrypt (cost factor 12) before storage; raw key shown only at creation |
| NFR-SEC-07 | CORS restricted to configured origin domains only |
| NFR-SEC-08 | Content Security Policy (CSP) headers enforced on all frontend responses |
| NFR-SEC-09 | SQL injection prevention via parameterised queries only (no string concatenation in SQL) |
| NFR-SEC-10 | XSS prevention via output encoding and React's built-in escaping |
| NFR-SEC-11 | Webhook payloads signed with HMAC-SHA256 using per-webhook secret |
| NFR-SEC-12 | Session tokens expire after 8 hours of inactivity; absolute expiry after 24 hours |

### 4.4 Scalability

| ID | Requirement |
|----|------------|
| NFR-SCL-01 | Horizontal scaling: backend must support 2-10 replicas behind a load balancer |
| NFR-SCL-02 | Database connection pooling: max 20 connections per replica (PgBouncer) |
| NFR-SCL-03 | Elasticsearch index lifecycle: alerts older than 90 days archived to cold storage |
| NFR-SCL-04 | WebSocket connections balanced across replicas via Redis pub/sub fan-out |
| NFR-SCL-05 | Alert ingestion must not degrade under burst traffic (10x sustained rate for 60 seconds) |

### 4.5 Observability (Self-Monitoring)

| ID | Requirement |
|----|------------|
| NFR-OBS-01 | Structured JSON logging (Winston) with correlation IDs on every log line |
| NFR-OBS-02 | OpenTelemetry traces for all API requests (sampled at 10% in production) |
| NFR-OBS-03 | Prometheus metrics endpoint at `/metrics` (request count, latency histograms, error rates, queue depths) |
| NFR-OBS-04 | Kubernetes liveness probe at `/healthz` (lightweight, no dependency checks) |
| NFR-OBS-05 | Kubernetes readiness probe at `/readyz` (includes dependency checks) |

---

## 5. Data Models

### 5.1 Alert Schema

```
alerts
├── alert_id          UUID, PK, default gen_random_uuid()
├── source            VARCHAR(32), NOT NULL, CHECK (source IN ('splunk','sentinel','crowdstrike','custom'))
├── severity          VARCHAR(16), NOT NULL, CHECK (severity IN ('critical','high','medium','low','informational'))
├── title             VARCHAR(256), NOT NULL
├── description       TEXT, NOT NULL, max 4096 chars
├── status            VARCHAR(32), NOT NULL, DEFAULT 'open'
├── timestamp         TIMESTAMPTZ, NOT NULL
├── ingested_at       TIMESTAMPTZ, NOT NULL, DEFAULT NOW()
├── correlation_id    UUID, NULLABLE, FK -> correlation_groups
├── dedup_key         VARCHAR(512), NOT NULL (composite: source + title + sorted indicators)
├── dedup_count       INTEGER, NOT NULL, DEFAULT 1
├── assignee          VARCHAR(256), NULLABLE
├── tlp               VARCHAR(8), NOT NULL, DEFAULT 'green'
├── asset_id          UUID, NULLABLE, FK -> assets
├── tags              TEXT[], DEFAULT '{}'
├── raw_event         JSONB, NULLABLE, max 64KB
├── created_by        VARCHAR(256), NOT NULL (authenticated user)
├── updated_at        TIMESTAMPTZ, NOT NULL, DEFAULT NOW()
└── INDEXES
    ├── idx_alerts_severity_status  (severity, status)
    ├── idx_alerts_timestamp        (timestamp DESC)
    ├── idx_alerts_correlation_id   (correlation_id)
    ├── idx_alerts_dedup_key        (dedup_key, timestamp)
    └── idx_alerts_source           (source)
```

### 5.2 Vulnerability Schema

```
vulnerabilities
├── vuln_id               UUID, PK
├── cve_id                VARCHAR(32), NULLABLE, UNIQUE when NOT NULL
├── title                 VARCHAR(256), NOT NULL
├── description           TEXT, NOT NULL
├── cvss_score            NUMERIC(3,1), NOT NULL, CHECK (0.0 <= cvss_score <= 10.0)
├── cvss_vector           VARCHAR(128), NOT NULL
├── severity              VARCHAR(16), NOT NULL, COMPUTED from cvss_score
├── status                VARCHAR(32), NOT NULL, DEFAULT 'open'
├── affected_assets       UUID[], NOT NULL, DEFAULT '{}'
├── discovered_at         TIMESTAMPTZ, NOT NULL
├── patch_available       BOOLEAN, NOT NULL, DEFAULT false
├── remediation_deadline  TIMESTAMPTZ, NULLABLE (computed from severity SLA)
├── remediation_guidance  TEXT, NULLABLE, max 8192 chars
├── scanner_source        VARCHAR(32), NOT NULL
├── created_at            TIMESTAMPTZ, NOT NULL, DEFAULT NOW()
└── updated_at            TIMESTAMPTZ, NOT NULL, DEFAULT NOW()
```

### 5.3 Incident State Machine

Valid status transitions for incidents:

```
                    ┌─────────────────────────────┐
                    v                             |
  open ──> investigating ──> contained ──> eradicated ──> recovered ──> closed
    |                                                                     ^
    └──────────────────── false_positive ──────────────────────────────────┘
```

Invalid transitions (must be rejected with 422):
- closed -> open (re-opening requires creating a new incident)
- contained -> open (cannot regress without going through investigating)
- Any state -> same state (no-op transitions rejected)

### 5.4 Audit Log Schema

```
audit_log (append-only, no UPDATE or DELETE permitted)
├── log_id            UUID, PK
├── entity_type       VARCHAR(32), NOT NULL (alert|incident|vulnerability|compliance|api_key)
├── entity_id         UUID, NOT NULL
├── action            VARCHAR(32), NOT NULL (created|updated|deleted|status_changed|assigned|commented)
├── actor             VARCHAR(256), NOT NULL (user email or 'system')
├── changes           JSONB, NOT NULL (before/after diff)
├── ip_address        INET, NOT NULL
├── user_agent        TEXT, NULLABLE
├── timestamp         TIMESTAMPTZ, NOT NULL, DEFAULT NOW()
└── INDEXES
    ├── idx_audit_entity    (entity_type, entity_id, timestamp DESC)
    └── idx_audit_actor     (actor, timestamp DESC)
```

---

## 6. External Interface Requirements

### 6.1 Upstream Integrations (Data Sources)

| System | Protocol | Data Flow | Auth Mechanism |
|--------|----------|-----------|---------------|
| Splunk | HTTPS webhook | Splunk -> SecObsDash alert ingestion API | HMAC-SHA256 signed payloads |
| Microsoft Sentinel | HTTPS webhook | Sentinel -> SecObsDash alert ingestion API | Azure Entra ID service principal |
| CrowdStrike Falcon | HTTPS webhook | Falcon -> SecObsDash alert ingestion API | API key in header |
| Qualys VMDR | HTTPS pull | SecObsDash -> Qualys API (polling every 15 min) | API key |
| Tenable.io | HTTPS pull | SecObsDash -> Tenable API (polling every 15 min) | API key |

### 6.2 Downstream Integrations (Consumers)

| System | Protocol | Data Flow | Auth Mechanism |
|--------|----------|-----------|---------------|
| PagerDuty | HTTPS webhook | SecObsDash -> PagerDuty Events API v2 | Routing key |
| ServiceNow | HTTPS webhook | SecObsDash -> ServiceNow API (incident creation) | OAuth 2.0 |
| Slack | HTTPS webhook | SecObsDash -> Slack Incoming Webhook | Webhook URL |
| SOAR Playbooks | HTTPS API | External SOAR -> SecObsDash API | API key with scoped permissions |

---

## 7. Known Failure Modes and Edge Cases

**KFM-01: Alert Storm**
During a large-scale security incident, upstream SIEM systems may send 10,000+
alerts per minute. The system must not crash or lose data. Expected behaviour:
ingestion queue backs up, latency increases, but no data loss. Dashboard may
show stale data with a visible "Data Delayed" indicator.

**KFM-02: Elasticsearch Cluster Unavailability**
If Elasticsearch becomes unavailable, the system shall:
- Continue accepting alerts (buffered in Redis for up to 1 hour)
- Return 503 for search/query endpoints with a Retry-After header
- Dashboard shows cached data with a "Search Unavailable" banner
- Resume indexing automatically when Elasticsearch recovers (no manual intervention)

**KFM-03: Correlation Engine False Positives**
The IOC-based correlation algorithm may produce false correlations when common
IOCs (e.g., `8.8.8.8`, `google.com`) appear across unrelated alerts. The system
does not currently filter "known benign" IOCs from correlation. This can result
in large, meaningless correlation groups.

**KFM-04: WebSocket Connection Leak**
Under high connection churn (clients repeatedly connecting/disconnecting), the
backend may accumulate orphaned WebSocket subscriptions in Redis pub/sub. A
background cleanup job runs every 5 minutes, but during the cleanup interval,
memory usage may spike.

**KFM-05: CVSS Vector Parsing Edge Cases**
Some vulnerability scanners emit CVSS v2 vectors alongside v3.1 scores. The
system currently rejects any record where the vector string does not pass v3.1
validation, even if the score itself is valid. This causes silent data loss for
scanners that have not been updated to emit v3.1 vectors.

**KFM-06: Timezone Inconsistency in Upstream Data**
Despite the spec requirement for UTC timestamps, some SIEM integrations send
timestamps in local timezone without offset information. The system assumes UTC
when no offset is present, which can cause alerts to appear at incorrect times
in the dashboard.

**KFM-07: Compliance Scan Resource Exhaustion**
Running multiple concurrent compliance scans against large Kubernetes clusters
(500+ nodes) can exhaust the backend's CPU and memory allocation. No concurrency
limit is currently enforced on scan execution.

---

## 8. Frontend Component Requirements

### 8.1 Component Hierarchy

```
<App>
├── <AuthProvider>              — Azure Entra ID context
├── <NavBar>                    — Top navigation, user menu, environment indicator
├── <DashboardPage>             — Default view
│   ├── <OverviewMetrics>       — Key metric cards (alerts, incidents, vulns, compliance)
│   ├── <ThreatHeatmap>         — Severity heatmap (D3.js or Recharts)
│   ├── <AlertTimeline>         — Scrollable real-time alert feed
│   ├── <AttackVectorChart>     — MITRE ATT&CK tactic distribution (donut)
│   ├── <TopIOCPanel>           — Top 10 IOCs panel
│   └── <ComplianceGauge>       — Overall compliance score gauge
├── <AlertsPage>                — Full alert listing with filters
│   ├── <AlertFilterBar>        — Severity, source, status, date range filters
│   ├── <AlertTable>            — Sortable, paginated alert table
│   └── <AlertDetailDrawer>     — Slide-out panel with full alert details
├── <IncidentsPage>             — Incident management
│   ├── <IncidentList>          — Active incidents list
│   ├── <IncidentDetail>        — Full incident view with timeline
│   └── <IncidentCreateModal>   — New incident form
├── <VulnerabilitiesPage>       — Vulnerability tracking
│   ├── <VulnFilterBar>         — CVSS, status, scanner filters
│   ├── <VulnTable>             — Sortable vulnerability table
│   └── <VulnDetailDrawer>      — Full vulnerability detail
├── <CompliancePage>            — Compliance posture
│   ├── <FrameworkSelector>     — Framework selection tabs
│   ├── <ComplianceOverview>    — Score gauge + trend chart
│   └── <ControlsList>          — Control-by-control results
└── <SettingsPage>              — API keys, webhooks, user preferences
    ├── <APIKeyManager>
    ├── <WebhookConfig>
    └── <NotificationPrefs>
```

### 8.2 Frontend Technology Requirements

| Requirement | Specification |
|-------------|--------------|
| Framework | React 18 with TypeScript (strict mode) |
| Routing | React Router v6 |
| State Management | TanStack Query (server state), Zustand (client state) |
| Charting | Recharts for standard charts, D3.js for heatmap |
| Table | TanStack Table with virtual scrolling for 1000+ rows |
| WebSocket Client | Native WebSocket API with reconnection wrapper |
| Form Handling | React Hook Form with Zod validation |
| Styling | Tailwind CSS 3 with dark mode (class strategy) |
| Date Handling | date-fns (no Moment.js) |
| Testing | Vitest + React Testing Library + MSW (Mock Service Worker) |
| Build | Vite 5 |
| Accessibility | WCAG 2.1 AA compliance minimum |

### 8.3 Backend Technology Requirements

| Requirement | Specification |
|-------------|--------------|
| Runtime | Node.js 20 LTS |
| Framework | Express.js 4.x with TypeScript |
| ORM | Prisma 5.x with PostgreSQL adapter |
| Validation | Zod (request/response schema validation) |
| Authentication | passport-azure-ad (Entra ID JWT verification) |
| WebSocket Server | ws library with Redis pub/sub for fan-out |
| Job Queue | BullMQ (Redis-backed) for compliance scans and webhook delivery |
| Logging | Winston with JSON transport |
| Tracing | @opentelemetry/sdk-node |
| Testing | Vitest + Supertest |
| Build | esbuild for production bundles |

---

## 9. Deployment Requirements

### 9.1 Kubernetes Resources

| Resource | Kind | Replicas | CPU Request | CPU Limit | Memory Request | Memory Limit |
|----------|------|----------|-------------|-----------|----------------|--------------|
| secobsdash-api | Deployment | 3 | 500m | 2000m | 512Mi | 2Gi |
| secobsdash-worker | Deployment | 2 | 250m | 1000m | 256Mi | 1Gi |
| secobsdash-frontend | Deployment | 2 | 100m | 500m | 128Mi | 512Mi |
| secobsdash-migration | Job | 1 | 250m | 500m | 256Mi | 512Mi |

### 9.2 Required Kubernetes Secrets

| Secret Name | Keys |
|-------------|------|
| secobsdash-db | POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD |
| secobsdash-redis | REDIS_URL, REDIS_PASSWORD |
| secobsdash-es | ELASTICSEARCH_URL, ELASTICSEARCH_API_KEY |
| secobsdash-auth | AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET |
| secobsdash-integrations | PAGERDUTY_ROUTING_KEY, SLACK_WEBHOOK_URL, SERVICENOW_CLIENT_ID, SERVICENOW_CLIENT_SECRET |

### 9.3 Network Policies

- Ingress: API service accepts traffic from ingress controller only (port 8080)
- Ingress: Frontend serves static assets via nginx (port 80)
- WebSocket: WSS traffic via ingress controller (port 8443)
- Egress: API service to PostgreSQL (port 5432), Redis (port 6379), Elasticsearch (port 9200)
- Egress: Worker to external webhook targets (port 443)
- Inter-service: API <-> Worker communication via Redis pub/sub only (no direct HTTP)

---

## 10. Acceptance Criteria

### 10.1 Functional Acceptance

| ID | Criterion | Verification Method |
|----|----------|-------------------|
| AC-01 | Alert ingested via API appears in dashboard within 2 seconds | Integration test |
| AC-02 | Duplicate alert increments count instead of creating new record | Unit test + integration test |
| AC-03 | Correlated alerts are grouped under shared correlation_id | Integration test with 3+ alerts sharing IOCs |
| AC-04 | Incident status transitions follow state machine (invalid transitions rejected) | Unit test for every invalid transition |
| AC-05 | CVSS scores outside 0.0-10.0 range rejected with 422 | Contract test |
| AC-06 | WebSocket feed delivers alert.new event within 50ms of ingestion | Load test |
| AC-07 | Compliance scan completes within 5 minutes for 100-node cluster | Performance test |
| AC-08 | API rate limiting returns 429 with Retry-After header when exceeded | Integration test |
| AC-09 | Audit log records all state changes with correct actor and timestamp | Integration test |
| AC-10 | Bulk alert update with partial failures returns 207 Multi-Status | Contract test |

### 10.2 Non-Functional Acceptance

| ID | Criterion | Verification Method |
|----|----------|-------------------|
| AC-NF-01 | Alert ingestion sustains 500 req/s for 5 minutes with < 100ms p95 | Load test (k6) |
| AC-NF-02 | Dashboard overview API responds in < 200ms p95 under 100 concurrent users | Load test (k6) |
| AC-NF-03 | Frontend LCP < 2s on simulated 4G connection | Lighthouse audit |
| AC-NF-04 | 500 concurrent WebSocket connections maintained without error | Stress test |
| AC-NF-05 | Zero data loss during Elasticsearch outage (up to 1 hour) | Chaos test |
| AC-NF-06 | All OWASP Top 10 vulnerabilities addressed | DAST scan (ZAP) |

---

## Appendix A: API Endpoint Summary

| Method | Endpoint | Description | Auth | Rate Limit |
|--------|----------|-------------|------|-----------|
| POST | /api/v1/alerts | Ingest security alert | Bearer JWT | 1000/min/source |
| GET | /api/v1/alerts | Query alerts with filters | Bearer JWT | 300/min/user |
| PATCH | /api/v1/alerts/{alert_id} | Update alert status | Bearer JWT | 300/min/user |
| POST | /api/v1/alerts/bulk | Bulk alert operations | Bearer JWT | 300/min/user |
| GET | /api/v1/dashboard/overview | Dashboard overview metrics | Bearer JWT | 300/min/user |
| GET | /api/v1/dashboard/heatmap | Threat severity heatmap data | Bearer JWT | 300/min/user |
| GET | /api/v1/dashboard/attack-vectors | Attack vector distribution | Bearer JWT | 300/min/user |
| GET | /api/v1/vulnerabilities | List vulnerabilities | Bearer JWT | 300/min/user |
| GET | /api/v1/vulnerabilities/{vuln_id} | Vulnerability detail | Bearer JWT | 300/min/user |
| PATCH | /api/v1/vulnerabilities/{vuln_id} | Update vulnerability | Bearer JWT | 300/min/user |
| POST | /api/v1/compliance/scan | Trigger compliance scan | Bearer JWT | 60/min/user |
| GET | /api/v1/compliance/posture | Compliance posture | Bearer JWT | 300/min/user |
| GET | /api/v1/compliance/controls/{id} | Control detail | Bearer JWT | 300/min/user |
| GET | /api/v1/compliance/report | Export compliance report | Bearer JWT | 60/min/user |
| POST | /api/v1/incidents | Create incident | Bearer JWT | 300/min/user |
| GET | /api/v1/incidents | List incidents | Bearer JWT | 300/min/user |
| GET | /api/v1/incidents/{id} | Incident detail | Bearer JWT | 300/min/user |
| PATCH | /api/v1/incidents/{id} | Update incident | Bearer JWT | 300/min/user |
| POST | /api/v1/incidents/{id}/comments | Add incident comment | Bearer JWT | 300/min/user |
| WSS | /ws/v1/feed | Real-time event feed | JWT query param | 500 conn/replica |
| POST | /api/v1/api-keys | Create API key | Bearer JWT (admin) | 60/min/user |
| DELETE | /api/v1/api-keys/{key_id} | Revoke API key | Bearer JWT (admin) | 60/min/user |
| POST | /api/v1/webhooks | Register webhook | Bearer JWT (admin) | 60/min/user |
| GET | /api/v1/health | Health check | None | Unlimited |

---

## Appendix B: Error Response Format

All API errors shall conform to the following structure:

```json
{
  "error": {
    "code": "string (machine-readable error code, e.g. ALERT_NOT_FOUND)",
    "message": "string (human-readable description)",
    "details": "object (optional, additional context)",
    "request_id": "string (UUID, correlation ID for tracing)"
  }
}
```

Standard HTTP status codes used:
- 400: Bad Request (validation failure)
- 401: Unauthorized (missing or invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 409: Conflict (e.g., duplicate API key name)
- 422: Unprocessable Entity (valid JSON but semantically invalid, e.g., invalid CVSS vector)
- 429: Too Many Requests (rate limit exceeded)
- 500: Internal Server Error
- 502: Bad Gateway (upstream dependency failure)
- 503: Service Unavailable (system degraded, include Retry-After header)

---

*End of Software Requirements Specification — SecObsDash v1.0.0*
