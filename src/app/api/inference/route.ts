import { NextRequest } from 'next/server';
import { getAccessToken } from '../../../lib/auth';

const INFERENCE_URL =
  process.env.INFERENCE_URL ??
  'https://qwen25-coder-14b-tenant-coding-assistant.dev.g.inference.genai.mlops.ingka.com';

/**
 * POST /api/inference
 *
 * Proxies chat completion requests to the Qwen endpoint.
 * Handles auth server-side and relays the SSE stream back to the client.
 */
export async function POST(request: NextRequest): Promise<Response> {
  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown auth error';
    return Response.json({ error: message }, { status: 502 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const upstreamUrl = `${INFERENCE_URL}/v1/chat/completions`;

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upstream fetch failed';
    return Response.json({ error: message }, { status: 502 });
  }

  if (!upstreamResponse.ok) {
    const errorBody = await upstreamResponse.text();
    return new Response(errorBody, {
      status: upstreamResponse.status,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // Relay the SSE stream from upstream directly to the client
  return new Response(upstreamResponse.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
