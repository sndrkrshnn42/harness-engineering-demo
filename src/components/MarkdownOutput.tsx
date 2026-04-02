import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';

interface Props {
  content: string;
}

/**
 * Custom style overrides for SyntaxHighlighter to blend with our zinc-950 theme.
 * vscDarkPlus uses #1e1e1e background — we override to match our bg-zinc-950.
 */
const codeThemeOverrides: Record<string, React.CSSProperties> = {
  ...vscDarkPlus,
  'pre[class*="language-"]': {
    ...(vscDarkPlus['pre[class*="language-"]'] as React.CSSProperties | undefined),
    background: 'rgb(9 9 11)', // zinc-950
    margin: 0,
    padding: '0.5rem 0.75rem',
    fontSize: '0.7rem',
    lineHeight: '1.5',
    borderRadius: '0.375rem',
  },
  'code[class*="language-"]': {
    ...(vscDarkPlus['code[class*="language-"]'] as React.CSSProperties | undefined),
    background: 'transparent',
    fontSize: '0.7rem',
    lineHeight: '1.5',
  },
};

/**
 * Language alias map for common fenced code block labels.
 */
function resolveLanguage(lang: string | undefined): string {
  if (!lang) return 'text';
  const lower = lang.toLowerCase();
  const aliases: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    py: 'python',
    yml: 'yaml',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    prisma: 'graphql', // closest syntax match
  };
  return aliases[lower] ?? lower;
}

/**
 * Custom renderers for react-markdown, styled to match our dark terminal theme.
 */
const markdownComponents: Components = {

  // ─── Code blocks (fenced) and inline code ──────────────────────────────
  code({ className, children, ...rest }) {
    const match = /language-(\w+)/.exec(className || '');
    const isBlock = String(children).includes('\n') || match;

    if (isBlock) {
      return (
        <SyntaxHighlighter
          style={codeThemeOverrides}
          language={resolveLanguage(match?.[1])}
          PreTag="div"
          wrapLongLines
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      );
    }

    // Inline code
    return (
      <code
        className="bg-zinc-800 text-violet-300 px-1 py-0.5 rounded text-[0.7rem] font-mono"
        {...rest}
      >
        {children}
      </code>
    );
  },

  // ─── Headings ──────────────────────────────────────────────────────────
  h1({ children }) {
    return (
      <h1 className="text-sm font-bold text-white mt-3 mb-1.5 border-b border-zinc-800 pb-1">
        {children}
      </h1>
    );
  },
  h2({ children }) {
    return (
      <h2 className="text-xs font-bold text-white mt-3 mb-1 border-b border-zinc-800 pb-0.5">
        {children}
      </h2>
    );
  },
  h3({ children }) {
    return (
      <h3 className="text-xs font-bold text-zinc-200 mt-2 mb-1">
        {children}
      </h3>
    );
  },
  h4({ children }) {
    return (
      <h4 className="text-xs font-semibold text-zinc-300 mt-1.5 mb-0.5">
        {children}
      </h4>
    );
  },

  // ─── Paragraphs ────────────────────────────────────────────────────────
  p({ children }) {
    return (
      <p className="text-xs text-zinc-300 leading-relaxed my-1">
        {children}
      </p>
    );
  },

  // ─── Lists ─────────────────────────────────────────────────────────────
  ul({ children }) {
    return <ul className="text-xs text-zinc-300 list-disc pl-4 my-1 space-y-0.5">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="text-xs text-zinc-300 list-decimal pl-4 my-1 space-y-0.5">{children}</ol>;
  },
  li({ children }) {
    return <li className="text-xs text-zinc-300 leading-relaxed">{children}</li>;
  },

  // ─── Tables ────────────────────────────────────────────────────────────
  table({ children }) {
    return (
      <div className="overflow-x-auto my-2">
        <table className="text-[10px] font-mono border-collapse w-full">
          {children}
        </table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="border-b border-zinc-700">{children}</thead>;
  },
  tbody({ children }) {
    return <tbody>{children}</tbody>;
  },
  tr({ children }) {
    return <tr className="border-b border-zinc-800/50">{children}</tr>;
  },
  th({ children }) {
    return (
      <th className="text-left px-2 py-1 text-zinc-400 font-semibold whitespace-nowrap">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="px-2 py-1 text-zinc-300 whitespace-pre-wrap">
        {children}
      </td>
    );
  },

  // ─── Horizontal rule ──────────────────────────────────────────────────
  hr() {
    return <hr className="border-zinc-800 my-2" />;
  },

  // ─── Blockquote ────────────────────────────────────────────────────────
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-violet-500/40 pl-3 my-1.5 text-zinc-400 italic">
        {children}
      </blockquote>
    );
  },

  // ─── Strong / Emphasis ─────────────────────────────────────────────────
  strong({ children }) {
    return <strong className="text-white font-bold">{children}</strong>;
  },
  em({ children }) {
    return <em className="text-zinc-200 italic">{children}</em>;
  },

  // ─── Links ─────────────────────────────────────────────────────────────
  a({ children, href }) {
    return (
      <a
        href={href}
        className="text-violet-400 hover:text-violet-300 underline underline-offset-2"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  },

  // ─── Pre (wrapper for code blocks) ─────────────────────────────────────
  pre({ children }) {
    return (
      <div className="my-1.5 rounded-md overflow-hidden border border-zinc-800">
        {children}
      </div>
    );
  },
};

/**
 * Renders markdown content with syntax-highlighted code blocks.
 * Designed for streaming: re-renders efficiently as content appends.
 * Styled to match the application's dark zinc-950 terminal aesthetic.
 */
export function MarkdownOutput({ content }: Props) {
  return (
    <div className="markdown-output font-mono">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
