# E-5: TestSprite MCP Config (QA Gen/Run)

## Purpose  
TestSprite MCP integration for automated test generation and execution, with PR-based suggestions only (no direct code commits) to maintain code review governance.

## TestSprite Capabilities
- ✅ **Test Generation**: Create Playwright E2E tests from PRD specifications
- ✅ **Acceptance Mapping**: Map Given/When/Then to executable test code  
- ✅ **RLS Test Assertions**: Generate role-based security tests
- ✅ **Test Execution**: Run test suites and analyze results
- ❌ **Direct Commits**: All changes go through PR review process
- ❌ **Prod Testing**: No execution against production environment

## Claude Desktop Configuration
Add to `~/.claude/mcp_servers.json`:
```json
{
  "mcpServers": {
    "testsprite": {
      "command": "python",
      "args": ["-m", "testsprite", "--mode", "mcp"],
      "env": {
        "TESTSPRITE_API_KEY": "${TESTSPRITE_API_KEY}",
        "TESTSPRITE_PROJECT_ROOT": "/absolute/path/to/CopperCore",
        "TESTSPRITE_FRAMEWORKS": "playwright,vitest,jest"
      }
    }
  }
}
```

## Environment Setup
```bash
# Install TestSprite
pip install testsprite-ai

# Set API key (obtain from TestSprite dashboard)
export TESTSPRITE_API_KEY="your_testsprite_key_here"

# Set project context
export TESTSPRITE_PROJECT_ROOT="/path/to/CopperCore"
export TESTSPRITE_FRAMEWORKS="playwright,vitest,jest"
```

## Supported Test Frameworks
Based on CopperCore's testing stack:
- **Playwright**: E2E browser automation tests
- **Vitest**: Unit and integration tests  
- **Jest**: Legacy test compatibility
- **Custom**: RLS assertion helpers

## Test Generation Categories

### Acceptance Tests (PRD §12)
Map PRD specifications to executable tests:
```typescript
// Example: Work Order creation flow
describe('Work Order Creation (PRD §5.3)', () => {
  test('CEO can create cross-factory work orders', async () => {
    // TestSprite generates from PRD specs
  });
  
  test('Factory Manager limited to own factory', async () => {
    // RLS enforcement validation
  });
});
```

### RLS Security Tests
Per-role access validation:
```typescript
// Example: Factory scoping tests
describe('RLS Factory Scoping', () => {
  test.each(['factory_1', 'factory_2'])('Factory %s isolation', async (factoryId) => {
    // TestSprite generates role-based tests
  });
});
```

### Integration Tests  
Database + API + RLS validation:
```typescript
// Example: Backdating permissions
describe('Backdating Controls (PRD §8.4)', () => {
  test('CEO can backdate with audit trail', async () => {
    // TestSprite generates from PRD constraints
  });
  
  test('Factory Worker cannot backdate', async () => {
    // RLS policy enforcement
  });
});
```

## Agent Usage Guidelines

### QA Agent Primary Usage
- Generate comprehensive test suites from PRD sections
- Create RLS assertion tests per user role
- Map acceptance criteria to Playwright scenarios
- Run test suites and analyze coverage gaps

### Other Agents (Limited)
- **Backend**: Generate API endpoint tests
- **Frontend**: Generate component interaction tests  
- **Architect**: Generate security policy tests
- **All others**: Read-only test result analysis

## TestSprite Workflow
1. **Analyze PRD**: Parse requirements from PRD-v1.5.md
2. **Generate Tests**: Create test files following project conventions
3. **PR Creation**: Submit tests via pull request
4. **Review Cycle**: Human review of generated test logic
5. **Execute Tests**: Run approved tests in CI pipeline
6. **Results Analysis**: Report failures and coverage metrics

## Security Constraints
- Tests run in isolated development environment only
- No production data access during test execution
- Generated tests must respect factory scoping (RLS)
- Sensitive data masked in test fixtures

## Configuration Files
TestSprite uses project-specific config:
```json
// testsprite.config.json
{
  "project_root": "/path/to/CopperCore",
  "frameworks": ["playwright", "vitest"],
  "prd_source": "docs/PRD/PRD-v1.5.md",
  "test_patterns": {
    "e2e": "tests/e2e/**/*.spec.ts",
    "unit": "tests/unit/**/*.test.ts",
    "integration": "tests/integration/**/*.test.ts"
  },
  "rls_roles": ["ceo", "director", "factory_manager", "factory_worker"],
  "output_mode": "pr_suggestions"
}
```

## Test Data Management
- Use factory-scoped seed data for tests
- Generate realistic but anonymized test fixtures
- Ensure test data isolation between test runs
- Clean up test data after execution

## Quality Gates
Generated tests must meet standards:
- ✅ Follow existing test conventions
- ✅ Include proper error handling
- ✅ Respect RLS factory scoping
- ✅ Cover happy path and edge cases
- ✅ Include proper cleanup/teardown

## Testing TestSprite Integration
```bash
# Verify TestSprite installation
python -m testsprite --version

# Test MCP connection
python -m testsprite --mode mcp --test-connection

# Generate sample test
python -m testsprite generate --spec "User can scan QR code" --framework playwright
```

## PR Integration
TestSprite suggestions delivered via PR:
- Branch: `test/testsprite-generated-YYYYMMDD`
- PR Title: `[TestSprite] Generated tests for [PRD Section]`
- PR Body: Links to PRD sections, test coverage report
- Review Required: QA + relevant domain agent

## Rollback Plan
If TestSprite generates problematic tests:
1. Reject PR with generated tests
2. Disable TestSprite MCP temporarily
3. Review TestSprite configuration for issues
4. Re-enable with stricter generation rules

## Limitations
- Cannot directly modify existing test files
- Requires human review for all generated tests
- Limited to test generation, not bug fixing
- No access to production or sensitive environments

## PRD References
- PRD-v1.5.md §12: "Testing & QA Blueprint" 
- CLAUDE.md §3.3: "Run locally before review: lint → typecheck → unit → integration → e2e"
- CLAUDE.md §6: "testsprite — test plan/gen/run; patch suggestions via PR"
- SESSION_CHECKLIST.md G-1: "Map acceptance tests to specs (Given/When/Then)"