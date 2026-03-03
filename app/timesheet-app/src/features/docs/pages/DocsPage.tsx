import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen } from 'lucide-react'
import DocsViewer from '../components/DocsViewer'
import DocsSidebar from '../components/DocsSidebar'
import { useDocs } from '@/shared/lib/useDocs'

export default function DocsPage() {
    const { t } = useTranslation()
    const [searchParams, setSearchParams] = useSearchParams()
    const { tree, firstLeaf, loadContent } = useDocs()
    const [content, setContent] = useState<string>('')
    const [loading, setLoading] = useState(false)

    const filePath = searchParams.get('file') || firstLeaf

    // Load the markdown content when the file path changes
    useEffect(() => {
        if (!filePath) return

        let isMounted = true
        const fetchContent = async () => {
            setLoading(true)
            try {
                const text = await loadContent(filePath)
                if (isMounted) {
                    setContent(text)
                }
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        fetchContent()

        return () => {
            isMounted = false
        }
    }, [filePath, loadContent])

    const handleDocSelect = (path: string) => {
        setSearchParams({ file: path })
    }

    return (
        <div className="flex h-[calc(100%+48px)] -m-6 overflow-hidden">
            {/* In-page docs sidebar */}
            <div className="w-[230px] shrink-0 flex flex-col border-r border-border bg-card">
                {/* Header */}
                <div className="flex items-center gap-2.5 px-4 py-5.5 bg-primary">
                    <BookOpen className="h-4.5 w-4.5 text-primary-foreground" />
                    <h2 className="text-sm font-semibold text-primary-foreground">
                        {t('sidebar.documents', 'Documentation')}
                    </h2>
                </div>
                {/* Tree */}
                <div className="flex-1 overflow-y-auto">
                    <DocsSidebar
                        tree={tree}
                        activePath={filePath}
                        onSelect={handleDocSelect}
                    />
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12 bg-card text-card-foreground">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                ) : content ? (
                    <DocsViewer content={content} />
                ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                        <BookOpen className="h-12 w-12 mb-4 opacity-50" />
                        <p className="text-sm">Select a document from the sidebar to view it.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
