# API Documentation — Implementation Plan

## Phase 1: OpenAPI Spec Generation

- [ ] Define route metadata decorator/helper: path, method, summary, description, request/response schemas
- [ ] Annotate all existing pivot routes with metadata
- [ ] Implement spec generator: scan route files, extract metadata, build OpenAPI 3.1 document
- [ ] Add request/response example annotations to route metadata
- [ ] Generate spec as YAML, output to `docs/openapi.yaml`
- [ ] Build script: run generator as part of build pipeline
- [ ] Watch mode: regenerate on route file changes during development
- [ ] Write tests: verify generated spec matches expected structure for sample routes

## Phase 2: Swagger UI

- [ ] Install swagger-ui-express (or Bun-compatible equivalent)
- [ ] Mount Swagger UI at `/api/docs` serving generated spec
- [ ] Configure try-it-out with API key authentication support
- [ ] Group endpoints by resource tag (projects, tasks, agents, etc.)
- [ ] Style Swagger UI with Fleet Commander branding
- [ ] Ensure Swagger UI loads spec from generated YAML (not hardcoded)
- [ ] Write integration tests: fetch `/api/docs`, verify HTML loads with spec

## Phase 3: SDK Generation and Versioning

- [ ] Install openapi-typescript-codegen or equivalent
- [ ] Configure SDK generation from OpenAPI spec
- [ ] Generate TypeScript client: typed request/response, fetch wrapper, error types
- [ ] Output SDK to `sdk/fleet-commander/` or publish as internal package
- [ ] Add `/api/v1/` prefix to all pivot routes
- [ ] Implement redirect from unversioned routes to v1
- [ ] Add `Deprecation` and `Sunset` headers support for future version transitions
- [ ] Write SDK integration test: import generated SDK, make real API call
- [ ] End-to-end test: Swagger UI → try-it-out → API call → response matches spec
