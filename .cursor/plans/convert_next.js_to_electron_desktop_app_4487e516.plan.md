---
name: Convert Next.js to Electron Desktop App
overview: Convert the JobHuntersToolbox Next.js SaaS application into a standalone Electron desktop app with SQLite database, removing authentication, payment system, and supporting Windows, macOS, and Linux platforms.
todos:
  - id: setup-electron
    content: Set up Electron project structure with main process, preload script, and basic window configuration
    status: completed
  - id: migrate-database
    content: Update Prisma schema to use SQLite, remove Subscription model, and configure database path for Electron
    status: completed
  - id: create-ipc-handlers
    content: Create Electron IPC handlers to replace Next.js API routes, handle all endpoints (no auth, no Stripe)
    status: completed
    dependencies:
      - migrate-database
  - id: setup-react-router
    content: Set up React Router and convert Next.js pages to React Router pages
    status: completed
    dependencies:
      - setup-electron
  - id: migrate-components
    content: Update all React components to remove Next.js dependencies and use React Router
    status: completed
    dependencies:
      - setup-react-router
  - id: settings-config
    content: Create settings page and configuration management for OpenAI API key (users supply their own key)
    status: completed
    dependencies:
      - setup-electron
  - id: remove-payments
    content: Remove all Stripe integration, payment pages, and subscription checks
    status: completed
    dependencies:
      - migrate-components
  - id: setup-build
    content: Configure electron-builder for Windows, macOS, and Linux builds
    status: completed
    dependencies:
      - setup-electron
  - id: test-features
    content: Test all features (resume generation, cover letters, interview prep, exports) in Electron
    status: completed
    dependencies:
      - remove-payments
---

# Convert JobHuntersToolbox to Electron Desktop App

## Overview

Transform the Next.js web application into a cross-platform Electron desktop application. The app will run locally with SQLite database, no payment system, and support Windows, macOS, and Linux.

## Architecture Changes

### Current Stack → New Stack

- **Framework**: Next.js 15 → Electron + React (Vite)
- **Database**: PostgreSQL → SQLite (via Prisma)
- **API**: Next.js API Routes → Electron IPC handlers
- **Auth**: NextAuth.js → Removed (no authentication needed for desktop app)
- **Payments**: Stripe → Removed
- **Routing**: Next.js App Router → React Router
- **Build**: Next.js build → Electron Builder

## Implementation Plan

### 1. Project Structure Setup

Create new Electron project structure in `/Volumes/LaCie/webapps/jht` following [Electron project structure](https://www.electronjs.org/docs/latest/tutorial/tutorial):

```javascript
jht/
├── electron/              # Electron main process
│   ├── main.ts           # Main Electron process (uses app, BrowserWindow)
│   ├── preload.ts        # Preload script (uses contextBridge)
│   └── server.ts         # Express API server (optional - see section 3)
├── src/                   # React frontend (from Next.js)
│   ├── components/       # React components (migrated)
│   ├── pages/           # Page components (converted from Next.js pages)
│   ├── lib/             # Utilities (adapted for Electron)
│   ├── hooks/           # React hooks
│   ├── router.tsx       # React Router setup
│   └── App.tsx          # Main React component
├── prisma/              # Database schema (SQLite)
├── public/              # Static assets
├── index.html           # HTML entry point (loads React app via Vite)
├── package.json         # Dependencies and scripts
└── electron-builder.yml # Build configuration
```

**Note**: Following Electron's recommended structure with separate main process, preload script, and renderer (React) code. The `index.html` file will be the entry point that loads the React app, as shown in [Electron's quick start guide](https://www.electronjs.org/docs/latest/).

### 2. Database Migration

- Update [prisma/schema.prisma](prisma/schema.prisma) to use SQLite:
- Change `provider = "postgresql"` → `provider = "sqlite"`
- Update connection string to use local SQLite file
- Remove User model (no authentication needed)
- Remove Subscription model (no payments)
- Simplify Profile model: Remove `userId` foreign key (single-user app)
- Simplify all models: Remove `userId` foreign keys from Resume, CoverLetter, InterviewPrep, SkillsHighlight
- Update relationships: Profile → Resumes (one-to-many, no user relationship)
- Keep models: Profile, Resume, CoverLetter, InterviewPrep, SkillsHighlight (all single-user)
- Create migration scripts for data initialization

### 3. Backend API Implementation

**Recommended Approach**: Use Electron IPC directly (simpler, more secure, follows [Electron best practices](https://www.electronjs.org/docs/latest/tutorial/ipc))Create API handlers in [electron/main.ts](electron/main.ts) using `ipcMain.handle()`:

- Expose API methods via [electron/preload.ts](electron/preload.ts) using `contextBridge.exposeInMainWorld()`
- Call from renderer using `window.electronAPI.methodName()` (exposed via preload)
- Convert all `/api/*` routes to IPC handlers:
- `/api/profile` → `ipcMain.handle('profile:get')`, `ipcMain.handle('profile:update')`
- `/api/resume/*` → `ipcMain.handle('resume:generate')`, `ipcMain.handle('resume:list')`, etc.
- `/api/cover-letter/*` → `ipcMain.handle('coverLetter:generate')`
- `/api/interview-prep/*` → `ipcMain.handle('interviewPrep:generate')`
- `/api/skills-highlight/*` → `ipcMain.handle('skillsHighlight:analyze')`
- Remove `/api/auth/*` routes (no authentication)
- Remove `/api/stripe/*` routes (no payments)
- Handle file operations (Word/PDF exports) using Electron's `dialog` API in main process

**Alternative Approach** (if preferred): Express server running on localhost

- Create [electron/server.ts](electron/server.ts) with Express
- Start server in main process, communicate port to renderer via IPC
- Renderer makes HTTP requests to local Express server
- Less recommended but acceptable if team prefers HTTP API pattern

### 4. Settings & Configuration Management

Create settings system for OpenAI API key (users will supply their own key):

- Create [src/pages/Settings.tsx](src/pages/Settings.tsx) - Settings page with API key input field
- Create [electron/config.ts](electron/config.ts) - Configuration management using Electron's `safeStorage` API
- Store OpenAI API key securely using `safeStorage.encryptString()` / `safeStorage.decryptString()`
- Expose config methods via preload script: `window.electronAPI.getOpenAIKey()`, `window.electronAPI.setOpenAIKey()`
- Validate API key format and optionally test connection when saved
- Show clear error messages if API key is missing when trying to use AI features
- Add Settings link to dashboard navigation

### 5. Frontend Migration

Convert Next.js App Router to React Router:

- [src/app/page.tsx](src/app/page.tsx) → [src/pages/Dashboard.tsx](src/pages/Dashboard.tsx) (landing page goes directly to dashboard)
- Remove login/register pages (no authentication needed)
- [src/app/(dashboard)/dashboard/page.tsx](src/app/\\(dashboard)/dashboard/page.tsx) → [src/pages/Dashboard.tsx](src/pages/Dashboard.tsx)
- Convert all dashboard pages similarly
- Update imports to use React Router's `useNavigate` instead of Next.js `Link`
- Remove Next.js specific features (metadata, server components)
- Remove authentication checks and redirects (app starts directly at dashboard)

### 6. Component Updates

- Update all components to remove Next.js dependencies:
- Replace `next/link` with React Router's `Link`
- Replace `next/image` with standard `img` tags
- Update API calls to use IPC or fetch to local Express server
- Remove server-side rendering logic

### 7. Electron Main Process

Create [electron/main.ts](electron/main.ts) following [Electron documentation](https://www.electronjs.org/docs/latest/):

- Use `app.whenReady()` to initialize Electron app (per Electron best practices)
- Create BrowserWindow with proper security settings:
- `contextIsolation: true` (required for security)
- `nodeIntegration: false` (security best practice)
- `preload: path.join(__dirname, 'preload.js')` (bridge to main process)
- Handle app lifecycle:
- `app.on('window-all-closed')` - Quit on Windows/Linux when all windows closed
- `app.on('activate')` - Recreate window on macOS when dock icon clicked
- Set up IPC handlers using `ipcMain` for API communication
- Manage SQLite database file location using `app.getPath('userData')`
- Handle file system operations (exports) using Electron's `dialog` API
- Follow Electron's process model: main process handles Node.js APIs, renderer runs React

### 8. Preload Script

Create [electron/preload.ts](electron/preload.ts) following [Electron security best practices](https://www.electronjs.org/docs/latest/tutorial/security):

- Use `contextBridge.exposeInMainWorld()` to safely expose APIs to renderer
- Expose only necessary IPC methods (no direct Node.js access)
- Bridge between renderer and main process using `ipcRenderer.invoke()` and `ipcRenderer.on()`
- Security requirements:
- Context isolation enabled (set in main process)
- Node integration disabled in renderer
- No direct `require()` or `process` access from renderer
- Use Content Security Policy (CSP) in HTML

### 9. Environment Configuration & OpenAI API Key

- **OpenAI API Key Management**:
- Create settings/preferences page in the app for users to enter their OpenAI API key
- Store API key securely using Electron's `safeStorage` API or encrypted local storage
- Validate API key when entered (optional: test connection)
- Show clear UI indicator if API key is missing or invalid
- API key will be supplied by users through the app's settings interface
- **Database Configuration**:
- Database path auto-configured using `app.getPath('userData')`
- No manual configuration needed
- **Remove**:
- Stripe environment variables
- NextAuth environment variables
- `.env` file approach (use app settings instead)

### 10. Build Configuration

- Set up [electron-builder.yml](electron-builder.yml):
- Configure for Windows, macOS, and Linux
- Set app icons and metadata
- Configure auto-updater (optional)
- Set up code signing (optional)
- Update [package.json](package.json) scripts:
- `dev`: Start Electron in development
- `build`: Build React app and Electron
- `package`: Create distributables
- `dist`: Build for all platforms

### 11. File Export Handling

- Update resume export functionality:
- Word export: Use `docx` library (already in dependencies)
- PDF export: Use `jspdf` and `html2canvas` (already in dependencies)
- Save files using Electron's dialog API
- Handle file permissions properly

### 12. Remove Authentication & Payment Features

- Remove authentication:
- Remove login/register pages
- Remove auth API routes (`/api/auth/*`)
- Remove auth middleware and session checks
- Remove NextAuth dependencies
- Remove User model from database schema
- Remove all `userId` foreign keys from models
- Remove payment features:
- Remove Stripe integration
- Remove pricing page
- Remove subscription checks
- Remove payment-related UI components

### 13. Testing & Validation

- Test all features in Electron environment:
- Resume generation
- Cover letter generation
- Interview prep
- Skills highlighting
- File exports
- Database operations
- Settings/OpenAI API key configuration

## Key Files to Create/Modify

### New Files

- `electron/main.ts` - Main Electron process (uses `app`, `BrowserWindow`, `ipcMain` per [Electron docs](https://www.electronjs.org/docs/latest/))
- `electron/preload.ts` - Preload script (uses `contextBridge` per [security best practices](https://www.electronjs.org/docs/latest/tutorial/security))
- `electron/server.ts` - Express API server (optional, if using HTTP approach instead of IPC)
- `electron/config.ts` - Configuration management (API key storage, settings)
- `index.html` - HTML entry point (loads React app, includes CSP)
- `src/router.tsx` - React Router configuration
- `src/pages/*.tsx` - Page components (converted from Next.js)
- `src/pages/Settings.tsx` - Settings page for OpenAI API key configuration
- `vite.config.ts` - Vite configuration for React
- `electron-builder.yml` - Build configuration

### Modified Files

- `prisma/schema.prisma` - Change to SQLite, remove User and Subscription models, remove userId foreign keys
- `package.json` - Update dependencies and scripts
- All components in `src/components/` - Remove Next.js dependencies
- `src/lib/prisma.ts` - Update for Electron environment
- `src/lib/openai.ts` - Keep as-is (already compatible)

## Dependencies

### Add

- `electron` - Electron framework ([official package](https://www.electronjs.org/docs/latest/))
- `electron-builder` - Build and package for distribution
- `express` - API server (optional, if using HTTP approach instead of IPC)
- `jsonwebtoken` - JWT authentication
- `react-router-dom` - Client-side routing
- `vite` - Build tool for React
- `@vitejs/plugin-react` - Vite React plugin
- `@types/node` - TypeScript types for Node.js (already in devDependencies)

### Remove

- `next` - Replaced by Electron
- `next-auth` - No authentication needed
- `stripe` - Payments removed
- `bcryptjs` - No password hashing needed

### Keep

- `react`, `react-dom` - UI framework
- `@prisma/client`, `prisma` - Database (SQLite)
- `openai` - AI features
- `docx`, `jspdf`, `html2canvas` - File exports
- `tailwindcss` - Styling
- `zod` - Validation

## Migration Strategy

1. **Phase 1**: Set up Electron skeleton with React
2. **Phase 2**: Migrate database to SQLite (remove User model, simplify to single-user)
3. **Phase 3**: Convert API routes to Electron IPC handlers
4. **Phase 4**: Migrate frontend pages and components (remove auth pages)
5. **Phase 5**: Remove authentication and payment systems
6. **Phase 6**: Test and package

## Electron Best Practices (from [official docs](https://www.electronjs.org/docs/latest/))

### Security

- **Context Isolation**: Always enabled (`contextIsolation: true`)
- **Node Integration**: Disabled in renderer (`nodeIntegration: false`)
- **Preload Scripts**: Use `contextBridge` to expose safe APIs
- **Content Security Policy**: Implement CSP headers in HTML
- **Remote Module**: Avoid using `remote` module (deprecated)

### Process Architecture

- **Main Process**: Handles app lifecycle, window management, Node.js APIs
- **Renderer Process**: Runs React app, communicates via IPC
- **IPC Communication**: Use `ipcMain.handle()` and `ipcRenderer.invoke()` for request-response pattern
- **Preload Script**: Runs in isolated context, bridges main and renderer

### Window Management

- Use `app.whenReady()` before creating windows
- Handle platform-specific behavior (macOS dock, Windows/Linux window close)
- Use `BrowserWindow` options for proper window configuration

### File System

- Use `app.getPath()` for standard directories (userData, documents, etc.)
- Use `dialog.showSaveDialog()` for file save operations
- Handle file permissions properly

## Considerations

- **Data Migration**: Users will need to start fresh (no data migration from web app)
- **OpenAI API**: Users will supply their OpenAI API key through the app's settings/preferences interface (stored securely using Electron's secure storage)
- **File Storage**: All data stored locally in user's app data directory using `app.getPath('userData')`
- **Updates**: Can implement auto-updater using `electron-updater` (optional)
- **Security**: Follow Electron security checklist from [official documentation](https://www.electronjs.org/docs/latest/tutorial/security)