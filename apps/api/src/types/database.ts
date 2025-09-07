/**
 * Database schema types for Supabase client
 * 
 * Auto-generated types would normally come from:
 * npx supabase gen types typescript --project-id <project-id> --schema public
 * 
 * For now, manually defining core types based on PRD requirements.
 */

export interface Database {
  public: {
    Tables: {
      factories: {
        Row: {
          id: string
          code: string
          name: string
          address: string
          city: string
          state: string
          postal_code: string
          country: string
          phone?: string
          email?: string
          contact_person?: string
          is_active: boolean
          fiscal_year_start: string
          created_at: string
          updated_at: string
          created_by: string
          updated_by: string
          version: number
        }
        Insert: {
          id?: string
          code: string
          name: string
          address: string
          city: string
          state: string
          postal_code: string
          country: string
          phone?: string
          email?: string
          contact_person?: string
          is_active?: boolean
          fiscal_year_start?: string
          created_at?: string
          updated_at?: string
          created_by: string
          updated_by: string
          version?: number
        }
        Update: {
          id?: string
          code?: string
          name?: string
          address?: string
          city?: string
          state?: string
          postal_code?: string
          country?: string
          phone?: string
          email?: string
          contact_person?: string
          is_active?: boolean
          fiscal_year_start?: string
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
          version?: number
        }
      }
      users: {
        Row: {
          id: string
          username: string
          email: string
          first_name: string
          last_name: string
          role: 'CEO' | 'DIRECTOR' | 'FACTORY_MANAGER' | 'FACTORY_WORKER' | 'OFFICE'
          is_active: boolean
          last_login?: string
          password_changed_at?: string
          created_at: string
          updated_at: string
          created_by: string
          updated_by: string
          version: number
        }
        Insert: {
          id?: string
          username: string
          email: string
          first_name: string
          last_name: string
          role: 'CEO' | 'DIRECTOR' | 'FACTORY_MANAGER' | 'FACTORY_WORKER' | 'OFFICE'
          is_active?: boolean
          last_login?: string
          password_changed_at?: string
          created_at?: string
          updated_at?: string
          created_by: string
          updated_by: string
          version?: number
        }
        Update: {
          id?: string
          username?: string
          email?: string
          first_name?: string
          last_name?: string
          role?: 'CEO' | 'DIRECTOR' | 'FACTORY_MANAGER' | 'FACTORY_WORKER' | 'OFFICE'
          is_active?: boolean
          last_login?: string
          password_changed_at?: string
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
          version?: number
        }
      }
      user_factory_assignments: {
        Row: {
          id: string
          user_id: string
          factory_id: string
          assigned_by: string
          assigned_at: string
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string
          updated_by: string
          version: number
        }
        Insert: {
          id?: string
          user_id: string
          factory_id: string
          assigned_by: string
          assigned_at?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by: string
          updated_by: string
          version?: number
        }
        Update: {
          id?: string
          user_id?: string
          factory_id?: string
          assigned_by?: string
          assigned_at?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
          version?: number
        }
      }
      audit_events: {
        Row: {
          id: string
          entity_type: string
          entity_id: string
          action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT'
          factory_id?: string
          user_id: string
          before_values?: Record<string, unknown>
          after_values?: Record<string, unknown>
          reason?: string
          ip_address?: string
          user_agent?: string
          session_id?: string
          previous_hash?: string
          event_hash: string
          created_at: string
          updated_at: string
          created_by: string
          updated_by: string
          version: number
        }
        Insert: {
          id?: string
          entity_type: string
          entity_id: string
          action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT'
          factory_id?: string
          user_id: string
          before_values?: Record<string, unknown>
          after_values?: Record<string, unknown>
          reason?: string
          ip_address?: string
          user_agent?: string
          session_id?: string
          previous_hash?: string
          event_hash: string
          created_at?: string
          updated_at?: string
          created_by: string
          updated_by: string
          version?: number
        }
        Update: {
          id?: string
          entity_type?: string
          entity_id?: string
          action?: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT'
          factory_id?: string
          user_id?: string
          before_values?: Record<string, unknown>
          after_values?: Record<string, unknown>
          reason?: string
          ip_address?: string
          user_agent?: string
          session_id?: string
          previous_hash?: string
          event_hash?: string
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
          version?: number
        }
      }
    }
    Views: {
      // Add views if needed
    }
    Functions: {
      set_user_context: {
        Args: {
          p_user_id: string
          p_factory_ids: string[]
          p_is_global: boolean
        }
        Returns: void
      }
      begin_transaction: {
        Args: Record<string, never>
        Returns: void
      }
      commit_transaction: {
        Args: Record<string, never>
        Returns: void
      }
      rollback_transaction: {
        Args: Record<string, never>
        Returns: void
      }
      execute_sql: {
        Args: {
          query: string
          params: unknown[]
        }
        Returns: unknown
      }
      get_connection_stats: {
        Args: Record<string, never>
        Returns: {
          active_connections?: number
          idle_connections?: number
          max_connections?: number
        }
      }
    }
    Enums: {
      user_role: 'CEO' | 'DIRECTOR' | 'FACTORY_MANAGER' | 'FACTORY_WORKER' | 'OFFICE'
      audit_action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT'
    }
    CompositeTypes: {
      // Add composite types if needed
    }
  }
}
