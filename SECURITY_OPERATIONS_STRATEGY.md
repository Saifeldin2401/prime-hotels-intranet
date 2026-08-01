# Comprehensive Security Operations Strategy
## Web Application Monitoring, Detection & Tooling

**Version:** 1.0  
**Classification:** Internal Use  
**Last Updated:** April 2026

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Monitoring & Detection Systems](#1-monitoring--detection-systems)
3. [Web Application Firewall (WAF)](#2-web-application-firewall-waf)
4. [Security Scanning Tools](#3-security-scanning-tools)
5. [Backup & Disaster Recovery](#4-backaster-recovery)
6. [Logging & Auditing](#5-logging--auditing)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Budget Considerations](#budget-considerations)

---

## Executive Summary

This document outlines a defense-in-depth security operations strategy encompassing prevention, detection, response, and recovery capabilities. The strategy is designed to protect web applications against modern cyber threats while ensuring business continuity.

### Security Posture Goals
- **Mean Time to Detect (MTTD):** < 5 minutes for critical threats
- **Mean Time to Respond (MTTR):** < 30 minutes for critical incidents
- **Availability Target:** 99.9% uptime
- **Data Loss Prevention:** Zero tolerance for PII/PHI exfiltration

---

## 1. Monitoring & Detection Systems

### 1.1 Intrusion Detection Systems (IDS)

#### Network-Based IDS (NIDS)

| Tool | Type | Best For | Cost |
|------|------|----------|------|
| **Suricata** | Open Source | High-performance network monitoring | Free |
| **Zeek (Bro)** | Open Source | Deep protocol analysis | Free |
| **Snort** | Open Source | Signature-based detection | Free/Paid |
| **Darktrace** | Commercial | AI-powered threat detection | $$$$ |

**Recommended: Suricata + Zeek**

```yaml
# Suricata Configuration Example (suricata.yaml)
%YAML 1.1
---
vars:
  address-groups:
    HOME_NET: "[192.168.0.0/16,10.0.0.0/8]"
    EXTERNAL_NET: "!$HOME_NET"
    HTTP_SERVERS: "$HOME_NET"
    SQL_SERVERS: "$HOME_NET"
    DNS_SERVERS: "$HOME_NET"

af-packet:
  - interface: eth0
    cluster-id: 99
    cluster-type: cluster_flow
    defrag: yes
    use-mmap: yes

# Enable rule categories
rule-files:
  - botnet.rules
  - malware.rules
  - exploit.rules
  - web-specific-threats.rules

# Detection thresholds
detection-engine:
  detect-profile: custom
  custom-values:
    inspect-recursion-limit: 3000
    toclient-groups: 2
    toserver-groups: 2

# EVE JSON logging for SIEM integration
outputs:
  - eve-log:
      enabled: yes
      filetype: regular
      filename: eve.json
      types:
        - alert:
            tagged-packets: yes
        - http:
            extended: yes
        - dns
        - tls
        - files
        - smtp
        - ssh
        - stats
```

**Pros of Suricata:**
- ✅ Multi-threaded architecture (high performance)
- ✅ Automatic protocol detection
- ✅ Native TLS/SSL inspection
- ✅ File extraction capabilities
- ✅ EVE JSON output for SIEM integration

**Cons:**
- ❌ Steep learning curve
- ❌ Requires tuning to reduce false positives
- ❌ Significant hardware requirements for high-throughput networks

---

#### Host-Based IDS (HIDS)

| Tool | Platform | Best For | Cost |
|------|----------|----------|------|
| **Wazuh** | Cross-platform | Endpoint detection & response | Free |
| **OSSEC** | Cross-platform | Log analysis, file integrity | Free |
| **Samhain** | Linux/Unix | File integrity monitoring | Free |
| **CrowdStrike Falcon** | Cross-platform | Enterprise EDR | $$$ |
| **Microsoft Defender for Endpoint** | Windows | Windows-centric environments | $$ |

**Recommended: Wazuh**

```xml
<!-- Wazuh Agent Configuration (ossec.conf) -->
<ossec_config>
  <!-- File Integrity Monitoring -->
  <syscheck>
    <directories check_all="yes">/etc,/usr/bin,/usr/sbin</directories>
    <directories check_all="yes">/bin,/sbin,/boot</directories>
    <directories check_all="yes" report_changes="yes">/var/www/html</directories>
    <ignore>/etc/mtab</ignore>
    <ignore>/etc/prelink.cache</ignore>
    <frequency>43200</frequency>
    <scan_on_start>yes</scan_on_start>
    
    <!-- Real-time monitoring for critical files -->
    <directories check_all="yes" realtime="yes">/var/www/html/config</directories>
    <directories check_all="yes" realtime="yes">/opt/application</directories>
  </syscheck>

  <!-- Rootkit Detection -->
  <rootcheck>
    <rootkit_files>/var/ossec/etc/shared/rootkit_files.txt</rootkit_files>
    <rootkit_trojans>/var/ossec/etc/shared/rootkit_trojans.txt</rootkit_trojans>
    <frequency>3600</frequency>
  </rootcheck>

  <!-- Log Analysis -->
  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/auth.log</location>
  </localfile>
  
  <localfile>
    <log_format>apache</log_format>
    <location>/var/log/apache2/access.log</location>
  </localfile>
  
  <localfile>
    <log_format>json</log_format>
    <location>/var/log/application/app.log</location>
  </localfile>

  <!-- Active Response -->
  <active-response>
    <command>host-deny</command>
    <location>local</location>
    <rules_id>5712,100100</rules_id>
    <repeated_offenders>30,60,120,240</repeated_offenders>
  </active-response>

  <!-- Vulnerability Detection -->
  <vulnerability-detector>
    <enabled>yes</enabled>
    <interval>5m</interval>
    <min_full_scan_interval>6h</min_full_scan_interval>
    <run_on_start>yes</run_on_start>
    <provider name="canonical">
      <enabled>yes</enabled>
      <os>focal</os>
      <os>jammy</os>
    </provider>
    <provider name="nvd">
      <enabled>yes</enabled>
      <update_from_year>2010</update_from_year>
    </provider>
  </vulnerability-detector>
</ossec_config>
```

**Custom Wazuh Rules for Web Applications:**

```xml
<!-- /var/ossec/etc/rules/local_rules.xml -->
<group name="webapp,access_control,">
  <!-- Detect multiple failed logins -->
  <rule id="100100" level="10" frequency="5" timeframe="120">
    <if_matched_sid>100101</if_matched_sid>
    <same_source_ip />
    <description>Multiple web login failures from same IP</description>
    <group>authentication_failures,</group>
  </rule>

  <!-- Detect SQL injection attempts -->
  <rule id="100200" level="12">
    <if_sid>31100</if_sid>
    <url>union|select|insert|delete|update|drop|exec|script</url>
    <description>SQL Injection attempt detected</description>
    <group>attack,sql_injection,</group>
  </rule>

  <!-- Detect XSS attempts -->
  <rule id="100300" level="12">
    <if_sid>31100</if_sid>
    <url><script|javascript:|onerror=|onload=|alert\(|document\.cookie</url>
    <description>XSS attempt detected</description>
    <group>attack,xss,</group>
  </rule>

  <!-- Detect suspicious user agents -->
  <rule id="100400" level="8">
    <if_sid>31100</if_sid>
    <match>sqlmap|nikto|nmap|masscan|gobuster|dirb</match>
    <description>Scanning tool user agent detected</description>
    <group>recon,</group>
  </rule>

  <!-- File upload abuse -->
  <rule id="100500" level="10">
    <if_sid>31100</if_sid>
    <url>\.php$|\.jsp$|\.asp$|\.aspx$</url>
    <match>POST</match>
    <description>Potential malicious file upload attempt</description>
    <group>attack,</group>
  </rule>
</group>
```

---

### 1.2 Intrusion Prevention Systems (IPS)

| Solution | Deployment | Best For | Cost |
|----------|------------|----------|------|
| **Suricata (IPS mode)** | Inline | Open-source IPS | Free |
| **Snort (IPS mode)** | Inline | Signature-based prevention | Free/Paid |
| **pfSense + Snort** | Gateway | SMB network protection | Free |
| **Fortinet FortiGate** | Hardware/Virtual | Enterprise IPS | $$$ |
| **Palo Alto PA-Series** | Hardware | Advanced threat prevention | $$$$ |

**Recommended: Suricata in IPS Mode (inline)**

```yaml
# IPS Mode Configuration
default-rule-path: /etc/suricata/rules
rule-files:
  - emerging-exploit.rules
  - emerging-web_specific_apps.rules
  - emerging-malware.rules
  - emerging-policy.rules

# Thresholding to prevent DoS
threshold-file: /etc/suricata/threshold.config

# IPS Action configuration
action-order:
  - pass
  - drop
  - reject
  - alert

# Drop rules for active threats
drop-rules:
  - alert tcp any any -> $HOME_NET $HTTP_PORTS (msg:"ET WEB_SPECIFIC_APPS WordPress Exploit"; content:"wp-admin"; nocase; sid:2010001; rev:1;)
```

---

### 1.3 SIEM (Security Information and Event Management)

| SIEM Solution | Best For | Deployment | Cost |
|---------------|----------|------------|------|
| **Wazuh + Elasticsearch** | Unified XDR/SIEM | On-prem/Cloud | Free |
| **Splunk Enterprise Security** | Enterprise-scale | On-prem/Cloud | $$$$ |
| **IBM QRadar** | Large enterprises | On-prem/Cloud | $$$$ |
| **Microsoft Sentinel** | Azure ecosystems | Cloud-native | $$ |
| **Elastic Security** | Open-source/SaaS | Hybrid | Free-$$$ |
| **Chronicle (Google)** | Cloud-native | GCP | $$ |
| **Securonix** | UEBA-focused | Cloud | $$$ |

**Recommended: Elastic Security (ELK Stack)**

```yaml
# docker-compose.yml for Elastic Security
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=true
      - ELASTIC_PASSWORD=changeme
    volumes:
      - es_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    mem_limit: 4g

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      - ELASTICSEARCH_USERNAME=elastic
      - ELASTICSEARCH_PASSWORD=changeme
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

  filebeat:
    image: docker.elastic.co/beats/filebeat:8.11.0
    user: root
    volumes:
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    depends_on:
      - logstash

volumes:
  es_data:
```

```conf
# Logstash Pipeline Configuration (logstash.conf)
input {
  beats {
    port => 5044
  }
  syslog {
    port => 514
  }
  http {
    port => 8080
    codec => json
  }
}

filter {
  if [type] == "suricata" {
    json {
      source => "message"
    }
    mutate {
      add_field => { "[@metadata][target_index]" => "suricata-logs" }
    }
  }
  
  if [type] == "wazuh-alerts" {
    json {
      source => "message"
    }
    date {
      match => [ "timestamp", "ISO8601" ]
    }
  }

  # Normalize web application logs
  if [type] == "web-access" {
    grok {
      match => { 
        "message" => '%{COMBINEDAPACHELOG}' 
      }
    }
    geoip {
      source => "clientip"
      target => "geoip"
    }
    useragent {
      source => "agent"
      target => "useragent"
    }
  }
}

output {
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    user => "elastic"
    password => "changeme"
    index => "%{[@metadata][target_index]}-%{+YYYY.MM.dd}"
    ilm_enabled => true
    ilm_rollover_alias => "security-logs"
    ilm_pattern => "{now/d}-000001"
    ilm_policy => "security-logs-policy"
  }
}
```

**SIEM Dashboard Configuration:**

```json
// Kibana Dashboard Export (security-overview.json)
{
  "version": "8.11.0",
  "objects": [
    {
      "id": "security-overview",
      "type": "dashboard",
      "attributes": {
        "title": "Security Operations Overview",
        "hits": 0,
        "description": "Real-time security monitoring dashboard",
        "panelsJSON": JSON.stringify([
          {
            "id": "alert-timeline",
            "type": "visualization",
            "gridData": { "x": 0, "y": 0, "w": 24, "h": 8 }
          },
          {
            "id": "threat-map",
            "type": "visualization", 
            "gridData": { "x": 24, "y": 0, "w": 24, "h": 15 }
          },
          {
            "id": "top-attacks",
            "type": "visualization",
            "gridData": { "x": 0, "y": 8, "w": 12, "h": 15 }
          },
          {
            "id": "failed-logins",
            "type": "visualization",
            "gridData": { "x": 12, "y": 8, "w": 12, "h": 15 }
          }
        ])
      }
    }
  ]
}
```

---

### 1.4 Real-Time Alerting Configuration

**Elastic Security Alerting Rules:**

```yaml
# Alert Rules Configuration
rules:
  - name: "Critical Authentication Failures"
    type: threshold
    index: ["wazuh-alerts-*"]
    query: 'rule.groups: "authentication_failures" AND rule.level: >= 10'
    threshold:
      field: source.ip
      value: 5
      timeframe: 5m
    actions:
      - type: webhook
        url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
        body: |
          {
            "text": "🚨 CRITICAL: Multiple authentication failures from {{source.ip}}"
          }
      - type: email
        to: ["security-team@company.com"]
        subject: "Critical Authentication Alert"

  - name: "SQL Injection Detected"
    type: query
    index: ["suricata-*"]
    query: 'alert.signature: "SQL Injection" AND alert.severity: >= 2'
    actions:
      - type: webhook
        url: "https://pagerduty.com/integration/your-key"
        body: |
          {
            "routing_key": "YOUR_ROUTING_KEY",
            "event_action": "trigger",
            "payload": {
              "summary": "SQL Injection attack detected from {{src_ip}}",
              "severity": "critical"
            }
          }

  - name: "Data Exfiltration Pattern"
    type: machine_learning
    job_id: "data-transfer-ml-job"
    anomaly_score: 75
    actions:
      - type: index
        index: "security-anomalies"
      - type: webhook
        url: "https://api.splunk.com/..."

  - name: "Brute Force Detection"
    type: eql
    query: |
      sequence by source.ip
        [authentication where event.outcome == "failure"]
        [authentication where event.outcome == "failure"]
        [authentication where event.outcome == "failure"]
        [authentication where event.outcome == "failure"]
        [authentication where event.outcome == "failure"]
      within 5 minutes
    actions:
      - type: webhook
        url: "https://automation.company.com/block-ip"
        body: '{"ip": "{{source.ip}}", "duration": "1h"}'
```

---

### 1.5 Behavioral Analytics (UEBA)

**User and Entity Behavior Analytics Components:**

| Component | Tool | Purpose |
|-----------|------|---------|
| **Baseline Learning** | Elastic ML | Establish normal behavior patterns |
| **Anomaly Detection** | Wazuh + Prelert | Detect deviations from baseline |
| **Risk Scoring** | Splunk UBA | Calculate user risk scores |
| **Peer Group Analysis** | Securonix | Compare user behavior to peers |

**Elastic Machine Learning Configuration:**

```json
// ML Job Configuration for UEBA
{
  "job_id": "webapp-user-behavior",
  "description": "Detect anomalous user behavior patterns",
  "analysis_config": {
    "bucket_span": "1h",
    "detectors": [
      {
        "function": "rare",
        "by_field_name": "user.name",
        "over_field_name": "source.ip"
      },
      {
        "function": "high_count",
        "by_field_name": "user.name"
      },
      {
        "function": "sum",
        "field_name": "http.response.bytes",
        "by_field_name": "user.name"
      }
    ],
    "influencers": ["user.name", "source.ip", "user_agent.original"]
  },
  "data_description": {
    "time_field": "@timestamp",
    "time_format": "epoch_ms"
  },
  "model_plot_config": {
    "enabled": true
  }
}
```

---

## 2. Web Application Firewall (WAF)

### 2.1 WAF Solution Comparison

| WAF Solution | Deployment | OWASP CRS | Custom Rules | Virtual Patching | Cost |
|--------------|------------|-----------|--------------|------------------|------|
| **ModSecurity + CRS** | Self-hosted | ✅ Full | ✅ Unlimited | ✅ Yes | Free |
| **Cloudflare WAF** | Cloud/CDN | ✅ Full | ✅ Business+ | ✅ Rapid | Free-$$$ |
| **AWS WAF** | Cloud-native | ✅ Via Marketplace | ✅ Yes | ✅ Via Rules | $ |
| **Azure Front Door WAF** | Azure | ✅ Full | ✅ Yes | ✅ Yes | $ |
| **F5 BIG-IP ASM** | Hardware/Virtual | ✅ Full | ✅ Yes | ✅ Yes | $$$$ |
| **Imperva Cloud WAF** | Cloud | ✅ Full | ✅ Yes | ✅ Yes | $$$ |
| **NGINX App Protect** | Self-hosted | ✅ Full | ✅ Yes | ✅ Yes | $$ |

### 2.2 Recommended: ModSecurity with OWASP CRS

**Apache Configuration:**

```apache
# /etc/apache2/conf-enabled/modsecurity.conf
<IfModule security2_module>
    # Enable ModSecurity
    SecRuleEngine On
    
    # DetectionOnly for initial tuning, switch to On after validation
    # SecRuleEngine DetectionOnly
    
    # Audit Logging
    SecAuditEngine RelevantOnly
    SecAuditLogRelevantStatus "^(?:5|4(?!04))"
    SecAuditLogParts ABIJDEFHZ
    SecAuditLogType Serial
    SecAuditLog /var/log/apache2/modsec_audit.log
    
    # Debug Logging (disable in production)
    SecDebugLog /var/log/apache2/modsec_debug.log
    SecDebugLogLevel 0
    
    # Include OWASP Core Rule Set
    Include /usr/share/modsecurity-crs/crs-setup.conf
    Include /usr/share/modsecurity-crs/rules/*.conf
    
    # Custom Application Rules
    Include /etc/modsecurity/custom-rules.conf
</IfModule>
```

**Custom Rules Configuration:**

```apache
# /etc/modsecurity/custom-rules.conf

# ============================================
# Custom Application-Specific Rules
# ============================================

# Block requests without proper API key
SecRule REQUEST_HEADERS:api-key "@rx ^$" \
    "id:1001,\
    phase:1,\
    block,\
    log,\
    msg:'API key missing',\
    tag:'application',\
    tag:'api_security'"

# Rate limiting per IP
SecAction \
    "id:2000,\
    phase:1,\
    nolog,\
    pass,\
    initcol:ip=%{REMOTE_ADDR}"

SecRule IP:LOGIN_ATTEMPTS "@gt 10" \
    "id:2001,\
    phase:1,\
    deny,\
    status:429,\
    log,\
    msg:'Rate limit exceeded - too many requests',\
    setvar:ip.login_attempts=+1,\
    expirevar:ip.login_attempts=300"

# Block SQLMap user agent
SecRule REQUEST_HEADERS:User-Agent "@contains sqlmap" \
    "id:3001,\
    phase:1,\
    deny,\
    status:403,\
    log,\
    msg:'SQLMap scanner detected',\
    tag:'attack_tool'"

# Virtual Patch for CVE-2023-XXXXX (Example)
SecRule REQUEST_URI "@contains /api/v1/upload" \
    "id:9001,\
    phase:2,\
    chain,\
    deny,\
    status:403,\
    log,\
    msg:'Virtual Patch: Blocking known vulnerable upload endpoint'"
    SecRule REQUEST_METHOD "@streq POST" chain
    SecRule REQUEST_BODY "@rx \.(php|jsp|asp|aspx)$"

# GeoIP Blocking (requires mod_maxminddb)
SecRule GEO:COUNTRY_CODE "@pm CN RU KP" \
    "id:4001,\
    phase:1,\
    deny,\
    status:403,\
    log,\
    msg:'Request from blocked country'"

# Custom whitelist for monitoring endpoints
SecRule REQUEST_URI "@beginsWith /health" \
    "id:5001,\
    phase:1,\
    pass,\
    nolog,\
    ctl:ruleEngine=Off"
```

### 2.3 Cloudflare WAF Configuration

```hcl
# Terraform configuration for Cloudflare WAF
resource "cloudflare_ruleset" "custom_waf" {
  zone_id     = var.zone_id
  name        = "Custom WAF Rules"
  description = "Application-specific WAF rules"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  # Block SQL Injection attempts
  rules {
    action      = "block"
    expression  = <<EOF
      (http.request.uri.path contains "/api/" and 
       http.request.uri.query contains "union select")
    EOF
    description = "Block SQL injection attempts on API"
    enabled     = true
  }

  # Rate limit login attempts
  rules {
    action      = "rate_limit"
    expression  = "(http.request.uri.path contains \"/login\")"
    description = "Rate limit login attempts"
    enabled     = true
    
    ratelimit {
      characteristics = ["ip.src"]
      period          = 60
      requests_per_period = 5
      mitigation_timeout = 300
    }
  }

  # Challenge suspicious user agents
  rules {
    action      = "managed_challenge"
    expression  = <<EOF
      (http.user_agent contains "bot" and 
       not http.user_agent contains "Googlebot" and
       not http.user_agent contains "Bingbot")
    EOF
    description = "Challenge suspicious bots"
    enabled     = true
  }

  # Custom header validation
  rules {
    action      = "block"
    expression  = <<EOF
      (http.host eq "api.example.com" and 
       not any(http.request.headers.names[*] == "x-api-key"))
    EOF
    description = "Block API requests without key"
    enabled     = true
  }
}

# Managed Rulesets
resource "cloudflare_ruleset" "managed_waf" {
  zone_id     = var.zone_id
  name        = "Managed WAF"
  description = "OWASP and Cloudflare managed rules"
  kind        = "zone"
  phase       = "http_request_firewall_managed"

  # OWASP Core Ruleset
  rules {
    action      = "execute"
    expression  = "true"
    description = "Execute OWASP Core Ruleset"
    enabled     = true
    
    action_parameters {
      id = "4814384a9e5d4991b9815dcfc25d2f1f"  # OWASP CRS ID
      overrides {
        action = "block"
      }
    }
  }
}
```

### 2.4 WAF Bypass Prevention

```nginx
# NGINX with ModSecurity - Additional Security Headers
server {
    listen 443 ssl http2;
    server_name app.example.com;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.example.com;" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Hide nginx version
    server_tokens off;

    # Rate limiting zone
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=1r/s;

    location / {
        modsecurity on;
        modsecurity_rules_file /etc/nginx/modsecurity.conf;
        
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        
        # Additional validation
        if ($http_x_api_key = "") {
            return 401 "API key required";
        }
        
        proxy_pass http://api_backend;
    }

    location /login {
        limit_req zone=login_limit burst=5 nodelay;
        proxy_pass http://backend;
    }

    # Block common attack paths
    location ~ ^/(\.env|\.git|\.svn|\.htaccess|config\.php|wp-admin) {
        deny all;
        return 404;
    }
}
```

---

## 3. Security Scanning Tools

### 3.1 Static Application Security Testing (SAST)

| Tool | Languages | Accuracy | Speed | Integration | Cost |
|------|-----------|----------|-------|-------------|------|
| **SonarQube** | Multi | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Free-$$ |
| **Semgrep** | Multi | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Free-$$ |
| **CodeQL (GitHub)** | Multi | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Free (public) |
| **Checkmarx** | Multi | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | $$$$ |
| **Fortify SCA** | Multi | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | $$$$ |
| **Bandit** | Python | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Free |
| **ESLint Security** | JS/TS | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Free |
| **Brakeman** | Ruby | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Free |

**Recommended Stack: SonarQube + Semgrep**

```yaml
# .github/workflows/sast.yml
name: SAST Security Scan

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  semgrep:
    name: Semgrep Scan
    runs-on: ubuntu-latest
    container:
      image: returntocorp/semgrep:latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Semgrep
        run: |
          semgrep --config=auto \
                  --config=p/security-audit \
                  --config=p/owasp-top-ten \
                  --config=p/cwe-top-25 \
                  --json --output=semgrep-results.json \
                  --error || true
      
      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: semgrep-results
          path: semgrep-results.json

  sonarqube:
    name: SonarQube Analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: SonarQube Scan
        uses: sonarqube-quality-gate-action@master
        with:
          host: ${{ secrets.SONAR_HOST }}
          token: ${{ secrets.SONAR_TOKEN }}
          projectKey: ${{ github.repository }}

  codeql:
    name: CodeQL Analysis
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4
      
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript, typescript, python
          queries: security-extended,security-and-quality
      
      - name: Autobuild
        uses: github/codeql-action/autobuild@v3
      
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
```

**Semgrep Rules Configuration:**

```yaml
# .semgrep.yml
rules:
  # Import OWASP rules
  - id: owasp-top-10
    pattern: |
      rules:
        - pattern: ...
    languages: [javascript, typescript]
    message: "Check against OWASP Top 10"
    severity: WARNING

  # Custom rule for SQL injection
  - id: sql-injection-risk
    patterns:
      - pattern-either:
          - pattern: |
              $QUERY = "..." + $INPUT
          - pattern: |
              $QUERY = `...${$INPUT}...`
      - pattern-inside: |
          $DB.query($QUERY, ...)
    languages: [javascript, typescript]
    message: "Potential SQL injection - use parameterized queries"
    severity: ERROR
    metadata:
      cwe: "CWE-89: SQL Injection"
      owasp: "A03:2021 - Injection"

  # Custom rule for hardcoded secrets
  - id: hardcoded-secrets
    patterns:
      - pattern-regex: '(api[_-]?key|password|secret|token)\s*=\s*["\'][^"\']{8,}["\']'
      - pattern-not-regex: '(process\.env|config\.get)'
    languages: [javascript, typescript, python]
    message: "Hardcoded secret detected"
    severity: ERROR
    metadata:
      cwe: "CWE-798: Hardcoded Credentials"

  # Custom rule for insecure JWT usage
  - id: insecure-jwt
    patterns:
      - pattern: |
          jwt.sign($PAYLOAD, "...", ...)
      - pattern-not: |
          jwt.sign($PAYLOAD, process.env.JWT_SECRET, ...)
    languages: [javascript, typescript]
    message: "JWT signed with hardcoded secret"
    severity: ERROR

  # React specific security
  - id: react-dangerous-html
    patterns:
      - pattern: |
          <div dangerouslySetInnerHTML={...} />
    languages: [javascript, typescript]
    message: "dangerouslySetInnerHTML can lead to XSS - ensure content is sanitized"
    severity: WARNING
    metadata:
      cwe: "CWE-79: Cross-site Scripting"
```

---

### 3.2 Dynamic Application Security Testing (DAST)

| Tool | Type | Crawling | Authentication | CI/CD | Cost |
|------|------|----------|----------------|-------|------|
| **OWASP ZAP** | Open Source | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Free |
| **Burp Suite Pro** | Commercial | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | $$$ |
| **Acunetix** | Commercial | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $$$ |
| **Invicti (Netsparker)** | Commercial | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $$$ |
| **Detectify** | SaaS | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $$ |
| **Probely** | SaaS | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $$ |

**Recommended: OWASP ZAP (Baseline) + Burp Suite Pro (Deep Testing)**

```yaml
# .github/workflows/dast.yml
name: DAST Security Scan

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  zap-baseline:
    runs-on: ubuntu-latest
    name: OWASP ZAP Baseline Scan
    steps:
      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.12.0
        with:
          target: 'https://staging.example.com'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'
          allow_issue_writing: false
          fail_action: true

  zap-full:
    runs-on: ubuntu-latest
    name: OWASP ZAP Full Scan
    steps:
      - name: ZAP Full Scan
        uses: zaproxy/action-full-scan@v0.10.0
        with:
          target: 'https://staging.example.com'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a -j'
          allow_issue_writing: true

  authenticated-scan:
    runs-on: ubuntu-latest
    name: Authenticated DAST Scan
    steps:
      - uses: actions/checkout@v4
      
      - name: Run authenticated scan
        run: |
          docker run -v $(pwd):/zap/wrk/:rw \
            -t ghcr.io/zaproxy/zaproxy:stable \
            zap-full-scan.py \
            -t https://staging.example.com \
            -J zap-report.json \
            -w zap-report.md \
            --hook=/zap/wrk/auth-hook.py \
            -z "-config replacer.full_list\(0\).description=auth1 \
                -config replacer.full_list\(0\).enabled=true \
                -config replacer.full_list\(0\).matchtype=REQ_HEADER \
                -config replacer.full_list\(0\).matchstr=Authorization \
                -config replacer.full_list\(0\).regex=false \
                -config replacer.full_list\(0\).replacement=Bearer ${{ secrets.TEST_TOKEN }}"
```

**ZAP Automation Framework Configuration:**

```yaml
# zap-automation.yaml
env:
  contexts:
    - name: "WebApp Context"
      urls:
        - "https://app.example.com"
      includePaths:
        - "https://app.example.com/.*"
      excludePaths:
        - ".*logout.*"
        - ".*health.*"
      
      authentication:
        method: "form"
        parameters:
          loginPagePath: "/login"
          loginRequestBody: "username={%username%}&password={%password%}"
        verification:
          method: "response"
          loggedInRegex: "\\QLogout\\E"
          loggedOutRegex: "\\QLogin\\E"
      
      sessionManagement:
        method: "cookie"
      
      users:
        - name: "admin"
          credentials:
            username: "admin@example.com"
            password: "${TEST_PASSWORD}"
        - name: "user"
          credentials:
            username: "user@example.com"
            password: "${TEST_PASSWORD}"

  parameters:
    failOnError: true
    failOnWarning: false
    progressToStdout: true

jobs:
  - type: "spider"
    parameters:
      context: "WebApp Context"
      user: "admin"
      url: "https://app.example.com"
      maxDuration: 10
      maxDepth: 5

  - type: "spiderAjax"
    parameters:
      context: "WebApp Context"
      user: "admin"
      url: "https://app.example.com"
      maxDuration: 10
      browserId: "firefox-headless"

  - type: "activeScan"
    parameters:
      context: "WebApp Context"
      user: "admin"
      policy: "Default Policy"
      maxRuleDuration: 10
      maxScanDuration: 30

  - type: "report"
    parameters:
      template: "modern"
      reportDir: "/zap/wrk/reports"
      reportFile: "zap-scan-report"
    risks:
      - "high"
      - "medium"
      - "low"
    confidences:
      - "high"
      - "medium"
      - "low"
```

---

### 3.3 Interactive Application Security Testing (IAST)

| Tool | Languages | Framework Support | Overhead | Cost |
|------|-----------|-------------------|----------|------|
| **Contrast Security** | Java, .NET, Node, Python, Ruby, Go | ⭐⭐⭐⭐⭐ | Low | $$$$ |
| **Synopsys Seeker** | Multi | ⭐⭐⭐⭐⭐ | Low-Medium | $$$$ |
| **Checkmarx IAST** | Multi | ⭐⭐⭐⭐ | Low | $$$ |
| **HCL AppScan** | Multi | ⭐⭐⭐⭐ | Medium | $$$$ |
| **AcuSensor (Acunetix)** | PHP, .NET, Java | ⭐⭐⭐ | Low | $$$ |

**Contrast Security Agent Configuration:**

```yaml
# docker-compose with Contrast agent
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - CONTRAST__API__URL=https://app.contrastsecurity.com/Contrast
      - CONTRAST__API__API_KEY=${CONTRAST_API_KEY}
      - CONTRAST__API__SERVICE_KEY=${CONTRAST_SERVICE_KEY}
      - CONTRAST__API__USER_NAME=${CONTRAST_USER}
      - CONTRAST__APPLICATION__NAME=AltusHotels-App
      - CONTRAST__APPLICATION__VERSION=${GITHUB_SHA}
      - CONTRAST__SERVER__NAME=production-cluster
      - CONTRAST__SERVER__ENVIRONMENT=production
      - CONTRAST__ASSESS__ENABLE=true
      - CONTRAST__PROTECT__ENABLE=true
      - JAVA_TOOL_OPTIONS=-javaagent:/opt/contrast/contrast-agent.jar
    volumes:
      - ./contrast-agent.jar:/opt/contrast/contrast-agent.jar
```

---

### 3.4 Software Composition Analysis (SCA)

| Tool | Database | Reachability | License Scan | Fix PRs | Cost |
|------|----------|--------------|--------------|---------|------|
| **Snyk** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Free-$$$ |
| **OWASP Dependency-Check** | ⭐⭐⭐ | ❌ | ❌ | ❌ | Free |
| **GitHub Dependabot** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | Free |
| **Sonatype Nexus IQ** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | $$$$ |
| **FOSSA** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $$ |
| **WhiteSource (Mend)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $$$ |

**Recommended: Snyk + Dependabot**

```yaml
# .github/workflows/sca.yml
name: SCA Security Scan

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM

jobs:
  snyk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Snyk test
        uses: snyk/actions/node@master
        continue-on-error: true
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high --sarif-file-output=snyk.sarif
      
      - name: Upload Snyk results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: snyk.sarif

  dependency-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'prime-hotels-app'
          path: '.'
          format: 'ALL'
          args: >
            --enableRetired
            --enableExperimental
      
      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: dependency-check-report
          path: reports/

  license-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Check licenses
        uses: fossas/fossa-action@main
        with:
          api-key: ${{ secrets.FOSSA_API_KEY }}
```

---

### 3.5 Container Scanning

| Tool | Scan Speed | CVE Database | Config Checks | Runtime Scan | Cost |
|------|------------|--------------|---------------|--------------|------|
| **Trivy** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Free |
| **Snyk Container** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Free-$$$ |
| **Clair** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | Free |
| **Anchore** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Free-$$ |
| **Qualys Container Security** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $$$$ |

**Trivy Configuration:**

```yaml
# .github/workflows/container-scan.yml
name: Container Security Scan

on:
  push:
    branches: [ main ]
    paths:
      - 'Dockerfile'
      - 'package*.json'

jobs:
  trivy:
    name: Trivy Security Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Build image
        run: docker build -t prime-hotels:${{ github.sha }} .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'prime-hotels:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'
          ignore-unfixed: true

      - name: Run Trivy config scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'config'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-config.sarif'

      - name: Upload Trivy results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Generate SBOM
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'image'
          image-ref: 'prime-hotels:${{ github.sha }}'
          format: 'cyclonedx'
          output: 'sbom.cyclonedx.json'

      - name: Upload SBOM
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.cyclonedx.json
```

---

### 3.6 Infrastructure Scanning

| Tool | Cloud | Kubernetes | IaC | Compliance | Cost |
|------|-------|------------|-----|------------|------|
| **Trivy** | AWS/GCP/Azure | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | CIS | Free |
| **Checkov** | Multi | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | CIS/NIST | Free |
| **tfsec** | AWS/GCP/Azure | ❌ | ⭐⭐⭐⭐⭐ | CIS | Free |
| **Prowler** | AWS/Azure/GCP | ❌ | ⭐⭐ | CIS/PCI/HIPAA | Free |
| **ScoutSuite** | AWS/Azure/GCP | ❌ | ❌ | CIS | Free |
| **Wiz** | Multi | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Multiple | $$$$ |

**Infrastructure as Code Security:**

```yaml
# .github/workflows/iac-scan.yml
name: IaC Security Scan

on:
  push:
    paths:
      - 'terraform/**'
      - 'k8s/**'
      - '*.tf'
  pull_request:
    paths:
      - 'terraform/**'
      - 'k8s/**'

jobs:
  checkov:
    name: Checkov Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Checkov
        uses: bridgecrewio/checkov-action@master
        with:
          directory: .
          framework: terraform,kubernetes,dockerfile
          output_format: sarif
          output_file_path: reports/checkov.sarif
          download_external_modules: true
          soft_fail: true

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: reports/checkov.sarif

  tfsec:
    name: tfsec Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: tfsec
        uses: aquasecurity/tfsec-action@v1.0.0
        with:
          soft_fail: true
          additional_args: "--format sarif --out tfsec.sarif"

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: tfsec.sarif

  kubesec:
    name: Kubesec Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run kubesec
        run: |
          curl -sSL https://github.com/controlplaneio/kubesec/releases/download/v2.14.0/kubesec_linux_amd64.tar.gz | tar xz
          ./kubesec scan k8s/*.yaml --format json --output kubesec-results.json || true
          
      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: kubesec-results
          path: kubesec-results.json
```

---

## 4. Backup & Disaster Recovery

### 4.1 Backup Strategy (3-2-1 Rule)

```
3 - Keep at least 3 copies of data
2 - Store data on 2 different media types
1 - Keep 1 copy offsite/offline
0 - Zero errors with verified recovery testing
```

### 4.2 Backup Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION ENVIRONMENT                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Application │  │   Database   │  │  File Store  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼─────────────────┼─────────────────┼──────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    PRIMARY BACKUP TARGET                     │
│                   (On-site / Hot Storage)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        Backup Server (Local NAS/SAN Storage)         │   │
│  │  - Incremental backups every 15 minutes              │   │
│  │  - Full backups daily                                │   │
│  │  - 30-day retention                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  SECONDARY BACKUP TARGET                     │
│              (Off-site / Warm Storage - S3)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Cloud Storage (AWS S3 / GCS)               │   │
│  │  - Daily sync from primary                           │   │
│  │  - Cross-region replication                          │   │
│  │  - 90-day retention                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   TERTIARY BACKUP TARGET                     │
│              (Air-gapped / Cold Storage)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │     Glacier / Deep Archive + Offline Tape/Disk       │   │
│  │  - Weekly snapshots                                  │   │
│  │  - Immutable backups                                 │   │
│  │  - 7-year retention (compliance)                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Automated Backup Solutions

**Database Backup (PostgreSQL):**

```bash
#!/bin/bash
# /opt/backup/scripts/pg-backup.sh

set -euo pipefail

# Configuration
DB_NAME="prime_hotels"
DB_USER="backup_user"
BACKUP_DIR="/backup/postgres"
S3_BUCKET="s3://company-backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup
pg_dump -h localhost -U $DB_USER -Fc $DB_NAME > "$BACKUP_DIR/${DB_NAME}_${DATE}.dump"

# Compress
gzip "$BACKUP_DIR/${DB_NAME}_${DATE}.dump"

# Encrypt
openssl enc -aes-256-cbc -salt -in "$BACKUP_DIR/${DB_NAME}_${DATE}.dump.gz" \
    -out "$BACKUP_DIR/${DB_NAME}_${DATE}.dump.gz.enc" \
    -pass file:/etc/backup/encryption.key

# Upload to S3
aws s3 cp "$BACKUP_DIR/${DB_NAME}_${DATE}.dump.gz.enc" "$S3_BUCKET/daily/"

# Sync to glacier for long-term storage
if [ $(date +%u) -eq 7 ]; then  # Sunday
    aws s3 cp "$BACKUP_DIR/${DB_NAME}_${DATE}.dump.gz.enc" \
        "$S3_BUCKET/weekly/" \
        --storage-class GLACIER
fi

# Cleanup old local backups
find $BACKUP_DIR -name "*.enc" -mtime +$RETENTION_DAYS -delete

# Cleanup old S3 daily backups
aws s3 ls $S3_BUCKET/daily/ | while read -r line; do
    createDate=$(echo $line | awk '{print $1" "$2}')
    createDate=$(date -d "$createDate" +%s)
    olderThan=$(date -d "$RETENTION_DAYS days ago" +%s)
    if [[ $createDate -lt $olderThan ]]; then
        filename=$(echo $line | awk '{print $4}')
        aws s3 rm "$S3_BUCKET/daily/$filename"
    fi
done

# Verify backup integrity
if aws s3 ls "$S3_BUCKET/daily/${DB_NAME}_${DATE}.dump.gz.enc" > /dev/null 2>&1; then
    echo "[$(date)] Backup completed successfully: ${DB_NAME}_${DATE}.dump.gz.enc" >> /var/log/backup.log
else
    echo "[$(date)] ERROR: Backup verification failed!" >> /var/log/backup.log
    exit 1
fi
```

**File Backup with Restic:**

```yaml
# docker-compose.backup.yml
version: '3.8'

services:
  restic-backup:
    image: restic/restic:latest
    volumes:
      - /data:/data:ro
      - /backup/cache:/cache
      - ./backup-scripts:/scripts
    environment:
      - RESTIC_REPOSITORY=s3:s3.amazonaws.com/company-backups/restic
      - RESTIC_PASSWORD_FILE=/etc/backup/restic-password
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_KEY}
    command: >
      backup /data
      --exclude=/data/temp
      --exclude=/data/cache
      --tag=automated
      --cache-dir=/cache

  restic-forget:
    image: restic/restic:latest
    environment:
      - RESTIC_REPOSITORY=s3:s3.amazonaws.com/company-backups/restic
      - RESTIC_PASSWORD_FILE=/etc/backup/restic-password
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_KEY}
    command: >
      forget
      --keep-daily 7
      --keep-weekly 4
      --keep-monthly 12
      --keep-yearly 3
      --prune
```

**Kubernetes Backup (Velero):**

```yaml
# velero-install.yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: default
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: company-k8s-backups
    prefix: production
  config:
    region: us-east-1
    s3ForcePathStyle: "false"
---
apiVersion: velero.io/v1
kind: VolumeSnapshotLocation
metadata:
  name: default
  namespace: velero
spec:
  provider: aws
  config:
    region: us-east-1
---
# Scheduled Backup
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: production-daily
  namespace: velero
spec:
  schedule: "0 1 * * *"  # Daily at 1 AM
  template:
    includedNamespaces:
      - production
    excludedResources:
      - events
      - pods
    snapshotVolumes: true
    ttl: 720h0m0s  # 30 days
    labelSelector:
      matchLabels:
        backup: "true"
```

### 4.4 Disaster Recovery Procedures

**RTO/RPO Definitions:**

| System Tier | RTO | RPO | Description |
|-------------|-----|-----|-------------|
| **Tier 1 - Critical** | 15 min | 5 min | Core booking engine, payment processing |
| **Tier 2 - High** | 2 hours | 1 hour | Customer portal, admin systems |
| **Tier 3 - Medium** | 24 hours | 4 hours | Reporting, analytics |
| **Tier 4 - Low** | 72 hours | 24 hours | Development, test environments |

**DR Runbook Template:**

```markdown
# Disaster Recovery Runbook
## Incident Classification

### Critical - Tier 1
- Database corruption/loss
- Complete infrastructure outage
- Ransomware attack
- Primary datacenter failure

**Response Team:** CTO, Security Lead, Infrastructure Lead
**Communication:** Status page updated every 15 minutes

### DR Activation Procedure

1. **Assess (0-5 minutes)**
   - Confirm disaster scope
   - Activate DR team (call tree)
   - Declare DR event level

2. **Activate DR Site (5-15 minutes)**
   ```bash
   # Failover to DR database
   ./scripts/dr-failover-db.sh --target=dr-region --force
   
   # Activate DR Kubernetes cluster
   velero restore create --from-backup production-daily-20240407
   
   # Update DNS to point to DR
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z123456789 \
     --change-batch file://dr-dns-update.json
   ```

3. **Verify Services (15-30 minutes)**
   - [ ] Database connectivity
   - [ ] Application health checks
   - [ ] Load balancer functionality
   - [ ] SSL certificates valid
   - [ ] Third-party integrations active

4. **Communication**
   - Update status page
   - Notify stakeholders
   - Post-mortem scheduled
```

**Automated DR Testing:**

```yaml
# .github/workflows/dr-test.yml
name: DR Testing - Monthly

on:
  schedule:
    - cron: '0 3 1 * *'  # First of month at 3 AM
  workflow_dispatch:

jobs:
  dr-test:
    runs-on: ubuntu-latest
    steps:
      - name: Restore from backup to isolated environment
        run: |
          # Create isolated test namespace
          kubectl create namespace dr-test-$(date +%s)
          
          # Restore latest backup
          velero restore create \
            --from-backup $(velero backup get | grep Completed | head -1 | awk '{print $1}') \
            --namespace-mappings production:dr-test \
            --wait
      
      - name: Run smoke tests
        run: |
          kubectl run smoke-test \
            --image=curlimages/curl \
            --rm -it --restart=Never \
            -- curl -f http://app.dr-test.svc.cluster.local/health
      
      - name: Cleanup
        run: kubectl delete namespace dr-test-*
```

---

## 5. Logging & Auditing

### 5.1 Events to Log

#### Authentication & Authorization
```typescript
// Auth Event Logger
interface AuthEvent {
  eventType: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILURE' | 'PASSWORD_CHANGE' | 
             'MFA_CHALLENGE' | 'MFA_SUCCESS' | 'MFA_FAILURE' | 
             'TOKEN_REFRESH' | 'SESSION_EXPIRED' | 'ACCOUNT_LOCKED';
  timestamp: string;
  userId: string;
  username: string;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  success: boolean;
  failureReason?: string;
  mfaMethod?: 'TOTP' | 'SMS' | 'EMAIL' | 'PUSH';
  geoLocation?: {
    country: string;
    city: string;
    coordinates: [number, number];
  };
}
```

#### Data Access Events
```typescript
interface DataAccessEvent {
  eventType: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'SEARCH';
  timestamp: string;
  userId: string;
  resourceType: 'GUEST' | 'BOOKING' | 'PAYMENT' | 'ROOM' | 'USER';
  resourceId: string;
  fieldsAccessed: string[];
  dataSensitivity: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  accessMethod: 'API' | 'UI' | 'BULK' | 'REPORT';
  queryParameters?: Record<string, unknown>;
  rowsAffected: number;
}
```

#### Administrative Actions
```typescript
interface AdminEvent {
  eventType: 'USER_CREATE' | 'USER_DELETE' | 'USER_MODIFY' | 
             'ROLE_CHANGE' | 'PERMISSION_GRANT' | 'PERMISSION_REVOKE' |
             'CONFIG_CHANGE' | 'BACKUP_INITIATED' | 'RESTORE_INITIATED';
  timestamp: string;
  adminId: string;
  targetUserId?: string;
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  justification?: string;
  approvalReference?: string;
}
```

#### Security Events
```typescript
interface SecurityEvent {
  eventType: 'FIREWALL_BLOCK' | 'WAF_ALERT' | 'IDS_ALERT' | 
             'RATE_LIMIT_HIT' | 'SUSPICIOUS_ACTIVITY' | 'MALWARE_DETECTED' |
             'DATA_EXFILTRATION_ATTEMPT' | 'PRIVILEGE_ESCALATION_ATTEMPT';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  timestamp: string;
  sourceIp: string;
  destinationIp?: string;
  sourcePort?: number;
  destinationPort?: number;
  protocol?: string;
  details: Record<string, unknown>;
  rawLog?: string;
}
```

### 5.2 Log Retention Policy

| Log Category | Retention Period | Storage Class | Encryption |
|--------------|------------------|---------------|------------|
| **Security Events** | 7 years | Glacier | AES-256 |
| **Authentication Logs** | 7 years | Glacier | AES-256 |
| **Admin Actions** | 7 years | Glacier | AES-256 |
| **Application Logs** | 90 days | Standard | AES-256 |
| **Access Logs** | 1 year | Infrequent Access | AES-256 |
| **Debug Logs** | 30 days | Standard | AES-256 |
| **Audit Trail** | Indefinite | Glacier Deep Archive | AES-256 |

### 5.3 Secure Log Storage Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     LOG GENERATION LAYER                      │
├──────────────────────────────────────────────────────────────┤
│  Application → Filebeat → Kafka → Logstash → Elasticsearch   │
│         │                                                    │
│         └──► CloudWatch (AWS) / Azure Monitor / Stackdriver  │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                     IMMUTABLE STORAGE                         │
├──────────────────────────────────────────────────────────────┤
│  S3 with Object Lock (Compliance Mode)                       │
│  ├── WORM (Write Once Read Many) enabled                     │
│  ├── Legal hold capability                                   │
│  └── Cross-region replication                                │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                     ARCHIVAL STORAGE                          │
├──────────────────────────────────────────────────────────────┤
│  Glacier Deep Archive (7+ years retention)                   │
│  └── Air-gapped backup to tape                               │
└──────────────────────────────────────────────────────────────┘
```

**Implementation:**

```yaml
# Filebeat Configuration
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/application/*.log
    - /var/log/auth.log
    - /var/log/audit/*.log
  fields:
    environment: production
    service: prime-hotels
  fields_under_root: true
  multiline.pattern: '^\['
  multiline.negate: true
  multiline.match: after

- type: filestream
  enabled: true
  paths:
    - /var/log/containers/*.log
  parsers:
    - container:
        stream: all
        ids:
          - timestamp
          - time

processors:
  - add_host_metadata:
      when.not.contains.tags: forwarded
  - add_cloud_metadata: ~
  - add_docker_metadata: ~
  - add_kubernetes_metadata: ~
  - fingerprint:
      fields: ["message"]
      target_field: "@metadata._id"
      ignore_missing: true

# Security: Log signing
- script:
    lang: javascript
    source: >
      function process(event) {
        var crypto = require('crypto');
        var message = event.Get('message');
        var timestamp = event.Get('@timestamp');
        var hash = crypto.createHmac('sha256', process.env.LOG_SIGNING_KEY)
                         .update(message + timestamp)
                         .digest('hex');
        event.Put('log.signature', hash);
      }

output.elasticsearch:
  hosts: ["https://es-cluster:9200"]
  protocol: "https"
  username: "${ES_USERNAME}"
  password: "${ES_PASSWORD}"
  ssl.certificate_authorities: ["/etc/filebeat/certs/ca.crt"]
  index: "filebeat-%{[agent.version]}-%{+yyyy.MM.dd}"
  
  # ILM for automatic rollover
  ilm.enabled: true
  ilm.rollover_alias: "filebeat"
  ilm.pattern: "{now/d}-000001"
  ilm.policy_name: "filebeat-logs-policy"

# Additional output to S3 for cold storage
output.s3:
  enabled: true
  bucket: "company-security-logs"
  path: "filebeat/%{+yyyy/MM/dd}"
  region: "us-east-1"
```

### 5.4 Audit Trail Implementation

```typescript
// Centralized Audit Service
class AuditService {
  private async log(event: AuditEvent): Promise<void> {
    const enrichedEvent = await this.enrichEvent(event);
    
    // Dual-write for reliability
    await Promise.all([
      this.writeToPrimary(enrichedEvent),
      this.writeToImmutableStore(enrichedEvent)
    ]);
  }

  private async enrichEvent(event: AuditEvent): Promise<AuditEvent> {
    return {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      hash: this.calculateHash(event),
      previousHash: await this.getLastHash(),
      geoLocation: await this.getGeoLocation(event.ipAddress),
      tamperProof: true
    };
  }

  private calculateHash(event: AuditEvent): string {
    const data = JSON.stringify({
      type: event.type,
      timestamp: event.timestamp,
      userId: event.userId,
      action: event.action,
      resource: event.resource
    });
    
    return crypto
      .createHmac('sha256', process.env.AUDIT_KEY)
      .update(data)
      .digest('hex');
  }

  // Blockchain-style integrity chain
  private async getLastHash(): Promise<string> {
    const lastEvent = await this.db.auditEvents
      .findFirst({ orderBy: { timestamp: 'desc' } });
    return lastEvent?.hash || 'genesis';
  }

  private async writeToImmutableStore(event: AuditEvent): Promise<void> {
    // Write to S3 with Object Lock
    await s3.putObject({
      Bucket: 'audit-trail-immutable',
      Key: `events/${event.timestamp}/${event.id}.json`,
      Body: JSON.stringify(event),
      ContentType: 'application/json',
      ChecksumAlgorithm: 'SHA256',
      ObjectLockMode: 'COMPLIANCE',
      ObjectLockRetainUntilDate: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000) // 7 years
    });
  }
}
```

---

## 6. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
| Priority | Task | Tool | Effort |
|----------|------|------|--------|
| P0 | WAF Deployment | ModSecurity + CRS | 3 days |
| P0 | HIDS Installation | Wazuh | 2 days |
| P0 | Centralized Logging | ELK Stack | 5 days |
| P1 | SCA Integration | Snyk + Dependabot | 1 day |
| P1 | Container Scanning | Trivy | 1 day |

### Phase 2: Detection & Response (Weeks 5-8)
| Priority | Task | Tool | Effort |
|----------|------|------|--------|
| P0 | SIEM Deployment | Elastic Security | 5 days |
| P0 | Alerting Rules | Elastic Alerting | 3 days |
| P1 | NIDS Installation | Suricata | 3 days |
| P1 | Automated Response | SOAR/Wazuh AR | 3 days |
| P2 | Behavioral Analytics | Elastic ML | 4 days |

### Phase 3: Testing & Hardening (Weeks 9-12)
| Priority | Task | Tool | Effort |
|----------|------|------|--------|
| P0 | DAST Integration | OWASP ZAP | 3 days |
| P0 | SAST Integration | Semgrep + SonarQube | 3 days |
| P1 | IaC Scanning | Checkov + tfsec | 2 days |
| P1 | Penetration Testing | External | 5 days |
| P2 | IAST Deployment | Contrast | 2 days |

### Phase 4: Resilience (Weeks 13-16)
| Priority | Task | Tool | Effort |
|----------|------|------|--------|
| P0 | Backup Automation | Restic + Velero | 4 days |
| P0 | DR Procedures | Custom scripts | 3 days |
| P1 | DR Testing Schedule | Automated | 2 days |
| P2 | Business Continuity Plan | Documentation | 3 days |

---

## 7. Budget Considerations

### Open Source Stack (Annual Cost)
| Component | License | Infrastructure | Total |
|-----------|---------|----------------|-------|
| WAF (ModSecurity) | $0 | $500 | $500 |
| IDS/IPS (Suricata) | $0 | $1,000 | $1,000 |
| SIEM (Elastic) | $0 (self-hosted) | $5,000 | $5,000 |
| HIDS (Wazuh) | $0 | $1,000 | $1,000 |
| SAST (Semgrep) | $0 | $500 | $500 |
| DAST (ZAP) | $0 | $500 | $500 |
| SCA (Snyk Free) | $0 | $0 | $0 |
| Container Scan (Trivy) | $0 | $0 | $0 |
| Backup Storage | $0 | $3,000 | $3,000 |
| **Total** | | | **~$11,500/year** |

### Enterprise Stack (Annual Cost)
| Component | License | Infrastructure | Total |
|-----------|---------|----------------|-------|
| WAF (Cloudflare Enterprise) | $12,000 | $0 | $12,000 |
| IDS/IPS (Darktrace) | $25,000 | $0 | $25,000 |
| SIEM (Splunk ES) | $50,000 | $5,000 | $55,000 |
| EDR (CrowdStrike) | $30,000 | $0 | $30,000 |
| SAST (Checkmarx) | $35,000 | $0 | $35,000 |
| DAST (Invicti) | $15,000 | $0 | $15,000 |
| SCA (Snyk Enterprise) | $10,000 | $0 | $10,000 |
| IAST (Contrast) | $25,000 | $0 | $25,000 |
| Container Security (Wiz) | $20,000 | $0 | $20,000 |
| Backup (Veeam + Storage) | $15,000 | $5,000 | $20,000 |
| **Total** | | | **~$247,000/year** |

### Recommended Hybrid Approach
| Component | Model | Cost |
|-----------|-------|------|
| WAF | Cloudflare Pro | $2,400 |
| SIEM | Elastic Cloud | $6,000 |
| HIDS/EDR | Wazuh + CrowdStrike | $15,000 |
| SAST | Semgrep Team | $3,600 |
| DAST | OWASP ZAP + Invicti monthly | $2,000 |
| SCA | Snyk Pro | $4,800 |
| Backup | AWS + Restic | $4,000 |
| **Total** | | **~$37,800/year** |

---

## Appendices

### A. Compliance Mapping

| Control | SOC 2 | ISO 27001 | PCI-DSS | HIPAA |
|---------|-------|-----------|---------|-------|
| IDS/IPS | CC6.6 | A.12.4 | 11.4 | 164.308(a)(1) |
| WAF | CC6.6 | A.12.6 | 6.6 | 164.312(b) |
| SIEM | CC7.2 | A.12.4 | 10.2 | 164.308(a)(1)(ii)(D) |
| SAST | CC7.1 | A.14.2.8 | 6.3 | 164.308(a)(8) |
| DAST | CC7.1 | A.12.6.1 | 6.5 | 164.308(a)(8) |
| Backup | A1.2 | A.12.3.1 | 9.5 | 164.308(a)(7) |
| Audit Logging | CC7.2 | A.12.4 | 10.3 | 164.312(b) |

### B. Tool Selection Decision Matrix

```
Criteria Weighting:
- Effectiveness: 30%
- Cost: 20%
- Ease of Integration: 15%
- Community/Support: 15%
- Scalability: 10%
- Maintenance: 10%
```

### C. Incident Response Integration

All monitoring and detection systems should feed into a unified incident response workflow:

```
Detection (WAF/IDS/SIEM) 
    ↓
Alert Enrichment (IP reputation, threat intel)
    ↓
Severity Assessment (Automated + Human)
    ↓
Response Action (Block, Isolate, Investigate)
    ↓
Forensic Collection (Logs, Memory, Disk)
    ↓
Recovery & Lessons Learned
```

---

**Document Owner:** Security Operations Team  
**Review Cycle:** Quarterly  
**Next Review:** July 2026
