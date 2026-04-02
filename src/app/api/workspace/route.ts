import { NextRequest } from 'next/server';
import { createWorkspace, destroyWorkspace } from '../../../lib/workspace';

/**
 * POST /api/workspace — Create a new workspace for a pipeline run.
 * Returns: { workspaceId: string }
 */
export async function POST(): Promise<Response> {
  try {
    const workspaceId = await createWorkspace();
    return Response.json({ workspaceId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create workspace';
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/workspace?id=<workspaceId> — Destroy a workspace.
 */
export async function DELETE(request: NextRequest): Promise<Response> {
  const workspaceId = request.nextUrl.searchParams.get('id');
  if (!workspaceId) {
    return Response.json({ error: 'Missing workspace id' }, { status: 400 });
  }

  try {
    await destroyWorkspace(workspaceId);
    return Response.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to destroy workspace';
    return Response.json({ error: message }, { status: 500 });
  }
}
