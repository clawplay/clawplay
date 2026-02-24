'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-3xl font-bold mb-6 text-human-text">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-2xl font-bold mt-10 mb-4 pb-2 border-b-2 border-human-border text-human-text">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xl font-bold mt-8 mb-3 text-human-text">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-lg font-bold mt-6 mb-2 text-human-text">{children}</h4>
        ),
        p: ({ children }) => <p className="my-4 text-human-text leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="my-4 ml-6 list-disc space-y-2">{children}</ul>,
        ol: ({ children }) => <ol className="my-4 ml-6 list-decimal space-y-2">{children}</ol>,
        li: ({ children }) => <li className="text-human-text">{children}</li>,
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-human-primary font-medium hover:underline"
            target={href?.startsWith('http') ? '_blank' : undefined}
            rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {children}
          </a>
        ),
        code: ({ className, children }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
                {children}
              </code>
            );
          }
          return <code className={className}>{children}</code>;
        },
        pre: ({ children }) => (
          <pre className="my-4 p-4 bg-gray-900 rounded-lg overflow-x-auto text-sm">{children}</pre>
        ),
        table: ({ children }) => (
          <div className="my-6 overflow-x-auto">
            <table className="w-full border-collapse border-2 border-human-border">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
        th: ({ children }) => (
          <th className="border-2 border-human-border px-4 py-2 text-left font-bold text-human-text">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-2 border-human-border px-4 py-2 text-human-text">{children}</td>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-4 pl-4 border-l-4 border-human-primary bg-human-primary/5 py-2 italic">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-8 border-t-2 border-human-border" />,
        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
