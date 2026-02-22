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

        setLoading(true)
        loadContent(filePath).then((text) => {
            setContent(text)
            setLoading(false)
        })
    }, [filePath])

    const handleDocSelect = (path: string) => {
        setSearchParams({ file: path })
    }

    return (
        <div className="flex h-full -m-6">
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
            <div className="flex-1 overflow-y-auto p-6">
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
