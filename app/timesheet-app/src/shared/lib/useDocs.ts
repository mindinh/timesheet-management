import { useMemo } from 'react'
import type { TreeNode } from '@/features/docs/components/DocsSidebar'

// Use Vite glob import to load all markdown files from the docs folder as raw strings
// Path from shared/lib/ -> ../../../../../docs/  (5 levels up to project root)
const markdownModules = import.meta.glob('../../../../../docs/**/*.md', {
    query: '?raw',
    import: 'default',
})

/**
 * Build a tree structure from flat glob paths.
 */
function buildTree(paths: string[]): TreeNode[] {
    const root: TreeNode[] = []

    for (const fullPath of paths) {
        const match = fullPath.match(/docs\/(.+)$/)
        if (!match) continue
        const relativePath = match[1]
        const parts = relativePath.split('/')

        let currentLevel = root
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i]
            const isFile = i === parts.length - 1

            if (isFile) {
                currentLevel.push({ name: part, path: fullPath })
            } else {
                let folder = currentLevel.find(
                    (node) => node.name === part && node.children
                )
                if (!folder) {
                    folder = { name: part, children: [] }
                    currentLevel.push(folder)
                }
                currentLevel = folder.children!
            }
        }
    }

    // Sort: folders first, then files, both alphabetically
    function sortTree(nodes: TreeNode[]) {
        nodes.sort((a, b) => {
            const aIsFolder = !!a.children
            const bIsFolder = !!b.children
            if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1
            return a.name.localeCompare(b.name)
        })
        for (const node of nodes) {
            if (node.children) sortTree(node.children)
        }
    }
    sortTree(root)

    return root
}

/**
 * Find the first leaf (file) path in the tree.
 */
function findFirstLeaf(nodes: TreeNode[]): string | null {
    for (const node of nodes) {
        if (node.path) return node.path
        if (node.children) {
            const found = findFirstLeaf(node.children)
            if (found) return found
        }
    }
    return null
}

/**
 * Hook that provides the docs tree structure and markdown loading functionality.
 */
export function useDocs() {
    const allPaths = useMemo(() => Object.keys(markdownModules), [])
    const tree = useMemo(() => buildTree(allPaths), [allPaths])
    const firstLeaf = useMemo(() => findFirstLeaf(tree), [tree])

    const loadContent = async (path: string): Promise<string> => {
        const loader = markdownModules[path]
        if (!loader) return `# Document not found\n\nThe file \`${path}\` could not be found.`
        return (await loader()) as string
    }

    return { tree, firstLeaf, loadContent }
}
