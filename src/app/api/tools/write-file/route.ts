import { NextRequest } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { resolveWorkspacePath } from '../../../../lib/workspace';

/**
 * POST /api/tools/write-file
 * Body: { workspaceId: string, path: string, content: string }
 *
 * Creates or overwrites a file in the workspace.
 */
export async function POST(request: NextRequest): Promise<Response> {
  let body: { workspaceId?: string; path?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { workspaceId, path: filePath, content } = body;

  if (!workspaceId || !filePath || content === undefined) {
    return Response.json(
      { error: 'Missing required fields: workspaceId, path, content' },
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
    // Ensure parent directory exists
    const dir = path.dirname(resolvedPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(resolvedPath, content, 'utf-8');

    const lineCount = content.split('\n').length;
    return Response.json({
      result: `File created: ${filePath} (${lineCount} lines, ${content.length} bytes)`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Write failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
