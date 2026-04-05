import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';

interface Props {
  content: string;
}

/**
 * Custom style overrides for SyntaxHighlighter to blend with Skapa neutral-2 theme.
 * Using `vs` (light) base theme to match Skapa's light design.
 */
const codeThemeOverrides: Record<string, React.CSSProperties> = {
  ...vs,
  'pre[class*="language-"]': {
    ...(vs['pre[class*="language-"]'] as React.CSSProperties | undefined),
    background: 'rgb(245 245 245)', // skapa-neutral-2
    margin: 0,
    padding: '0.5rem 0.75rem',
    fontSize: '0.7rem',
    lineHeight: '1.5',
    borderRadius: '0.375rem',
  },
  'code[class*="language-"]': {
    ...(vs['code[class*="language-"]'] as React.CSSProperties | undefined),
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
 * Custom renderers for react-markdown, styled with Skapa design tokens.
 */
const markdownComponents: Components = {

  // --- Code blocks (fenced) and inline code ---
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
        className="bg-skapa-neutral-2 px-1 py-0.5 rounded text-[0.7rem] font-mono"
        style={{ color: 'var(--skapa-brand-blue)' }}
        {...rest}
      >
        {children}
      </code>
    );
  },

  // --- Headings ---
  h1({ children }) {
    return (
      <h1 className="text-sm font-bold text-skapa-text-1 mt-3 mb-1.5 border-b border-skapa-neutral-3 pb-1">
        {children}
      </h1>
    );
  },
  h2({ children }) {
    return (
      <h2 className="text-xs font-bold text-skapa-text-1 mt-3 mb-1 border-b border-skapa-neutral-3 pb-0.5">
        {children}
      </h2>
    );
  },
  h3({ children }) {
    return (
      <h3 className="text-xs font-bold text-skapa-text-2 mt-2 mb-1">
        {children}
      </h3>
    );
  },
  h4({ children }) {
    return (
      <h4 className="text-xs font-semibold text-skapa-text-2 mt-1.5 mb-0.5">
        {children}
      </h4>
    );
  },

  // --- Paragraphs ---
  p({ children }) {
    return (
      <p className="text-xs text-skapa-text-2 leading-relaxed my-1">
        {children}
      </p>
    );
  },

  // --- Lists ---
  ul({ children }) {
    return <ul className="text-xs text-skapa-text-2 list-disc pl-4 my-1 space-y-0.5">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="text-xs text-skapa-text-2 list-decimal pl-4 my-1 space-y-0.5">{children}</ol>;
  },
  li({ children }) {
    return <li className="text-xs text-skapa-text-2 leading-relaxed">{children}</li>;
  },

  // --- Tables ---
  table({ children }) {
    return (
      <div className="overflow-x-auto my-2">
        <table className="text-[10px] border-collapse w-full">
          {children}
        </table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="border-b border-skapa-neutral-4">{children}</thead>;
  },
  tbody({ children }) {
    return <tbody>{children}</tbody>;
  },
  tr({ children }) {
    return <tr className="border-b border-skapa-neutral-3">{children}</tr>;
  },
  th({ children }) {
    return (
      <th className="text-left px-2 py-1 text-skapa-text-2 font-semibold whitespace-nowrap">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="px-2 py-1 text-skapa-text-2 whitespace-pre-wrap">
        {children}
      </td>
    );
  },

  // --- Horizontal rule ---
  hr() {
    return <hr className="border-skapa-neutral-3 my-2" />;
  },

  // --- Blockquote ---
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 pl-3 my-1.5 text-skapa-text-3 italic"
                   style={{ borderColor: 'var(--skapa-brand-blue)' }}>
        {children}
      </blockquote>
    );
  },

  // --- Strong / Emphasis ---
  strong({ children }) {
    return <strong className="text-skapa-text-1 font-bold">{children}</strong>;
  },
  em({ children }) {
    return <em className="text-skapa-text-2 italic">{children}</em>;
  },

  // --- Links ---
  a({ children, href }) {
    return (
      <a
        href={href}
        className="underline underline-offset-2"
        style={{ color: 'var(--skapa-brand-blue)' }}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  },

  // --- Pre (wrapper for code blocks) ---
  pre({ children }) {
    return (
      <div className="my-1.5 rounded-skapa-s overflow-hidden border border-skapa-neutral-3">
        {children}
      </div>
    );
  },
};

/**
 * Renders markdown content with syntax-highlighted code blocks.
 * Designed for streaming: re-renders efficiently as content appends.
 * Styled with Skapa design tokens for clean Scandinavian aesthetics.
 */
export function MarkdownOutput({ content }: Props) {
  return (
    <div className="markdown-output">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
