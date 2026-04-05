/**
 * Git Push API Route — pushes all workspace files to a GitHub repository
 * using the GitHub Git Data API via @octokit/rest.
 *
 * No git CLI dependency. Works on any platform.
 *
 * Flow:
 *   1. Parse repo URL → owner + repo
 *   2. Authenticate with PAT via Octokit
 *   3. Verify repo exists (or create it)
 *   4. Read all workspace files
 *   5. Create blobs → tree → commit → update ref
 *   6. Stream progress via SSE
 */

import { NextRequest } from 'next/server';
import { Octokit } from '@octokit/rest';
import * as fs from 'fs/promises';
import { Dirent } from 'fs';
import * as path from 'path';
import { getWorkspaceDir } from '@/lib/workspace';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WorkspaceFile {
  relativePath: string;
  content: string;
}

interface TreeEntry {
  path: string;
  mode: '100644';
  type: 'blob';
  sha: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Parses a GitHub repo URL into owner and repo name.
 * Supports:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   github.com/owner/repo
 *   owner/repo
 */
function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  const cleaned = repoUrl.trim().replace(/\.git\s*$/, '');

  // Try URL parsing first
  try {
    const url = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
  } catch {
    // Fall through to simple split
  }

  // Simple owner/repo format
  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return { owner: parts[parts.length - 2], repo: parts[parts.length - 1] };
  }

  throw new Error(`Invalid repository URL: "${repoUrl}". Expected format: owner/repo or https://github.com/owner/repo`);
}

/** Directories and files to skip when reading the workspace. */
const SKIP_DIRS = new Set(['node_modules', '.git', '__pycache__', '.next', 'dist', '.turbo']);
const SKIP_FILES = new Set(['.env', '.env.local']);

/**
 * Recursively reads all files from a directory, returning relative paths and content.
 * Skips node_modules, .git, and other non-essential directories.
 */
async function readWorkspaceFiles(rootDir: string, subDir: string = ''): Promise<WorkspaceFile[]> {
  const files: WorkspaceFile[] = [];
  const currentDir = subDir ? path.join(rootDir, subDir) : rootDir;

  let entries: Dirent[];
  try {
    entries = await fs.readdir(currentDir, { withFileTypes: true }) as Dirent[];
  } catch {
    return files;
  }

  for (const entry of entries) {
    const name = String(entry.name);
    const relativePath = subDir ? `${subDir}/${name}` : name;

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      const subFiles = await readWorkspaceFiles(rootDir, relativePath);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      if (SKIP_FILES.has(name)) continue;
      try {
        const fullPath = path.join(rootDir, relativePath);
        const contentBuffer = await fs.readFile(fullPath);
        files.push({ relativePath, content: contentBuffer.toString('base64') });
      } catch {
        // Skip files that can't be read
      }
    }
  }

  return files;
}

/**
 * Default .gitignore content for generated projects.
 */
const DEFAULT_GITIGNORE = `node_modules/
dist/
.next/
.env
.env.local
__pycache__/
*.pyc
.turbo/
coverage/
.DS_Store
`;

// ─── SSE Helpers ────────────────────────────────────────────────────────────

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { workspaceId, patToken, repoUrl } = body as {
    workspaceId: string;
    patToken: string;
    repoUrl: string;
  };

  if (!workspaceId || !patToken || !repoUrl) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: workspaceId, patToken, repoUrl' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Resolve workspace directory
  let workspaceDir: string;
  try {
    workspaceDir = getWorkspaceDir(workspaceId);
  } catch {
    return new Response(
      JSON.stringify({ error: `Workspace not found: ${workspaceId}` }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Parse repo URL
  let owner: string;
  let repo: string;
  try {
    const parsed = parseRepoUrl(repoUrl);
    owner = parsed.owner;
    repo = parsed.repo;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid repository URL';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, message: string, extra?: Record<string, unknown>) => {
        controller.enqueue(new TextEncoder().encode(
          sseEvent({ type, message, ...extra })
        ));
      };

      try {
        // Step 1: Authenticate
        const octokit = new Octokit({ auth: patToken });
        send('step', `Authenticating with GitHub as PAT owner...`);

        // Step 2: Verify or create repo
        let repoExists = false;
        try {
          await octokit.repos.get({ owner, repo });
          repoExists = true;
          send('step', `\u2713 Repository ${owner}/${repo} found`);
        } catch (err: unknown) {
          const status = (err as { status?: number }).status;
          if (status === 404) {
            send('step', `Repository ${owner}/${repo} not found, creating...`);
            try {
              await octokit.repos.createForAuthenticatedUser({
                name: repo,
                private: true,
                auto_init: false,
                description: 'Auto-generated by Harness Engineering Demo pipeline',
              });
              repoExists = true;
              send('step', `\u2713 Created private repository ${owner}/${repo}`);
            } catch (createErr: unknown) {
              const createMsg = createErr instanceof Error ? createErr.message : 'Unknown error';
              send('error', `Failed to create repository: ${createMsg}. Please create it manually.`);
              controller.close();
              return;
            }
          } else {
            const errMsg = err instanceof Error ? err.message : 'Unknown error';
            send('error', `Failed to access repository: ${errMsg}`);
            controller.close();
            return;
          }
        }

        if (!repoExists) {
          send('error', 'Repository could not be verified or created.');
          controller.close();
          return;
        }

        // Step 3: Ensure .gitignore exists in workspace
        const gitignorePath = path.join(workspaceDir, '.gitignore');
        try {
          await fs.access(gitignorePath);
        } catch {
          await fs.writeFile(gitignorePath, DEFAULT_GITIGNORE, 'utf-8');
          send('step', '\u2713 Created default .gitignore');
        }

        // Step 4: Read all workspace files
        send('step', 'Reading workspace files...');
        const files = await readWorkspaceFiles(workspaceDir);

        if (files.length === 0) {
          send('error', 'No files found in workspace. Nothing to push.');
          controller.close();
          return;
        }
        send('step', `\u2713 Found ${files.length} files to commit`);

        // Step 5: Create blobs for each file
        send('step', 'Creating file blobs...');
        const treeEntries: TreeEntry[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const blobResponse = await octokit.git.createBlob({
            owner,
            repo,
            content: file.content,
            encoding: 'base64',
          });

          treeEntries.push({
            path: file.relativePath.replace(/\\/g, '/'), // Normalize Windows paths
            mode: '100644',
            type: 'blob',
            sha: blobResponse.data.sha,
          });

          // Progress update every 5 files or on the last file
          if ((i + 1) % 5 === 0 || i === files.length - 1) {
            send('step', `\u2713 Created blob ${i + 1}/${files.length}: ${file.relativePath}`);
          }
        }

        // Step 6: Create tree
        send('step', 'Creating git tree...');
        const treeResponse = await octokit.git.createTree({
          owner,
          repo,
          tree: treeEntries,
        });
        send('step', `\u2713 Created tree ${treeResponse.data.sha.substring(0, 7)}`);

        // Step 7: Check for existing HEAD
        let parentSha: string | undefined;
        try {
          const refResponse = await octokit.git.getRef({
            owner,
            repo,
            ref: 'heads/main',
          });
          parentSha = refResponse.data.object.sha;
          send('step', `\u2713 Found existing HEAD at ${parentSha.substring(0, 7)}`);
        } catch {
          // Empty repo or no main branch — will create initial commit
          send('step', 'No existing branch found, creating initial commit...');
        }

        // Step 8: Create commit
        send('step', 'Creating commit...');
        const commitResponse = await octokit.git.createCommit({
          owner,
          repo,
          message: 'feat: auto-generated application scaffold\n\nGenerated by Harness Engineering Demo pipeline.\nIncludes: application code, test suite, K8s manifests, CI/CD workflows.',
          tree: treeResponse.data.sha,
          parents: parentSha ? [parentSha] : [],
        });
        const commitSha = commitResponse.data.sha;
        send('step', `\u2713 Created commit ${commitSha.substring(0, 7)}`);

        // Step 9: Create or update branch ref
        send('step', 'Updating main branch...');
        if (parentSha) {
          // Update existing ref
          await octokit.git.updateRef({
            owner,
            repo,
            ref: 'heads/main',
            sha: commitSha,
            force: true,
          });
          send('step', '\u2713 Updated refs/heads/main');
        } else {
          // Create new ref
          await octokit.git.createRef({
            owner,
            repo,
            ref: 'refs/heads/main',
            sha: commitSha,
          });
          send('step', '\u2713 Created refs/heads/main');
        }

        // Step 10: Done
        const commitUrl = `https://github.com/${owner}/${repo}/commit/${commitSha}`;
        const repoUrlClean = `https://github.com/${owner}/${repo}`;
        send('complete', `\u2713 Successfully pushed ${files.length} files to ${repoUrlClean}`, {
          commitSha,
          commitUrl,
          repoUrl: repoUrlClean,
          fileCount: files.length,
        });

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        // Redact PAT token from any error messages
        const safeMessage = message.replace(new RegExp(patToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '***');
        send('error', `Git push failed: ${safeMessage}`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
