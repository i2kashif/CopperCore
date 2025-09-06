# E-6: Magic UI + Puppeteer MCP Config (Dev Only)

## Purpose
Development environment tools for UI component scaffolding (Magic UI) and automated browser testing/validation (Puppeteer), with strict dev-only usage to prevent production interference.

## Magic UI Integration
Automated React component generation with Tailwind CSS styling:
- ✅ **Component Scaffolding**: Generate form components, modals, tables
- ✅ **Tailwind Integration**: Consistent styling with project theme
- ✅ **TypeScript Support**: Fully typed component generation
- ❌ **Production Use**: Dev environment only, all output reviewed via PR

## Puppeteer Integration  
Headless browser automation for testing and validation:
- ✅ **E2E Testing**: Automated browser interactions
- ✅ **PDF Generation**: Work orders, labels, certificates
- ✅ **UI Screenshots**: Visual regression testing
- ❌ **Production Access**: No production site automation

## Claude Desktop Configuration
Add to `~/.claude/mcp_servers.json`:
```json
{
  "mcpServers": {
    "magic-ui": {
      "command": "npx",
      "args": ["-y", "@magic-ui/mcp-server"],
      "env": {
        "MAGIC_UI_ENV": "development",
        "MAGIC_UI_PROJECT_ROOT": "/absolute/path/to/CopperCore"
      }
    },
    "puppeteer": {
      "command": "npx", 
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"],
      "env": {
        "PUPPETEER_EXECUTABLE_PATH": "/path/to/chrome",
        "PUPPETEER_HEADLESS": "true",
        "PUPPETEER_DEV_ONLY": "true"
      }
    }
  }
}
```

## Environment Detection
Both tools enforce development-only usage:
```bash
# Environment variables that restrict to dev
export NODE_ENV="development"
export MAGIC_UI_ENV="development" 
export PUPPETEER_DEV_ONLY="true"

# Prevent production usage
export PUPPETEER_PROD_DISABLED="true"
```

## Magic UI Usage

### Component Generation
```typescript
// Example: Generate scanner input component
const ScannerInput = generateComponent({
  type: 'form-input',
  props: ['value', 'onScan', 'placeholder'],
  styling: 'tailwind',
  validation: 'zod'
});

// Generated component follows project patterns:
// - TypeScript interfaces
// - Tailwind CSS classes  
// - Zod validation schemas
// - React Hook Form integration
```

### Supported Component Types
- Form inputs with validation
- Modal dialogs with factory context
- Data tables with RLS awareness  
- Navigation components
- Status indicators and badges

### Quality Gates
Generated components must:
- ✅ Pass TypeScript compilation
- ✅ Follow project naming conventions
- ✅ Include proper prop interfaces
- ✅ Use approved Tailwind classes
- ✅ Include accessibility attributes

## Puppeteer Usage

### Browser Automation
```javascript
// Example: Test work order creation flow
const testWorkOrderFlow = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    devtools: false
  });
  
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  
  // Simulate work order creation
  await page.click('[data-testid="create-work-order"]');
  await page.fill('#product-code', 'TEST-001');
  
  await browser.close();
};
```

### PDF Generation
```javascript
// Example: Generate work order PDF
const generateWorkOrderPDF = async (workOrderId) => {
  const page = await browser.newPage();
  await page.goto(`http://localhost:3000/work-orders/${workOrderId}/pdf`);
  
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '1cm', bottom: '1cm' }
  });
  
  return pdf;
};
```

## Development Environment Setup

### Magic UI Prerequisites
```bash
# Install Magic UI CLI
npm install -g @magic-ui/cli

# Verify installation
magic-ui --version

# Test component generation
magic-ui generate button --framework react --styling tailwind
```

### Puppeteer Prerequisites  
```bash
# Install Puppeteer
npm install puppeteer

# Verify Chrome/Chromium path
which google-chrome
# or
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version
```

## Agent Usage Guidelines

### Frontend Agent (Primary)
- Generate React components with Magic UI
- Create Puppeteer tests for UI flows
- Visual regression testing with screenshots
- PDF generation for factory documents

### QA Agent
- E2E test automation with Puppeteer
- Cross-browser compatibility testing
- Performance testing (load times, interactions)
- Accessibility testing automation

### Other Agents (Limited)
- Read-only access to generated components
- View test results and screenshots
- No direct component generation or browser automation

## Security Restrictions

### Magic UI Safeguards
- Components generated in development workspace only
- All output goes through PR review process
- No direct production deployment
- Malicious code patterns blocked

### Puppeteer Safeguards  
- Headless mode only (no GUI access)
- Ephemeral browser profiles (no data persistence)
- Local development sites only (`localhost`, `127.0.0.1`)
- No external network requests
- No file system access outside project

## Browser Profile Management
```javascript
// Ephemeral profile for security
const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--incognito'  // Ephemeral session
  ],
  userDataDir: '/tmp/puppeteer-profile-' + Date.now()
});
```

## Testing Integration
```bash
# Test Magic UI generation
magic-ui generate --dry-run form --name ScannerInput

# Test Puppeteer automation
node -e "
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  console.log(await page.title());
  await browser.close();
})();
"
```

## Quality Assurance

### Magic UI Output Review
- Components match design system
- TypeScript interfaces are correct
- Tailwind classes are approved
- Accessibility attributes present
- No hardcoded values or secrets

### Puppeteer Test Validation
- Tests target development environment only
- No sensitive data in test scripts
- Proper cleanup and browser closure
- Error handling for failed interactions

## Rollback Plan
If tools cause development issues:
1. Remove both entries from MCP config
2. Delete any problematic generated components
3. Clean up Puppeteer temporary files
4. Review generated code for security issues
5. Re-enable with stricter restrictions

## File Organization
```
/docs/mcp-tools/
├── generated-components/     # Magic UI output (dev review)
├── puppeteer-tests/         # Browser automation scripts
├── screenshots/             # Visual regression baseline
└── pdf-templates/           # Generated PDF layouts
```

## PRD References  
- CLAUDE.md §6: "magic-ui — dev-only component scaffolds; must pass lint/type/storybook"
- CLAUDE.md §6: "puppeteer — headless checks (PDF/labels/UI); ephemeral browser profile"
- PRD-v1.5.md §9.2: "PDF generation for work orders, certificates, and labels"
- SESSION_CHECKLIST.md F-2: "Matrix pipeline includes browser-based E2E testing"