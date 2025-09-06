-- Realtime Setup Templates for CopperCore ERP
-- Configures Supabase Realtime with factory-scoped channels
-- Follows PRD-v1.5.md §3.7 Realtime requirements

-- Enable realtime for core tables
ALTER publication supabase_realtime ADD TABLE work_orders;
ALTER publication supabase_realtime ADD TABLE packing_units;
ALTER publication supabase_realtime ADD TABLE dispatch_notes;
ALTER publication supabase_realtime ADD TABLE grns;
ALTER publication supabase_realtime ADD TABLE inventory_lots;
ALTER publication supabase_realtime ADD TABLE audit_chain;

-- Create realtime notification function
CREATE OR REPLACE FUNCTION notify_realtime_change()
RETURNS TRIGGER AS $$
DECLARE
  v_payload JSONB;
  v_channel TEXT;
  v_factory_id UUID;
BEGIN
  -- Get factory_id from the record
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_factory_id := NEW.factory_id;
  ELSE
    v_factory_id := OLD.factory_id;
  END IF;
  
  -- Skip if no factory_id (shouldn't happen in our system)
  IF v_factory_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Build payload
  v_payload := jsonb_build_object(
    'type', TG_TABLE_NAME,
    'id', COALESCE(NEW.id, OLD.id),
    'factory_id', v_factory_id,
    'action', TG_OP,
    'timestamp', NOW(),
    'user_id', auth.uid(),
    'version', COALESCE(NEW.version, OLD.version),
    'metadata', jsonb_build_object(
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA
    )
  );
  
  -- Add changed keys for updates
  IF TG_OP = 'UPDATE' THEN
    v_payload := v_payload || jsonb_build_object(
      'changed_keys', (
        SELECT array_agg(key)
        FROM jsonb_each(to_jsonb(NEW))
        WHERE to_jsonb(NEW) ->> key IS DISTINCT FROM to_jsonb(OLD) ->> key
      )
    );
  END IF;
  
  -- Factory-scoped channel
  v_channel := 'factory_' || v_factory_id;
  PERFORM pg_notify(v_channel, v_payload::text);
  
  -- Global channel for CEO/Director
  PERFORM pg_notify('global_changes', v_payload::text);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply realtime triggers to core tables
CREATE TRIGGER work_orders_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION notify_realtime_change();

CREATE TRIGGER packing_units_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON packing_units
  FOR EACH ROW EXECUTE FUNCTION notify_realtime_change();

CREATE TRIGGER dispatch_notes_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON dispatch_notes
  FOR EACH ROW EXECUTE FUNCTION notify_realtime_change();

CREATE TRIGGER grns_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON grns
  FOR EACH ROW EXECUTE FUNCTION notify_realtime_change();

CREATE TRIGGER inventory_lots_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON inventory_lots
  FOR EACH ROW EXECUTE FUNCTION notify_realtime_change();

-- Special trigger for audit chain (no DELETE, append-only)
CREATE TRIGGER audit_chain_realtime_trigger
  AFTER INSERT ON audit_chain
  FOR EACH ROW EXECUTE FUNCTION notify_realtime_change();

-- Function to setup factory-specific realtime subscription
CREATE OR REPLACE FUNCTION setup_factory_realtime_subscription(p_factory_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_channel TEXT;
BEGIN
  v_channel := 'factory_' || p_factory_id;
  
  -- This would be called from client-side to set up subscription
  RETURN format('
    const channel = supabase
      .channel(''%s'')
      .on(''postgres_changes'', {
        event: ''*'',
        schema: ''public'',
        filter: ''factory_id=eq.%s''
      }, handleRealtimeChange)
      .subscribe()
  ', v_channel, p_factory_id);
END;
$$ LANGUAGE plpgsql;

-- Function to get realtime configuration for client
CREATE OR REPLACE FUNCTION get_realtime_config(p_factory_id UUID, p_user_role TEXT)
RETURNS JSONB AS $$
DECLARE
  v_config JSONB;
BEGIN
  v_config := jsonb_build_object(
    'factory_channel', 'factory_' || p_factory_id,
    'global_access', p_user_role IN ('CEO', 'DIRECTOR'),
    'tables', jsonb_build_array(
      'work_orders',
      'packing_units', 
      'dispatch_notes',
      'grns',
      'inventory_lots',
      'audit_chain'
    ),
    'filters', jsonb_build_object(
      'factory_id', 'eq.' || p_factory_id
    )
  );
  
  -- Add global channel for CEO/Director
  IF p_user_role IN ('CEO', 'DIRECTOR') THEN
    v_config := v_config || jsonb_build_object(
      'global_channel', 'global_changes',
      'global_filters', jsonb_build_object()
    );
  END IF;
  
  -- Add cross-factory access for Factory Managers (incoming dispatches)
  IF p_user_role = 'FACTORY_MANAGER' THEN
    v_config := v_config || jsonb_build_object(
      'incoming_dispatches', jsonb_build_object(
        'table', 'dispatch_notes',
        'filter', 'destination_factory_id=eq.' || p_factory_id
      )
    );
  END IF;
  
  RETURN v_config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_realtime_change IS 'Trigger function for realtime notifications with factory scoping';
COMMENT ON FUNCTION setup_factory_realtime_subscription IS 'Generate client-side subscription code for factory';
COMMENT ON FUNCTION get_realtime_config IS 'Get realtime configuration based on user role and factory';