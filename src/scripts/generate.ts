#!/usr/bin/env tsx
/**
 * Migration Generator
 * Creates new database migration files with proper naming and templates
 */

import { writeFile, readdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface MigrationTemplate {
  name: string
  template: string
}

class MigrationGenerator {
  private migrationsDir = join(__dirname, '../../db/migrations')

  /**
   * Get next migration number
   */
  private async getNextMigrationNumber(): Promise<string> {
    try {
      const files = await readdir(this.migrationsDir)
      const migrationFiles = files
        .filter(f => f.endsWith('.sql') && /^[0-9]{3}_/.test(f))
        .map(f => {
          const match = f.match(/^([0-9]{3})_/)
          return match ? parseInt(match[1], 10) : 0
        })
        .sort((a, b) => b - a)

      const lastNumber = migrationFiles.length > 0 ? migrationFiles[0] : 0
      const nextNumber = lastNumber + 1

      return nextNumber.toString().padStart(3, '0')
    } catch (error) {
      // If migrations directory doesn't exist or is empty, start with 001
      return '001'
    }
  }

  /**
   * Sanitize migration name for filename
   */
  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
  }

  /**
   * Generate migration file content
   */
  private generateMigrationContent(name: string, type: string): string {
    const timestamp = new Date().toISOString().split('T')[0]
    
    const templates: Record<string, string> = {
      table: `-- Migration: Create ${name} table
-- Purpose: [Describe the purpose of this migration]
-- Features: [List key features or changes]
-- Date: ${timestamp}

-- Create ${name} table
CREATE TABLE ${name} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factory_id UUID NOT NULL REFERENCES factories(id),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Add your columns here
    
    -- Factory scoping constraint
    CONSTRAINT chk_${name}_factory_scoping CHECK (factory_id IS NOT NULL)
);

-- Add comments for documentation
COMMENT ON TABLE ${name} IS '[Describe table purpose]';
COMMENT ON COLUMN ${name}.id IS 'Primary key UUID';
COMMENT ON COLUMN ${name}.factory_id IS 'Factory scope reference';
COMMENT ON COLUMN ${name}.name IS '[Describe name column]';

-- Create indexes
CREATE INDEX idx_${name}_factory_id ON ${name} (factory_id);
CREATE INDEX idx_${name}_name ON ${name} (name);

-- Add updated_at trigger
CREATE TRIGGER trigger_${name}_updated_at
    BEFORE UPDATE ON ${name}
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE ${name} ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY policy_${name}_select ON ${name}
    FOR SELECT
    USING (
        user_is_global() OR 
        factory_id = ANY(user_accessible_factories())
    );

CREATE POLICY policy_${name}_insert ON ${name}
    FOR INSERT
    WITH CHECK (
        user_has_factory_access(factory_id) AND
        (user_is_global() OR factory_id = current_factory())
    );

CREATE POLICY policy_${name}_update ON ${name}
    FOR UPDATE
    USING (
        user_is_global() OR 
        factory_id = ANY(user_accessible_factories())
    )
    WITH CHECK (
        user_has_factory_access(factory_id) AND
        (user_is_global() OR factory_id = current_factory())
    );

CREATE POLICY policy_${name}_delete ON ${name}
    FOR DELETE
    USING (
        user_is_global() OR 
        factory_id = ANY(user_accessible_factories())
    );
`,

      function: `-- Migration: Create ${name} function
-- Purpose: [Describe the purpose of this function]
-- Features: [List key features or functionality]
-- Date: ${timestamp}

-- Create ${name} function
CREATE OR REPLACE FUNCTION ${name}()
RETURNS TABLE (
    -- Define return columns here
    result_column TEXT
) AS $$
BEGIN
    -- Add your function logic here
    RETURN QUERY SELECT
        'example'::TEXT as result_column;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION ${name}() IS '[Describe function purpose]';
`,

      index: `-- Migration: Add ${name} indexes
-- Purpose: [Describe the performance optimization purpose]
-- Features: [List tables and columns being indexed]
-- Date: ${timestamp}

-- Add performance indexes for ${name}
-- Replace 'table_name' and 'column_name' with actual values

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_${name}
    ON table_name (column_name);

-- Add partial index if needed
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_${name}_partial
    ON table_name (column_name) 
    WHERE condition = true;

-- Add composite index if needed
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_${name}_composite
    ON table_name (column1, column2);

-- Update table statistics
ANALYZE table_name;

-- Add comments for documentation
COMMENT ON INDEX idx_${name} IS '[Describe index purpose]';
`,

      custom: `-- Migration: ${name}
-- Purpose: [Describe the purpose of this migration]
-- Features: [List key features or changes]
-- Date: ${timestamp}

-- Add your custom migration code here
-- Remember to:
-- 1. Use proper transaction handling
-- 2. Add appropriate comments
-- 3. Consider rollback scenarios
-- 4. Test thoroughly before applying

-- Example:
-- ALTER TABLE existing_table ADD COLUMN new_column TEXT;
-- UPDATE existing_table SET new_column = 'default_value';
-- ALTER TABLE existing_table ALTER COLUMN new_column SET NOT NULL;
`
    }

    return templates[type] || templates.custom
  }

  /**
   * Create a new migration file
   */
  async createMigration(name: string, type: string = 'custom'): Promise<string> {
    if (!name.trim()) {
      throw new Error('Migration name is required')
    }

    const number = await this.getNextMigrationNumber()
    const sanitizedName = this.sanitizeName(name)
    const filename = `${number}_${sanitizedName}.sql`
    const filepath = join(this.migrationsDir, filename)

    const content = this.generateMigrationContent(sanitizedName, type)

    await writeFile(filepath, content, 'utf-8')

    console.log(`✅ Created migration: ${filename}`)
    console.log(`📁 Location: ${filepath}`)
    console.log(`📝 Type: ${type}`)
    console.log('')
    console.log('Next steps:')
    console.log('1. Edit the migration file to add your changes')
    console.log('2. Test the migration on a development database')
    console.log('3. Run: pnpm db:migrate')

    return filepath
  }

  /**
   * List available migration templates
   */
  listTemplates(): void {
    console.log('Available migration templates:')
    console.log('  table    - Create new table with RLS policies')
    console.log('  function - Create new database function')
    console.log('  index    - Add performance indexes')
    console.log('  custom   - Custom migration (default)')
    console.log('')
    console.log('Usage:')
    console.log('  pnpm db:generate "migration name" [template]')
    console.log('  pnpm db:generate "add users table" table')
    console.log('  pnpm db:generate "create helper function" function')
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new MigrationGenerator()
  const migrationName = process.argv[2]
  const template = process.argv[3] || 'custom'

  if (!migrationName || migrationName === '--help' || migrationName === '-h') {
    generator.listTemplates()
    process.exit(0)
  }

  if (migrationName === '--list-templates') {
    generator.listTemplates()
    process.exit(0)
  }

  generator.createMigration(migrationName, template).catch(error => {
    console.error('Failed to create migration:', error.message)
    process.exit(1)
  })
}

export { MigrationGenerator }