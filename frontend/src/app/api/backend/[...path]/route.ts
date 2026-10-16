// Proxy for the FastAPI backend: /api/backend/* -> FASTAPI_BASE_URL/*.
// Keeps the backend URL server-side and avoids CORS in the browser.
const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL ?? "http://localhost:8000";

async function proxy(request: Request, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const target = `${FASTAPI_BASE_URL}/api/${path.join("/")}${
    request.url.includes("?") ? `?${new URL(request.url).searchParams}` : ""
  }`;

  const headers = new Headers();
  // Forward only what the API needs; never forward cookies.
  for (const name of ["authorization", "x-api-key", "content-type"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    body: request.method === "POST" ? await request.text() : undefined,
  };

  try {
    const res = await fetch(target, init);
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return Response.json(
      { detail: "Backend is unreachable. Is uvicorn running on port 8000?" },
      { status: 502 }
    );
  }
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx.params);
}

export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx.params);
}
