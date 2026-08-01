# Incident Response Quick Reference Card
## Altus Connect Intranet System

**🚨 SECURITY HOTLINE: [24/7 NUMBER]**  
**📧 security@prime-hotels.com**

---

## Immediate Actions (First 15 Minutes)

```
1. ⬜ ACKNOWLEDGE
   → Document start time
   → Create incident ticket: INC-YYYY-NNNN

2. ⬜ ASSESS
   → Confirm if real incident or false positive
   → Determine severity (P1/P2/P3/P4)
   → Identify affected systems

3. ⬜ ALERT
   P1 (Critical): Call CISO + CTO + Legal immediately
   P2 (High): Notify Security Team + IT Director
   P3/P4: Create ticket, handle during business hours

4. ⬜ PRESERVE
   → DO NOT shut down compromised systems
   → Capture memory dump if possible
   → Screenshot suspicious activity
   → Save relevant logs
```

---

## Severity Classification

| Severity | Examples | Response Time | Notify |
|----------|----------|---------------|--------|
| **P1 - Critical** 🔴 | Active breach, ransomware, data exfiltration | 15 min | CISO, CTO, Legal, CEO |
| **P2 - High** 🟠 | Malware detected, unauthorized access | 1 hour | Security Team, IT Director |
| **P3 - Medium** 🟡 | Policy violation, phishing attempt | 4 hours | Team Lead |
| **P4 - Low** 🟢 | Failed logins, port scans | 24 hours | Auto-ticket |

---

## Contact Escalation

```
First Responder (You)
        ↓
Security Analyst / On-Call
        ↓
┌───────┴───────┐
P1/P2          P3/P4
  ↓              ↓
CISO         Team Lead
  ↓
CTO + Legal + CEO
```

---

## Containment Actions

### Network Isolation
```bash
# Block IP at firewall
block-ip 192.168.1.100

# Isolate system (network port shutdown)
switch# configure terminal
switch(config)# interface GigabitEthernet0/1
switch(config-if)# shutdown

# DNS sinkhole malicious domain
echo "0.0.0.0 malicious-domain.com" >> /etc/hosts.blocked
```

### Account Actions
```sql
-- Disable user account
UPDATE users SET disabled = true WHERE id = 'user-uuid';

-- Revoke all sessions
SELECT auth.sign_out('user-uuid');

-- Force password reset
UPDATE auth.users 
SET encrypted_password = NULL,
    raw_user_meta_data = raw_user_meta_data || '{"require_password_change": true}'
WHERE id = 'user-uuid';
```

---

## Evidence Collection

### Priority Order
1. **Memory** (volatile - capture first)
2. **Running processes**
3. **Network connections**
4. **Disk image**
5. **Logs**

### Quick Commands
```bash
# List running processes
ps aux > /evidence/processes.txt

# List network connections
netstat -ano > /evidence/network.txt

# Capture memory (if tool available)
magnetramcapture /evidence/memory.raw

# Create disk image
dd if=/dev/sda of=/evidence/disk-image.dd bs=4M
```

---

## Communication Templates

### Internal Alert (Slack/Teams)
```
🚨 SECURITY INCIDENT ALERT 🚨

ID: INC-2026-001
Severity: P1 - Critical
Status: Active Investigation

SUMMARY:
[One-line description]

AFFECTED:
[System/Service names]

ACTIONS TAKEN:
[What you've done so far]

NEXT UPDATE:
[Time of next communication]

War Room: [Conference Bridge]
Incident Commander: [Name]
```

### Executive Summary
```
EXECUTIVE SECURITY BRIEFING

Date/Time: [Timestamp]
Incident ID: INC-YYYY-NNNN

SITUATION:
[2-3 sentence summary]

BUSINESS IMPACT:
[Customer impact, revenue impact, reputation]

ACTIONS IN PROGRESS:
[Current response activities]

COMMUNICATIONS STATUS:
[Who has been notified / needs notification]

NEXT BRIEFING:
[When you'll update next]
```

---

## Common Incident Types

### Ransomware Detected
```
1. ISOLATE affected systems immediately
2. DO NOT pay ransom (consult Legal)
3. Preserve evidence before cleanup
4. Activate disaster recovery procedures
5. Notify cyber insurance carrier
6. Engage external forensics if needed
```

### Data Breach Suspected
```
1. CONTAIN access immediately
2. PRESERVE all logs and evidence
3. ASSESS scope (what data, how many records)
4. NOTIFY Legal within 1 hour
5. Check regulatory notification requirements
6. Prepare breach notifications (72h for GDPR)
```

### Account Compromised
```
1. DISABLE account immediately
2. REVOKE all active sessions
3. RESET password
4. AUDIT recent activity (last 24-48 hours)
5. CHECK for privilege escalation
6. REQUIRE MFA re-enrollment
7. NOTIFY user via OUT-OF-BAND method
```

### DDoS Attack
```
1. ACTIVATE DDoS mitigation (CloudFlare/AWS Shield)
2. SCALE up resources if needed
3. CONTACT ISP/hosting provider
4. IMPLEMENT rate limiting
5. DOCUMENT attack patterns
6. PREPARE law enforcement report if needed
```

---

## Key Resources

### Documentation
- Full IRP: `/docs/INCIDENT_RESPONSE_PLAN.md`
- Technical Guide: `/docs/SECURITY_IMPLEMENTATION_GUIDE.md`
- System Architecture: `SYSTEM_ARCHITECTURE.md`

### Tools Access
| Tool | URL | Login |
|------|-----|-------|
| Supabase Dashboard | https://app.supabase.com | SSO |
| Netlify Dashboard | https://app.netlify.com | SSO |
| Security Monitoring | [SIEM_URL] | SSO |
| Password Vault | [VAULT_URL] | Hardware Token |

### External Contacts
| Service | Provider | Phone |
|---------|----------|-------|
| Cyber Insurance | [CARRIER] | [HOTLINE] |
| External Forensics | [FIRM] | [HOTLINE] |
| Legal Counsel | [FIRM] | [PHONE] |
| Supabase Support | Supabase | support@supabase.com |
| Netlify Support | Netlify | support@netlify.com |

---

## Regulatory Notification Requirements

| Regulation | When to Notify | Timeline | Contact |
|------------|----------------|----------|---------|
| **GDPR** | Personal data breach | 72 hours to SA | Legal |
| **GDPR** | High risk to individuals | Without delay | Legal |
| **State Laws** | Personal info breach | 24-60 days | Legal |
| **PCI DSS** | Cardholder data compromise | Immediately | Legal |
| **Cyber Insurance** | Any covered incident | 24 hours | IR Commander |

---

## Post-Incident Checklist

```
Within 24 Hours:
⬜ Submit initial incident report
⬜ Complete evidence inventory
⬜ Document timeline of events
⬜ Brief executive team

Within 5 Days:
⬜ Conduct lessons learned meeting
⬜ Complete final incident report
⬜ Update security controls
⬜ Brief all staff if needed

Within 30 Days:
⬜ Implement process improvements
⬜ Update incident response plan
⬜ Conduct follow-up training
⬜ Verify control effectiveness
```

---

## Remember

> **"Detect Early, Respond Fast, Contain Quickly, Recover Safely"**

### Key Principles
- 🎯 **Safety First**: Ensure physical safety before technical response
- 🔒 **Preserve Evidence**: Don't destroy forensic evidence
- 📢 **Communicate**: Keep stakeholders informed
- 📋 **Document**: Record everything you do
- 🧘 **Stay Calm**: Follow the plan, one step at a time

---

*Keep this card accessible at all times during security incidents.*
*Last Updated: 2026-04-07*
