# Observability & Telemetry — Implementation Plan

## Phase 1: Prometheus Metrics

- [ ] Install Prometheus client library (prom-client for Bun/Node)
- [ ] Define metric types: counters (requests, errors), gauges (queue depth, agents), histograms (latency)
- [ ] Implement request metrics middleware: count, duration, status per route
- [ ] Add orchestrator metrics: dispatch rate, retry rate, cycle duration
- [ ] Add queue metrics: ready queue depth, pending tasks, in-progress tasks
- [ ] Add agent metrics: active count, circuit breaker states, completion rate
- [ ] Expose `/metrics` endpoint returning Prometheus text format
- [ ] Write tests: verify metric names, labels, and value types

## Phase 2: OpenTelemetry Tracing

- [ ] Install OpenTelemetry SDK (@opentelemetry/sdk-trace-node)
- [ ] Configure tracer provider with OTLP exporter
- [ ] Add HTTP instrumentation: auto-trace pivot API requests
- [ ] Add custom spans for orchestrator cycle: dispatch → assign → execute → complete
- [ ] Add Convex call spans: wrap Convex client queries/mutations
- [ ] Propagate trace context via W3C Trace Context headers
- [ ] Correlate logs with traces: inject traceId/spanId into log entries
- [ ] Configure exporter endpoint via environment variable
- [ ] Write tests: verify spans created with correct parent-child relationships

## Phase 3: Health Checks, Dashboards, and Logs

- [ ] Extend `/health` endpoint with per-component status checks
- [ ] Component checks: orchestrator (heartbeat), Convex (ping), agents (responsive)
- [ ] Return degraded/partial status when some components fail
- [ ] Build Grafana dashboard JSON: fleet overview panel, agent performance, queue charts
- [ ] Build Datadog dashboard template as alternative
- [ ] Implement structured JSON logger: timestamp, level, message, traceId, component
- [ ] Replace console.log calls with structured logger throughout pivot
- [ ] Configure log level via LOG_LEVEL environment variable
- [ ] End-to-end test: generate traffic, verify metrics, traces, and logs correlate
