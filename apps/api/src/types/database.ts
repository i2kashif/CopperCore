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
      product_families: {
        Row: {
          id: string
          factory_id: string
          name: string
          code: string
          description?: string
          attributes: Record<string, unknown>[]
          sku_naming_rule?: string
          default_unit?: string
          default_routing?: Record<string, unknown>
          default_packing_rules?: Record<string, unknown>
          schema_version: number
          is_active: boolean
          version: number
          created_at: string
          updated_at: string
          created_by: string
          updated_by: string
        }
        Insert: {
          id?: string
          factory_id: string
          name: string
          code: string
          description?: string
          attributes?: Record<string, unknown>[]
          sku_naming_rule?: string
          default_unit?: string
          default_routing?: Record<string, unknown>
          default_packing_rules?: Record<string, unknown>
          schema_version?: number
          is_active?: boolean
          version?: number
          created_at?: string
          updated_at?: string
          created_by: string
          updated_by: string
        }
        Update: {
          id?: string
          factory_id?: string
          name?: string
          code?: string
          description?: string
          attributes?: Record<string, unknown>[]
          sku_naming_rule?: string
          default_unit?: string
          default_routing?: Record<string, unknown>
          default_packing_rules?: Record<string, unknown>
          schema_version?: number
          is_active?: boolean
          version?: number
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
        }
      }
      skus: {
        Row: {
          id: string
          factory_id: string
          product_family_id: string
          sku_code: string
          name: string
          description?: string
          attribute_values: Record<string, unknown>
          unit_of_measure: string
          routing?: Record<string, unknown>
          packing_rules?: Record<string, unknown>
          status: 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'DISABLED'
          sku_attributes?: Record<string, unknown>
          created_by?: string
          updated_by?: string
          approved_by?: string
          approved_at?: string
          is_active: boolean
          created_at: string
          updated_at: string
          version: number
        }
        Insert: {
          id?: string
          factory_id: string
          product_family_id: string
          sku_code: string
          name: string
          description?: string
          attribute_values?: Record<string, unknown>
          unit_of_measure?: string
          routing?: Record<string, unknown>
          packing_rules?: Record<string, unknown>
          status?: 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'DISABLED'
          sku_attributes?: Record<string, unknown>
          created_by?: string
          updated_by?: string
          approved_by?: string
          approved_at?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          version?: number
        }
        Update: {
          id?: string
          factory_id?: string
          product_family_id?: string
          sku_code?: string
          name?: string
          description?: string
          attribute_values?: Record<string, unknown>
          unit_of_measure?: string
          routing?: Record<string, unknown>
          packing_rules?: Record<string, unknown>
          status?: 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'DISABLED'
          sku_attributes?: Record<string, unknown>
          created_by?: string
          updated_by?: string
          approved_by?: string
          approved_at?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          version?: number
        }
      }
      inventory_lots: {
        Row: {
          id: string
          factory_id: string
          lot_number: string
          sku_id: string
          work_order_id?: string
          quantity: number
          reserved_quantity: number
          unit: string
          location?: string
          expiry_date?: string
          notes?: string
          movement_type?: 'OPENING_STOCK' | 'PRODUCTION' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'CONSUMPTION'
          created_by?: string
          updated_by?: string
          created_at: string
          updated_at: string
          version: number
        }
        Insert: {
          id?: string
          factory_id: string
          lot_number: string
          sku_id: string
          work_order_id?: string
          quantity: number
          reserved_quantity?: number
          unit: string
          location?: string
          expiry_date?: string
          notes?: string
          movement_type?: 'OPENING_STOCK' | 'PRODUCTION' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'CONSUMPTION'
          created_by?: string
          updated_by?: string
          created_at?: string
          updated_at?: string
          version?: number
        }
        Update: {
          id?: string
          factory_id?: string
          lot_number?: string
          sku_id?: string
          work_order_id?: string
          quantity?: number
          reserved_quantity?: number
          unit?: string
          location?: string
          expiry_date?: string
          notes?: string
          movement_type?: 'OPENING_STOCK' | 'PRODUCTION' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'CONSUMPTION'
          created_by?: string
          updated_by?: string
          created_at?: string
          updated_at?: string
          version?: number
        }
      }
      inventory_movements: {
        Row: {
          id: string
          factory_id: string
          inventory_lot_id: string
          movement_type: 'OPENING_STOCK' | 'PRODUCTION' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'CONSUMPTION' | 'RETURN'
          reference_type?: string
          reference_id?: string
          quantity_before: number
          quantity_change: number
          quantity_after: number
          unit: string
          reason?: string
          notes?: string
          movement_date: string
          created_by: string
          created_at: string
          version: number
        }
        Insert: {
          id?: string
          factory_id: string
          inventory_lot_id: string
          movement_type: 'OPENING_STOCK' | 'PRODUCTION' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'CONSUMPTION' | 'RETURN'
          reference_type?: string
          reference_id?: string
          quantity_before: number
          quantity_change: number
          quantity_after: number
          unit: string
          reason?: string
          notes?: string
          movement_date?: string
          created_by: string
          created_at?: string
          version?: number
        }
        Update: {
          // Movement records are immutable - no updates allowed
        }
      }
    }
    Views: {
      opening_stock_view: {
        Row: {
          id: string
          factory_id: string
          factory_name: string
          factory_code: string
          sku_id: string
          sku_code: string
          sku_name: string
          lot_number: string
          quantity: number
          reserved_quantity: number
          unit: string
          location?: string
          expiry_date?: string
          notes?: string
          created_at: string
          updated_at: string
          created_by_email?: string
          updated_by_email?: string
          version: number
        }
      }
      sku_stats_by_factory: {
        Row: {
          factory_id: string
          factory_name: string
          factory_code: string
          total_skus: number
          active_skus: number
          pending_approval: number
          rejected_skus: number
          disabled_skus: number
          product_families_used: number
        }
      }
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
      cc_validate_sku_attributes: {
        Args: {
          p_product_family_id: string
          p_attribute_values: Record<string, unknown>
        }
        Returns: boolean
      }
      cc_generate_sku_code: {
        Args: {
          p_product_family_id: string
          p_attribute_values: Record<string, unknown>
        }
        Returns: string
      }
      cc_create_sku: {
        Args: {
          p_factory_id: string
          p_product_family_id: string
          p_name: string
          p_description?: string
          p_attribute_values?: Record<string, unknown>
          p_unit_of_measure?: string
          p_routing?: Record<string, unknown>
          p_packing_rules?: Record<string, unknown>
          p_created_by?: string
        }
        Returns: string
      }
      cc_approve_pending_sku: {
        Args: {
          p_sku_id: string
          p_approved_by: string
          p_approve?: boolean
        }
        Returns: boolean
      }
      get_connection_stats: {
        Args: Record<string, never>
        Returns: {
          active_connections?: number
          idle_connections?: number
          max_connections?: number
        }
      }
      cc_create_opening_stock: {
        Args: {
          p_factory_id: string
          p_sku_id: string
          p_lot_number: string
          p_quantity: number
          p_unit: string
          p_location?: string
          p_expiry_date?: string
          p_notes?: string
        }
        Returns: string // UUID of created inventory lot
      }
      cc_create_inventory_movement: {
        Args: {
          p_factory_id: string
          p_inventory_lot_id: string
          p_movement_type: string
          p_reference_type?: string
          p_reference_id?: string
          p_quantity_before: number
          p_quantity_change: number
          p_quantity_after: number
          p_unit: string
          p_reason?: string
          p_notes?: string
          p_created_by?: string
        }
        Returns: string // UUID of created movement record
      }
    }
    Enums: {
      user_role: 'CEO' | 'DIRECTOR' | 'FACTORY_MANAGER' | 'FACTORY_WORKER' | 'OFFICE'
      audit_action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT'
      sku_status: 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'DISABLED'
      movement_type: 'OPENING_STOCK' | 'PRODUCTION' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'CONSUMPTION' | 'RETURN'
    }
    CompositeTypes: {
      // Add composite types if needed
    }
  }
}
