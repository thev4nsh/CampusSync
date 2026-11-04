import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownSummary({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="mb-3 mt-6 text-xl font-bold text-slate-900">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 mt-5 text-lg font-bold text-slate-900">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold text-slate-900">{children}</h3>,
        p: ({ children }) => <p className="my-3">{children}</p>,
        ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-6">{children}</ul>,
        ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-6">{children}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
        hr: () => <hr className="my-5 border-violet-200" />,
        blockquote: ({ children }) => <blockquote className="my-4 border-l-2 border-violet-300 pl-4 text-slate-600">{children}</blockquote>,
        table: ({ children }) => <div className="my-4 overflow-x-auto"><table className="w-full border-collapse text-left">{children}</table></div>,
        th: ({ children }) => <th className="border border-slate-200 bg-violet-50 px-3 py-2 font-semibold text-slate-900">{children}</th>,
        td: ({ children }) => <td className="border border-slate-200 px-3 py-2 align-top">{children}</td>,
        code: ({ children }) => <code className="rounded bg-violet-100 px-1.5 py-0.5 text-[0.92em] text-violet-900">{children}</code>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
