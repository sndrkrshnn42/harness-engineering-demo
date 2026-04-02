/**
 * Server-side workspace management.
 * Each pipeline run gets a temp directory for real filesystem operations.
 *
 * - Workspaces are tracked in a globalThis-persisted Map (survives Next.js HMR)
 * - Paths are sandboxed via canonicalization to prevent traversal attacks
 * - Cleanup removes the temp directory and its contents
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

/**
 * Use globalThis to persist the workspace Map across Next.js module
 * re-evaluations in development mode. Without this, HMR resets the
 * module-level Map and subsequent API route calls can't find workspaces
 * created by earlier calls.
 */
const globalForWorkspaces = globalThis as typeof globalThis & {
  __workspaces?: Map<string, string>;
};

if (!globalForWorkspaces.__workspaces) {
  globalForWorkspaces.__workspaces = new Map<string, string>();
}

const workspaces = globalForWorkspaces.__workspaces;

/**
 * Creates a new temp directory for a pipeline run.
 * Returns the workspace ID.
 */
export async function createWorkspace(): Promise<string> {
  const prefix = path.join(os.tmpdir(), 'harness-run-');
  const dirPath = await fs.mkdtemp(prefix);
  const workspaceId = path.basename(dirPath);
  workspaces.set(workspaceId, dirPath);
  return workspaceId;
}

/**
 * Resolves a relative file path within a workspace, with traversal protection.
 * Throws if the workspace doesn't exist or the resolved path escapes the workspace.
 */
export function resolveWorkspacePath(workspaceId: string, relativePath: string): string {
  const workspaceDir = workspaces.get(workspaceId);
  if (!workspaceDir) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  const resolved = path.resolve(workspaceDir, relativePath);
  const relative = path.relative(workspaceDir, resolved);

  // If relative path starts with '..' or is absolute, it's a traversal attempt
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path traversal blocked: ${relativePath}`);
  }

  return resolved;
}

/**
 * Returns the root directory path for a workspace.
 */
export function getWorkspaceDir(workspaceId: string): string {
  const workspaceDir = workspaces.get(workspaceId);
  if (!workspaceDir) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }
  return workspaceDir;
}

/**
 * Destroys a workspace — removes the temp directory and all contents.
 */
export async function destroyWorkspace(workspaceId: string): Promise<void> {
  const workspaceDir = workspaces.get(workspaceId);
  if (!workspaceDir) return; // Already destroyed or never existed

  try {
    await fs.rm(workspaceDir, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup; ignore errors (e.g., already removed)
  }

  workspaces.delete(workspaceId);
}
