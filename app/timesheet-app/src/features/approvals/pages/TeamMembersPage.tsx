import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { toast } from 'sonner'
import {
    getMyMembers,
    getUnassignedEmployees,
    assignMember,
    removeMember,
    createMember
} from '../api/teamlead-api'
import { Users, UserPlus, UserMinus, Plus } from 'lucide-react'
import type { User } from '@/shared/types'

export default function TeamMembersPage() {
    const queryClient = useQueryClient()
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newMember, setNewMember] = useState({ firstName: '', lastName: '', email: '' })
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { data: members = [], isLoading: loadingMembers } = useQuery({
        queryKey: ['my-members'],
        queryFn: getMyMembers,
    })

    const { data: unassigned = [], isLoading: loadingUnassigned } = useQuery({
        queryKey: ['unassigned-employees'],
        queryFn: getUnassignedEmployees,
    })

    const assignMutation = useMutation({
        mutationFn: assignMember,
        onSuccess: () => {
            toast.success('Member assigned successfully')
            queryClient.invalidateQueries({ queryKey: ['my-members'] })
            queryClient.invalidateQueries({ queryKey: ['unassigned-employees'] })
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.error?.message || err?.message || 'Failed to assign'
            toast.error(msg)
        }
    })

    const removeMutation = useMutation({
        mutationFn: removeMember,
        onSuccess: () => {
            toast.success('Member removed successfully')
            queryClient.invalidateQueries({ queryKey: ['my-members'] })
            queryClient.invalidateQueries({ queryKey: ['unassigned-employees'] })
        },
        onError: () => toast.error('Failed to remove member')
    })

    const createMutation = useMutation({
        mutationFn: (data: typeof newMember) => createMember(data.firstName, data.lastName, data.email),
        onSuccess: () => {
            toast.success('New employee created & assigned successfully')
            queryClient.invalidateQueries({ queryKey: ['my-members'] })
            setIsCreateOpen(false)
            setNewMember({ firstName: '', lastName: '', email: '' })
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.error?.message || err?.message || 'Failed to create employee'
            toast.error(msg)
        },
        onSettled: () => setIsSubmitting(false)
    })

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMember.firstName || !newMember.lastName || !newMember.email) {
            toast.error('Please fill all fields')
            return
        }
        setIsSubmitting(true)
        createMutation.mutate(newMember)
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Users className="h-6 w-6 text-indigo-600" />
                    Team Management
                </h1>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="h-4 w-4 mr-2" /> Add New Employee
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* My Team Panel */}
                <Card className="shadow-sm border-indigo-100">
                    <CardHeader className="bg-indigo-50/50 pb-4 border-b">
                        <CardTitle className="text-lg text-indigo-800 flex justify-between items-center">
                            <span>My Team</span>
                            <span className="bg-indigo-200 text-indigo-800 py-1 px-3 rounded-full text-xs font-semibold">
                                {members.length} Members
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loadingMembers ? (
                            <div className="p-8 text-center text-gray-500">Loading...</div>
                        ) : members.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 italic">No members in your team yet.</div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {members.map((u: User) => (
                                    <li key={u.id} className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors">
                                        <div>
                                            <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                                            <p className="text-sm text-gray-500">{u.email}</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                            disabled={removeMutation.isPending}
                                            onClick={() => {
                                                if (confirm(`Remove ${u.firstName} from your team?`)) {
                                                    removeMutation.mutate(String(u.id))
                                                }
                                            }}
                                        >
                                            <UserMinus className="h-4 w-4 mr-1" /> Remove
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* Unassigned Pool */}
                <Card className="shadow-sm">
                    <CardHeader className="bg-gray-50 pb-4 border-b">
                        <CardTitle className="text-lg text-gray-800 flex justify-between items-center">
                            <span>Unassigned Employees</span>
                            <span className="bg-gray-200 text-gray-800 py-1 px-3 rounded-full text-xs font-semibold">
                                {unassigned.length} Available
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loadingUnassigned ? (
                            <div className="p-8 text-center text-gray-500">Loading...</div>
                        ) : unassigned.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 italic">No unassigned employees available.</div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {unassigned.map((u: User) => (
                                    <li key={u.id} className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors">
                                        <div>
                                            <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                                            <p className="text-sm text-gray-500">{u.email}</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                                            disabled={assignMutation.isPending}
                                            onClick={() => assignMutation.mutate(String(u.id))}
                                        >
                                            <UserPlus className="h-4 w-4 mr-1" /> Assign to My Team
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Employee</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input
                                    id="firstName"
                                    value={newMember.firstName}
                                    onChange={(e) => setNewMember({ ...newMember, firstName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    id="lastName"
                                    value={newMember.lastName}
                                    onChange={(e) => setNewMember({ ...newMember, lastName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={newMember.email}
                                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                {isSubmitting ? 'Creating...' : 'Create & Assign'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
