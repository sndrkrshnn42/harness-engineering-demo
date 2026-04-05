import { useMemo, useState, useCallback } from 'react';
import Accordion, { AccordionItem } from '@ingka/accordion';
import SSRIcon from '@ingka/ssr-icon';
import folderIcon from '@ingka/ssr-icon/paths/folder';
import documentIcon from '@ingka/ssr-icon/paths/document';
import codeIcon from '@ingka/ssr-icon/paths/chevron-left-slash-chevron-right';
import gearIcon from '@ingka/ssr-icon/paths/gear';
import Loading from '@ingka/loading';
import LoadingBall from '@ingka/loading/LoadingBall';
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

/** Pick the appropriate SSR icon paths function based on file extension */
function getFileIconPaths(name: string): (prefix?: string) => React.SVGProps<SVGElement>[] {
  const lower = name.toLowerCase();
  // Code files
  if (
    lower.endsWith('.ts') || lower.endsWith('.tsx') ||
    lower.endsWith('.js') || lower.endsWith('.jsx') ||
    lower.endsWith('.py') || lower.endsWith('.css') ||
    lower.endsWith('.scss') || lower.endsWith('.html') ||
    lower.endsWith('.sql') || lower.endsWith('.prisma')
  ) {
    return codeIcon;
  }
  // Config files
  if (
    lower.endsWith('.yaml') || lower.endsWith('.yml') ||
    lower.endsWith('.json') || lower.endsWith('.toml') ||
    lower.endsWith('.env') || lower.endsWith('.lock') ||
    lower.endsWith('.cfg') || lower.endsWith('.ini')
  ) {
    return gearIcon;
  }
  // Default: generic document
  return documentIcon;
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

/** Recursively count all descendant nodes (files + subdirs) */
function countDescendants(node: TreeNode): number {
  let count = node.children.length;
  for (const child of node.children) {
    if (child.isDir) {
      count += countDescendants(child);
    }
  }
  return count;
}

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  }).map(n => ({ ...n, children: sortNodes(n.children) }));
}

// --- File Content State ---

interface FileContentCache {
  [path: string]: {
    content: string;
    status: 'loaded' | 'error';
  };
}

// --- FileItem: a single file row with click-to-expand content ---

interface FileItemProps {
  node: TreeNode;
  expandedFiles: Set<string>;
  loadingFiles: Set<string>;
  contentCache: FileContentCache;
  onFileClick: (path: string) => void;
}

function FileItem({
  node, expandedFiles, loadingFiles, contentCache, onFileClick,
}: FileItemProps) {
  const isExpanded = expandedFiles.has(node.path);
  const isLoading = loadingFiles.has(node.path);
  const cached = contentCache[node.path];

  return (
    <div className="animate-fade-in">
      <div
        className="flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-skapa-neutral-2 rounded"
        onClick={() => onFileClick(node.path)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onFileClick(node.path);
          }
        }}
      >
        <SSRIcon paths={getFileIconPaths(node.name)} className="w-4 h-4 flex-shrink-0 text-skapa-text-3" />
        <span className="text-xs text-skapa-text-1">{node.name}</span>
        {node.lineCount !== undefined && (
          <span className="text-[10px] text-skapa-text-3 ml-1">{node.lineCount}L</span>
        )}
        <span className="text-[10px] text-skapa-text-4 ml-auto select-none">
          {isLoading ? '...' : isExpanded ? '\u25BE' : '\u25B8'}
        </span>
      </div>

      {/* Expanded file content */}
      {isExpanded && (
        <div className="ml-6 mt-0.5 mb-1">
          {isLoading ? (
            <Loading text="Loading file...">
              <LoadingBall size="small" color="secondary" />
            </Loading>
          ) : cached?.status === 'error' ? (
            <div className="text-[10px] py-1 px-2 border border-skapa-negative/30 rounded-skapa-s"
                 style={{ color: 'var(--skapa-negative)', backgroundColor: 'rgba(224, 7, 81, 0.05)' }}>
              {cached.content}
            </div>
          ) : cached?.status === 'loaded' ? (
            <pre className="
              text-[10px] font-mono leading-relaxed text-skapa-text-2
              bg-skapa-neutral-2 border border-skapa-neutral-3 rounded-skapa-s
              px-2 py-1.5 overflow-x-auto max-h-60
              whitespace-pre-wrap break-words
            ">
              {cached.content}
            </pre>
          ) : null}
        </div>
      )}
    </div>
  );
}

// --- DirNode: recursive directory rendering with Accordion ---

interface DirNodeProps {
  node: TreeNode;
  expandedFiles: Set<string>;
  loadingFiles: Set<string>;
  contentCache: FileContentCache;
  onFileClick: (path: string) => void;
}

function DirNode({
  node, expandedFiles, loadingFiles, contentCache, onFileClick,
}: DirNodeProps) {
  const sorted = useMemo(() => sortNodes(node.children), [node.children]);
  const dirs = sorted.filter(n => n.isDir);
  const files = sorted.filter(n => !n.isDir);

  const title = (
    <span className="flex items-center gap-2">
      <SSRIcon paths={folderIcon} className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--skapa-brand-blue)' }} />
      <span className="text-xs" style={{ color: 'var(--skapa-brand-blue)' }}>{node.name}</span>
      <span className="text-[10px] text-skapa-text-4">{countDescendants(node)}</span>
    </span>
  );

  return (
    <Accordion collapsible size="small">
      <AccordionItem
        id={`dir-${node.path}`}
        title={title}
        open
        subtle
      >
        <div style={{ paddingLeft: node.depth > 0 ? '1rem' : undefined }}>
        {/* Nested directories first */}
        {dirs.map(child => (
          <DirNode
            key={child.path}
            node={child}
            expandedFiles={expandedFiles}
            loadingFiles={loadingFiles}
            contentCache={contentCache}
            onFileClick={onFileClick}
          />
        ))}
        {/* Then files */}
        {files.map(child => (
          <FileItem
            key={child.path}
            node={child}
            expandedFiles={expandedFiles}
            loadingFiles={loadingFiles}
            contentCache={contentCache}
            onFileClick={onFileClick}
          />
        ))}
        </div>
      </AccordionItem>
    </Accordion>
  );
}

// --- FileTree Component ---

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

  // Separate top-level dirs and files
  const dirs = tree.filter(n => n.isDir);
  const topFiles = tree.filter(n => !n.isDir);

  return (
    <div className="border border-skapa-neutral-3 rounded-skapa-m bg-skapa-neutral-1 px-3 py-2">
      <div className="flex items-center gap-2 mb-1.5">
        <SSRIcon paths={folderIcon} className="w-4 h-4" style={{ color: 'var(--skapa-brand-blue)' }} />
        <span className="text-[10px] text-skapa-text-3 uppercase tracking-wider">
          Generated Files
        </span>
        <span className="text-[10px]" style={{ color: 'var(--skapa-brand-blue)' }}>
          {files.length}
        </span>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {/* Top-level directories */}
        {dirs.map(node => (
          <DirNode
            key={node.path}
            node={node}
            expandedFiles={expandedFiles}
            loadingFiles={loadingFiles}
            contentCache={contentCache}
            onFileClick={handleFileClick}
          />
        ))}
        {/* Top-level files (if any) */}
        {topFiles.map(node => (
          <FileItem
            key={node.path}
            node={node}
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
