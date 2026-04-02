import { NextRequest } from 'next/server';
import * as fs from 'fs/promises';
import { resolveWorkspacePath } from '../../../../lib/workspace';

/**
 * POST /api/tools/read-file
 * Body: { workspaceId: string, path: string }
 *
 * Reads a file from the workspace.
 */
export async function POST(request: NextRequest): Promise<Response> {
  let body: { workspaceId?: string; path?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { workspaceId, path: filePath } = body;

  if (!workspaceId || !filePath) {
    return Response.json(
      { error: 'Missing required fields: workspaceId, path' },
      { status: 400 }
    );
  }

  let resolvedPath: string;
  try {
    resolvedPath = resolveWorkspacePath(workspaceId, filePath);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Path resolution failed';
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const content = await fs.readFile(resolvedPath, 'utf-8');
    return Response.json({ result: content });
  } catch {
    return Response.json({ result: `Error: File not found: ${filePath}` });
  }
}
