# Timesheet App

A modern compiled timesheet management application built with React and Vite.

## 📚 Documentation

This project includes comprehensive documentation for developers:

- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - detailed explanations of architecture, patterns, and workflows
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - code snippets and common tasks
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm

### Installation
```bash
npm install
```

### Development
```bash
npm run dev    # Start dev server
```

### Build
```bash
npm run build  # Production build
```

### Linting
```bash
npm run lint   # Run ESLint
```

## 📁 Project Structure

```
src/
├── features/          # Feature modules (timesheet, admin, auth)
├── shared/            # Shared utilities, components, APIs
├── core/              # Core configuration
├── App.tsx            # Root component
└── main.tsx           # Entry point
```

Each feature module follows a consistent structure:
- `components/` - React components
- `pages/` - Route pages
- `store/` - Zustand state management

## 🛠 Technology Stack

- **React 19.2.0** - UI framework
- **Vite 7.3.1** - Build tool
- **Zustand 5.0.11** - State management
- **React Query 5.90.20** - Data fetching
- **TailwindCSS 4.1.18** - Styling
- **Radix UI** - Component primitives
- **React Hook Form 7.71.1** - Form handling
- **Zod 4.3.6** - Schema validation
- **React Router DOM 7.13.0** - Routing
- **Lucide React** - Icons
- **Date-fns** - Date manipulation

## 🎨 Key Features

### Timesheet Management
- Manage daily entries
- Track project hours

### Admin
- Project configuration
- User management

## 📦 Import Aliases

The project uses path aliases for cleaner imports:

```typescript
import { Button } from '@/shared/components/ui/button'
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore'
```

| Alias | Maps to |
|-------|---------|
| `@/features/*` | `./src/features/*` |
| `@/shared/*` | `./src/shared/*` |
| `@/core/*` | `./src/core/*` |

## 🏗 Development Workflow

1. **Create feature** in `src/features/<feature-name>/`
2. **Create store** for state management
3. **Build components** in `components/`
4. **Add routes** in `App.tsx`

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

## 📋 Code Style & Conventions

- **Components**: PascalCase (e.g., `DailyEntryList.tsx`)
- **Hooks**: `use<Name>.ts`
- **Stores**: `camelCase` (e.g., `timesheetStore.ts`)

## 📄 License

Private - Timesheet Management Project

---

**Version:** 0.0.0
**Last Updated:** February 2026
