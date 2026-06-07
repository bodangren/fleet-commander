export type RouteParams = Record<string, string>;

export type RouteHandler = (
  request: Request,
  params: RouteParams,
) => Response | Promise<Response>;

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

export class Router {
  private routes: Route[] = [];

  on(method: string, path: string, handler: RouteHandler): this {
    const paramNames: string[] = [];
    const patternStr = path.replace(/:(\w+)/g, (_match, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    this.routes.push({
      method: method.toUpperCase(),
      pattern: new RegExp(`^${patternStr}$`),
      paramNames,
      handler,
    });
    return this;
  }

  get(path: string, handler: RouteHandler): this {
    return this.on('GET', path, handler);
  }

  post(path: string, handler: RouteHandler): this {
    return this.on('POST', path, handler);
  }

  put(path: string, handler: RouteHandler): this {
    return this.on('PUT', path, handler);
  }

  patch(path: string, handler: RouteHandler): this {
    return this.on('PATCH', path, handler);
  }

  delete(path: string, handler: RouteHandler): this {
    return this.on('DELETE', path, handler);
  }

  match(method: string, pathname: string): { handler: RouteHandler; params: RouteParams } | null {
    const pathWithoutQuery = pathname.split('?')[0]!;
    for (const route of this.routes) {
      if (route.method !== method.toUpperCase()) continue;
      const match = pathWithoutQuery.match(route.pattern);
      if (match) {
        const params: RouteParams = {};
        for (let i = 0; i < route.paramNames.length; i++) {
          params[route.paramNames[i]] = decodeURIComponent(match[i + 1]);
        }
        return { handler: route.handler, params };
      }
    }
    return null;
  }
}

/**
 * Creates a JSON response with the given data.
 * @param data - Response body data
 * @param status - HTTP status code (default 200)
 * @returns Response object
 */
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/**
 * Creates a 204 No Content response.
 * @returns Response object with status 204
 */
export function noContent(): Response {
  return new Response(null, { status: 204 });
}

/**
 * Creates a 404 Not Found response.
 * @param message - Optional error message
 * @returns Response object with status 404
 */
export function notFound(message?: string): Response {
  return json({ error: 'not_found', ...(message && { message }) }, 404);
}

/**
 * Creates a 400 Bad Request response.
 * @param message - Error message describing the bad request
 * @returns Response object with status 400
 */
export function badRequest(message: string): Response {
  return json({ error: 'bad_request', message }, 400);
}

/**
 * Creates a 405 Method Not Allowed response.
 * @returns Response object with status 405
 */
export function methodNotAllowed(): Response {
  return json({ error: 'method_not_allowed' }, 405);
}

type RouteBodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

/**
 * Parse and validate a request body against a Zod schema.
 * Returns parsed data on success or a 400 Response on failure.
 * @param schema - Zod schema to validate against
 * @param request - HTTP request with JSON body
 * @returns Result with parsed data or error response
 */
export async function routeBody<T>(
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: { issues: Array<{ path: PropertyKey[]; message: string }> } } },
  request: Request,
): Promise<RouteBodyResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: badRequest('Invalid JSON body') };
  }

  const result = schema.safeParse(raw);
  if (result.success) {
    return { ok: true, data: result.data as T };
  }

  const issues = (result.error?.issues ?? [])
    .map(i => `${i.path.join('.')}: ${i.message}`)
    .join('; ');
  return { ok: false, response: badRequest(issues) };
}
