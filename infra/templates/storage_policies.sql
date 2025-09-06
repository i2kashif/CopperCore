-- Supabase Storage Policies for CopperCore ERP
-- Manages secure file storage with factory scoping and signed URLs
-- Follows PRD-v1.5.md requirements for QC certificates and labels

-- Create storage buckets (run via Supabase Dashboard or API)
-- These are examples - actual bucket creation is done via Supabase interface

/*
-- QC Certificates bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('qc-certificates', 'qc-certificates', false);

-- Packing Labels bucket  
INSERT INTO storage.buckets (id, name, public)
VALUES ('packing-labels', 'packing-labels', false);

-- Document Templates bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-templates', 'document-templates', false);

-- Dispatch Documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('dispatch-documents', 'dispatch-documents', false);
*/

-- Storage RLS Policies for QC Certificates
-- Factory-scoped access with CEO/Director global access

-- QC Certificates: Factory users can read own factory certs
CREATE POLICY "QC Certificates: Factory read access" ON storage.objects
FOR SELECT USING (
  bucket_id = 'qc-certificates' AND (
    is_global_user() OR 
    (storage.foldername(name))[1] = get_user_factory_id()::text
  )
);

-- QC Certificates: Factory users can upload own factory certs
CREATE POLICY "QC Certificates: Factory upload access" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'qc-certificates' AND
  (storage.foldername(name))[1] = get_user_factory_id()::text
);

-- QC Certificates: Only CEO/Director can delete
CREATE POLICY "QC Certificates: Admin delete only" ON storage.objects
FOR DELETE USING (
  bucket_id = 'qc-certificates' AND is_global_user()
);

-- Packing Labels: Similar pattern for labels
CREATE POLICY "Packing Labels: Factory read access" ON storage.objects
FOR SELECT USING (
  bucket_id = 'packing-labels' AND (
    is_global_user() OR 
    (storage.foldername(name))[1] = get_user_factory_id()::text
  )
);

CREATE POLICY "Packing Labels: Factory upload access" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'packing-labels' AND
  (storage.foldername(name))[1] = get_user_factory_id()::text
);

-- Document Templates: Read-only for workers, upload for managers
CREATE POLICY "Document Templates: All can read" ON storage.objects
FOR SELECT USING (bucket_id = 'document-templates');

CREATE POLICY "Document Templates: Manager+ can upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'document-templates' AND (
    is_global_user() OR is_manager_or_above()
  )
);

-- Dispatch Documents: Cross-factory visibility for transfers
CREATE POLICY "Dispatch Documents: Factory and destination access" ON storage.objects
FOR SELECT USING (
  bucket_id = 'dispatch-documents' AND (
    is_global_user() OR
    (storage.foldername(name))[1] = get_user_factory_id()::text OR
    -- Allow destination factory to read dispatch documents
    EXISTS (
      SELECT 1 FROM dispatch_notes dn 
      WHERE dn.dn_number = (storage.foldername(name))[2]
      AND dn.destination_factory_id = get_user_factory_id()
    )
  )
);

CREATE POLICY "Dispatch Documents: Origin factory can upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'dispatch-documents' AND
  (storage.foldername(name))[1] = get_user_factory_id()::text
);

-- File naming convention functions
-- Ensures consistent file organization and security

CREATE OR REPLACE FUNCTION generate_qc_certificate_path(
  p_factory_id UUID,
  p_pu_id UUID,
  p_test_type TEXT,
  p_file_extension TEXT DEFAULT 'pdf'
) RETURNS TEXT AS $$
BEGIN
  RETURN format('%s/qc/%s_%s_%s.%s',
    p_factory_id,
    p_pu_id,
    p_test_type,
    extract(epoch from now())::bigint,
    p_file_extension
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_packing_label_path(
  p_factory_id UUID,
  p_pu_code TEXT,
  p_label_type TEXT DEFAULT 'standard',
  p_file_extension TEXT DEFAULT 'pdf'
) RETURNS TEXT AS $$
BEGIN
  RETURN format('%s/labels/%s_%s_%s.%s',
    p_factory_id,
    p_pu_code,
    p_label_type,
    extract(epoch from now())::bigint,
    p_file_extension
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_dispatch_document_path(
  p_factory_id UUID,
  p_dn_number TEXT,
  p_document_type TEXT,
  p_file_extension TEXT DEFAULT 'pdf'
) RETURNS TEXT AS $$
BEGIN
  RETURN format('%s/%s/%s_%s.%s',
    p_factory_id,
    p_dn_number,
    p_document_type,
    extract(epoch from now())::bigint,
    p_file_extension
  );
END;
$$ LANGUAGE plpgsql;

-- Function to generate signed URLs with proper permissions
CREATE OR REPLACE FUNCTION get_signed_url(
  p_bucket TEXT,
  p_path TEXT,
  p_expires_in INTEGER DEFAULT 3600
) RETURNS TEXT AS $$
DECLARE
  v_factory_id UUID;
  v_user_factory_id UUID;
BEGIN
  -- Extract factory_id from path
  v_factory_id := (string_to_array(p_path, '/'))[1]::uuid;
  v_user_factory_id := get_user_factory_id();
  
  -- Security check: user must have access to this factory's files
  IF NOT (is_global_user() OR v_factory_id = v_user_factory_id) THEN
    -- Additional check for dispatch documents (destination factory access)
    IF p_bucket = 'dispatch-documents' THEN
      IF NOT EXISTS (
        SELECT 1 FROM dispatch_notes dn 
        WHERE dn.dn_number = (string_to_array(p_path, '/'))[2]
        AND dn.destination_factory_id = v_user_factory_id
      ) THEN
        RAISE EXCEPTION 'Access denied to file: %', p_path;
      END IF;
    ELSE
      RAISE EXCEPTION 'Access denied to file: %', p_path;
    END IF;
  END IF;
  
  -- Generate signed URL (this would use Supabase storage API in practice)
  -- This is a placeholder - actual implementation uses storage.sign() function
  RETURN format('https://your-project.supabase.co/storage/v1/object/sign/%s/%s?expires=%s',
    p_bucket, p_path, extract(epoch from now() + p_expires_in * interval '1 second')::bigint
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit table for file operations
CREATE TABLE IF NOT EXISTS file_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  bucket TEXT NOT NULL,
  file_path TEXT NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('UPLOAD', 'DOWNLOAD', 'DELETE')),
  user_id UUID REFERENCES users(id),
  entity_type TEXT,
  entity_id UUID,
  file_size BIGINT,
  content_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on file audit
ALTER TABLE file_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "File Audit: CEO/Director see all" ON file_audit
  FOR SELECT USING (is_global_user());

CREATE POLICY "File Audit: Factory users see own factory" ON file_audit
  FOR SELECT USING (factory_id = get_user_factory_id());

CREATE POLICY "File Audit: Users can log own actions" ON file_audit
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Function to log file operations
CREATE OR REPLACE FUNCTION log_file_operation(
  p_bucket TEXT,
  p_file_path TEXT,
  p_action TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_file_size BIGINT DEFAULT NULL,
  p_content_type TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_factory_id UUID;
  v_audit_id UUID;
BEGIN
  -- Extract factory_id from path
  v_factory_id := (string_to_array(p_file_path, '/'))[1]::uuid;
  
  INSERT INTO file_audit (
    factory_id, bucket, file_path, action, user_id,
    entity_type, entity_id, file_size, content_type
  ) VALUES (
    v_factory_id, p_bucket, p_file_path, p_action, auth.uid(),
    p_entity_type, p_entity_id, p_file_size, p_content_type
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_audit_factory_id ON file_audit(factory_id);
CREATE INDEX IF NOT EXISTS idx_file_audit_entity ON file_audit(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_audit_created_at ON file_audit(created_at);

COMMENT ON FUNCTION generate_qc_certificate_path IS 'Generate standardized path for QC certificate files';
COMMENT ON FUNCTION generate_packing_label_path IS 'Generate standardized path for packing label files';  
COMMENT ON FUNCTION generate_dispatch_document_path IS 'Generate standardized path for dispatch document files';
COMMENT ON FUNCTION get_signed_url IS 'Generate signed URL with factory-scoped access control';
COMMENT ON FUNCTION log_file_operation IS 'Log file operations for audit trail';
COMMENT ON TABLE file_audit IS 'Audit log for all file operations in storage buckets';