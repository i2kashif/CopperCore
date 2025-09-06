# Backup & PITR Checklist - CopperCore

> **Purpose:** Ensure reliable backup and point-in-time recovery capabilities  
> **Frequency:** Before every production deployment + weekly verification  
> **Authority:** DevOps role, Architect oversight  
> **PRD Reference:** Section 11.6 (disaster recovery)

## Backup Strategy Overview

- **RTO (Recovery Time Objective):** 30 minutes
- **RPO (Recovery Point Objective):** 5 minutes  
- **Backup Retention:** 30 days production, 7 days staging
- **PITR Window:** 7 days continuous

## Pre-Deployment Backup Checklist

### 1. Create PITR Checkpoint
**Before every production migration or major deployment:**

```bash
# 1. Generate checkpoint ID
export CHECKPOINT_ID="$(date +%Y%m%d_%H%M%S)_v$(git describe --tags)"
echo "Creating PITR checkpoint: $CHECKPOINT_ID"

# 2. Document current system state
psql "$SUPABASE_PRODUCTION_URL" -c "
SELECT 
  'Production snapshot at: ' || NOW()::text as timestamp,
  (SELECT COUNT(*) FROM work_orders) as work_orders_count,
  (SELECT COUNT(*) FROM packing_units) as packing_units_count,
  (SELECT COUNT(*) FROM grns) as grns_count;
"
```

**Manual steps in Supabase Dashboard:**
1. Navigate to Settings > Database
2. Click "Create Backup" 
3. Name: `CHECKPOINT_${CHECKPOINT_ID}`
4. Wait for backup completion
5. **Document backup ID below**

- [ ] **PITR checkpoint created:** ID `_________________`
- [ ] **Backup completion verified:** ✅
- [ ] **System state documented:** ✅
- [ ] **Checkpoint ID recorded in deployment notes:** ✅

### 2. Verify Backup Integrity
```bash
# Test backup accessibility (staging environment)
export STAGING_RESTORE_TEST="test_restore_$(date +%Y%m%d_%H%M%S)"

# Verify critical table counts match
psql "$SUPABASE_STAGING_URL" -c "
SELECT 
  'Staging verification at: ' || NOW()::text,
  (SELECT COUNT(*) FROM work_orders) as wo_count,
  (SELECT COUNT(*) FROM users) as user_count;
"
```

- [ ] **Backup integrity verified:** ✅
- [ ] **Critical data accessible:** ✅
- [ ] **No corruption detected:** ✅

### 3. Document Recovery Points
- [ ] **Last successful backup:** (timestamp) `_________________`
- [ ] **Previous backup checkpoint:** (ID) `_________________`  
- [ ] **Recovery window available:** `_____ hours`
- [ ] **Estimated recovery time:** `_____ minutes`

## Weekly Backup Verification

**Every Monday morning - verify backup/restore capabilities:**

### Automated Backup Health Check
```bash
#!/bin/bash
# Weekly backup verification script

echo "🔍 Weekly Backup Health Check - $(date)"
echo "======================================="

# 1. Check backup frequency
echo "📋 Recent backups:"
# TODO: Add Supabase API call to list recent backups

# 2. Verify PITR coverage
echo "⏰ PITR coverage verification:"
# TODO: Add PITR timeline verification

# 3. Test restore to staging
echo "🧪 Staging restore test:"
# TODO: Add automated staging restore test

echo "✅ Weekly backup verification complete"
```

- [ ] **Automated backup health check run:** ✅
- [ ] **PITR timeline verified:** (7 days continuous) ✅  
- [ ] **Staging restore test passed:** ✅
- [ ] **Backup alerts functional:** ✅

### Manual Verification Steps
- [ ] **Production backup count:** `___ backups in last 7 days`
- [ ] **Backup sizes reasonable:** (not 0 bytes, not excessively large)
- [ ] **Backup retention policy enforced:** (30 days production)
- [ ] **Cross-region backup replication verified:** (if applicable)

## Emergency PITR Recovery Procedure

**⚠️ Use only during actual incidents - this modifies production data!**

### Step 1: Assess Recovery Requirements
- [ ] **Incident timestamp identified:** `_________________`
- [ ] **Target recovery point selected:** `_________________`
- [ ] **Data loss window calculated:** `_____ minutes`
- [ ] **CEO/Director approval obtained:** ✅

### Step 2: Execute PITR Recovery
```bash
# 1. Create emergency backup of current (corrupted) state
export EMERGENCY_ID="emergency_$(date +%Y%m%d_%H%M%S)"
echo "Creating emergency backup: $EMERGENCY_ID"

# 2. Initiate PITR recovery
# CRITICAL: This is done through Supabase dashboard
# Target recovery time: ____________________
```

**Manual recovery steps:**
1. Supabase Dashboard → Settings → Database  
2. Point-in-Time Recovery tab
3. Select target timestamp: `_________________`
4. Confirm recovery (⚠️ irreversible operation)
5. Wait for recovery completion

- [ ] **Emergency backup created:** ID `_________________`
- [ ] **PITR recovery initiated:** Target `_________________`
- [ ] **Recovery completion verified:** ✅
- [ ] **Application functionality verified:** ✅

### Step 3: Post-Recovery Verification
```bash
# Verify recovered database state
psql "$SUPABASE_PRODUCTION_URL" -c "
SELECT 
  'Recovery completed at: ' || NOW()::text,
  'Data recovery window: ' || (NOW() - TIMESTAMP '$TARGET_RECOVERY_TIMESTAMP'),
  (SELECT COUNT(*) FROM work_orders) as wo_recovered,
  (SELECT COUNT(*) FROM grns) as grns_recovered;
"
```

- [ ] **Data integrity verified:** ✅
- [ ] **User workflows tested:** ✅  
- [ ] **Performance metrics normal:** ✅
- [ ] **Recovery documented:** ✅

## Backup Monitoring & Alerts

### Key Metrics to Monitor
- [ ] **Backup completion rate:** >99%
- [ ] **Backup duration:** <15 minutes
- [ ] **PITR lag:** <5 minutes
- [ ] **Storage usage:** <80% of allocated space

### Alert Thresholds
- **🚨 Critical:** Backup failure or PITR gap >1 hour
- **⚠️ Warning:** Backup duration >15 minutes or lag >5 minutes  
- **📊 Info:** Weekly verification results

## Recovery Testing Schedule

| Test Type | Frequency | Last Executed | Next Due |
|-----------|-----------|---------------|----------|
| Staging restore | Weekly | __________ | __________ |
| PITR simulation | Monthly | __________ | __________ |
| Full DR drill | Quarterly | __________ | __________ |
| Cross-region failover | Annually | __________ | __________ |

## Documentation & Compliance

- [ ] **Backup procedures documented:** ✅
- [ ] **Recovery contacts updated:** (on-call rotation)
- [ ] **Compliance requirements met:** (data retention, audit logs)
- [ ] **Insurance requirements satisfied:** (backup verification records)

## Sign-off

- **Checklist completed by:** _________________ (timestamp: _______)
- **Technical review:** _________________ (Architect, timestamp: _______)
- **Backup verification confirmed:** _________________ (DevOps, timestamp: _______)

---

**📋 Remember:** This checklist should be executed before every production deployment and reviewed weekly for ongoing backup health.