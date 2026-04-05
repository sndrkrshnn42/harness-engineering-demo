import { useReducer, useRef, useCallback } from 'react';
import { pipelineReducer, createInitialState, StageId, STAGE_DEFINITIONS } from '../types';
import type { CodegenMode } from '../types';
import { SYSTEM_PROMPTS, ADRIAN_CODEGEN_PROMPT, ROCKY_CODEGEN_PROMPT, DEVOPS_DEPLOY_PROMPT } from '../constants/prompts';

const INFERENCE_PATH = '/api/inference';
const MODEL = 'qwen25-coder-14b';
const MAX_TOKENS = 2048;
const INTER_STAGE_DELAY_MS = 600;
const MAX_TOOL_ITERATIONS = 10;

/**
 * Derives a DNS-safe slug from the user's prompt for unique Docker image and K8s resource naming.
 * Examples: "Build a snake game" → "snake-game", "Create a 2048 puzzle app" → "2048-puzzle-app"
 */
function deriveServiceSlug(prompt: string): string {
  const STOP_WORDS = new Set([
    'a', 'an', 'the', 'for', 'and', 'or', 'to', 'of', 'in', 'on', 'at',
    'by', 'my', 'our', 'me', 'i', 'we', 'you', 'it', 'is', 'are', 'was',
    'be', 'been', 'being', 'have', 'has', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'can', 'shall',
    'build', 'create', 'make', 'develop', 'generate', 'write', 'implement',
    'design', 'please', 'want', 'need', 'like', 'with', 'using', 'that',
    'this', 'which', 'from', 'into', 'about',
  ]);
  const words = prompt.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
    .filter(w => w.length > 0 && !STOP_WORDS.has(w)).slice(0, 4);
  let slug = words.join('-') || 'app';
  if (/^[^a-z]/.test(slug)) slug = 'app-' + slug;
  slug = slug.slice(0, 40).replace(/[^a-z0-9]+$/, '').replace(/-{2,}/g, '-');
  return slug || 'app';
}

// ─── Agent File Type (exported for FileTree component) ──────────────────────

export interface AgentFile {
  path: string;
  lineCount: number;
  timestamp: number;
}

// ─── Tool Definitions for Stage 2 (Agentic Code Generation) ─────────────────

const AGENT_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'write_file',
      description: 'Create or overwrite a file with the given content',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path relative to project root' },
          content: { type: 'string', description: 'Full file content' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to read' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_files',
      description: 'List all files in the project directory structure',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'execute_command',
      description: 'Run a shell command and return the output',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Shell command to execute' },
        },
        required: ['command'],
      },
    },
  },
];

// ─── Types for Streaming Tool Calls ─────────────────────────────────────────

interface AccumulatedToolCall {
  index: number;
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

interface StreamResult {
  content: string;
  toolCalls: AccumulatedToolCall[];
  finishReason: string | null;
}

// ─── Server-side Tool Execution via API Routes ─────────────────────────────

async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  workspaceId: string
): Promise<string> {
  const routeMap: Record<string, string> = {
    write_file: '/api/tools/write-file',
    read_file: '/api/tools/read-file',
    list_files: '/api/tools/list-files',
    execute_command: '/api/tools/execute',
  };

  const route = routeMap[name];
  if (!route) return `Unknown tool: ${name}`;

  // Build the request body — always include workspaceId, plus tool-specific args
  const body: Record<string, unknown> = { workspaceId };

  switch (name) {
    case 'write_file':
      body.path = args.path;
      body.content = args.content;
      break;
    case 'read_file':
      body.path = args.path;
      break;
    case 'list_files':
      // No extra args needed
      break;
    case 'execute_command':
      body.command = args.command;
      break;
  }

  try {
    const response = await fetch(route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.error) return `Error: ${data.error}`;
    return data.result ?? 'Done';
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Tool call failed';
    return `Error: ${message}`;
  }
}

function formatToolCallForDisplay(
  name: string,
  args: Record<string, unknown>,
  result: string
): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(`\u250C\u2500 [TOOL] ${name}`);

  switch (name) {
    case 'write_file': {
      const path = args.path as string;
      const content = args.content as string;
      const contentLines = content.split('\n');
      lines.push(`\u2502  Path: ${path}`);
      lines.push(`\u2502  Size: ${contentLines.length} lines`);
      const preview = contentLines.slice(0, 4);
      preview.forEach(l => lines.push(`\u2502  \u2502 ${l.substring(0, 80)}`));
      if (contentLines.length > 4) {
        lines.push(`\u2502  \u2502 ... (${contentLines.length - 4} more lines)`);
      }
      break;
    }
    case 'read_file':
      lines.push(`\u2502  Path: ${args.path}`);
      break;
    case 'list_files':
      lines.push(`\u2502  Listing project files...`);
      break;
    case 'execute_command':
      lines.push(`\u2502  $ ${args.command}`);
      break;
  }

  lines.push(`\u2502`);
  lines.push(`\u2502  \u2192 ${result.split('\n')[0]}`);
  lines.push(`\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`);
  lines.push('');

  return lines.join('\n');
}

// ─── SSE Stream Parser (handles both content and tool calls) ────────────────

async function parseSSEStream(
  response: Response,
  onContent: (text: string) => void
): Promise<StreamResult> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  let accumulated = '';
  const toolCalls: AccumulatedToolCall[] = [];
  let finishReason: string | null = null;
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    // Keep the last (potentially incomplete) line in the buffer
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const choice = parsed.choices?.[0];
        if (!choice) continue;

        // Track finish reason
        if (choice.finish_reason) {
          finishReason = choice.finish_reason;
        }

        const delta = choice.delta;
        if (!delta) continue;

        // Content streaming
        if (typeof delta.content === 'string' && delta.content.length > 0) {
          accumulated += delta.content;
          onContent(delta.content);
        }

        // Tool call streaming — accumulate incrementally
        if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const idx: number = tc.index ?? 0;
            if (!toolCalls[idx]) {
              toolCalls[idx] = {
                index: idx,
                id: tc.id ?? '',
                type: tc.type ?? 'function',
                function: { name: '', arguments: '' },
              };
            }
            if (tc.id) toolCalls[idx].id = tc.id;
            if (tc.type) toolCalls[idx].type = tc.type;
            if (tc.function?.name) toolCalls[idx].function.name += tc.function.name;
            if (tc.function?.arguments) {
              toolCalls[idx].function.arguments += tc.function.arguments;
            }
          }
        }
      } catch {
        // Malformed SSE line — skip silently
      }
    }
  }

  // Process any remaining buffered data
  if (buffer.trim().startsWith('data: ')) {
    const data = buffer.trim().slice(6).trim();
    if (data !== '[DONE]') {
      try {
        const parsed = JSON.parse(data);
        const choice = parsed.choices?.[0];
        if (choice?.finish_reason) {
          finishReason = choice.finish_reason;
        }
      } catch {
        // ignore
      }
    }
  }

  return { content: accumulated, toolCalls, finishReason };
}

// ─── Workspace Lifecycle Helpers ────────────────────────────────────────────

async function createWorkspaceOnServer(): Promise<string> {
  const response = await fetch('/api/workspace', { method: 'POST' });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.workspaceId as string;
}

async function destroyWorkspaceOnServer(workspaceId: string): Promise<void> {
  await fetch(`/api/workspace?id=${encodeURIComponent(workspaceId)}`, {
    method: 'DELETE',
  });
}

// ─── Infra File Parser ──────────────────────────────────────────────────────

interface ParsedInfraFile {
  path: string;
  content: string;
}

/**
 * Strips markdown code fences from file content extracted from LLM output.
 * Handles ```yaml, ```yml, ```json, bare ```, and closing ``` markers.
 */
function stripMarkdownCodeFences(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip opening code fences: ```yaml, ```yml, ```json, ```dockerfile, bare ```
    if (/^```\w*$/.test(trimmed)) continue;
    result.push(line);
  }

  return result.join('\n').trim();
}

/**
 * Parses Stage 3 (Infra generation) output for `# FILE: <path>` markers
 * and extracts each file's content. Returns an array of parsed files.
 * Automatically strips markdown code fences from extracted content.
 */
function parseInfraFiles(output: string): ParsedInfraFile[] {
  const files: ParsedInfraFile[] = [];
  const lines = output.split('\n');

  let currentPath: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const fileMatch = /^#\s*FILE:\s*(.+)$/i.exec(line.trim());
    if (fileMatch) {
      // Save the previous file if we had one
      if (currentPath !== null) {
        const content = stripMarkdownCodeFences(currentLines.join('\n'));
        if (content.length > 0) {
          files.push({ path: currentPath, content });
        }
      }
      currentPath = fileMatch[1].trim();
      currentLines = [];
    } else if (currentPath !== null) {
      currentLines.push(line);
    }
  }

  // Save the last file
  if (currentPath !== null) {
    const content = stripMarkdownCodeFences(currentLines.join('\n'));
    if (content.length > 0) {
      files.push({ path: currentPath, content });
    }
  }

  return files;
}

/**
 * Writes parsed infra files to the workspace and tracks them in the agent files ref.
 */
async function writeInfraFilesToWorkspace(
  files: ParsedInfraFile[],
  workspaceId: string
): Promise<AgentFile[]> {
  const written: AgentFile[] = [];

  for (const file of files) {
    try {
      await fetch('/api/tools/write-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          path: file.path,
          content: file.content,
        }),
      });

      written.push({
        path: file.path,
        lineCount: file.content.split('\n').length,
        timestamp: Date.now(),
      });
    } catch {
      // Best-effort: skip files that fail to write
    }
  }

  return written;
}

// ─── Main Hook ──────────────────────────────────────────────────────────────

export function usePipeline(inputSpec: string, codegenMode: CodegenMode, patToken: string, repoUrl: string) {
  const [state, dispatch] = useReducer(pipelineReducer, undefined, createInitialState);
  const abortRef = useRef<AbortController | null>(null);
  const stageOutputsRef = useRef<Record<number, string>>({});
  const agentFilesRef = useRef<AgentFile[]>([]);
  const workspaceIdRef = useRef<string | null>(null);

  /**
   * Streams a single standard (non-agentic) stage.
   * Returns the full accumulated output when streaming completes.
   */
  const streamStage = useCallback(async (
    stageId: StageId,
    userMessage: string,
    serviceSlug: string
  ): Promise<string> => {
    const stageStart = Date.now();
    dispatch({ type: 'STAGE_START', stageId });

    abortRef.current = new AbortController();

    const systemPrompt = SYSTEM_PROMPTS[stageId].replace(/__SERVICE_SLUG__/g, serviceSlug);

    const response = await fetch(INFERENCE_PATH, {
      method: 'POST',
      signal: abortRef.current.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error ${response.status}: ${errorBody}`);
    }

    const result = await parseSSEStream(response, (text) => {
      dispatch({ type: 'STAGE_APPEND', stageId, text });
    });

    const elapsedMs = Date.now() - stageStart;
    dispatch({ type: 'STAGE_COMPLETE', stageId, elapsedMs });

    if (process.env.NODE_ENV === 'development') {
      console.group(`[Stage ${stageId}] Complete`);
      console.log('Elapsed:', elapsedMs, 'ms');
      console.log('Output length:', result.content.length);
      console.groupEnd();
    }

    return result.content;
  }, []);

  /**
   * Streams Stage 2 with agentic tool-calling loop.
   * The model can call write_file, read_file, list_files, execute_command
   * across multiple iterations to produce complete source code.
   * Falls back to standard streaming if the endpoint doesn't support tools.
   */
  const streamStageAgentic = useCallback(async (
    stageId: StageId,
    userMessage: string,
    workspaceId: string
  ): Promise<string> => {
    const stageStart = Date.now();
    dispatch({ type: 'STAGE_START', stageId });

    agentFilesRef.current = [];
    let filesCreated = 0;

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPTS[stageId] },
      { role: 'user', content: userMessage },
    ];

    let fullOutput = '';
    let iteration = 0;
    let useTools = true;

    // Show agent mode header
    const header = '[Agent Mode: Code Generation]\n' +
      '\u2500'.repeat(40) + '\n';
    fullOutput += header;
    dispatch({ type: 'STAGE_APPEND', stageId, text: header });

    while (iteration < MAX_TOOL_ITERATIONS) {
      iteration++;

      abortRef.current = new AbortController();

      // Build request body — include tools if supported
      const requestBody: Record<string, unknown> = {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        stream: true,
        messages,
      };

      if (useTools) {
        requestBody.tools = AGENT_TOOLS;
        requestBody.tool_choice = 'auto';
      }

      let response: Response;
      try {
        response = await fetch(INFERENCE_PATH, {
          method: 'POST',
          signal: abortRef.current.signal,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
      } catch (err: unknown) {
        // Re-throw abort errors and network errors
        throw err;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        // If the endpoint rejects tools on first attempt, fall back to standard mode
        if (response.status === 400 && iteration === 1 && useTools) {
          useTools = false;
          const fallbackNote =
            '\n[Tools not supported \u2014 falling back to standard generation]\n\n';
          fullOutput += fallbackNote;
          dispatch({ type: 'STAGE_APPEND', stageId, text: fallbackNote });
          iteration--; // Don't count failed attempt
          continue;
        }
        throw new Error(`API error ${response.status}: ${errorBody}`);
      }

      // Parse the SSE stream — content goes directly to the display
      const result = await parseSSEStream(response, (text) => {
        fullOutput += text;
        dispatch({ type: 'STAGE_APPEND', stageId, text });
      });

      // If the model responded with content and stopped, we're done
      if (result.finishReason === 'stop' || result.toolCalls.length === 0) {
        break;
      }

      // ─── Handle tool calls ────────────────────────────────────────
      if (result.toolCalls.length > 0) {
        // Add assistant message with tool calls to conversation history
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: result.content || null,
          tool_calls: result.toolCalls.map(tc => ({
            id: tc.id,
            type: tc.type,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
        };
        messages.push(assistantMsg);

        // Process each tool call
        for (const tc of result.toolCalls) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.function.arguments);
          } catch {
            args = { _parseError: 'Failed to parse tool arguments' };
          }

          // Execute via server-side API route
          const toolResult = await executeToolCall(tc.function.name, args, workspaceId);

          // Track files for the FileTree component
          if (tc.function.name === 'write_file' && typeof args.path === 'string') {
            const content = typeof args.content === 'string' ? args.content : '';
            filesCreated++;
            agentFilesRef.current = [
              ...agentFilesRef.current,
              {
                path: args.path,
                lineCount: content.split('\n').length,
                timestamp: Date.now(),
              },
            ];
          }

          // Display the formatted tool call in the stage output
          const displayText = formatToolCallForDisplay(
            tc.function.name, args, toolResult
          );
          fullOutput += displayText;
          dispatch({ type: 'STAGE_APPEND', stageId, text: displayText });

          // Add tool result to conversation for the next iteration
          messages.push({
            role: 'tool',
            content: toolResult,
            tool_call_id: tc.id,
          });
        }

        // Show iteration progress marker
        const iterMarker =
          `\n[Iteration ${iteration}/${MAX_TOOL_ITERATIONS}` +
          ` \u2014 ${filesCreated} file${filesCreated !== 1 ? 's' : ''} created]\n`;
        fullOutput += iterMarker;
        dispatch({ type: 'STAGE_APPEND', stageId, text: iterMarker });
      }
    }

    const elapsedMs = Date.now() - stageStart;
    dispatch({ type: 'STAGE_COMPLETE', stageId, elapsedMs });

    if (process.env.NODE_ENV === 'development') {
      console.group(`[Stage ${stageId}] Agentic Complete`);
      console.log('Elapsed:', elapsedMs, 'ms');
      console.log('Iterations:', iteration);
      console.log('Files created:', filesCreated);
      console.log('Total output length:', fullOutput.length);
      console.groupEnd();
    }

    return fullOutput;
  }, []);

  /**
   * Parses SSE events from a single OpenCode codegen agent stream.
   * Returns the accumulated output and whether the agent completed successfully.
   */
  const parseAgentSSEStream = useCallback(async (
    response: Response,
    stageId: StageId,
    agentLabel: string,
    onFile: (file: AgentFile) => void
  ): Promise<{ output: string; success: boolean }> => {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullOutput = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      let currentEvent = '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
          continue;
        }

        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();

          try {
            const parsed = JSON.parse(data);

            switch (currentEvent) {
              case 'text': {
                const content = parsed.content as string;
                if (content) {
                  const labeled = `[${agentLabel}] ${content}`;
                  fullOutput += labeled;
                  dispatch({ type: 'STAGE_APPEND', stageId, text: labeled });
                }
                break;
              }

              case 'file': {
                const filePath = parsed.path as string;
                const lineCount = parsed.lineCount as number;
                const timestamp = parsed.timestamp as number;

                onFile({ path: filePath, lineCount, timestamp });

                const fileMsg = `\n[${agentLabel}] \u250C\u2500 [FILE] ${filePath} (${lineCount} lines)\n` +
                  `[${agentLabel}] \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n`;
                fullOutput += fileMsg;
                dispatch({ type: 'STAGE_APPEND', stageId, text: fileMsg });
                break;
              }

              case 'tool': {
                const toolName = parsed.name as string;
                const toolTitle = parsed.title as string;
                const toolMsg = `[${agentLabel}] [Tool: ${toolName}] ${toolTitle}\n`;
                fullOutput += toolMsg;
                dispatch({ type: 'STAGE_APPEND', stageId, text: toolMsg });
                break;
              }

              case 'complete': {
                const totalFiles = parsed.totalFiles as number;
                const completeFiles = parsed.files as Array<{ path: string; lineCount: number; timestamp: number }>;

                if (completeFiles && completeFiles.length > 0) {
                  for (const f of completeFiles) {
                    onFile({ path: f.path, lineCount: f.lineCount, timestamp: f.timestamp });
                  }
                }

                const summary = `\n[${agentLabel}] Complete: ${totalFiles} file${totalFiles !== 1 ? 's' : ''} generated\n`;
                fullOutput += summary;
                dispatch({ type: 'STAGE_APPEND', stageId, text: summary });
                return { output: fullOutput, success: true };
              }

              case 'error': {
                const errorMsg = parsed.message as string;
                const errText = `\n[${agentLabel}] ERROR: ${errorMsg}\n`;
                fullOutput += errText;
                dispatch({ type: 'STAGE_APPEND', stageId, text: errText });
                return { output: fullOutput, success: false };
              }
            }
          } catch (parseErr: unknown) {
            if (parseErr instanceof Error && currentEvent === 'error') {
              throw parseErr;
            }
          }

          currentEvent = '';
        }
      }
    }

    return { output: fullOutput, success: true };
  }, []);

  /**
   * Streams Stage 2 via the OpenCode SDK codegen endpoint with dual agents.
   * Adrian (FastAPI backend in api/) and Rocky (React/Skapa frontend in frontend/)
   * run in parallel. After both complete, a testing sub-step validates the output.
   */
  const streamStageOpenCode = useCallback(async (
    stageId: StageId,
    userMessage: string,
    workspaceId: string
  ): Promise<string> => {
    const stageStart = Date.now();
    dispatch({ type: 'STAGE_START', stageId });

    agentFilesRef.current = [];

    let fullOutput = '';

    // Show dual-agent mode header
    const header = '[Rocky and Adrian - picked this up]\n' +
      '[Adrian] FastAPI backend (api/)\n' +
      '[Rocky] React + INGKA Skapa frontend (frontend/)\n' +
      '\u2500'.repeat(40) + '\n\n';
    fullOutput += header;
    dispatch({ type: 'STAGE_APPEND', stageId, text: header });

    abortRef.current = new AbortController();

    // Build prompts for each agent
    const adrianPrompt =
      `System Instructions:\n${ADRIAN_CODEGEN_PROMPT}\n\n` +
      `---\n\n${userMessage}`;

    const rockyPrompt =
      `System Instructions:\n${ROCKY_CODEGEN_PROMPT}\n\n` +
      `---\n\n${userMessage}`;

    // Launch both agents in parallel
    const adrianFetch = fetch('/api/codegen', {
      method: 'POST',
      signal: abortRef.current.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        prompt: adrianPrompt,
        agent: 'adrian',
        subdir: 'api',
      }),
    });

    const rockyFetch = fetch('/api/codegen', {
      method: 'POST',
      signal: abortRef.current.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        prompt: rockyPrompt,
        agent: 'rocky',
        subdir: 'frontend',
      }),
    });

    // Wait for both fetch responses to start
    const [adrianResponse, rockyResponse] = await Promise.all([adrianFetch, rockyFetch]);

    if (!adrianResponse.ok) {
      const errorBody = await adrianResponse.text();
      throw new Error(`Adrian codegen API error ${adrianResponse.status}: ${errorBody}`);
    }
    if (!rockyResponse.ok) {
      const errorBody = await rockyResponse.text();
      throw new Error(`Rocky codegen API error ${rockyResponse.status}: ${errorBody}`);
    }

    // Track files per agent
    const fileTracker = (file: AgentFile) => {
      agentFilesRef.current = [...agentFilesRef.current, file];
    };

    // Stream both agents in parallel
    const [adrianResult, rockyResult] = await Promise.all([
      parseAgentSSEStream(adrianResponse, stageId, 'Adrian', fileTracker),
      parseAgentSSEStream(rockyResponse, stageId, 'Rocky', fileTracker),
    ]);

    fullOutput += adrianResult.output + rockyResult.output;

    if (!adrianResult.success || !rockyResult.success) {
      throw new Error('One or both agents failed during code generation');
    }

    // ─── Testing sub-step: validate generated code ──────────────────
    const testHeader = '\n' + '\u2500'.repeat(40) + '\n' +
      '[Testing] Validating generated code...\n';
    fullOutput += testHeader;
    dispatch({ type: 'STAGE_APPEND', stageId, text: testHeader });

    // Validate backend (Python syntax check)
    try {
      const backendCheck = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          command: 'cd api && python -m py_compile main.py 2>&1 || echo "Python syntax check: no main.py or error"',
        }),
      });
      const backendResult = await backendCheck.json();
      const backendMsg = `[Testing] Backend syntax: ${backendResult.result || 'OK'}\n`;
      fullOutput += backendMsg;
      dispatch({ type: 'STAGE_APPEND', stageId, text: backendMsg });
    } catch {
      const msg = '[Testing] Backend validation skipped (not available)\n';
      fullOutput += msg;
      dispatch({ type: 'STAGE_APPEND', stageId, text: msg });
    }

    // Validate frontend (check package.json exists and attempt syntax check)
    try {
      const frontendCheck = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          command: 'cd frontend && ls package.json 2>&1 && node -e "try{require(\'./src/App.tsx\'||\'./src/App.jsx\')}catch(e){console.log(\'Parse check:\',e.message?.substring(0,100))}" 2>&1 || echo "Frontend check: no package.json"',
        }),
      });
      const frontendResult = await frontendCheck.json();
      const frontendMsg = `[Testing] Frontend structure: ${frontendResult.result || 'OK'}\n`;
      fullOutput += frontendMsg;
      dispatch({ type: 'STAGE_APPEND', stageId, text: frontendMsg });
    } catch {
      const msg = '[Testing] Frontend validation skipped (not available)\n';
      fullOutput += msg;
      dispatch({ type: 'STAGE_APPEND', stageId, text: msg });
    }

    // List all generated files
    try {
      const listCheck = await fetch('/api/tools/list-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });
      const listResult = await listCheck.json();
      const fileList = listResult.result || '';
      const fileCount = fileList.split('\n').filter((l: string) => l.trim()).length;
      const listMsg = `[Testing] Total files in workspace: ${fileCount}\n`;
      fullOutput += listMsg;
      dispatch({ type: 'STAGE_APPEND', stageId, text: listMsg });
    } catch {
      // Skip silently
    }

    const testFooter = '[Testing] Validation complete.\n' +
      '\u2500'.repeat(40) + '\n';
    fullOutput += testFooter;
    dispatch({ type: 'STAGE_APPEND', stageId, text: testFooter });

    const elapsedMs = Date.now() - stageStart;
    dispatch({ type: 'STAGE_COMPLETE', stageId, elapsedMs });

    if (process.env.NODE_ENV === 'development') {
      console.group(`[Stage ${stageId}] Dual-Agent OpenCode Complete`);
      console.log('Elapsed:', elapsedMs, 'ms');
      console.log('Files created:', agentFilesRef.current.length);
      console.log('Total output length:', fullOutput.length);
      console.groupEnd();
    }

    return fullOutput;
  }, [parseAgentSSEStream]);

  /**
   * Streams Stage 5 via the OpenCode SDK deploy agent endpoint.
   * The DevOps agent autonomously builds Docker images (Kaniko) and deploys to K8s.
   * Uses the same OpenCode SDK pattern as Stage 2 codegen but with a single agent
   * operating on the full workspace root (no subdir scoping).
   */
  const streamStageDeployAgent = useCallback(async (
    stageId: StageId,
    userMessage: string,
    workspaceId: string,
    serviceSlug: string
  ): Promise<string> => {
    const stageStart = Date.now();
    dispatch({ type: 'STAGE_START', stageId });

    abortRef.current = new AbortController();

    const header = '[DevOps Agent — Docker Build & Deploy]\n' +
      '\u2500'.repeat(40) + '\n\n';
    let fullOutput = header;
    dispatch({ type: 'STAGE_APPEND', stageId, text: header });

    // Build the deploy prompt: system instructions + context from prior stages
    const deployPrompt =
      `System Instructions:\n${DEVOPS_DEPLOY_PROMPT.replace(/__SERVICE_SLUG__/g, serviceSlug)}\n\n` +
      `---\n\n${userMessage}`;

    const response = await fetch('/api/deploy', {
      method: 'POST',
      signal: abortRef.current.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        prompt: deployPrompt,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Deploy agent API error ${response.status}: ${errorBody}`);
    }

    // Parse SSE events from the deploy agent (same format as codegen)
    const result = await parseAgentSSEStream(response, stageId, 'DevOps', (file) => {
      agentFilesRef.current = [...agentFilesRef.current, file];
    });

    fullOutput += result.output;

    if (!result.success) {
      throw new Error('Deploy agent failed during build/deploy');
    }

    const elapsedMs = Date.now() - stageStart;
    dispatch({ type: 'STAGE_COMPLETE', stageId, elapsedMs });

    if (process.env.NODE_ENV === 'development') {
      console.group(`[Stage ${stageId}] Deploy Agent Complete`);
      console.log('Elapsed:', elapsedMs, 'ms');
      console.log('Total output length:', fullOutput.length);
      console.groupEnd();
    }

    return fullOutput;
  }, [parseAgentSSEStream]);

  /**
   * Pushes all workspace files to a GitHub repository via the /api/git-push SSE endpoint.
   * Uses the GitHub Git Data API (via @octokit/rest) server-side — no git CLI needed.
   * If patToken or repoUrl is empty, the stage completes immediately with a skip message.
   */
  const pushToGit = useCallback(async (
    stageId: StageId,
    workspaceId: string
  ): Promise<string> => {
    const stageStart = Date.now();
    dispatch({ type: 'STAGE_START', stageId });

    // If no credentials, skip gracefully
    if (!patToken.trim() || !repoUrl.trim()) {
      const skipMessage = '[Push to Git \u2014 Skipped]\n' +
        '\u2500'.repeat(40) + '\n' +
        'No GitHub credentials provided.\n' +
        'Provide a PAT token and repository URL in the input panel to enable git push.\n' +
        '\u2500'.repeat(40) + '\n';
      dispatch({ type: 'STAGE_APPEND', stageId, text: skipMessage });
      const elapsedMs = Date.now() - stageStart;
      dispatch({ type: 'STAGE_COMPLETE', stageId, elapsedMs });
      return skipMessage;
    }

    abortRef.current = new AbortController();

    const header = '[Push to Git \u2014 GitHub API]\n' +
      '\u2500'.repeat(40) + '\n';
    let fullOutput = header;
    dispatch({ type: 'STAGE_APPEND', stageId, text: header });

    const response = await fetch('/api/git-push', {
      method: 'POST',
      signal: abortRef.current.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        patToken: patToken.trim(),
        repoUrl: repoUrl.trim(),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Git push API error ${response.status}: ${errorBody}`);
    }

    if (!response.body) {
      throw new Error('No response body from git push API');
    }

    // Parse SSE stream from git-push endpoint
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr) as {
            type: string;
            message: string;
            commitUrl?: string;
            commitSha?: string;
            repoUrl?: string;
            fileCount?: number;
          };

          const text = event.message + '\n';
          fullOutput += text;
          dispatch({ type: 'STAGE_APPEND', stageId, text });

          if (event.type === 'error') {
            throw new Error(event.message);
          }

          if (event.type === 'complete' && event.commitUrl) {
            const linkText = `\nCommit: ${event.commitUrl}\nRepository: ${event.repoUrl ?? ''}\n`;
            fullOutput += linkText;
            dispatch({ type: 'STAGE_APPEND', stageId, text: linkText });
          }
        } catch (parseErr) {
          if (parseErr instanceof Error && parseErr.message.startsWith('Git push failed:')) {
            throw parseErr;
          }
          // Ignore malformed SSE lines
        }
      }
    }

    const footer = '\u2500'.repeat(40) + '\n';
    fullOutput += footer;
    dispatch({ type: 'STAGE_APPEND', stageId, text: footer });

    const elapsedMs = Date.now() - stageStart;
    dispatch({ type: 'STAGE_COMPLETE', stageId, elapsedMs });

    return fullOutput;
  }, [patToken, repoUrl]);

  /**
   * Builds the user message for each stage.
   * Every stage receives the original user prompt plus all prior stage outputs.
   */
  const buildUserMessage = useCallback((stageId: StageId): string => {
    const lines: string[] = [];

    lines.push('=== USER PROMPT ===');
    lines.push(inputSpec.trim());
    lines.push('');

    const outputLabels: Record<number, string> = {
      1: 'PRD + ARCHITECTURE + API CONTRACT',
      2: 'APPLICATION CODE (FastAPI backend + React/Skapa frontend) + TESTS',
      3: 'INFRA CONFIGURATION (K8S MANIFESTS)',
      4: 'GIT PUSH LOG',
      5: 'DOCKER BUILD & DEPLOY LOG',
      6: 'DEFECT TRIAGE',
    };

    for (let i = 1; i < stageId; i++) {
      const label = outputLabels[i];
      if (label) {
        lines.push(`=== STAGE ${i} OUTPUT: ${label} ===`);
        lines.push(stageOutputsRef.current[i] ?? '[not available]');
        lines.push('');
      }
    }

    const def = STAGE_DEFINITIONS.find(d => d.id === stageId)!;
    lines.push(`Now perform Stage ${stageId}: ${def.name}.`);

    return lines.join('\n');
  }, [inputSpec]);

  /**
   * Main pipeline runner. Executes stages 1-7 sequentially.
   * Stage 2 uses dual-agent OpenCode codegen; Stage 4 pushes to Git;
   * Stage 5 uses DevOps deploy agent (OpenCode SDK) for Docker builds and K8s deployment;
   * all others use standard streaming.
   */
  const runPipeline = useCallback(async () => {
    stageOutputsRef.current = {};
    agentFilesRef.current = [];
    dispatch({ type: 'START', timestamp: Date.now() });

    // Create workspace for agentic stages (real filesystem)
    let workspaceId: string | null = null;
    try {
      workspaceId = await createWorkspaceOnServer();
      workspaceIdRef.current = workspaceId;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      dispatch({ type: 'STAGE_ERROR', stageId: 1, message: `Workspace creation failed: ${message}` });
      return;
    }

    const pipelineStart = Date.now();
    const serviceSlug = deriveServiceSlug(inputSpec);

    for (const def of STAGE_DEFINITIONS) {
      if (def.id > 1) {
        await new Promise(r => setTimeout(r, INTER_STAGE_DELAY_MS));
      }

      try {
        const userMessage = buildUserMessage(def.id);

        let output: string;
        if (def.id === 2) {
          // Stage 2: Dual-agent OpenCode codegen (Adrian + Rocky)
          output = codegenMode === 'opencode'
            ? await streamStageOpenCode(def.id, userMessage, workspaceId)
            : await streamStageAgentic(def.id, userMessage, workspaceId);
        } else if (def.id === 4 && workspaceId) {
          // Stage 4: Push to Git via GitHub API
          output = await pushToGit(def.id, workspaceId);
        } else if (def.id === 5 && workspaceId) {
          // Stage 5: DevOps Agent — Docker Build & Deploy (OpenCode SDK)
          output = await streamStageDeployAgent(def.id, userMessage, workspaceId, serviceSlug);
        } else {
          // Stages 1, 3, 6, 7: Standard LLM streaming
          output = await streamStage(def.id, userMessage, serviceSlug);
        }

        // Post-process Stage 3: parse # FILE markers and write K8s manifest files to workspace
        if (def.id === 3 && workspaceId) {
          const infraFiles = parseInfraFiles(output);
          if (infraFiles.length > 0) {
            const written = await writeInfraFilesToWorkspace(infraFiles, workspaceId);
            agentFilesRef.current = [...agentFilesRef.current, ...written];
          }
        }

        stageOutputsRef.current[def.id] = output;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        dispatch({ type: 'STAGE_ERROR', stageId: def.id, message });
        return;
      }
    }

    const totalElapsedMs = Date.now() - pipelineStart;
    dispatch({ type: 'PIPELINE_COMPLETE', totalElapsedMs });
  }, [buildUserMessage, streamStage, streamStageAgentic, streamStageOpenCode, pushToGit, streamStageDeployAgent, codegenMode, inputSpec]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    stageOutputsRef.current = {};
    agentFilesRef.current = [];

    // Destroy workspace on reset
    if (workspaceIdRef.current) {
      destroyWorkspaceOnServer(workspaceIdRef.current).catch(() => {
        // Best-effort cleanup
      });
      workspaceIdRef.current = null;
    }

    dispatch({ type: 'RESET' });
  }, []);

  return { state, runPipeline, reset, agentFiles: agentFilesRef, workspaceId: workspaceIdRef };
}
