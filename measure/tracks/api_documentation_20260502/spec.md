# API Documentation

## Overview

Auto-generated OpenAPI specification from pivot route definitions, interactive Swagger UI, TypeScript SDK generation, and API versioning strategy.

## Functional Requirements

1. **OpenAPI Spec Generation**
   - Parse pivot route definitions to generate OpenAPI 3.1 spec
   - Extract: path, method, request/response schemas, parameters, descriptions
   - Generate spec in YAML format, committed to repo
   - Auto-regenerate on route changes (build step or watch mode)
   - Include request/response examples from route metadata

2. **Swagger UI**
   - Serve interactive Swagger UI at `/api/docs`
   - Try-it-out: execute API calls directly from browser
   - Authentication support: enter API key in Swagger UI
   - Grouped by resource: projects, tasks, agents, tracks, etc.

3. **SDK Generation**
   - Generate TypeScript client SDK from OpenAPI spec
   - Type-safe request/response types
   - Automatic fetch wrapper with error handling
   - Published as internal package or generated artifact

4. **API Versioning**
   - All routes prefixed with `/api/v1/`
   - Version in URL path (not header-based)
   - Deprecation headers for future version transitions
   - Version migration guide template

## Data Sources

- Pivot route definitions — source for spec generation
- Existing API structure — routes, handlers, schemas

## Acceptance Criteria

- [ ] OpenAPI spec generated with all routes documented
- [ ] Swagger UI accessible at `/api/docs` with try-it-out working
- [ ] Generated spec matches actual API behavior (validated in tests)
- [ ] TypeScript SDK generated with correct types
- [ ] API versioning: all routes under `/api/v1/`
- [ ] Request/response examples present for all endpoints
- [ ] Spec regeneration runs as part of build process

## Out of Scope

- GraphQL API (REST only)
- API gateway or rate limiting
- Contract testing with Pact
- Multi-language SDK generation (TypeScript only)
