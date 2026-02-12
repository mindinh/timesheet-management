export default function AdminDashboard() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground">Manage master data and review timesheets</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border bg-card p-6">
                    <h3 className="font-semibold">Total Projects</h3>
                    <p className="text-3xl font-bold">0</p>
                </div>
                <div className="rounded-lg border bg-card p-6">
                    <h3 className="font-semibold">Total Task Types</h3>
                    <p className="text-3xl font-bold">0</p>
                </div>
                <div className="rounded-lg border bg-card p-6">
                    <h3 className="font-semibold">Pending Approvals</h3>
                    <p className="text-3xl font-bold">0</p>
                </div>
            </div>
        </div>
    )
}
