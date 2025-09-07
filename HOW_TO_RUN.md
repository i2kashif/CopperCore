# CopperCore ERP - How to Run

This guide explains how to run CopperCore ERP locally to see the UI-1 Authentication System implementation.

## 📋 Prerequisites

- Node.js 18+ and pnpm
- Git

## 🚀 Quick Start

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd CopperCore
pnpm install
```

### 2. Start Development Server
```bash
# From project root
cd apps/web
pnpm dev
```

The application will be available at: **http://localhost:3000**

## 🔐 Authentication System (UI-1) - Current Implementation

### What's Been Implemented

**✅ Core Authentication Components:**
- `AuthProvider` - Context provider with Supabase Auth integration
- `LoginForm` - Email/password login with loading states
- `FactorySelector` - Multi-factory selection after authentication  
- `RouteGuard` - Role-based access control for protected routes
- `Dashboard` - Basic authenticated user dashboard

**✅ Authentication Features:**
- Email/password authentication via Supabase
- Factory-scoped user access (CEO/Director global, others factory-specific)
- Role-based permissions (CEO, Director, Factory Manager, Factory Worker, Office)
- Factory selection for multi-factory users
- Session management and logout
- Loading states and error handling

**✅ File Structure (Following CLAUDE.md §13 modularity):**
```
apps/web/src/features/auth/
├── components/
│   ├── LoginForm.tsx (~123 lines)
│   ├── FactorySelector.tsx (~95 lines)
│   ├── RouteGuard.tsx (~85 lines)
│   └── LoadingSpinner.tsx (~12 lines)
├── hooks/
│   └── useAuth.ts (~65 lines)
├── providers/
│   └── AuthProvider.tsx (~235 lines)
├── types/
│   └── auth.ts (~85 lines)
└── index.ts (exports)
```

### Current Status

**🟨 In Development:**
- Branch: `feat/ui-1-authentication-system`
- Authentication flow complete (login → factory selection → dashboard)
- Role-based permissions implemented
- Factory scoping logic ready

**⚠️ Database Requirements:**
The authentication system expects these Supabase tables (from database schema):
- `users` (id, email, role, created_at, last_login_at, current_factory_id)
- `factories` (id, name, code, location, is_active, created_at)  
- `user_factory_assignments` (user_id, factory_id, created_at)

## 🧪 Testing the Authentication Flow

### Default Configuration
The app uses local Supabase development settings:
```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<development-key>
```

### Authentication Flow
1. **Login Screen**: Enter email/password 
2. **Factory Selection**: Choose factory (if user has multiple)
3. **Dashboard**: Basic authenticated view with user info
4. **Logout**: Sign out functionality

### Role-Based Access
- **CEO/Director**: Global access, no factory selection required
- **Factory Manager/Worker**: Factory-scoped, must select factory
- **Office**: Configurable factory access

## 🔧 Development Details

### Environment Setup
```bash
# Web application (React + Vite)
cd apps/web
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
pnpm dev
```

### Project Architecture
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Authentication**: Supabase Auth with JWT tokens
- **State Management**: React Context + useReducer
- **Routing**: React Router v6 with protected routes
- **UI**: Tailwind CSS with responsive design

### Key Features Implemented
1. **Session Persistence**: Authentication state persists across browser sessions
2. **Factory Context**: Multi-factory users can switch between assigned factories  
3. **Permission System**: Role-based UI rendering and API access control
4. **Error Handling**: Comprehensive error states for auth failures
5. **Loading States**: Proper loading indicators during auth operations

## 📝 PRD Compliance

This implementation follows **PRD v1.5 Section 2 (Users, Roles & Factory Scoping)**:

- ✅ Role definitions (CEO, Director, Factory Manager, Factory Worker, Office)
- ✅ Factory linkage via assigned_factories[]
- ✅ Global vs factory-scoped access control  
- ✅ Authentication via Supabase Auth (PRD §10)

## 🎯 Next Steps

**Coming Next (UI-2)**: CEO Manage Company Dashboard
- Factory CRUD operations
- User management interface  
- Factory assignment matrix
- Bulk operations support

## 🐛 Troubleshooting

**Common Issues:**

1. **"Module not found" errors**: Run `pnpm install` from project root
2. **Supabase connection errors**: Check `.env.local` configuration
3. **TypeScript errors**: Ensure all dependencies are installed
4. **Port 3000 in use**: Server will automatically use next available port

**Development Commands:**
```bash
# Lint and type checking
pnpm -w lint
pnpm -w typecheck

# Run tests (when available)  
pnpm -w test

# Build production
pnpm -w build
```

## 📊 Implementation Metrics

**Code Statistics:**
- **Total Implementation**: ~700 lines across authentication system
- **Component Count**: 7 main components + hooks + types
- **File Compliance**: All files under 500 LOC limit (CLAUDE.md §13)
- **Test Coverage**: Unit tests pending (next phase)

**Performance:**
- Fast development server startup (< 5 seconds)
- Instant hot reload for development
- Optimized production builds with Vite

---

*This implementation represents the foundation for all CopperCore ERP features, providing secure authentication and factory-scoped access control as specified in the PRD.*