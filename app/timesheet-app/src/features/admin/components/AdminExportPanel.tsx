import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, Upload, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { triggerExportToExcel, runReport, clearDatabase } from '../api/admin-api';
import { getAllProjects } from '@/features/projects/api/project-api';
import { getPotentialApprovers } from '@/features/auth/api/auth-api';
import StatusDialog from '@/shared/components/common/StatusDialog';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';

export function AdminExportPanel({ onExportComplete }: { onExportComplete?: () => void }) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [month, setMonth] = useState<string>('');
  const [userId, setUserId] = useState<string>('all');
  const [projectId, setProjectId] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Data for dropdowns
  const [users, setUsers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  // Dialogs — same pattern as TimesheetPage / AdminBatchDetailPage
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    variant: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description?: string;
  }>({ open: false, variant: 'info', title: '' });

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    onConfirm: () => void;
    destructive?: boolean;
  }>({ open: false, title: '', onConfirm: () => {} });

  useEffect(() => {
    Promise.all([getPotentialApprovers().catch(() => []), getAllProjects().catch(() => [])]).then(
      ([usersData, projectsData]) => {
        setUsers(usersData);
        setProjects(projectsData);
      }
    );
  }, []);

  const handleExport = async () => {
    if (!year) {
      setStatusDialog({
        open: true,
        variant: 'warning',
        title: 'Year Required',
        description: 'Please enter a year before exporting.',
      });
      return;
    }

    setIsExporting(true);
    try {
      await triggerExportToExcel({
        year: parseInt(year),
        month: month ? parseInt(month) : undefined,
        userId: userId !== 'all' ? userId : null,
        projectId: projectId !== 'all' ? projectId : null,
        from: fromDate || null,
        to: toDate || null,
      });
      setStatusDialog({
        open: true,
        variant: 'success',
        title: 'Export Successful',
        description: 'The Excel file is downloading and history has been saved.',
      });
      if (onExportComplete) onExportComplete();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'An error occurred during export.';
      setStatusDialog({ open: true, variant: 'error', title: 'Export Failed', description: msg });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        try {
          const result = await runReport(base64Data);
          setStatusDialog({ open: true, variant: 'success', title: 'Import Successful', description: result });
          if (onExportComplete) onExportComplete();
        } catch (err: any) {
          setStatusDialog({
            open: true,
            variant: 'error',
            title: 'Import Failed',
            description: err.message || 'Unknown error',
          });
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      setStatusDialog({ open: true, variant: 'error', title: 'File Read Error', description: error.message });
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearDatabase = () => {
    setConfirmDialog({
      open: true,
      title: 'Clear All Database Data',
      description:
        'This will DELETE ALL DATA — Users, Projects, Tasks, Timesheets, Entries, Batches, and all history. This action cannot be undone.',
      destructive: true,
      onConfirm: async () => {
        setIsClearing(true);
        try {
          const result = await clearDatabase();
          setStatusDialog({ open: true, variant: 'success', title: 'Database Cleared', description: result });
          if (onExportComplete) onExportComplete();
        } catch (err: any) {
          setStatusDialog({
            open: true,
            variant: 'error',
            title: 'Clear Failed',
            description: err.message || 'Unknown error',
          });
        } finally {
          setIsClearing(false);
        }
      },
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-sap-informative" />
            Advanced Timesheet Export &amp; Import
          </CardTitle>
          <CardDescription>
            Export timesheet records across the entire organization with custom filters or import data to seed the
            database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Year & Month */}
            <div className="space-y-2">
              <Label>Year *</Label>
              <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2026" />
            </div>
            <div className="space-y-2">
              <Label>Month (Optional)</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Months</SelectItem>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Override */}
            <div className="space-y-2">
              <Label>Custom Start Date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Custom End Date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>

            {/* User & Project Filters */}
            <div className="space-y-2">
              <Label>Filter by User</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filter by Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/50 py-3 flex flex-wrap justify-between gap-2">
          <div className="flex gap-2">
            <input
              type="file"
              accept=".xlsx, .xls"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <Button variant="outline" onClick={handleImportClick} disabled={isImporting} className="gap-2">
              <Upload className="w-4 h-4" />
              {isImporting ? 'Importing...' : 'Import Data from Excel'}
            </Button>
            <Button
              variant="outline"
              onClick={handleClearDatabase}
              disabled={isClearing}
              className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              {isClearing ? 'Clearing...' : 'Clear Database'}
            </Button>
          </div>
          <Button onClick={handleExport} disabled={isExporting} className="gap-2">
            <Download className="w-4 h-4" />
            {isExporting ? 'Generating...' : 'Export to Excel'}
          </Button>
        </CardFooter>
      </Card>

      {/* Shared dialogs — same pattern as TimesheetPage */}
      <StatusDialog
        open={statusDialog.open}
        onOpenChange={(open) => setStatusDialog((prev) => ({ ...prev, open }))}
        variant={statusDialog.variant}
        title={statusDialog.title}
        description={statusDialog.description}
      />
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        destructive={confirmDialog.destructive}
      />
    </>
  );
}
