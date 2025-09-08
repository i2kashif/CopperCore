# MCP Services Integration Guide

> **Purpose:** Comprehensive guide for using Model Context Protocol (MCP) services in CopperCore ERP development. This guide provides detailed usage instructions, examples, and best practices for all available MCP services.

---

## 🚀 Overview

CopperCore leverages multiple MCP servers to enhance development workflows. **ALL development MUST use these services where applicable** before falling back to manual methods.

### Available MCP Services
1. **Database Operations** — Supabase MCP
2. **Testing & Quality** — TestSprite MCP  
3. **IDE Integration** — VS Code Diagnostics & Jupyter
4. **UI/UX Development** — MagicUI MCP
5. **Memory & Context** — OpenMemory MCP
6. **Browser Automation** — Brave Browser Control
7. **File Operations** — Filesystem MCP
8. **Context Enhancement** — Context7

---

## 1. Database Operations (Supabase MCP)

### Core Functions

#### `mcp__supabase__list_tables`
Lists all tables in specified schemas.
```javascript
// Usage
mcp__supabase__list_tables({ schemas: ["public", "auth"] })

// When to use
- Before writing any database queries
- When exploring schema structure
- During migration planning
```

#### `mcp__supabase__execute_sql`
Executes raw SQL queries (non-DDL operations).
```sql
-- Usage
mcp__supabase__execute_sql({ 
  query: "SELECT * FROM factories WHERE active = true LIMIT 10" 
})

-- When to use
- Data exploration and validation
- Complex queries for debugging
- Performance testing queries
```

#### `mcp__supabase__apply_migration`
Applies DDL migrations to the database.
```sql
-- Usage
mcp__supabase__apply_migration({
  name: "add_audit_columns_to_work_orders",
  query: `
    ALTER TABLE work_orders 
    ADD COLUMN created_by UUID REFERENCES users(id),
    ADD COLUMN updated_by UUID REFERENCES users(id);
  `
})

-- When to use
- Schema changes and migrations
- Adding new tables, columns, indexes
- Creating RLS policies
```

#### `mcp__supabase__get_logs`
Retrieves service logs for debugging.
```javascript
// Usage
mcp__supabase__get_logs({ service: "postgres" })
mcp__supabase__get_logs({ service: "api" })
mcp__supabase__get_logs({ service: "auth" })

// When to use
- Debugging database connection issues
- Investigating query performance
- Troubleshooting authentication problems
```

#### `mcp__supabase__get_advisors`
Gets security and performance recommendations.
```javascript
// Usage
mcp__supabase__get_advisors({ type: "security" })
mcp__supabase__get_advisors({ type: "performance" })

// When to use
- After schema changes
- Regular security audits
- Performance optimization reviews
- **MANDATORY** after RLS policy changes
```

#### `mcp__supabase__generate_typescript_types`
Auto-generates TypeScript types from database schema.
```javascript
// Usage
mcp__supabase__generate_typescript_types()

// When to use
- After schema migrations
- Before frontend development
- Type safety validation
```

### Database Workflow Example
```javascript
// 1. Inspect current schema
await mcp__supabase__list_tables({ schemas: ["public"] })

// 2. Apply migration if needed
await mcp__supabase__apply_migration({
  name: "add_qc_status_to_batches",
  query: "ALTER TABLE batches ADD COLUMN qc_status VARCHAR(20) DEFAULT 'pending';"
})

// 3. Generate updated types
await mcp__supabase__generate_typescript_types()

// 4. Check for security issues
await mcp__supabase__get_advisors({ type: "security" })

// 5. Validate with test query
await mcp__supabase__execute_sql({
  query: "SELECT qc_status, COUNT(*) FROM batches GROUP BY qc_status;"
})
```

---

## 2. Testing & Quality Assurance (TestSprite MCP)

### Core Functions

#### `mcp__TestSprite__testsprite_bootstrap_tests`
Initializes the testing environment for the project.
```javascript
// Usage
mcp__TestSprite__testsprite_bootstrap_tests({
  localPort: 5173,  // Vite dev server port
  type: "frontend", // or "backend"
  projectPath: "/Users/ibrahimkashif/Desktop/CopperCore",
  testScope: "codebase" // or "diff"
})

// When to use
- At start of any testing session
- Before implementing new features
- When setting up CI/CD pipelines
```

#### `mcp__TestSprite__testsprite_generate_code_summary`
Analyzes codebase structure and generates comprehensive summary.
```javascript
// Usage
mcp__TestSprite__testsprite_generate_code_summary({
  projectRootPath: "/Users/ibrahimkashif/Desktop/CopperCore"
})

// When to use
- Before major refactoring
- New team member onboarding
- Architecture documentation updates
```

#### `mcp__TestSprite__testsprite_generate_standardized_prd`
Creates structured Product Requirements Document.
```javascript
// Usage
mcp__TestSprite__testsprite_generate_standardized_prd({
  projectPath: "/Users/ibrahimkashif/Desktop/CopperCore"
})

// When to use
- Feature specification documentation
- Stakeholder alignment meetings
- Compliance requirement tracking
```

#### `mcp__TestSprite__testsprite_generate_frontend_test_plan`
Generates comprehensive frontend testing strategy.
```javascript
// Usage
mcp__TestSprite__testsprite_generate_frontend_test_plan({
  projectPath: "/Users/ibrahimkashif/Desktop/CopperCore",
  needLogin: true  // Include authentication flows
})

// When to use
- Before implementing UI features
- Setting up E2E test suites
- Component testing strategies
```

#### `mcp__TestSprite__testsprite_generate_backend_test_plan`
Creates backend API and database testing plan.
```javascript
// Usage
mcp__TestSprite__testsprite_generate_backend_test_plan({
  projectPath: "/Users/ibrahimkashif/Desktop/CopperCore"
})

// When to use
- API endpoint development
- Database schema changes
- Integration testing setup
```

#### `mcp__TestSprite__testsprite_generate_code_and_execute`
Generates and executes comprehensive test suites.
```javascript
// Usage
mcp__TestSprite__testsprite_generate_code_and_execute({
  projectName: "CopperCore",
  projectPath: "/Users/ibrahimkashif/Desktop/CopperCore",
  testIds: [], // Empty = all tests
  additionalInstruction: "Focus on factory RLS boundaries and QC workflows"
})

// When to use
- Before committing code changes
- Validating new features
- Regression testing
```

### Testing Workflow Example
```javascript
// 1. Bootstrap test environment
await mcp__TestSprite__testsprite_bootstrap_tests({
  localPort: 5173,
  type: "frontend",
  projectPath: "/Users/ibrahimkashif/Desktop/CopperCore",
  testScope: "codebase"
})

// 2. Generate test plan for new feature
await mcp__TestSprite__testsprite_generate_frontend_test_plan({
  projectPath: "/Users/ibrahimkashif/Desktop/CopperCore",
  needLogin: true
})

// 3. Execute comprehensive tests
await mcp__TestSprite__testsprite_generate_code_and_execute({
  projectName: "CopperCore",
  projectPath: "/Users/ibrahimkashif/Desktop/CopperCore",
  testIds: [],
  additionalInstruction: "Validate factory isolation and QC gate compliance"
})
```

---

## 3. IDE Integration

### VS Code Diagnostics (`mcp__ide__getDiagnostics`)
Real-time error and warning detection.
```javascript
// Usage
mcp__ide__getDiagnostics()  // All files
mcp__ide__getDiagnostics({ uri: "file:///path/to/specific/file.ts" })

// When to use
- Before every commit
- During code review
- After refactoring operations
- **MANDATORY** before PR creation
```

### Jupyter Code Execution (`mcp__ide__executeCode`)
Execute Python code for data analysis and validation.
```python
# Usage
mcp__ide__executeCode({ 
  code: `
import pandas as pd
import numpy as np

# Analyze factory performance data
data = pd.read_csv('factory_metrics.csv')
print(data.describe())
` 
})

# When to use
- Data migration validation
- Performance analysis scripts
- Complex calculations for business logic
- Database query result analysis
```

---

## 4. UI/UX Development (MagicUI MCP)

### Core Functions

#### `mcp__magicui__getUIComponents`
Lists all available Magic UI components.
```javascript
// Usage
mcp__magicui__getUIComponents()

// Returns categorized components:
// - Buttons, Cards, Forms
// - Animations, Effects
// - Navigation, Layout
```

#### Component-Specific Getters
```javascript
// Get specific component categories
mcp__magicui__getButtons()           // Button components
mcp__magicui__getSpecialEffects()    // Visual effects
mcp__magicui__getTextAnimations()    // Text animations
mcp__magicui__getBackgrounds()       // Background patterns
mcp__magicui__getDeviceMocks()       // Device mockups
```

### UI Development Workflow
```javascript
// 1. Explore available components
await mcp__magicui__getUIComponents()

// 2. Get specific component details
await mcp__magicui__getButtons()  // For CTA buttons

// 3. Implement component in React
// Use the returned implementation details
// Follow accessibility guidelines
// Ensure factory theme compliance
```

---

## 5. Memory & Context Management (OpenMemory MCP)

### Core Functions

#### `mcp__openmemory__recall_memory_abstract`
Retrieves session context and previous decisions.
```javascript
// Usage
mcp__openmemory__recall_memory_abstract()
mcp__openmemory__recall_memory_abstract({ force_refresh: true })

// When to use
- Start of development sessions
- Context switching between features
- Reviewing previous architectural decisions
```

#### `mcp__openmemory__save_memory`
Saves important conversation context.
```javascript
// Usage
mcp__openmemory__save_memory({
  speaker: "agent",
  message: "Implemented RLS policy for factory isolation in work_orders table",
  context: "CopperCore-RLS-Implementation"
})

// When to use
- After completing major features
- Recording architectural decisions
- Documenting complex implementation details
```

#### `mcp__openmemory__update_memory_abstract`
Updates the session memory summary.
```javascript
// Usage
mcp__openmemory__update_memory_abstract({
  abstract: "Updated work order management system with enhanced QC gates and factory scoping. Implemented optimistic locking for concurrent updates.",
  last_processed_timestamp: Date.now()
})

// When to use
- End of development sessions
- Major milestone completions
- Feature delivery summaries
```

### Memory Management Workflow
```javascript
// 1. Start session - recall context
const context = await mcp__openmemory__recall_memory_abstract()

// 2. During work - save key decisions
await mcp__openmemory__save_memory({
  speaker: "agent",
  message: "Added composite index on (factory_id, status, created_at) for work_orders",
  context: "CopperCore-Performance-Optimization"
})

// 3. End session - update summary
await mcp__openmemory__update_memory_abstract({
  abstract: "Enhanced work order performance with strategic indexing and query optimization"
})
```

---

## 6. Browser Automation (Brave Browser Control)

### Core Functions

#### `mcp__brave_control__open_url`
Opens URLs for research and validation.
```javascript
// Usage
mcp__brave_control__open_url({ 
  url: "https://docs.example.com/api-reference",
  new_tab: true 
})

// When to use
- API documentation research
- Competitive analysis
- Integration documentation
- Standards compliance checking
```

#### `mcp__brave_control__get_page_content`
Extracts page content for analysis.
```javascript
// Usage
mcp__brave_control__get_page_content({ tab_id: 123 })

// When to use
- Documentation scraping
- Compliance requirement gathering
- Integration specification extraction
```

#### `mcp__brave_control__execute_javascript`
Runs JavaScript for web automation.
```javascript
// Usage
mcp__brave_control__execute_javascript({ 
  code: `
    document.querySelectorAll('.api-endpoint').forEach(el => {
      console.log(el.textContent.trim());
    });
  `,
  tab_id: 123 
})

// When to use
- API endpoint discovery
- Form testing and validation
- Integration testing setup
```

---

## 7. File System Operations (Filesystem MCP)

### Core Functions

#### `mcp__fs_local__read_multiple_files`
Reads multiple files efficiently.
```javascript
// Usage
mcp__fs_local__read_multiple_files({
  paths: [
    "/Users/ibrahimkashif/Desktop/CopperCore/apps/web/package.json",
    "/Users/ibrahimkashif/Desktop/CopperCore/apps/api/package.json"
  ]
})

// When to use
- Dependency analysis across modules
- Configuration comparison
- Multi-file validation
```

#### `mcp__fs_local__search_files`
Pattern-based file searching.
```javascript
// Usage
mcp__fs_local__search_files({
  path: "/Users/ibrahimkashif/Desktop/CopperCore",
  pattern: "*.test.ts",
  excludePatterns: ["node_modules", ".git"]
})

// When to use
- Test file discovery
- Migration script location
- Configuration file auditing
```

#### `mcp__fs_local__directory_tree`
Generates project structure visualization.
```javascript
// Usage
mcp__fs_local__directory_tree({
  path: "/Users/ibrahimkashif/Desktop/CopperCore/apps/web/src"
})

// When to use
- Architecture documentation
- Code organization analysis
- New developer onboarding
```

---

## 8. Context Enhancement (Context7)

### Core Functions

#### `mcp__context7__resolve-library-id`
Maps library names to Context7 IDs.
```javascript
// Usage
mcp__context7__resolve-library-id({ libraryName: "react" })
mcp__context7__resolve-library-id({ libraryName: "supabase" })

// When to use
- Before using get-library-docs
- Library identification and selection
- Documentation discovery
```

#### `mcp__context7__get-library-docs`
Retrieves comprehensive library documentation.
```javascript
// Usage
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/facebook/react",
  topic: "hooks",
  tokens: 5000
})

// When to use
- Implementation guidance
- Best practices research
- API usage examples
- Integration patterns
```

---

## 🔄 Complete Development Workflow

### 1. Pre-Development (Research & Planning)
```javascript
// Memory context
await mcp__openmemory__recall_memory_abstract()

// Database state
await mcp__supabase__list_tables({ schemas: ["public"] })
await mcp__supabase__get_advisors({ type: "security" })

// Codebase analysis  
await mcp__TestSprite__testsprite_generate_code_summary({
  projectRootPath: "/Users/ibrahimkashif/Desktop/CopperCore"
})

// Current issues
await mcp__ide__getDiagnostics()
```

### 2. During Development
```javascript
// UI component research
await mcp__magicui__getUIComponents()

// Documentation lookup
await mcp__context7__resolve-library-id({ libraryName: "tanstack-query" })
await mcp__context7__get-library-docs({ 
  context7CompatibleLibraryID: "/tanstack/query",
  topic: "mutations" 
})

// Browser research
await mcp__brave_control__open_url({ 
  url: "https://supabase.com/docs/guides/auth/row-level-security" 
})

// Save decisions
await mcp__openmemory__save_memory({
  speaker: "agent",
  message: "Implemented optimistic updates with TanStack Query mutations",
  context: "CopperCore-Frontend-State-Management"
})
```

### 3. Testing & Validation
```javascript
// Bootstrap tests
await mcp__TestSprite__testsprite_bootstrap_tests({
  localPort: 5173,
  type: "frontend", 
  projectPath: "/Users/ibrahimkashif/Desktop/CopperCore",
  testScope: "diff"
})

// Generate test plan
await mcp__TestSprite__testsprite_generate_frontend_test_plan({
  projectPath: "/Users/ibrahimkashif/Desktop/CopperCore",
  needLogin: true
})

// Execute tests
await mcp__TestSprite__testsprite_generate_code_and_execute({
  projectName: "CopperCore",
  projectPath: "/Users/ibrahimkashif/Desktop/CopperCore", 
  testIds: [],
  additionalInstruction: "Focus on new factory scoping logic"
})
```

### 4. Pre-Commit Validation
```javascript
// Check diagnostics
await mcp__ide__getDiagnostics()

// Database validation
await mcp__supabase__get_logs({ service: "postgres" })
await mcp__supabase__get_advisors({ type: "security" })

// Type generation
await mcp__supabase__generate_typescript_types()

// Update memory
await mcp__openmemory__update_memory_abstract({
  abstract: "Completed factory isolation feature with comprehensive RLS policies and frontend state management"
})
```

---

## 🚨 MCP Service Rules

### ✅ MANDATORY Usage
- **TestSprite** for all testing workflows
- **Supabase MCP** for database operations  
- **MagicUI** for frontend component development
- **VS Code Diagnostics** before every commit
- **OpenMemory** for session continuity
- **Brave Browser Control** for research tasks
- **Filesystem MCP** for bulk file operations
- **Context7** for library documentation

### ⚠️ Failure Handling
1. **Document** failures in `docs/logs/mcp-issues/`
2. **Retry** with different parameters if appropriate
3. **Fall back** to manual methods ONLY after MCP attempt
4. **Report** persistent issues for improvement

### ❌ Never Skip
- TestSprite test generation for new features
- Supabase MCP for schema queries
- MagicUI consultation for UI components  
- Diagnostic checks before commits
- OpenMemory session management
- Browser Control for external research
- Context7 for documentation needs

---

## 📋 Quick Reference

### Common MCP Patterns
```bash
# Database workflow
mcp__supabase__list_tables → apply_migration → get_advisors → generate_typescript_types

# Testing workflow  
testsprite_bootstrap_tests → generate_test_plan → generate_code_and_execute

# UI workflow
mcp__magicui__getUIComponents → getSpecialEffects → implement component

# Research workflow
mcp__context7__resolve-library-id → get-library-docs → browser research

# Memory workflow
recall_memory_abstract → save_memory (during work) → update_memory_abstract
```

### Error Patterns to Watch
- **MCP timeouts** — Reduce token limits, simplify requests
- **Schema validation** — Always use list_tables before migrations  
- **Test failures** — Check bootstrap parameters and project structure
- **Memory overflow** — Regular abstract updates to prevent bloat

---

*This guide should be referenced for all MCP service usage in CopperCore development. For updates and issues, see `docs/logs/mcp-issues/`.*