import { User, LogOut } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

export default function Header() {
    return (
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold">Welcome, Alice</h2>
            </div>

            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                    <LogOut className="h-5 w-5" />
                </Button>
            </div>
        </header>
    )
}
