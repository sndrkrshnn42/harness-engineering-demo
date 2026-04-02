import { NextRequest } from 'next/server';
import { exec } from 'child_process';
import { getWorkspaceDir } from '../../../../lib/workspace';

const EXEC_TIMEOUT_MS = 30_000;

/**
 * POST /api/tools/execute
 * Body: { workspaceId: string, command: string }
 *
 * Executes a shell command sandboxed to the workspace directory.
 * 30-second timeout. stdout + stderr returned.
 */
export async function POST(request: NextRequest): Promise<Response> {
  let body: { workspaceId?: string; command?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { workspaceId, command } = body;

  if (!workspaceId || !command) {
    return Response.json(
      { error: 'Missing required fields: workspaceId, command' },
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
    const result = await runCommand(command, workspaceDir);
    return Response.json({ result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Execution failed';
    return Response.json({ result: `Error: ${message}` });
  }
}

function runCommand(command: string, cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      command,
      {
        cwd,
        timeout: EXEC_TIMEOUT_MS,
        maxBuffer: 1024 * 1024, // 1MB
        env: { ...process.env, HOME: cwd, USERPROFILE: cwd },
      },
      (error, stdout, stderr) => {
        if (error) {
          // Still return output even on non-zero exit
          const output = (stdout + stderr).trim();
          if (output) {
            resolve(`$ ${command}\n${output}\nExit code: ${error.code ?? 1}`);
          } else {
            reject(new Error(`Command failed: ${error.message}`));
          }
          return;
        }
        const output = (stdout + stderr).trim();
        resolve(`$ ${command}\n${output}\nDone. Exit code: 0`);
      }
    );
  });
}
