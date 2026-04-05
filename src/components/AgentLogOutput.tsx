import type { AgentLogEntry } from '../types';

interface Props {
  entries: AgentLogEntry[];
}

/** Map agent name to a Skapa-token-based color class for the label */
function agentColorClass(agent: string): string {
  switch (agent) {
    case 'Adrian': return 'text-skapa-informative';   // blue
    case 'Rocky': return 'text-skapa-caution';         // orange
    case 'DevOps': return 'text-skapa-text-1';         // primary dark
    case 'Testing': return 'text-skapa-text-3';        // muted grey
    default: return 'text-skapa-text-2';
  }
}

/** Agent label badge rendered inline before content */
function AgentLabel({ agent }: { agent: string }) {
  if (!agent) return null;
  return (
    <span className={`font-bold text-[11px] ${agentColorClass(agent)} shrink-0`}>
      [{agent}]
    </span>
  );
}

/** Small inline tool badge: [Tool: bash] */
function ToolBadge({ toolName }: { toolName: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-px text-[9px] font-mono font-medium rounded-skapa-s border border-skapa-neutral-4 bg-skapa-neutral-2 text-skapa-text-2 shrink-0">
      {toolName}
    </span>
  );
}

/** Renders a single log entry with type-specific formatting */
function LogEntry({ entry }: { entry: AgentLogEntry }) {
  switch (entry.type) {
    case 'header':
      return (
        <div className="py-1">
          <span className="text-xs font-bold text-skapa-text-1">
            {entry.content}
          </span>
        </div>
      );

    case 'separator':
      return <hr className="border-skapa-neutral-3 my-1" />;

    case 'text':
      return (
        <div className="flex items-start gap-2 py-px">
          <AgentLabel agent={entry.agent} />
          <span className="text-[11px] font-mono text-skapa-text-2 leading-relaxed whitespace-pre-wrap break-words min-w-0">
            {entry.content}
          </span>
        </div>
      );

    case 'tool':
      return (
        <div className="flex items-center gap-2 py-0.5">
          <AgentLabel agent={entry.agent} />
          <ToolBadge toolName={entry.toolName ?? 'tool'} />
          <span className="text-[11px] font-mono text-skapa-text-2 truncate">
            {entry.content}
          </span>
        </div>
      );

    case 'file':
      return (
        <div className="flex items-center gap-2 py-0.5">
          <AgentLabel agent={entry.agent} />
          <span className="text-[11px] text-skapa-informative font-medium font-mono">
            {entry.filePath}
          </span>
          <span className="text-[10px] text-skapa-text-3">
            ({entry.lineCount} lines)
          </span>
        </div>
      );

    case 'complete':
      return (
        <div className="flex items-center gap-2 py-0.5 mt-0.5">
          <AgentLabel agent={entry.agent} />
          <span className="text-[11px] font-medium" style={{ color: 'var(--skapa-positive)' }}>
            {entry.content}
          </span>
        </div>
      );

    case 'error':
      return (
        <div className="flex items-start gap-2 py-0.5">
          <AgentLabel agent={entry.agent} />
          <span className="text-[11px] font-mono font-medium text-skapa-negative">
            ERROR: {entry.content}
          </span>
        </div>
      );

    default:
      return null;
  }
}

/**
 * Renders structured agent log entries with distinct visual formatting per type.
 * Replaces MarkdownOutput for agent stages (2 and 5) where output is structured
 * SSE events rather than free-form markdown.
 */
export function AgentLogOutput({ entries }: Props) {
  return (
    <div className="agent-log-output space-y-px">
      {entries.map((entry, i) => (
        <LogEntry key={i} entry={entry} />
      ))}
    </div>
  );
}
