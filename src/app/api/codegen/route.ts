/**
 * POST /api/codegen
 *
 * OpenCode SDK-powered code generation endpoint.
 * Spawns/reuses an OpenCode server, creates a session in the workspace directory,
 * sends the codegen prompt, and relays events to the client as SSE.
 *
 * Request body: { workspaceId: string, prompt: string }
 * Response: text/event-stream with event types: text, file, tool, complete, error
 */

import { NextRequest } from 'next/server';
import { ensureOpenCodeServer } from '../../../lib/opencode';
import { getWorkspaceDir } from '../../../lib/workspace';
import * as fs from 'fs/promises';
import * as path from 'path';

/** Recursively list all files in a directory, returning relative paths */
async function listFilesRecursive(dir: string, base: string = ''): Promise<Array<{ path: string; lineCount: number }>> {
  const results: Array<{ path: string; lineCount: number }> = [];
  let entryNames: string[];

  try {
    entryNames = await fs.readdir(dir);
  } catch {
    return results;
  }

  for (const name of entryNames) {
    const relativePath = base ? `${base}/${name}` : name;
    const fullPath = path.join(dir, name);

    let stat: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stat = await fs.stat(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      // Skip node_modules and .git
      if (name === 'node_modules' || name === '.git') continue;
      const subFiles = await listFilesRecursive(fullPath, relativePath);
      results.push(...subFiles);
    } else {
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        results.push({
          path: relativePath,
          lineCount: content.split('\n').length,
        });
      } catch {
        results.push({ path: relativePath, lineCount: 0 });
      }
    }
  }

  return results;
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: { workspaceId: string; prompt: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { workspaceId, prompt } = body;
  if (!workspaceId || !prompt) {
    return Response.json({ error: 'workspaceId and prompt are required' }, { status: 400 });
  }

  // Resolve workspace directory
  let workspaceDir: string;
  try {
    workspaceDir = getWorkspaceDir(workspaceId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 404 });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream may be closed
        }
      };

      try {
        // 1. Get OpenCode client (starts server if needed)
        sendEvent('text', { content: '[The Code Guy from INGKA] Connecting to server...\n' });
        const client = await ensureOpenCodeServer();

        // 2. Create a session pointed at the workspace
        sendEvent('text', { content: '[The Code Guy from INGKA] Creating session...\n' });
        const sessionResult = await client.session.create({
          body: { title: 'Harness Codegen' },
          query: { directory: workspaceDir },
        });

        if (!sessionResult.data) {
          sendEvent('error', { message: 'Failed to create OpenCode session' });
          controller.close();
          return;
        }

        const sessionId = sessionResult.data.id;
        sendEvent('text', { content: `[The Code Guy from INGKA] Session ${sessionId.substring(0, 8)}... ready\n` });

        // 3. Subscribe to events BEFORE sending the prompt
        const eventResult = await client.event.subscribe({
          query: { directory: workspaceDir },
        });

        if (!eventResult.stream) {
          sendEvent('error', { message: 'Failed to subscribe to OpenCode events' });
          controller.close();
          return;
        }

        // 4. Send the prompt asynchronously
        sendEvent('text', { content: '[The Code Guy from INGKA] Sending codegen prompt...\n' });
        sendEvent('text', { content: '\u2500'.repeat(40) + '\n\n' });

        await client.session.promptAsync({
          path: { id: sessionId },
          body: {
            parts: [{ type: 'text', text: prompt }],
          },
          query: { directory: workspaceDir },
        });

        // 5. Process events from the stream
        const trackedFiles = new Set<string>();

        try {
          for await (const event of eventResult.stream) {
            // Type-narrow based on event.type
            switch (event.type) {
              case 'message.part.updated': {
                const part = event.properties.part;
                const delta = event.properties.delta;

                // Only process events for our session
                if (part.sessionID !== sessionId) break;

                // Stream text deltas to the client
                if (delta && delta.length > 0) {
                  sendEvent('text', { content: delta });
                }

                // Track tool completions for display
                if (part.type === 'tool' && part.state.status === 'completed') {
                  const toolName = part.tool;
                  const title = part.state.title || toolName;
                  sendEvent('tool', {
                    name: toolName,
                    title,
                    input: part.state.input,
                  });
                }
                break;
              }

              case 'file.edited': {
                const filePath = event.properties.file;
                // Convert absolute path to relative path within workspace
                let relativePath = filePath;
                if (filePath.startsWith(workspaceDir)) {
                  relativePath = filePath
                    .substring(workspaceDir.length)
                    .replace(/^[/\\]+/, '');
                }

                if (relativePath && !trackedFiles.has(relativePath)) {
                  trackedFiles.add(relativePath);

                  // Try to get line count
                  let lineCount = 0;
                  try {
                    const content = await fs.readFile(filePath, 'utf-8');
                    lineCount = content.split('\n').length;
                  } catch {
                    // File might not exist yet or be binary
                  }

                  sendEvent('file', {
                    path: relativePath,
                    lineCount,
                    timestamp: Date.now(),
                  });
                }
                break;
              }

              case 'permission.updated': {
                // Auto-approve all permissions for codegen (file writes, shell, etc.)
                const permission = event.properties;
                if (permission.sessionID === sessionId) {
                  try {
                    await client.postSessionIdPermissionsPermissionId({
                      path: { id: sessionId, permissionID: permission.id },
                      body: { response: 'always' },
                    });
                    sendEvent('text', {
                      content: `[Auto-approved: ${permission.title}]\n`,
                    });
                  } catch {
                    // Permission might have been resolved already
                  }
                }
                break;
              }

              case 'session.idle': {
                // Only react to our session going idle
                if (event.properties.sessionID !== sessionId) break;

                // Session complete — list all generated files
                sendEvent('text', { content: '\n' + '\u2500'.repeat(40) + '\n' });
                sendEvent('text', { content: '[The Code Guy from INGKA] Code generation complete.\n' });

                const files = await listFilesRecursive(workspaceDir);
                sendEvent('complete', {
                  files: files.map(f => ({
                    path: f.path,
                    lineCount: f.lineCount,
                    timestamp: Date.now(),
                  })),
                  totalFiles: files.length,
                });

                controller.close();
                return;
              }

              case 'session.error': {
                if (event.properties.sessionID !== sessionId) break;
                const errorObj = event.properties.error;
                const errorMsg = errorObj && typeof errorObj === 'object' && 'message' in errorObj
                  ? String((errorObj as { message?: string }).message)
                  : 'Unknown OpenCode error';
                sendEvent('error', { message: errorMsg });
                controller.close();
                return;
              }

              // Ignore all other event types
              default:
                break;
            }
          }
        } catch (streamErr: unknown) {
          // Stream ended or errored
          const message = streamErr instanceof Error ? streamErr.message : 'Event stream ended unexpectedly';
          // If it's just the stream closing, generate completion based on files
          const files = await listFilesRecursive(workspaceDir);
          if (files.length > 0) {
            sendEvent('text', { content: '\n[The Code Guy from INGKA] Stream ended. Collecting generated files...\n' });
            sendEvent('complete', {
              files: files.map(f => ({
                path: f.path,
                lineCount: f.lineCount,
                timestamp: Date.now(),
              })),
              totalFiles: files.length,
            });
          } else {
            sendEvent('error', { message });
          }
        }

        controller.close();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'OpenCode codegen failed';
        sendEvent('error', { message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
