import { NextRequest } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getWorkspaceDir } from '../../../../lib/workspace';

/**
 * POST /api/tools/list-files
 * Body: { workspaceId: string }
 *
 * Recursively lists all files in the workspace directory.
 */
export async function POST(request: NextRequest): Promise<Response> {
  let body: { workspaceId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { workspaceId } = body;

  if (!workspaceId) {
    return Response.json(
      { error: 'Missing required field: workspaceId' },
      { status: 400 }
    );
  }

  let workspaceDir: string;
  try {
    workspaceDir = getWorkspaceDir(workspaceId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Workspace lookup failed';
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const files = await listFilesRecursive(workspaceDir, workspaceDir);
    if (files.length === 0) {
      return Response.json({ result: 'No files created yet.' });
    }
    return Response.json({
      result: 'Project files:\n' + files.map(f => `  ${f}`).join('\n'),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'List failed';
    return Response.json({ error: message }, { status: 500 });
  }
}

async function listFilesRecursive(dir: string, rootDir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await listFilesRecursive(fullPath, rootDir);
      files.push(...subFiles);
    } else {
      // Return relative path from workspace root
      files.push(path.relative(rootDir, fullPath).replace(/\\/g, '/'));
    }
  }

  return files;
}
