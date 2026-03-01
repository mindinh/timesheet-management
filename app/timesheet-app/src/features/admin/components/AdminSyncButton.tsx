import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { syncProjects } from '../api/admin-api'

export function AdminSyncButton() {
    const [isSyncing, setIsSyncing] = useState(false)

    const handleSync = async () => {
        setIsSyncing(true)
        try {
            const resultMsg = await syncProjects()
            alert(`Sync Complete:\n${resultMsg}`)
        } catch (error: any) {
            alert(`Sync Failed:\n${error.message || 'Failed to sync projects from Papierkram'}`)
        } finally {
            setIsSyncing(false)
        }
    }

    return (
        <Button
            variant="outline"
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2"
        >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing Papierkram...' : 'Sync Papierkram Projects'}
        </Button>
    )
}
