# Observability & Telemetry — Implementation Plan

> **Symphony Compliance:** Instrument hook execution as OpenTelemetry spans. Add Prometheus counters for session events. Track backoff as histogram. Health checks validate hook capability.

## Phase 1: Prometheus Metrics

- [ ] Install Prometheus client library (prom-client for Bun/Node)
- [ ] Define metric types: counters (requests, errors), gauges (queue depth, agents), histograms (latency)
- [ ] Implement request metrics middleware: count, duration, status per route
- [ ] Add orchestrator metrics: dispatch rate, retry rate, cycle duration
- [ ] Add queue metrics: ready queue depth, pending tasks, in-progress tasks
- [ ] Add agent metrics: active count, circuit breaker states, completion rate
- [ ] Add Symphony-specific metrics:
  - Counter: `symphony_hook_executions_total{phase, exitCode}` — hook run count by phase and outcome
  - Counter: `symphony_session_resumptions_total` — session resume count
  - Counter: `symphony_backoff_events_total` — retry backoff trigger count
  - Histogram: `symphony_hook_duration_seconds{phase}` — hook execution time
  - Histogram: `symphony_session_duration_seconds` — total session lifetime
  - Gauge: `symphony_active_sessions` — currently session-bound tasks
- [ ] Expose `/metrics` endpoint returning Prometheus text format
- [ ] Write tests: verify metric names, labels, and value types

## Phase 2: OpenTelemetry Tracing

- [ ] Install OpenTelemetry SDK (@opentelemetry/sdk-trace-node)
- [ ] Configure tracer provider with OTLP exporter
- [ ] Add HTTP instrumentation: auto-trace pivot API requests
- [ ] Add custom spans for orchestrator cycle: dispatch → assign → execute → complete
- [ ] Add Symphony spans:
  - `hook.beforeRun` / `hook.afterRun` / `hook.afterCreate` spans from `hookRunner.ts` `HookResult.durationMs`
  - `session.resume` span when passing `sessionId` to executor
  - `retry.backoff` span capturing `calculateSymphonyBackoff` delay
- [ ] Add Convex call spans: wrap Convex client queries/mutations
- [ ] Propagate trace context via W3C Trace Context headers
- [ ] Correlate logs with traces: inject traceId/spanId into log entries
- [ ] Add `sessionId` as span attribute for session-bound operations
- [ ] Configure exporter endpoint via environment variable
- [ ] Write tests: verify spans created with correct parent-child relationships

## Phase 3: Health Checks, Dashboards, and Logs

- [ ] Extend `/health` endpoint with per-component status checks
- [ ] Component checks: orchestrator (heartbeat), Convex (ping), agents (responsive), hook capability (can we run `sh -c echo test`?)
- [ ] Return degraded/partial status when some components fail
- [ ] Build Grafana dashboard JSON: fleet overview panel, agent performance, queue charts, Symphony hook/session panels
- [ ] Build Datadog dashboard template as alternative
- [ ] Implement structured JSON logger: timestamp, level, message, traceId, component, sessionId, hookName
- [ ] Replace console.log calls with structured logger throughout pivot
- [ ] Configure log level via LOG_LEVEL environment variable
- [ ] End-to-end test: generate traffic, verify metrics, traces, and logs correlate
