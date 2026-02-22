import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import mermaid from 'mermaid'
import { useEffect, useRef } from 'react'

interface DocsViewerProps {
    content: string
    title?: string
}

function MermaidChart({ chart }: { chart: string }) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: 'inherit',
        })

        if (ref.current) {
            // Reset the div content to the raw chart string so mermaid.run can process it
            ref.current.textContent = chart
            try {
                mermaid.run({ nodes: [ref.current] })
            } catch (err) {
                console.error("Mermaid parsing error", err)
            }
        }
    }, [chart])

    return (
        <div className="flex justify-center my-8 p-4 sm:p-8 bg-white dark:bg-slate-50 rounded-lg border border-border shadow-sm overflow-x-auto">
            <div ref={ref} className="mermaid min-w-max">{chart}</div>
        </div>
    )
}

export default function DocsViewer({ content, title }: DocsViewerProps) {
    return (
        <article className="prose prose-sm max-w-none">
            {title && (
                <div className="mb-6 pb-4 border-b border-border">
                    <h1 className="text-2xl font-bold text-foreground m-0">{title}</h1>
                </div>
            )}
            <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ children }) => (
                        <h1 className="text-2xl font-bold text-foreground mt-8 mb-4 pb-2 border-b border-border">
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-lg font-semibold text-foreground mt-5 mb-2">
                            {children}
                        </h3>
                    ),
                    h4: ({ children }) => (
                        <h4 className="text-base font-semibold text-foreground mt-4 mb-2">
                            {children}
                        </h4>
                    ),
                    p: ({ children }) => (
                        <p className="text-sm leading-relaxed text-foreground/90 mb-4">
                            {children}
                        </p>
                    ),
                    ul: ({ children }) => (
                        <ul className="list-disc list-inside space-y-1 mb-4 text-sm text-foreground/90">
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="list-decimal list-inside space-y-1 mb-4 text-sm text-foreground/90">
                            {children}
                        </ol>
                    ),
                    li: ({ children }) => (
                        <li className="text-sm leading-relaxed">{children}</li>
                    ),
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            className="text-primary hover:underline font-medium"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {children}
                        </a>
                    ),
                    code: ({ className, children, ...props }: any) => {
                        const isInline = !className
                        const match = /language-(\w+)/.exec(className || '')

                        if (!isInline && match && match[1] === 'mermaid') {
                            return <MermaidChart chart={String(children).replace(/\n$/, '')} />
                        }

                        return isInline ? (
                            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground" {...props}>
                                {children}
                            </code>
                        ) : (
                            <code className={`${className} text-xs`} {...props}>
                                {children}
                            </code>
                        )
                    },
                    pre: ({ children }) => (
                        <pre className="bg-muted rounded-lg p-4 overflow-x-auto mb-4 border border-border">
                            {children}
                        </pre>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-primary/40 pl-4 py-1 my-4 bg-primary/5 rounded-r-lg text-sm italic text-foreground/80">
                            {children}
                        </blockquote>
                    ),
                    table: ({ children }) => (
                        <div className="overflow-x-auto mb-4 rounded-lg border border-border">
                            <table className="w-full text-sm">{children}</table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead className="bg-muted/60">{children}</thead>
                    ),
                    th: ({ children }) => (
                        <th className="px-4 py-2 text-left font-semibold text-foreground border-b border-border">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="px-4 py-2 text-foreground/90 border-b border-border/50">
                            {children}
                        </td>
                    ),
                    hr: () => <hr className="my-6 border-border" />,
                    strong: ({ children }) => (
                        <strong className="font-semibold text-foreground">{children}</strong>
                    ),
                }}
            >
                {content}
            </Markdown>
        </article>
    )
}
