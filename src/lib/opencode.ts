/**
 * OpenCode server lifecycle manager (singleton).
 *
 * Spawns an OpenCode server and provides a client for code generation sessions.
 *
 * The SDK's createOpencode() uses spawn("opencode", ...) without shell: true,
 * which fails on Windows because npm global installs create .cmd wrappers
 * that Node's spawn can't find without shell mode. This module replaces the
 * SDK's server spawner with a Windows-compatible version while still using
 * the SDK's client.
 *
 * The `directory` parameter on each API call controls which workspace
 * OpenCode operates in — no need to restart the server per workspace.
 *
 * Uses globalThis to persist across Next.js HMR in development mode.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { createOpencodeClient, type OpencodeClient } from '@opencode-ai/sdk';

const OPENCODE_PORT = parseInt(process.env.OPENCODE_PORT ?? '4096', 10);

// Persist singleton state across Next.js HMR via globalThis
const globalForOpenCode = globalThis as typeof globalThis & {
  __opencodeServer?: { url: string; close(): void } | null;
  __opencodeClient?: OpencodeClient | null;
  __opencodeStartup?: Promise<OpencodeClient> | null;
};

/**
 * Spawns the OpenCode server process with shell: true for Windows compatibility.
 * Replicates the SDK's createOpencodeServer() logic but adds shell: true so that
 * .cmd wrappers (created by npm global install on Windows) are resolved correctly.
 */
async function spawnOpenCodeServer(options: {
  hostname: string;
  port: number;
  timeout: number;
}): Promise<{ url: string; close(): void }> {
  const args = [
    'serve',
    `--hostname=${options.hostname}`,
    `--port=${options.port}`,
  ];

  const proc: ChildProcess = spawn('opencode', args, {
    shell: true,
    env: {
      ...process.env,
      OPENCODE_CONFIG_CONTENT: JSON.stringify({}),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const url = await new Promise<string>((resolve, reject) => {
    const id = setTimeout(() => {
      proc.kill();
      reject(
        new Error(
          `Timeout waiting for OpenCode server to start after ${options.timeout}ms`
        )
      );
    }, options.timeout);

    let output = '';

    proc.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.startsWith('opencode server listening')) {
          const match = line.match(/on\s+(https?:\/\/[^\s]+)/);
          if (!match) {
            clearTimeout(id);
            reject(
              new Error(
                `Failed to parse server url from output: ${line}`
              )
            );
            return;
          }
          clearTimeout(id);
          resolve(match[1]);
          return;
        }
      }
    });

    proc.stderr?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });

    proc.on('exit', (code) => {
      clearTimeout(id);
      let msg = `OpenCode server exited with code ${code}`;
      if (output.trim()) {
        msg += `\nServer output: ${output}`;
      }
      reject(new Error(msg));
    });

    proc.on('error', (error) => {
      clearTimeout(id);
      reject(error);
    });
  });

  return {
    url,
    close() {
      proc.kill();
    },
  };
}

/**
 * Ensures the OpenCode server is running and returns the client.
 * Uses a singleton pattern — only one server instance at a time.
 * Concurrent calls will await the same startup promise.
 */
export async function ensureOpenCodeServer(): Promise<OpencodeClient> {
  // Already running
  if (globalForOpenCode.__opencodeClient && globalForOpenCode.__opencodeServer) {
    return globalForOpenCode.__opencodeClient;
  }

  // Startup already in progress — wait for it
  if (globalForOpenCode.__opencodeStartup) {
    return globalForOpenCode.__opencodeStartup;
  }

  globalForOpenCode.__opencodeStartup = (async () => {
    try {
      console.log(`[The Code Guy from INGKA] Starting server on port ${OPENCODE_PORT}...`);

      const server = await spawnOpenCodeServer({
        hostname: '127.0.0.1',
        port: OPENCODE_PORT,
        timeout: 15000,
      });

      const client = createOpencodeClient({
        baseUrl: server.url,
      });

      globalForOpenCode.__opencodeServer = server;
      globalForOpenCode.__opencodeClient = client;

      console.log(`[The Code Guy from INGKA] Server ready at ${server.url}`);
      return client;
    } catch (err) {
      // Reset state so next call can retry
      globalForOpenCode.__opencodeServer = null;
      globalForOpenCode.__opencodeClient = null;
      globalForOpenCode.__opencodeStartup = null;
      throw err;
    }
  })();

  const result = await globalForOpenCode.__opencodeStartup;
  return result;
}

/**
 * Shuts down the OpenCode server if it's running.
 */
export function shutdownOpenCodeServer(): void {
  if (globalForOpenCode.__opencodeServer) {
    console.log('[The Code Guy from INGKA] Shutting down server...');
    globalForOpenCode.__opencodeServer.close();
    globalForOpenCode.__opencodeServer = null;
    globalForOpenCode.__opencodeClient = null;
    globalForOpenCode.__opencodeStartup = null;
  }
}
