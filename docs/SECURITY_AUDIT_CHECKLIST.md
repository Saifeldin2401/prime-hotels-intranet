# Security Audit Checklist
## Altus Connect Intranet System

**Audit Date:** _______________  
**Auditor:** _______________  
**Scope:** _______________  
**Classification:** INTERNAL USE ONLY

---

## 1. Authentication & Access Control

### 1.1 Password Policies

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1.1.1 | Minimum password length is 14+ characters | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 1.1.2 | Password complexity requires 3+ character types | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 1.1.3 | Password history prevents reuse (24+ previous) | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 1.1.4 | No password expiration for standard users | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 1.1.5 | Service accounts use 32+ character random passwords | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 1.1.6 | Password manager usage is enforced | ⬜ Pass ⬜ Fail ⬜ N/A | |

### 1.2 Multi-Factor Authentication

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1.2.1 | MFA is required for all administrative accounts | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 1.2.2 | MFA is required for all remote access | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 1.2.3 | Hardware tokens or authenticator apps used (not SMS) | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 1.2.4 | MFA enrollment rate is >90% | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 1.2.5 | MFA bypass is not available without approval | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 1.2.6 | Backup codes are provided and securely stored | ⬜ Pass ⬜ Fail ⬜ N/A | |

### 1.3 Session Management

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1.3.1 | Sessions timeout after 30 minutes of inactivity | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 1.3.2 | Concurrent session limits are enforced | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 1.3.3 | Session invalidation works across all devices | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 1.3.4 | Secure session cookies (HttpOnly, Secure, SameSite) | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 1.3.5 | JWT tokens have appropriate expiration (1 hour) | ⬜ Pass ⬜ Fail ⬜ N/A | |

### 1.4 Access Control

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1.4.1 | Principle of least privilege is enforced | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 1.4.2 | Role-based access control (RBAC) is implemented | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 1.4.3 | Privileged access requires approval workflow | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 1.4.4 | Access reviews conducted quarterly | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 1.4.5 | Terminated employee access revoked within 24 hours | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 1.4.6 | Break-glass accounts exist and are secured | ⬜ Pass ⬜ Fail ⬜ N/A | |

---

## 2. Application Security

### 2.1 Input Validation

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 2.1.1 | All user inputs are validated on server-side | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 2.1.2 | Input validation uses whitelist approach | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 2.1.3 | SQL injection prevention implemented (parameterized queries) | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 2.1.4 | File upload restrictions enforced (type, size, extension) | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 2.1.5 | Special characters are properly handled | ⬜ Pass ⬜ Fail ⬜ N/A | |

### 2.2 Output Encoding

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 2.2.1 | Output encoding prevents XSS attacks | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 2.2.2 | HTML content is sanitized before display | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 2.2.3 | Content Security Policy (CSP) is implemented | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 2.2.4 | Auto-escaping is enabled in template engine | ⬜ Pass ⬜ Fail ⬜ N/A | |

### 2.3 Authentication Flow

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 2.3.1 | Login errors don't reveal valid usernames | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 2.3.2 | Account lockout after 5 failed attempts | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 2.3.3 | Password reset tokens expire after short time (15 min) | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 2.3.4 | Password reset links are single-use | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 2.3.5 | Registration requires email verification | ⬜ Pass ⬜ Fail ⬜ N/A | |

### 2.4 API Security

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 2.4.1 | APIs require authentication | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 2.4.2 | Rate limiting is implemented | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 2.4.3 | API keys are not exposed in client-side code | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 2.4.4 | CORS is properly configured | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 2.4.5 | API versioning is in place | ⬜ Pass ⬜ Fail ⬜ N/A | |

---

## 3. Database Security

### 3.1 Access Control

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 3.1.1 | Database uses strong authentication | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 3.1.2 | Default database passwords changed | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 3.1.3 | Database accounts follow least privilege | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 3.1.4 | Row Level Security (RLS) policies are enabled | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 3.1.5 | RLS policies are tested and effective | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 3.1.6 | Direct database access is restricted | ⬜ Pass ⬜ Fail ⬜ N/A | |

### 3.2 Data Protection

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 3.2.1 | Sensitive data is encrypted at rest (AES-256) | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 3.2.2 | Data in transit uses TLS 1.3 | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 3.2.3 | PII fields are encrypted or tokenized | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 3.2.4 | Database backups are encrypted | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 3.2.5 | Encryption keys are properly managed | ⬜ Pass ⬜ Fail ⬜ N/A | |

### 3.3 Audit Logging

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 3.3.1 | Database audit logging is enabled | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 3.3.2 | All data modifications are logged | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 3.3.3 | Audit logs include user ID and timestamp | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 3.3.4 | Audit logs are tamper-resistant | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 3.3.5 | Audit logs are retained for required period (7 years) | ⬜ Pass ⬜ Fail ⬜ N/A | |

---

## 4. Infrastructure Security

### 4.1 Network Security

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 4.1.1 | Firewall rules follow least privilege | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 4.1.2 | Unnecessary ports are closed | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 4.1.3 | DDoS protection is enabled | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 4.1.4 | IP allowlisting for admin access | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 4.1.5 | Network segmentation is implemented | ⬜ Pass ⬜ Fail ⬜ N/A | |

### 4.2 Web Server Security

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 4.2.1 | HTTPS is enforced (HSTS enabled) | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 4.2.2 | SSL/TLS certificate is valid and strong | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 4.2.3 | Security headers are configured | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 4.2.4 | Server version information is hidden | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 4.2.5 | Directory listing is disabled | ⬜ Pass ⬜ Fail ⬜ N/A | |

### 4.3 Security Headers Check

| Header | Expected Value | Status | Notes |
|--------|---------------|--------|-------|
| Content-Security-Policy | Defined | ⬜ Pass ⬜ Fail | |
| Strict-Transport-Security | max-age=31536000 | ⬜ Pass ⬜ Fail | |
| X-Content-Type-Options | nosniff | ⬜ Pass ⬜ Fail | |
| X-Frame-Options | DENY | ⬜ Pass ⬜ Fail | |
| X-XSS-Protection | 1; mode=block | ⬜ Pass ⬜ Fail | |
| Referrer-Policy | strict-origin-when-cross-origin | ⬜ Pass ⬜ Fail | |

### 4.4 Hosting Platform (Netlify/Vercel)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 4.4.1 | Team access uses SSO/MFA | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 4.4.2 | Deploy previews are protected | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 4.4.3 | Environment variables are encrypted | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 4.4.4 | Build logs don't expose secrets | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 4.4.5 | Branch protection rules enabled | ⬜ Pass ⬜ Fail ⬜ N/A | |

---

## 5. Data Protection

### 5.1 Data Classification

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 5.1.1 | Data classification policy exists | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 5.1.2 | Data inventory is maintained | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 5.1.3 | PII is identified and protected | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 5.1.4 | Data retention policies enforced | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 5.1.5 | Secure data deletion procedures exist | ⬜ Pass ⬜ Fail ⬜ N/A | |

### 5.2 Backup and Recovery

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 5.2.1 | Automated backups are configured | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 5.2.2 | Backups are encrypted | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 5.2.3 | Backup restoration is tested quarterly | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 5.2.4 | RTO and RPO are defined and met | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 5.2.5 | Offsite/offline backups exist | ⬜ Pass ⬜ Fail ⬜ N/A | |

### 5.3 Data Loss Prevention

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 5.3.1 | Bulk data export requires approval | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 5.3.2 | Data exfiltration monitoring enabled | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 5.3.3 | Email DLP rules are configured | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 5.3.4 | USB/storage device restrictions | ⬜ Pass ⬜ Fail ⬜ N/A | |

---

## 6. Logging and Monitoring

### 6.1 Security Logging

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 6.1.1 | Security events are logged | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 6.1.2 | Logs include user ID, timestamp, IP, action | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 6.1.3 | Failed authentication attempts are logged | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 6.1.4 | Privileged actions are logged | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 6.1.5 | Data access is logged | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 6.1.6 | Log integrity is protected | ⬜ Pass ⬜ Fail ⬜ N/A | |

### 6.2 Monitoring and Alerting

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 6.2.1 | SIEM or centralized logging in place | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 6.2.2 | Real-time alerting configured | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 6.2.3 | Alert thresholds are appropriate | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 6.2.4 | Alert response procedures documented | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 6.2.5 | After-hours alerting works | ⬜ Pass ⬜ Fail ⬜ N/A | |

### 6.3 Log Retention

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 6.3.1 | Log retention policy documented | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 6.3.2 | Security logs retained 1+ years | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 6.3.3 | Audit logs retained 7+ years | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 6.3.4 | Log archival process is automated | ⬜ Pass ⬜ Fail ⬜ N/A | |

---

## 7. Incident Response

### 7.1 Incident Response Plan

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 7.1.1 | Incident response plan is documented | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 7.1.2 | Plan is reviewed annually | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 7.1.3 | IRT roles and contacts are current | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 7.1.4 | Plan is tested annually (tabletop exercise) | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 7.1.5 | Post-incident procedures defined | ⬜ Pass ⬜ Fail ⬜ N/A | |

### 7.2 Communication

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 7.2.1 | Communication plan documented | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 7.2.2 | Out-of-band communication available | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 7.2.3 | External contact list maintained | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 7.2.4 | Breach notification templates ready | ⬜ Pass ⬜ Fail ⬜ N/A | |

### 7.3 Forensics

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 7.3.1 | Forensic tools available | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 7.3.2 | Chain of custody forms available | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 7.3.3 | Evidence storage is secure | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 7.3.4 | External forensics contact established | ⬜ Pass ⬜ Fail ⬜ N/A | |

---

## 8. Third-Party and Supply Chain

### 8.1 Vendor Management

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 8.1.1 | Vendor risk assessment completed | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 8.1.2 | Security requirements in contracts | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 8.1.3 | Vendor security assessments current | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 8.1.4 | Critical vendor SOC 2/ISO 27001 verified | ⬜ Pass ⬜ Fail ⬜ N/A | |

### 8.2 Third-Party Services

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 8.2.1 | Supabase security settings reviewed | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 8.2.2 | Netlify/Vercel security settings reviewed | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 8.2.3 | Third-party API keys rotated regularly | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 8.2.4 | Dependency vulnerabilities monitored | ⬜ Pass ⬜ Fail ⬜ N/A | |

---

## 9. Security Governance

### 9.1 Policies and Procedures

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 9.1.1 | Information security policy exists | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 9.1.2 | Acceptable use policy exists | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 9.1.3 | Data classification policy exists | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 9.1.4 | Password policy exists | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 9.1.5 | Remote access policy exists | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 9.1.6 | Policies reviewed annually | ⬜ Pass ⬜ Fail ⬜ N/A | |

### 9.2 Training and Awareness

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 9.2.1 | Security awareness training completed by all | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 9.2.2 | Phishing simulations run monthly | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 9.2.3 | Developer secure coding training completed | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 9.2.4 | Training records maintained | ⬜ Pass ⬜ Fail ⬜ N/A | |

### 9.3 Compliance

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 9.3.1 | GDPR compliance maintained | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 9.3.2 | Data processing agreements in place | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 9.3.3 | Privacy policy is current | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 9.3.4 | Cookie consent implemented | ⬜ Pass ⬜ Fail ⬜ N/A | |

---

## 10. Physical Security (if applicable)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 10.1 | Office access controls in place | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 10.2 | Visitor management process exists | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 10.3 | Clean desk policy enforced | ⬜ Pass ⬜ Fail ⬜ N/A | |
| 10.4 | Equipment disposal is secure | ⬜ Pass ⬜ Fail ⬜ N/A | |

---

## Summary

### Scoring

| Category | Total Checks | Pass | Fail | N/A | Pass Rate |
|----------|-------------|------|------|-----|-----------|
| 1. Authentication & Access Control | 18 | | | | % |
| 2. Application Security | 15 | | | | % |
| 3. Database Security | 16 | | | | % |
| 4. Infrastructure Security | 19 | | | | % |
| 5. Data Protection | 14 | | | | % |
| 6. Logging and Monitoring | 14 | | | | % |
| 7. Incident Response | 12 | | | | % |
| 8. Third-Party and Supply Chain | 8 | | | | % |
| 9. Security Governance | 16 | | | | % |
| 10. Physical Security | 4 | | | | % |
| **TOTAL** | **136** | | | | **%** |

### Critical Findings

| # | Finding | Severity | Recommendation | Owner | Due Date |
|---|---------|----------|----------------|-------|----------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

### Overall Assessment

- ⬜ **COMPLIANT** - Meets security standards
- ⬜ **COMPLIANT WITH REMEDIATION** - Minor issues identified
- ⬜ **NON-COMPLIANT** - Significant issues require immediate attention

### Remediation Plan

| Priority | Action Item | Owner | Target Date |
|----------|-------------|-------|-------------|
| Critical | | | |
| High | | | |
| Medium | | | |
| Low | | | |

---

## Signatures

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Auditor** | | | |
| **CISO** | | | |
| **CTO** | | | |
| **Date Completed** | | | |

---

## Next Steps

1. ⬜ Distribute findings to stakeholders
2. ⬜ Create remediation tickets
3. ⬜ Schedule follow-up audit
4. ⬜ Update security documentation
5. ⬜ Brief executive team on results

---

*This audit checklist should be completed quarterly for critical systems and annually for all systems.*
