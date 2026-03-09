import { useState } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login, isLoggingIn, loginError } = useAuthStore();
  const { switchUser, fetchCurrentUser } = useTimesheetStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    await login(username.trim(), password.trim());
    // Sync timesheetStore with the newly logged in user
    const user = useAuthStore.getState().user;
    if (user) {
      switchUser(user.id);
      fetchCurrentUser();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <img src="/logo.jpg" alt="logo" className="w-16 h-16 rounded-xl shadow" />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Timesheet</h1>
            <p className="text-sm text-muted-foreground mt-1">Đăng nhập để tiếp tục</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="username">
                Tên đăng nhập
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="diana"
                autoComplete="username"
                autoFocus
                disabled={isLoggingIn}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="password">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                autoComplete="current-password"
                disabled={isLoggingIn}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 transition"
              />
            </div>

            {loginError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn || !username.trim() || !password.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoggingIn && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoggingIn ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>

        {/* Dev hint */}
        <p className="mt-4 text-center text-xs text-muted-foreground/70">
          Dev: diana · manager (Admin) · bob · charlie (TeamLead) · alice · nam · cuong (Employee) — password = username
        </p>
      </div>
    </div>
  );
}
