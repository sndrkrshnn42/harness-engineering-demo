import { useMemo, useState, useCallback } from 'react';
import type { AgentFile } from '../hooks/usePipeline';

interface Props {
  files: AgentFile[];
  isVisible: boolean;
  workspaceId: string | null;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  lineCount?: number;
  depth: number;
}

/** File extension to icon/label map */
function getFileIcon(name: string): string {
  if (name.endsWith('.ts') || name.endsWith('.tsx')) return 'TS';
  if (name.endsWith('.js') || name.endsWith('.jsx')) return 'JS';
  if (name.endsWith('.py')) return 'PY';
  if (name.endsWith('.yaml') || name.endsWith('.yml')) return 'YM';
  if (name.endsWith('.json')) return 'JS';
  if (name.endsWith('.css') || name.endsWith('.scss')) return 'CS';
  if (name.endsWith('.html')) return 'HT';
  if (name.endsWith('.md')) return 'MD';
  if (name.endsWith('.sql')) return 'SQ';
  if (name.endsWith('.env')) return 'EN';
  if (name.endsWith('.toml')) return 'TO';
  if (name.endsWith('.lock')) return 'LK';
  if (name.endsWith('.prisma')) return 'PR';
  return '··';
}

/** Build a tree structure from flat file paths */
function buildTree(files: AgentFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.replace(/\\/g, '/').split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join('/');

      let existing = current.find(n => n.name === part);
      if (!existing) {
        existing = {
          name: part,
          path: fullPath,
          isDir: !isLast,
          children: [],
          lineCount: isLast ? file.lineCount : undefined,
          depth: i,
        };
        current.push(existing);
      }
      current = existing.children;
    }
  }

  return root;
}

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return [...nodes].sort((a, b) => {
    // Directories first
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  }).map(n => ({ ...n, children: sortNodes(n.children) }));
}

// ─── File Content State ─────────────────────────────────────────────────────

interface FileContentCache {
  [path: string]: {
    content: string;
    status: 'loaded' | 'error';
  };
}

// ─── TreeNodeItem with Collapsible Content ──────────────────────────────────

interface TreeNodeItemProps {
  node: TreeNode;
  isLast: boolean;
  expandedFiles: Set<string>;
  loadingFiles: Set<string>;
  contentCache: FileContentCache;
  onFileClick: (path: string) => void;
}

function TreeNodeItem({
  node, isLast, expandedFiles, loadingFiles, contentCache, onFileClick,
}: TreeNodeItemProps) {
  const prefix = isLast ? '\u2514\u2500' : '\u251C\u2500';
  const icon = node.isDir ? '\u25B8' : getFileIcon(node.name);
  const isFile = !node.isDir;
  const isExpanded = isFile && expandedFiles.has(node.path);
  const isLoading = isFile && loadingFiles.has(node.path);
  const cached = isFile ? contentCache[node.path] : undefined;

  return (
    <div>
      <div
        className={`
          flex items-center gap-1 py-px animate-fade-in
          ${isFile ? 'cursor-pointer hover:bg-zinc-800/50 rounded px-0.5 -mx-0.5' : ''}
        `}
        onClick={isFile ? () => onFileClick(node.path) : undefined}
        role={isFile ? 'button' : undefined}
        tabIndex={isFile ? 0 : undefined}
        onKeyDown={isFile ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onFileClick(node.path);
          }
        } : undefined}
      >
        <span className="text-zinc-700 select-none">{prefix}</span>
        <span className={`
          text-[10px] font-mono w-4 text-center
          ${node.isDir ? 'text-violet-500' : 'text-zinc-600'}
        `}>
          {icon}
        </span>
        <span className={`
          text-xs font-mono
          ${node.isDir ? 'text-violet-400' : 'text-zinc-300'}
        `}>
          {node.name}
        </span>
        {node.lineCount !== undefined && (
          <span className="text-[10px] font-mono text-zinc-600 ml-1">
            {node.lineCount}L
          </span>
        )}
        {isFile && (
          <span className="text-[10px] font-mono text-zinc-700 ml-auto select-none">
            {isLoading ? '...' : isExpanded ? '\u25BE' : '\u25B8'}
          </span>
        )}
      </div>

      {/* Expanded file content */}
      {isExpanded && (
        <div className="ml-6 mt-0.5 mb-1">
          {isLoading ? (
            <div className="text-[10px] font-mono text-zinc-600 py-1 px-2">
              Loading...
            </div>
          ) : cached?.status === 'error' ? (
            <div className="text-[10px] font-mono text-red-400/70 py-1 px-2 border border-red-900/30 rounded bg-red-950/20">
              {cached.content}
            </div>
          ) : cached?.status === 'loaded' ? (
            <pre className="
              text-[10px] font-mono leading-relaxed text-zinc-400
              bg-zinc-950 border border-zinc-800 rounded
              px-2 py-1.5 overflow-x-auto max-h-60
              whitespace-pre-wrap break-words
            ">
              {cached.content}
            </pre>
          ) : null}
        </div>
      )}

      {node.children.length > 0 && (
        <div className="ml-3">
          {sortNodes(node.children).map((child, i, arr) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              isLast={i === arr.length - 1}
              expandedFiles={expandedFiles}
              loadingFiles={loadingFiles}
              contentCache={contentCache}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── FileTree Component ─────────────────────────────────────────────────────

export function FileTree({ files, isVisible, workspaceId }: Props) {
  const tree = useMemo(() => sortNodes(buildTree(files)), [files]);

  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());
  const [contentCache, setContentCache] = useState<FileContentCache>({});

  const handleFileClick = useCallback(async (filePath: string) => {
    // Toggle: if already expanded, collapse
    if (expandedFiles.has(filePath)) {
      setExpandedFiles(prev => {
        const next = new Set(prev);
        next.delete(filePath);
        return next;
      });
      return;
    }

    // Expand the file
    setExpandedFiles(prev => new Set(prev).add(filePath));

    // If already cached, no need to fetch
    if (contentCache[filePath]) return;

    // If no workspace, show error
    if (!workspaceId) {
      setContentCache(prev => ({
        ...prev,
        [filePath]: { content: 'No workspace available', status: 'error' },
      }));
      return;
    }

    // Fetch content from server
    setLoadingFiles(prev => new Set(prev).add(filePath));

    try {
      const response = await fetch('/api/tools/read-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, path: filePath }),
      });

      const data = await response.json();

      if (data.error) {
        setContentCache(prev => ({
          ...prev,
          [filePath]: { content: `Error: ${data.error}`, status: 'error' },
        }));
      } else {
        setContentCache(prev => ({
          ...prev,
          [filePath]: { content: data.result ?? '', status: 'loaded' },
        }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to read file';
      setContentCache(prev => ({
        ...prev,
        [filePath]: { content: `Error: ${message}`, status: 'error' },
      }));
    } finally {
      setLoadingFiles(prev => {
        const next = new Set(prev);
        next.delete(filePath);
        return next;
      });
    }
  }, [expandedFiles, contentCache, workspaceId]);

  if (!isVisible || files.length === 0) return null;

  return (
    <div className="border border-zinc-800 rounded-lg bg-zinc-950 px-3 py-2 mt-1 mb-1">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
          Generated Files
        </span>
        <span className="text-[10px] font-mono text-violet-500">
          {files.length}
        </span>
        {expandedFiles.size > 0 && (
          <button
            onClick={() => setExpandedFiles(new Set())}
            className="text-[10px] font-mono text-zinc-600 hover:text-zinc-400 ml-auto transition-colors"
          >
            Collapse all
          </button>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto">
        {tree.map((node, i) => (
          <TreeNodeItem
            key={node.path}
            node={node}
            isLast={i === tree.length - 1}
            expandedFiles={expandedFiles}
            loadingFiles={loadingFiles}
            contentCache={contentCache}
            onFileClick={handleFileClick}
          />
        ))}
      </div>
    </div>
  );
}
