# Emergency Rollback Template - CopperCore

> **⚠️ CRITICAL:** Use this template for production rollbacks only  
> **Authority:** DevOps + CEO/Director approval required  
> **PRD Reference:** Section 11.6 (disaster recovery), Section 7.3 (backup strategy)

## Incident Information

- **Incident ID:** `INC-YYYY-MMDD-NNN` (e.g., INC-2024-0306-001)
- **Reported by:** 
- **Severity:** [ ] P1-Critical [ ] P2-High [ ] P3-Medium
- **Affected release:** 
- **Rollback initiated at:** (UTC timestamp)
- **Estimated downtime:** 

## Rollback Decision Matrix

**☑️ Confirm rollback criteria (check all that apply):**
- [ ] Production system is non-functional
- [ ] Data corruption detected
- [ ] Security vulnerability exposed
- [ ] Critical business process blocked
- [ ] Performance degraded >50% for >15 minutes
- [ ] CEO/Director authorization obtained

## Pre-Rollback Checklist

### 1. Assessment & Communication
- [ ] **Incident commander assigned:** 
- [ ] **Stakeholders notified:** (CEO, key users)
- [ ] **Rollback window approved:** Start: _____ End: _____
- [ ] **Maintenance page activated:** (if applicable)

### 2. Backup & PITR Verification
- [ ] **Current PITR checkpoint ID:** `_________________`
- [ ] **Target rollback point:** (timestamp) `_________________`
- [ ] **Backup integrity verified:** ✅ Database ✅ Files ✅ Config
- [ ] **Rollback database URL ready:** `supabase_rollback_YYYYMMDD`

### 3. Technical Preparation
- [ ] **Previous stable release identified:** `v____.__.__`
- [ ] **Deployment artifacts available:** (GitHub release, Docker images)
- [ ] **Configuration rollback plan ready:** (env vars, secrets)
- [ ] **Third-party services impact assessed:** (payment, shipping APIs)

## Rollback Execution Steps

### Phase 1: Database Rollback
```bash
# 1. Create emergency backup of current state
export EMERGENCY_BACKUP_ID=$(date +%Y%m%d_%H%M%S)
echo "Creating emergency backup: $EMERGENCY_BACKUP_ID"

# 2. Point-in-time recovery to stable state
# MANUAL STEP: Use Supabase dashboard to restore to target timestamp
# Target: ____________________ (UTC)

# 3. Verify database rollback
psql "$SUPABASE_PRODUCTION_URL" -c "SELECT 'DB Rollback verification: ' || NOW();"
```

- [ ] **Emergency backup created:** ID `_________________`
- [ ] **PITR restore initiated:** Timestamp `_________________`
- [ ] **Database rollback verified:** ✅
- [ ] **Critical data integrity spot-checked:** ✅

### Phase 2: Application Rollback
```bash
# 1. Deploy previous stable release
git checkout v____.__.__
pnpm install --frozen-lockfile
pnpm -w build

# 2. Update environment variables (if needed)
# MANUAL STEP: Update production environment configuration

# 3. Deploy to production
# MANUAL STEP: Use deployment platform (Vercel, Docker, etc.)
```

- [ ] **Previous release deployed:** `v____.__.__`
- [ ] **Environment configuration updated:** ✅
- [ ] **Application health check passed:** ✅
- [ ] **Critical user flows tested:** ✅

### Phase 3: Verification & Recovery
- [ ] **Production smoke tests passed:**
  - [ ] User authentication working
  - [ ] Work order creation working  
  - [ ] GRN processing working
  - [ ] Reports generation working
- [ ] **Performance metrics restored:** (response times, error rates)
- [ ] **Third-party integrations functional:** 
- [ ] **Maintenance page removed:**

## Post-Rollback Actions

### Immediate (within 1 hour)
- [ ] **Incident status communicated:** (all stakeholders)
- [ ] **System monitoring enhanced:** (alerts, dashboards)
- [ ] **User impact assessment:** (data loss, workflow disruption)
- [ ] **Rollback summary documented:** (what worked, what didn't)

### Short-term (within 24 hours)
- [ ] **Root cause analysis initiated:** 
- [ ] **Forward-fix timeline established:**
- [ ] **User communication plan executed:**
- [ ] **Compliance notifications sent:** (if required)

### Long-term (within 1 week)
- [ ] **Post-incident review scheduled:**
- [ ] **Process improvements identified:**
- [ ] **Preventive measures implemented:**
- [ ] **Documentation updated:**

## Rollback Metrics

| Metric | Target | Actual |
|--------|---------|---------|
| Time to decision | <15 min | _____ |
| Time to database rollback | <30 min | _____ |
| Time to application rollback | <45 min | _____ |
| Total downtime | <60 min | _____ |
| Data loss | 0 records | _____ |

## Sign-off

- **Rollback executed by:** _________________ (timestamp: _______)
- **Technical verification:** _________________ (timestamp: _______)
- **Business approval:** _________________ (CEO/Director, timestamp: _______)

## Related Procedures

- [PITR Checkpoint Creation](#backup-pitr-checklist)
- [Incident Response Playbook](../docs/procedures/INCIDENT_RESPONSE.md)
- [Disaster Recovery Plan](../docs/procedures/DISASTER_RECOVERY.md)

---

**⚠️ Remember:** This template should be pre-filled during normal deployments and kept updated with current release information.