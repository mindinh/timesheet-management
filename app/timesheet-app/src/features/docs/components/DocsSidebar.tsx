import { useState } from 'react'
import { ChevronRight, ChevronDown, FileText } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

// A tree node can be either a folder or a file
interface TreeNode {
    name: string
    path?: string           // Only present for leaf files
    children?: TreeNode[]   // Only present for folders
}

interface DocsSidebarProps {
    tree: TreeNode[]
    activePath: string | null
    onSelect: (path: string) => void
}

/**
 * Build a display label from a file/folder name.
 * e.g., "01-architecture" -> "Architecture", "README.md" -> "README"
 */
function formatLabel(name: string): string {
    // Remove leading numbers and dash, e.g. "01-architecture" -> "architecture"
    let label = name.replace(/^\d+-/, '')
    // Remove .md extension
    label = label.replace(/\.md$/i, '')
    // Convert kebab-case/snake_case to Title Case
    label = label
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
    return label
}

/**
 * Check whether a tree node (or any of its descendants) contains the given path.
 */
function containsActivePath(node: TreeNode, activePath: string | null): boolean {
    if (!activePath) return false
    if (node.path === activePath) return true
    return !!node.children?.some((child) => containsActivePath(child, activePath))
}

function TreeItem({
    node,
    depth,
    activePath,
    onSelect,
}: {
    node: TreeNode
    depth: number
    activePath: string | null
    onSelect: (path: string) => void
}) {
    const isFolder = !!node.children
    const isActive = node.path === activePath
    const hasActive = containsActivePath(node, activePath)
    const [isOpen, setIsOpen] = useState(false) // All folders start collapsed

    if (isFolder) {
        return (
            <div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        'flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                        hasActive
                            ? 'text-primary hover:bg-primary/5'
                            : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground'
                    )}
                    style={{ paddingLeft: `${depth * 12 + 12}px` }}
                >
                    {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate">{formatLabel(node.name)}</span>
                </button>
                {isOpen && (
                    <div className="mt-0.5">
                        {node.children!.map((child) => (
                            <TreeItem
                                key={child.path || child.name}
                                node={child}
                                depth={depth + 1}
                                activePath={activePath}
                                onSelect={onSelect}
                            />
                        ))}
                    </div>
                )}
            </div>
        )
    }

    return (
        <button
            onClick={() => node.path && onSelect(node.path)}
            className={cn(
                'flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors',
                isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
            style={{ paddingLeft: `${depth * 12 + 12}px` }}
        >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{formatLabel(node.name)}</span>
        </button>
    )
}

export default function DocsSidebar({ tree, activePath, onSelect }: DocsSidebarProps) {
    return (
        <nav className="space-y-0.5 py-2">
            {tree.map((node) => (
                <TreeItem
                    key={node.path || node.name}
                    node={node}
                    depth={0}
                    activePath={activePath}
                    onSelect={onSelect}
                />
            ))}
        </nav>
    )
}

export type { TreeNode }
