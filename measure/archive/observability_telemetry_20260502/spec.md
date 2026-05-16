# Observability & Telemetry

## Overview

Production-grade observability with Prometheus metrics, OpenTelemetry distributed tracing, dashboard templates, and structured log export. Builds on existing health check infrastructure.

## Functional Requirements

1. **Prometheus Metrics**
   - `/metrics` endpoint exposing Prometheus text format
   - Request metrics: count, duration histogram, error rate (by route and status)
   - Queue metrics: ready queue depth, dispatch rate, retry rate
   - Agent metrics: active agents, circuit breaker states, task completion rate
   - System metrics: memory usage, event loop lag, connection pool size
   - Custom metrics API for application-specific counters/gauges

2. **OpenTelemetry Tracing**
   - Trace orchestrator cycles: dispatch → agent assignment → execution → completion
   - Trace Convex calls: query/mutation duration, cache hits
   - Trace pivot API requests: middleware → handler → response
   - Propagate trace context across service boundaries
   - Configurable exporter: OTLP, Jaeger, Zipkin

3. **Health Check Aggregation**
   - Extend existing health checks with structured response
   - `/health` endpoint: overall status + per-component status
   - Components: orchestrator, Convex connection, database, agents
   - Degraded state: partial failure with details

4. **Dashboard Templates**
   - Grafana dashboard JSON: fleet overview, agent performance, queue depth
   - Datadog dashboard template (alternative)
   - Importable with one click, pre-configured for Prometheus datasource

5. **Structured Log Export**
   - JSON formatted logs to stdout (for container environments)
   - Log fields: timestamp, level, message, traceId, spanId, component, metadata
   - Configurable log level (debug, info, warn, error)
   - Log correlation: link logs to traces via traceId

## Data Sources

- Pivot HTTP server — request metrics and traces
- Orchestrator — cycle timing, dispatch metrics
- Convex client — query/mutation traces
- Agents — health, task execution spans

## Acceptance Criteria

- [ ] `/metrics` endpoint returns valid Prometheus format
- [ ] Key metrics present: request rate, latency p50/p95/p99, queue depth, dispatch rate
- [ ] Traces visible in Jaeger/OTLP collector for orchestrator cycles
- [ ] `/health` returns structured status for all components
- [ ] Grafana dashboard importable and displays metrics correctly
- [ ] Logs output as JSON to stdout with trace correlation
- [ ] Metrics collection adds <5ms overhead per request

## Out of Scope

- Custom metrics storage (use existing Prometheus/Grafana stack)
- Alerting rules configuration (managed in Grafana/Datadog)
- Log aggregation platform (ELK, Loki — user's choice)
- Application Performance Monitoring (APM) beyond basic tracing
