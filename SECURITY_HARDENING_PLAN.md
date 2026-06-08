# Comprehensive Security Hardening Plan
## Post-Compromise Recovery & Enterprise Hardening Guide

**Document Version:** 1.0  
**Classification:** Internal Security Documentation  
**Priority:** CRITICAL - Immediate Action Required

---

## EXECUTIVE SUMMARY

This document provides a step-by-step security hardening plan for a recently compromised web application. Implement these measures in the order specified to minimize exposure window and establish defense in depth.

### Immediate Actions (First 24 Hours)
1. Isolate compromised systems
2. Preserve forensic evidence
3. Reset ALL credentials (assume compromise)
4. Patch critical vulnerabilities
5. Enable comprehensive logging

---

## SECTION 1: SERVER-LEVEL SECURITY
**Priority: CRITICAL | Implementation Time: 4-8 hours**

### 1.1 Firewall Configuration

#### Linux (iptables/nftables)

**iptables Hardening Script:**
```bash
#!/bin/bash
# /root/firewall-hardening.sh
# Flush existing rules
iptables -F
iptables -X
iptables -t nat -F
iptables -t mangle -F

# Default deny policy
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow SSH (custom port recommended)
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --set
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --update --seconds 60 --hitcount 4 -j DROP
iptables -A INPUT -p tcp --dport 22 -s YOUR_OFFICE_IP/32 -j ACCEPT

# Allow HTTP/HTTPS
iptables -A INPUT -p tcp --dport 80 -m conntrack --ctstate NEW -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -m conntrack --ctstate NEW -j ACCEPT

# Rate limiting for web traffic
iptables -A INPUT -p tcp --dport 80 -m limit --limit 25/minute --limit-burst 100 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -m limit --limit 25/minute --limit-burst 100 -j ACCEPT

# Block common attack patterns
iptables -A INPUT -p tcp --tcp-flags ALL NONE -j DROP
iptables -A INPUT -p tcp --tcp-flags SYN,FIN SYN,FIN -j DROP
iptables -A INPUT -p tcp --tcp-flags SYN,RST SYN,RST -j DROP
iptables -A INPUT -p tcp --tcp-flags FIN,RST FIN,RST -j DROP
iptables -A INPUT -p tcp --tcp-flags ACK,FIN FIN -j DROP
iptables -A INPUT -p tcp --tcp-flags ACK,PSH PSH -j DROP
iptables -A INPUT -p tcp --tcp-flags ACK,URG URG -j DROP

# Save rules
iptables-save > /etc/iptables/rules.v4
```

**nftables (Modern Replacement):**
```bash
#!/usr/sbin/nft -f

flush ruleset

table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;
        
        # Allow loopback
        iif "lo" accept
        
        # Allow established
        ct state established,related accept
        
        # Drop invalid
        ct state invalid drop
        
        # Rate limit ICMP
        ip protocol icmp limit rate 5/second accept
        ip6 nexthdr icmpv6 limit rate 5/second accept
        
        # Allow SSH with connection limiting
        tcp dport 22 ct state new limit rate 4/minute accept
        
        # Allow HTTP/HTTPS
        tcp dport { 80, 443 } ct state new accept
        
        # Log and drop
        log prefix "nftables dropped: " flags all counter drop
    }
    
    chain forward {
        type filter hook forward priority 0; policy drop;
    }
    
    chain output {
        type filter hook output priority 0; policy accept;
    }
}
```

#### Cloud Security Groups

**AWS Security Group (Terraform):**
```hcl
resource "aws_security_group" "web_app" {
  name_prefix = "web-app-hardened"
  description = "Hardened security group for web application"
  vpc_id      = aws_vpc.main.id

  # SSH - Restrict to bastion/VPN only
  ingress {
    description = "SSH from bastion only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.bastion_subnet_cidr]
  }

  # HTTPS only - HTTP redirects to HTTPS
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    
    # Enable VPC Flow Logs for this traffic
  }

  # HTTP for redirect only
  ingress {
    description = "HTTP redirect"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "HTTPS outbound"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "DNS"
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "web-app-hardened"
    Environment = var.environment
    Compliance  = "SOC2"
  }
}
```

**Azure NSG (ARM Template):**
```json
{
  "type": "Microsoft.Network/networkSecurityGroups",
  "name": "web-app-nsg-hardened",
  "properties": {
    "securityRules": [
      {
        "name": "DenyAllInbound",
        "properties": {
          "priority": 4096,
          "direction": "Inbound",
          "access": "Deny",
          "protocol": "*",
          "sourceAddressPrefix": "*",
          "sourcePortRange": "*",
          "destinationAddressPrefix": "*",
          "destinationPortRange": "*"
        }
      },
      {
        "name": "AllowHTTPS",
        "properties": {
          "priority": 100,
          "direction": "Inbound",
          "access": "Allow",
          "protocol": "Tcp",
          "sourceAddressPrefix": "*",
          "sourcePortRange": "*",
          "destinationAddressPrefix": "*",
          "destinationPortRange": "443"
        }
      }
    ]
  }
}
```

### 1.2 Port Management & Service Hardening

**Service Audit Script:**
```bash
#!/bin/bash
# audit-services.sh - Run this first

echo "=== LISTENING PORTS ==="
ss -tulpn | grep LISTEN

echo "=== RUNNING SERVICES ==="
systemctl list-units --type=service --state=running

echo "=== ENABLED SERVICES ==="
systemctl list-unit-files --state=enabled

echo "=== UNNECESSARY SERVICES TO DISABLE ==="
echo "telnet, ftp, nfs, smb, cups, bluetooth, avahi-daemon"
```

**Disable Unnecessary Services:**
```bash
# List of services to disable on web servers
SERVICES_TO_DISABLE=(
    "telnet"
    "vsftpd"
    "nfs-server"
    "smbd"
    "nmbd"
    "cups"
    "bluetooth"
    "avahi-daemon"
    " ModemManager"
    "pppoe-server"
)

for service in "${SERVICES_TO_DISABLE[@]}"; do
    sudo systemctl stop "$service" 2>/dev/null
    sudo systemctl disable "$service" 2>/dev/null
    echo "Disabled: $service"
done

# Mask dangerous services
sudo systemctl mask telnet.socket
sudo systemctl mask rsh.socket
sudo systemctl mask rexec.socket
```

### 1.3 OS-Level Security (Linux)

**Kernel Hardening (sysctl):**
```bash
# /etc/sysctl.d/99-security.conf

# Disable IP source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# Disable ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0

# Enable SYN cookies
net.ipv4.tcp_syncookies = 1

# Disable IPv6 if not used
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1

# Increase backlog for SYN flood protection
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

# Ignore ICMP broadcasts
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1

# Enable ASLR
kernel.randomize_va_space = 2

# Restrict dmesg access
kernel.dmesg_restrict = 1

# Restrict ptrace
kernel.yama.ptrace_scope = 1

# Disable core dumps
fs.suid_dumpable = 0

# Apply settings
sysctl -p /etc/sysctl.d/99-security.conf
```

**File Integrity Monitoring (AIDE):**
```bash
# Install AIDE
sudo apt-get install aide

# Initialize database
sudo aideinit
sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# Create daily check script
sudo tee /etc/cron.daily/aide-check << 'EOF'
#!/bin/bash
AIDE_OUTPUT=$(/usr/bin/aide --check 2>&1)
if [ $? -ne 0 ]; then
    echo "$AIDE_OUTPUT" | mail -s "AIDE Alert: File Integrity Changes Detected" security@company.com
fi
EOF
sudo chmod +x /etc/cron.daily/aide-check
```

### 1.4 SSH Hardening

**sshd_config Hardening:**
```bash
# /etc/ssh/sshd_config.d/hardening.conf

# Use only protocol 2
Protocol 2

# Change default port (security through obscurity + reduce log noise)
Port 2222

# Disable root login
PermitRootLogin no

# Disable password authentication - Keys only
PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no

# Public key authentication only
PubkeyAuthentication yes
AuthenticationMethods publickey

# Limit users and groups
AllowUsers deploy@10.0.1.* admin@10.0.1.*
AllowGroups ssh-users

# Connection limits
MaxSessions 2
MaxAuthTries 3
LoginGraceTime 30
ClientAliveInterval 300
ClientAliveCountMax 2

# Cryptography hardening
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512,hmac-sha2-256
KexAlgorithms curve25519-sha256@libssh.org,ecdh-sha2-nistp521,ecdh-sha2-nistp384,ecdh-sha2-nistp256,diffie-hellman-group-exchange-sha256

# Disable forwarding unless required
X11Forwarding no
AllowTcpForwarding no
PermitTunnel no
GatewayPorts no

# Logging
LogLevel VERBOSE

# Banner
Banner /etc/ssh/banner
```

**SSH Banner (/etc/ssh/banner):**
```
************************************************************************
* WARNING: Unauthorized access to this system is strictly prohibited   *
* and may result in criminal prosecution. All activities are logged    *
* and monitored. Disconnect immediately if you are not authorized.     *
************************************************************************
```

**SSH Key Management:**
```bash
# Generate strong SSH key pair
ssh-keygen -t ed25519 -a 100 -C "$(whoami)@$(hostname)-$(date +%Y-%m-%d)"

# Or RSA with larger key size (for legacy systems)
ssh-keygen -t rsa -b 4096 -o -a 100 -C "$(whoami)@$(hostname)-$(date +%Y-%m-%d)"

# Verify key strength
ssh-keygen -l -f ~/.ssh/id_ed25519.pub

# Restrict authorized_keys
# ~/.ssh/authorized_keys
no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAA... user@host
```

### 1.5 Container Security (Docker)

**Docker Daemon Hardening:**
```json
{
  "/etc/docker/daemon.json": "# Container runtime security configuration",
  "userns-remap": "default",
  "live-restore": true,
  "no-new-privileges": true,
  "selinux-enabled": true,
  "apparmor-default": "docker-default",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  },
  "seccomp-profile": "/etc/docker/seccomp-default.json"
}
```

**Secure Container Run Command:**
```bash
# Run container with security options
docker run -d \
  --name web-app-hardened \
  --read-only \
  --user 1000:1000 \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  --security-opt=no-new-privileges:true \
  --security-opt=seccomp:custom-seccomp.json \
  --tmpfs /tmp:noexec,nosuid,size=100m \
  --tmpfs /var/tmp:noexec,nosuid,size=100m \
  -p 127.0.0.1:8080:8080 \
  web-app:latest
```

**Dockerfile Security Best Practices:**
```dockerfile
# Multi-stage build for minimal attack surface
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts
COPY . .
RUN npm run build

# Production stage - minimal image
FROM node:20-alpine

# Add non-root user
RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -s /bin/sh -D appuser

# Security updates
RUN apk update && \
    apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copy only necessary files
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

# No shell access
USER appuser

# Read-only filesystem
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

---

## SECTION 2: APPLICATION-LEVEL SECURITY
**Priority: CRITICAL | Implementation Time: 1-2 weeks**

### 2.1 Input Validation Strategies

**Validation Layer Architecture:**
```typescript
// validation/ValidationFramework.ts
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Define validation schemas
const UserInputSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid characters in username')
    .transform(val => DOMPurify.sanitize(val.trim())),
  
  email: z.string()
    .email('Invalid email format')
    .max(255)
    .transform(val => val.toLowerCase().trim()),
  
  age: z.number()
    .int()
    .min(13, 'Must be at least 13')
    .max(120, 'Invalid age'),
  
  searchQuery: z.string()
    .max(200)
    .transform(val => DOMPurify.sanitize(val.trim()))
    .optional(),
});

// Generic validation middleware
export const validateInput = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      // Attach validated data
      req.validated = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};

// Content Security Policy for XSS prevention
export const cspMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'nonce-{random}'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));
  next();
};
```

**File Upload Security:**
```typescript
// validation/FileUploadValidator.ts
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileTypeFromBuffer } from 'file-type';

interface UploadConfig {
  maxSize: number;        // bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  scanForMalware: boolean;
}

export class SecureFileUpload {
  private config: UploadConfig;
  private uploadPath: string;
  
  constructor(config: UploadConfig, uploadPath: string) {
    this.config = {
      maxSize: 5 * 1024 * 1024, // 5MB default
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
      ...config,
    };
    this.uploadPath = uploadPath;
  }
  
  async validateAndStore(file: Buffer, originalName: string): Promise<string> {
    // 1. Check file size
    if (file.length > this.config.maxSize) {
      throw new Error('File too large');
    }
    
    // 2. Verify MIME type from content (magic numbers)
    const fileType = await fileTypeFromBuffer(file);
    if (!fileType || !this.config.allowedMimeTypes.includes(fileType.mime)) {
      throw new Error('Invalid file type');
    }
    
    // 3. Verify extension matches MIME
    const ext = path.extname(originalName).toLowerCase();
    if (!this.config.allowedExtensions.includes(ext)) {
      throw new Error('Invalid file extension');
    }
    
    // 4. Generate safe filename (no user input)
    const safeName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const fullPath = path.join(this.uploadPath, safeName);
    
    // 5. Ensure path is within upload directory (path traversal protection)
    if (!fullPath.startsWith(path.resolve(this.uploadPath))) {
      throw new Error('Invalid path');
    }
    
    // 6. Scan for embedded threats (basic check)
    if (this.containsExecutableContent(file)) {
      throw new Error('Potentially malicious content detected');
    }
    
    // 7. Store file
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file);
    
    // 8. Set restrictive permissions
    await fs.chmod(fullPath, 0o644);
    
    return safeName;
  }
  
  private containsExecutableContent(buffer: Buffer): boolean {
    const dangerousSignatures = [
      Buffer.from('%PDF-1.', 'ascii'),  // PDF with embedded JS
      Buffer.from('<script', 'ascii'),
      Buffer.from('<?php', 'ascii'),
      Buffer.from('#!/bin/', 'ascii'),
    ];
    
    return dangerousSignatures.some(sig => 
      buffer.includes(sig)
    );
  }
}
```

### 2.2 Output Encoding Framework

```typescript
// security/OutputEncoder.ts
import { escapeHtml, escapeJs, escapeUrl } from './escape-utils';

export class OutputEncoder {
  // HTML Context
  static html(input: string): string {
    return escapeHtml(input);
  }
  
  // JavaScript Context
  static js(input: string): string {
    return escapeJs(input);
  }
  
  // URL Context
  static url(input: string): string {
    return escapeUrl(input);
  }
  
  // CSS Context
  static css(input: string): string {
    // Strict whitelist for CSS values
    const allowed = /^[a-zA-Z0-9-#.,()%\s]*$/;
    if (!allowed.test(input)) {
      throw new Error('Invalid CSS value');
    }
    return input;
  }
  
  // Template literal for safe HTML
  static htmlTemplate(strings: TemplateStringsArray, ...values: any[]): string {
    return strings.reduce((result, string, i) => {
      const value = values[i];
      if (value === undefined) return result + string;
      return result + string + this.html(String(value));
    }, '');
  }
}

// React/Vue safe component example
export const SafeHtml: React.FC<{ content: string }> = ({ content }) => {
  // DOMPurify sanitization
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
  
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
};
```

### 2.3 Authentication Hardening

**Multi-Factor Authentication (MFA):**
```typescript
// auth/MFAService.ts
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import bcrypt from 'bcrypt';

export class MFAService {
  private readonly backupCodesCount = 10;
  
  // Generate TOTP secret
  async generateSecret(userId: string, email: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    const secret = speakeasy.generateSecret({
      name: `YourApp (${email})`,
      length: 32,
    });
    
    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
    
    // Generate backup codes
    const backupCodes = await this.generateBackupCodes();
    
    // Store encrypted backup codes
    const hashedCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 12))
    );
    
    await this.storeMFASecret(userId, secret.base32, hashedCodes);
    
    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes, // Show once to user
    };
  }
  
  // Verify TOTP token
  async verifyToken(userId: string, token: string): Promise<boolean> {
    const secret = await this.getUserSecret(userId);
    
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 steps before/after for clock drift
    });
  }
  
  // Rate limited MFA verification
  async verifyWithRateLimit(
    userId: string, 
    token: string,
    ip: string
  ): Promise<boolean> {
    const key = `mfa_attempts:${userId}:${ip}`;
    const attempts = await this.redis.incr(key);
    
    if (attempts === 1) {
      await this.redis.expire(key, 300); // 5 minute window
    }
    
    if (attempts > 5) {
      throw new Error('Too many MFA attempts. Please try again later.');
    }
    
    return this.verifyToken(userId, token);
  }
  
  private async generateBackupCodes(): Promise<string[]> {
    const codes: string[] = [];
    for (let i = 0; i < this.backupCodesCount; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
}
```

**Password Policy & Strength:**
```typescript
// auth/PasswordPolicy.ts
import zxcvbn from 'zxcvbn';
import bcrypt from 'bcrypt';

export class PasswordPolicy {
  private readonly minStrength = 3; // zxcvbn scale 0-4
  private readonly minLength = 12;
  private readonly maxLength = 128;
  private readonly bcryptRounds = 12;
  
  validate(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Length check
    if (password.length < this.minLength) {
      errors.push(`Password must be at least ${this.minLength} characters`);
    }
    if (password.length > this.maxLength) {
      errors.push(`Password must not exceed ${this.maxLength} characters`);
    }
    
    // Complexity (encourage but don't require)
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    
    if (!hasUpper || !hasLower || !hasNumber) {
      errors.push('Password must contain uppercase, lowercase, and numbers');
    }
    
    // Strength check using zxcvbn
    const strength = zxcvbn(password);
    if (strength.score < this.minStrength) {
      errors.push('Password is too weak. Avoid common words and patterns.');
      if (strength.feedback.suggestions.length > 0) {
        errors.push(...strength.feedback.suggestions);
      }
    }
    
    // Check against breached passwords (using HaveIBeenPwned API)
    // Implementation would call HIBP API
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.bcryptRounds);
  }
  
  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
```

**Brute Force Protection:**
```typescript
// auth/BruteForceProtection.ts
import { Redis } from 'ioredis';

export class BruteForceProtection {
  private redis: Redis;
  
  private readonly config = {
    maxAttempts: 5,
    windowSeconds: 300,     // 5 minutes
    lockoutDuration: 1800,  // 30 minutes
    progressiveDelay: true,
  };
  
  async recordAttempt(identifier: string, ip: string): Promise<{
    allowed: boolean;
    attemptsRemaining: number;
    lockoutSeconds?: number;
  }> {
    const key = `login_attempts:${identifier}:${ip}`;
    const lockoutKey = `lockout:${identifier}`;
    
    // Check if locked out
    const lockoutTTL = await this.redis.ttl(lockoutKey);
    if (lockoutTTL > 0) {
      return {
        allowed: false,
        attemptsRemaining: 0,
        lockoutSeconds: lockoutTTL,
      };
    }
    
    // Increment attempts
    const attempts = await this.redis.incr(key);
    if (attempts === 1) {
      await this.redis.expire(key, this.config.windowSeconds);
    }
    
    // Check threshold
    if (attempts >= this.config.maxAttempts) {
      await this.redis.setex(lockoutKey, this.config.lockoutDuration, 'locked');
      await this.redis.del(key);
      
      // Log security event
      await this.logSecurityEvent('account_locked', { identifier, ip, attempts });
      
      return {
        allowed: false,
        attemptsRemaining: 0,
        lockoutSeconds: this.config.lockoutDuration,
      };
    }
    
    return {
      allowed: true,
      attemptsRemaining: this.config.maxAttempts - attempts,
    };
  }
  
  async clearAttempts(identifier: string, ip: string): Promise<void> {
    const key = `login_attempts:${identifier}:${ip}`;
    await this.redis.del(key);
  }
  
  // Progressive delay for valid attempts too
  calculateDelay(attemptCount: number): number {
    if (!this.config.progressiveDelay) return 0;
    
    // Exponential backoff: 0, 1, 2, 4, 8 seconds
    return Math.min(Math.pow(2, attemptCount - 1) * 1000, 8000);
  }
}
```

### 2.4 Session Management Best Practices

```typescript
// auth/SessionManager.ts
import { Redis } from 'ioredis';
import crypto from 'crypto';

interface SessionConfig {
  maxAge: number;           // Session lifetime (ms)
  idleTimeout: number;      // Inactivity timeout (ms)
  absoluteTimeout: number;  // Hard limit regardless of activity (ms)
  maxConcurrent: number;    // Max sessions per user
}

export class SecureSessionManager {
  private redis: Redis;
  private config: SessionConfig;
  
  constructor(redis: Redis, config: Partial<SessionConfig> = {}) {
    this.redis = redis;
    this.config = {
      maxAge: 24 * 60 * 60 * 1000,        // 24 hours
      idleTimeout: 30 * 60 * 1000,        // 30 minutes
      absoluteTimeout: 8 * 60 * 60 * 1000, // 8 hours
      maxConcurrent: 3,
      ...config,
    };
  }
  
  async createSession(
    userId: string,
    metadata: { ip: string; userAgent: string }
  ): Promise<string> {
    // Enforce max concurrent sessions
    await this.enforceSessionLimit(userId);
    
    // Generate cryptographically secure session ID
    const sessionId = crypto.randomBytes(32).toString('base64url');
    const now = Date.now();
    
    const session = {
      userId,
      createdAt: now,
      lastActivity: now,
      expiresAt: now + this.config.absoluteTimeout,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
      mfaVerified: false,
    };
    
    // Store session
    await this.redis.setex(
      `session:${sessionId}`,
      Math.floor(this.config.maxAge / 1000),
      JSON.stringify(session)
    );
    
    // Add to user's session index
    await this.redis.sadd(`user_sessions:${userId}`, sessionId);
    
    return sessionId;
  }
  
  async validateSession(
    sessionId: string,
    currentMetadata: { ip: string; userAgent: string }
  ): Promise<{ valid: boolean; session?: any }> {
    const data = await this.redis.get(`session:${sessionId}`);
    if (!data) {
      return { valid: false };
    }
    
    const session = JSON.parse(data);
    const now = Date.now();
    
    // Check absolute timeout
    if (now > session.expiresAt) {
      await this.destroySession(sessionId);
      return { valid: false };
    }
    
    // Check idle timeout
    if (now - session.lastActivity > this.config.idleTimeout) {
      await this.destroySession(sessionId);
      return { valid: false };
    }
    
    // Validate IP binding (optional - can use subnet)
    if (!this.isIpAllowed(session.ip, currentMetadata.ip)) {
      await this.destroySession(sessionId);
      await this.logSecurityEvent('session_ip_mismatch', { session, current: currentMetadata });
      return { valid: false };
    }
    
    // Update last activity
    session.lastActivity = now;
    await this.redis.setex(
      `session:${sessionId}`,
      Math.floor(this.config.maxAge / 1000),
      JSON.stringify(session)
    );
    
    return { valid: true, session };
  }
  
  async destroySession(sessionId: string): Promise<void> {
    const data = await this.redis.get(`session:${sessionId}`);
    if (data) {
      const session = JSON.parse(data);
      await this.redis.srem(`user_sessions:${session.userId}`, sessionId);
    }
    await this.redis.del(`session:${sessionId}`);
  }
  
  async destroyAllUserSessions(userId: string, except?: string): Promise<void> {
    const sessionIds = await this.redis.smembers(`user_sessions:${userId}`);
    for (const sid of sessionIds) {
      if (sid !== except) {
        await this.redis.del(`session:${sid}`);
      }
    }
    if (except) {
      await this.redis.srem(`user_sessions:${userId}`, ...sessionIds.filter(s => s !== except));
    } else {
      await this.redis.del(`user_sessions:${userId}`);
    }
  }
  
  private async enforceSessionLimit(userId: string): Promise<void> {
    const sessions = await this.redis.smembers(`user_sessions:${userId}`);
    if (sessions.length >= this.config.maxConcurrent) {
      // Remove oldest session
      const oldest = sessions[0];
      await this.destroySession(oldest);
    }
  }
  
  private isIpAllowed(storedIp: string, currentIp: string): boolean {
    // Exact match or subnet match
    return storedIp === currentIp;
  }
}
```

### 2.5 Secure Cookie Settings

```typescript
// auth/CookieConfig.ts
import { CookieOptions } from 'express';

export const secureCookieConfig: CookieOptions = {
  httpOnly: true,        // Prevent JavaScript access
  secure: true,          // HTTPS only
  sameSite: 'strict',    // CSRF protection
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
  domain: process.env.COOKIE_DOMAIN, // Explicit domain
};

// For cross-site scenarios (OAuth callbacks)
export const crossSiteCookieConfig: CookieOptions = {
  ...secureCookieConfig,
  sameSite: 'none',      // Required for cross-site
  secure: true,          // Must be true with sameSite: 'none'
};

// Session cookie (deleted on browser close)
export const sessionCookieConfig: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/',
};

// Express middleware
export const cookieMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Set additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Cookie prefix for additional security
  res.cookie('__Host-sessionId', sessionId, {
    ...secureCookieConfig,
    domain: undefined, // __Host- prefix requires no domain attribute
  });
  
  next();
};
```

---

## SECTION 3: DATABASE SECURITY
**Priority: HIGH | Implementation Time: 2-3 days**

### 3.1 Connection Security

**PostgreSQL SSL/TLS Configuration:**
```sql
-- postgresql.conf
ssl = on
ssl_cert_file = '/etc/ssl/certs/server.crt'
ssl_key_file = '/etc/ssl/private/server.key'
ssl_ca_file = '/etc/ssl/certs/ca.crt'
ssl_crl_file = '/etc/ssl/certs/server.crl'

-- Require SSL for all connections
ssl_min_protocol_version = 'TLSv1.2'
ssl_ciphers = 'HIGH:!aNULL:!MD5'

-- pg_hba.conf - Host-Based Authentication
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local connections with peer auth
local   all             postgres                                peer

# Reject non-SSL connections
hostnossl all           all             0.0.0.0/0               reject

# Require SSL and certificate verification
hostssl  production      app_user        10.0.1.0/24             scram-sha-256
hostssl  production      readonly_user   10.0.2.0/24             scram-sha-256 clientcert=verify-full

# Admin access from bastion only
hostssl  all             admin           10.0.0.5/32             scram-sha-256
```

**Application Connection String:**
```typescript
// Database connection with SSL
const dbConfig = {
  host: process.env.DB_HOST,
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca.crt').toString(),
    cert: fs.readFileSync('/path/to/client.crt').toString(),
    key: fs.readFileSync('/path/to/client.key').toString(),
  },
  
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  
  // Application name for monitoring
  application_name: 'web-app-api',
};
```

### 3.2 User Privilege Management

**Database Role Hierarchy:**
```sql
-- Create role hierarchy
CREATE ROLE app_read;
CREATE ROLE app_write;
CREATE ROLE app_admin;

-- Read-only permissions
GRANT USAGE ON SCHEMA public TO app_read;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_read;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_read;

-- Write permissions (inherits read)
GRANT app_read TO app_write;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_write;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT, UPDATE, DELETE ON TABLES TO app_write;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_write;

-- Admin permissions (limited)
GRANT app_write TO app_admin;
GRANT CREATE ON SCHEMA public TO app_admin;

-- Create application users
CREATE USER app_web WITH PASSWORD 'strong_random_password';
CREATE USER app_migration WITH PASSWORD 'different_strong_password';
CREATE USER app_backup WITH PASSWORD 'backup_strong_password';

-- Assign roles
GRANT app_write TO app_web;
GRANT app_admin TO app_migration;
GRANT app_read TO app_backup;

-- Row Level Security policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_isolation ON users
  FOR ALL
  TO app_web
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Set tenant in application
SET app.current_tenant = 'tenant-uuid';
```

**Connection User Separation:**
```typescript
// config/database.ts
export const databaseConfigs = {
  // Web application - limited permissions
  application: {
    user: 'app_web',
    password: process.env.DB_APP_PASSWORD,
    maxConnections: 20,
    allowedOperations: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  },
  
  // Migrations - elevated permissions but time-limited
  migration: {
    user: 'app_migration',
    password: process.env.DB_MIGRATION_PASSWORD,
    maxConnections: 5,
    allowedOperations: ['ALL'],
    // Rotate password after each deployment
  },
  
  // Analytics/Reporting - read-only
  analytics: {
    user: 'app_analytics',
    password: process.env.DB_ANALYTICS_PASSWORD,
    maxConnections: 10,
    allowedOperations: ['SELECT'],
  },
};
```

### 3.3 Query Parameterization

**Repository Pattern with Parameterization:**
```typescript
// db/SecureRepository.ts
import { Pool, QueryResult } from 'pg';

export class SecureRepository {
  private pool: Pool;
  
  constructor(pool: Pool) {
    this.pool = pool;
  }
  
  // NEVER concatenate user input into queries
  // Always use parameterized queries
  
  async findUserByEmail(email: string): Promise<User | null> {
    const query = {
      text: 'SELECT id, email, name FROM users WHERE email = $1 AND active = $2',
      values: [email.toLowerCase().trim(), true],
    };
    
    const result = await this.pool.query(query);
    return result.rows[0] || null;
  }
  
  async searchUsers(filters: UserFilters): Promise<User[]> {
    // Build query dynamically but safely
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (filters.name) {
      // Use parameterized ILIKE
      conditions.push(`name ILIKE $${paramIndex}`);
      values.push(`%${filters.name.replace(/[%_]/g, '\\$&')}%`);
      paramIndex++;
    }
    
    if (filters.role) {
      // Whitelist allowed values
      const allowedRoles = ['admin', 'user', 'guest'];
      if (!allowedRoles.includes(filters.role)) {
        throw new Error('Invalid role filter');
      }
      conditions.push(`role = $${paramIndex}`);
      values.push(filters.role);
      paramIndex++;
    }
    
    if (filters.createdAfter) {
      conditions.push(`created_at >= $${paramIndex}`);
      values.push(filters.createdAfter);
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';
    
    // Limit and offset with validation
    const limit = Math.min(Math.max(filters.limit || 20, 1), 100);
    const offset = Math.max(filters.offset || 0, 0);
    
    const query = {
      text: `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      values: [...values, limit, offset],
    };
    
    const result = await this.pool.query(query);
    return result.rows;
  }
  
  // Bulk operations with validation
  async updateUserStatus(userIds: string[], status: string): Promise<void> {
    // Validate status against whitelist
    const allowedStatuses = ['active', 'inactive', 'suspended'];
    if (!allowedStatuses.includes(status)) {
      throw new Error('Invalid status');
    }
    
    // Validate UUID format
    const validUuids = userIds.filter(id => 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    );
    
    if (validUuids.length === 0) return;
    
    // Use ANY with array parameter
    const query = {
      text: 'UPDATE users SET status = $1, updated_at = NOW() WHERE id = ANY($2::UUID[])',
      values: [status, validUuids],
    };
    
    await this.pool.query(query);
  }
}
```

### 3.4 Database Firewall Rules

**PgBouncer Connection Pooling with Rules:**
```ini
; pgbouncer.ini
[databases]
production = host=db.internal port=5432 dbname=production

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; Connection limits
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3

; Timeouts
server_idle_timeout = 600
server_lifetime = 3600
server_connect_timeout = 5
query_timeout = 30
query_wait_timeout = 30

; Security
server_tls_sslmode = require
server_tls_ca_file = /etc/ssl/certs/ca.crt
server_tls_cert_file = /etc/ssl/certs/pgbouncer.crt
server_tls_key_file = /etc/ssl/private/pgbouncer.key

; Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
stats_period = 60

; Admin users
admin_users = pgbouncer_admin
stats_users = pgbouncer_stats
```

**AWS RDS Security Group:**
```hcl
resource "aws_security_group" "database" {
  name_prefix = "database-hardened"
  description = "Database security group - restricted access"
  vpc_id      = aws_vpc.main.id

  # Only allow connections from application servers
  ingress {
    description     = "PostgreSQL from app servers"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.web_app.id]
  }

  # No public access
  ingress {
    description = "Block public access"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = []
  }

  egress {
    description = "No outbound needed"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = []
  }

  tags = {
    Name = "database-restricted"
  }
}

# Enable CloudTrail for database access logging
resource "aws_cloudtrail" "database_access" {
  name           = "database-access-logs"
  s3_bucket_name = aws_s3_bucket.logs.id
  
  event_selector {
    read_write_type           = "All"
    include_management_events = true
    
    data_resource {
      type   = "AWS::RDS::DBInstance"
      values = [aws_db_instance.production.arn]
    }
  }
}
```

### 3.5 Encryption

**Encryption at Rest (PostgreSQL with pgcrypto):**
```sql
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive column
ALTER TABLE users ADD COLUMN ssn_encrypted BYTEA;

-- Encrypt data on insert
INSERT INTO users (name, ssn_encrypted)
VALUES (
  'John Doe',
  pgp_sym_encrypt('123-45-6789', current_setting('app.encryption_key'))
);

-- Decrypt on select (only with proper permissions)
SELECT 
  name,
  pgp_sym_decrypt(ssn_encrypted, current_setting('app.encryption_key')) as ssn
FROM users
WHERE id = 1;

-- Set encryption key per session
SET app.encryption_key = 'your-encryption-key';
```

**Application-Level Field Encryption:**
```typescript
// crypto/FieldEncryption.ts
import crypto from 'crypto';

export class FieldEncryption {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;
  
  constructor(masterKey: string) {
    // Derive key using HKDF
    this.key = crypto.hkdfSync('sha256', masterKey, '', 'field-encryption', 32);
  }
  
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  decrypt(encryptedData: string): string {
    const [ivHex, authTagHex, ciphertext] = encryptedData.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Usage for PII
const encryption = new FieldEncryption(process.env.FIELD_ENCRYPTION_KEY!);

// Before saving to database
const encryptedSsn = encryption.encrypt(user.ssn);
await db.query('UPDATE users SET ssn_encrypted = $1 WHERE id = $2', [encryptedSsn, userId]);

// After reading from database
const decryptedSsn = encryption.decrypt(row.ssn_encrypted);
```

---

## SECTION 4: SECURE API DESIGN
**Priority: HIGH | Implementation Time: 1-2 weeks**

### 4.1 API Authentication

**OAuth 2.0 + PKCE Implementation:**
```typescript
// auth/OAuthService.ts
import crypto from 'crypto';
import { Redis } from 'ioredis';

export class OAuthService {
  private redis: Redis;
  
  // PKCE Authorization Endpoint
  async createAuthorizationRequest(params: {
    clientId: string;
    redirectUri: string;
    scope: string;
    state: string;
    codeChallenge: string;
    codeChallengeMethod: 'S256';
  }): Promise<string> {
    // Validate client
    const client = await this.validateClient(params.clientId, params.redirectUri);
    if (!client) {
      throw new Error('Invalid client');
    }
    
    // Generate authorization code
    const code = crypto.randomBytes(32).toString('base64url');
    
    // Store code with PKCE verifier requirement
    await this.redis.setex(
      `auth_code:${code}`,
      600, // 10 minutes
      JSON.stringify({
        clientId: params.clientId,
        redirectUri: params.redirectUri,
        scope: params.scope,
        codeChallenge: params.codeChallenge,
        codeChallengeMethod: params.codeChallengeMethod,
        userId: null, // Set after user authentication
      })
    );
    
    return code;
  }
  
  // Token Exchange with PKCE verification
  async exchangeCodeForTokens(params: {
    code: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    codeVerifier: string;
  }): Promise<Tokens> {
    // Retrieve authorization code
    const codeData = await this.redis.get(`auth_code:${params.code}`);
    if (!codeData) {
      throw new Error('Invalid or expired code');
    }
    
    const authCode = JSON.parse(codeData);
    
    // Verify client
    if (authCode.clientId !== params.clientId || 
        authCode.redirectUri !== params.redirectUri) {
      throw new Error('Invalid client credentials');
    }
    
    await this.verifyClientSecret(params.clientId, params.clientSecret);
    
    // Verify PKCE code_verifier
    const expectedChallenge = crypto
      .createHash('sha256')
      .update(params.codeVerifier)
      .digest('base64url');
    
    if (expectedChallenge !== authCode.codeChallenge) {
      await this.logSecurityEvent('pkce_verification_failed', { clientId: params.clientId });
      throw new Error('Invalid code_verifier');
    }
    
    // Delete used code
    await this.redis.del(`auth_code:${params.code}`);
    
    // Generate tokens
    return this.generateTokenPair(authCode.userId, authCode.scope);
  }
  
  private async generateTokenPair(userId: string, scope: string): Promise<Tokens> {
    const accessToken = this.generateJWT({
      sub: userId,
      scope,
      type: 'access',
      exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
    });
    
    const refreshToken = crypto.randomBytes(32).toString('base64url');
    
    // Store refresh token hash
    await this.redis.setex(
      `refresh_token:${refreshToken}`,
      30 * 24 * 60 * 60, // 30 days
      userId
    );
    
    return { accessToken, refreshToken, expiresIn: 900 };
  }
  
  private generateJWT(payload: object): string {
    // Use RS256 for asymmetric signing
    const header = { alg: 'RS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    const signature = crypto
      .createSign('RSA-SHA256')
      .update(`${encodedHeader}.${encodedPayload}`)
      .sign(privateKey, 'base64url');
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }
}
```

**JWT Security Best Practices:**
```typescript
// auth/JWTValidator.ts
import jwt from 'jsonwebtoken';
import { Redis } from 'ioredis';

export class JWTValidator {
  private redis: Redis;
  private publicKey: string;
  
  constructor(publicKey: string, redis: Redis) {
    this.publicKey = publicKey;
    this.redis = redis;
  }
  
  async validateToken(token: string): Promise<JWTPayload> {
    try {
      // Verify signature and decode
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'], // Explicitly allow only RS256
        issuer: 'your-app',
        audience: 'your-api',
        complete: false,
      }) as JWTPayload;
      
      // Check token blacklist (for logout/revocation)
      const jti = decoded.jti;
      if (jti) {
        const isRevoked = await this.redis.exists(`revoked_token:${jti}`);
        if (isRevoked) {
          throw new Error('Token has been revoked');
        }
      }
      
      // Validate token binding (optional)
      if (decoded.binding && !this.validateBinding(decoded.binding)) {
        throw new Error('Token binding mismatch');
      }
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }
  
  async revokeToken(jti: string, exp: number): Promise<void> {
    // Store in blacklist until expiration
    const ttl = exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.setex(`revoked_token:${jti}`, ttl, 'revoked');
    }
  }
  
  private validateBinding(binding: TokenBinding): boolean {
    // Compare with current request context
    // Implementation depends on your binding strategy
    return true;
  }
}

// JWT Middleware
export const jwtMiddleware = (validator: JWTValidator) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    
    const token = authHeader.substring(7);
    
    try {
      const payload = await validator.validateToken(token);
      req.user = payload;
      next();
    } catch (error) {
      return res.status(401).json({ error: error.message });
    }
  };
};
```

**API Key Management:**
```typescript
// auth/APIKeyManager.ts
import crypto from 'crypto';
import { Redis } from 'ioredis';

export class APIKeyManager {
  private redis: Redis;
  
  async generateKey(organizationId: string, scopes: string[]): Promise<{
    keyId: string;
    apiKey: string;
    hashedKey: string;
  }> {
    const keyId = crypto.randomUUID();
    const apiKey = `pk_${crypto.randomBytes(32).toString('base64url')}`;
    
    // Hash the key for storage
    const hashedKey = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');
    
    // Store key metadata
    await this.redis.setex(
      `api_key:${hashedKey}`,
      365 * 24 * 60 * 60, // 1 year
      JSON.stringify({
        keyId,
        organizationId,
        scopes,
        createdAt: Date.now(),
        lastUsed: null,
        usageCount: 0,
      })
    );
    
    // Index by organization
    await this.redis.sadd(`org_keys:${organizationId}`, hashedKey);
    
    return { keyId, apiKey, hashedKey };
  }
  
  async validateKey(apiKey: string): Promise<APIKeyData | null> {
    const hashedKey = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');
    
    const data = await this.redis.get(`api_key:${hashedKey}`);
    if (!data) return null;
    
    const keyData = JSON.parse(data);
    
    // Update usage statistics
    keyData.lastUsed = Date.now();
    keyData.usageCount++;
    
    await this.redis.setex(
      `api_key:${hashedKey}`,
      365 * 24 * 60 * 60,
      JSON.stringify(keyData)
    );
    
    return keyData;
  }
  
  async revokeKey(hashedKey: string): Promise<void> {
    const data = await this.redis.get(`api_key:${hashedKey}`);
    if (data) {
      const keyData = JSON.parse(data);
      await this.redis.srem(`org_keys:${keyData.organizationId}`, hashedKey);
      await this.redis.del(`api_key:${hashedKey}`);
    }
  }
}

// API Key Middleware
export const apiKeyMiddleware = (keyManager: APIKeyManager) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
    
    const keyData = await keyManager.validateKey(apiKey);
    if (!keyData) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    req.apiKey = keyData;
    next();
  };
};
```

### 4.2 Rate Limiting & Throttling

**Tiered Rate Limiting:**
```typescript
// middleware/RateLimiter.ts
import { Redis } from 'ioredis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export class TieredRateLimiter {
  private redis: Redis;
  
  private readonly tiers = {
    // Anonymous users - very restrictive
    anonymous: {
      windowMs: 60 * 1000,      // 1 minute
      maxRequests: 10,
      keyPrefix: 'ratelimit:anon',
    },
    
    // Authenticated users - moderate
    authenticated: {
      windowMs: 60 * 1000,
      maxRequests: 100,
      keyPrefix: 'ratelimit:auth',
    },
    
    // API keys - higher limit
    api: {
      windowMs: 60 * 1000,
      maxRequests: 1000,
      keyPrefix: 'ratelimit:api',
    },
    
    // Specific endpoints - strict
    sensitive: {
      windowMs: 60 * 1000,
      maxRequests: 5,
      keyPrefix: 'ratelimit:sensitive',
    },
  };
  
  constructor(redis: Redis) {
    this.redis = redis;
  }
  
  async checkLimit(
    tier: keyof typeof this.tiers,
    identifier: string
  ): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
  }> {
    const config = this.tiers[tier];
    const key = `${config.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Use Redis sorted set for sliding window
    const pipeline = this.redis.pipeline();
    
    // Remove old entries
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Count current entries
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${crypto.randomUUID()}`);
    
    // Set expiry on the key
    pipeline.pexpire(key, config.windowMs);
    
    const results = await pipeline.exec();
    const currentCount = results![1][1] as number;
    
    const allowed = currentCount < config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - currentCount - 1);
    const resetTime = now + config.windowMs;
    
    if (!allowed) {
      await this.logRateLimitExceeded(tier, identifier);
    }
    
    return {
      allowed,
      limit: config.maxRequests,
      remaining,
      resetTime,
    };
  }
  
  // Express middleware
  middleware(tier: keyof typeof this.tiers) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const identifier = this.getIdentifier(req, tier);
      const result = await this.checkLimit(tier, identifier);
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', result.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
      
      if (!result.allowed) {
        res.setHeader('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000));
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        });
      }
      
      next();
    };
  }
  
  private getIdentifier(req: Request, tier: string): string {
    if (tier === 'api' && req.apiKey) {
      return req.apiKey.organizationId;
    }
    if (req.user) {
      return req.user.sub;
    }
    // Fallback to IP (with caution - can affect multiple users behind NAT)
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
  
  private async logRateLimitExceeded(tier: string, identifier: string): Promise<void> {
    console.warn(`Rate limit exceeded: tier=${tier}, identifier=${identifier}`);
    // Send to SIEM/monitoring
  }
}

// Circuit breaker pattern for cascading failures
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime: number = 0;
  
  constructor(
    private readonly threshold = 5,
    private readonly timeout = 60000
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        this.failureCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

### 4.3 API Input Validation

**OpenAPI-Based Validation:**
```typescript
// validation/OpenAPIValidator.ts
import { OpenAPIV3 } from 'openapi-types';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export class OpenAPIValidator {
  private ajv: Ajv;
  private schemas: Map<string, any> = new Map();
  
  constructor(openApiSpec: OpenAPIV3.Document) {
    this.ajv = new Ajv({
      strict: true,
      allErrors: true,
      coerceTypes: true,
    });
    addFormats(this.ajv);
    
    // Compile schemas from OpenAPI spec
    this.compileSchemas(openApiSpec);
  }
  
  private compileSchemas(spec: OpenAPIV3.Document): void {
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods as any)) {
        if (operation?.requestBody?.content?.['application/json']?.schema) {
          const schema = operation.requestBody.content['application/json'].schema;
          const operationId = operation.operationId || `${method}_${path}`;
          this.schemas.set(operationId, this.ajv.compile(schema));
        }
      }
    }
  }
  
  validate(operationId: string, data: unknown): { valid: boolean; errors?: any[] } {
    const validate = this.schemas.get(operationId);
    if (!validate) {
      return { valid: true }; // No schema defined
    }
    
    const valid = validate(data);
    return {
      valid,
      errors: valid ? undefined : validate.errors,
    };
  }
}

// Strict validation middleware
export const strictValidation = (validator: OpenAPIValidator) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const operationId = req.route?.stack?.[0]?.name || `${req.method}_${req.path}`;
    
    // Validate body
    if (req.body && Object.keys(req.body).length > 0) {
      const result = validator.validate(operationId, req.body);
      if (!result.valid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: result.errors,
        });
      }
    }
    
    // Additional strict checks
    const disallowedPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /\.\./,  // Path traversal
      /\/etc\/passwd/,
      /\/proc\/self/,
    ];
    
    const checkValue = (value: any, path: string): string[] => {
      const errors: string[] = [];
      
      if (typeof value === 'string') {
        for (const pattern of disallowedPatterns) {
          if (pattern.test(value)) {
            errors.push(`Suspicious pattern detected in ${path}`);
          }
        }
        
        // Check for null bytes
        if (value.includes('\x00')) {
          errors.push(`Null byte detected in ${path}`);
        }
      } else if (typeof value === 'object' && value !== null) {
        for (const [key, val] of Object.entries(value)) {
          errors.push(...checkValue(val, `${path}.${key}`));
        }
      }
      
      return errors;
    };
    
    const errors = checkValue(req.body, 'body');
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Input contains disallowed patterns',
        details: errors,
      });
    }
    
    next();
  };
};
```

### 4.4 CORS Configuration

```typescript
// middleware/CORSConfig.ts
import cors from 'cors';

// Whitelist-based CORS
const allowedOrigins = new Set([
  'https://app.yourdomain.com',
  'https://admin.yourdomain.com',
  'https://api.yourdomain.com',
  // Development origins (only in dev mode)
  ...(process.env.NODE_ENV === 'development' ? [
    'http://localhost:3000',
    'http://localhost:8080',
  ] : []),
]);

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Request-ID',
    'X-CSRF-Token',
  ],
  
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Request-ID',
  ],
  
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Dynamic CORS for multi-tenant applications
export const dynamicCors = (allowedDomainsCache: Map<string, boolean>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    
    if (!origin) {
      return next();
    }
    
    // Check cache first
    if (allowedDomainsCache.has(origin)) {
      if (allowedDomainsCache.get(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      return next();
    }
    
    // Validate against database
    validateTenantOrigin(origin).then(isValid => {
      allowedDomainsCache.set(origin, isValid);
      
      if (isValid) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      
      next();
    });
  };
};
```

### 4.5 API Versioning & Deprecation

```typescript
// middleware/APIVersioning.ts
import { Request, Response, NextFunction } from 'express';

interface VersionConfig {
  version: string;
  deprecated: boolean;
  sunsetDate?: Date;
  alternatives?: string[];
}

export class APIVersionManager {
  private versions: Map<string, VersionConfig> = new Map([
    ['2023-01-01', { version: '2023-01-01', deprecated: true, sunsetDate: new Date('2024-01-01') }],
    ['2024-01-01', { version: '2024-01-01', deprecated: false }],
    ['2024-06-01', { version: '2024-06-01', deprecated: false }],
  ]);
  
  private readonly defaultVersion = '2024-01-01';
  
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Get version from header or URL
      const version = this.extractVersion(req);
      
      if (!this.versions.has(version)) {
        return res.status(400).json({
          error: 'Invalid API version',
          supportedVersions: Array.from(this.versions.keys()),
        });
      }
      
      const config = this.versions.get(version)!;
      
      // Add deprecation headers
      res.setHeader('API-Version', version);
      
      if (config.deprecated) {
        res.setHeader('Deprecation', 'true');
        
        if (config.sunsetDate) {
          res.setHeader('Sunset', config.sunsetDate.toUTCString());
          
          // Block requests after sunset
          if (new Date() > config.sunsetDate) {
            return res.status(410).json({
              error: 'API version retired',
              message: `Version ${version} is no longer supported`,
              currentVersion: this.defaultVersion,
            });
          }
        }
        
        if (config.alternatives) {
          res.setHeader('Link', config.alternatives.map(alt => 
            `<${alt}>; rel="successor-version"`
          ).join(', '));
        }
      }
      
      req.apiVersion = version;
      next();
    };
  }
  
  private extractVersion(req: Request): string {
    // Priority: Header > Query param > URL path > Default
    return req.headers['api-version'] as string ||
           req.query.version as string ||
           req.params.version ||
           this.defaultVersion;
  }
}

// Version-specific route handlers
export const versionedHandler = (handlers: { [version: string]: Function }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const version = req.apiVersion || '2024-01-01';
    
    // Find appropriate handler
    const availableVersions = Object.keys(handlers).sort().reverse();
    const selectedVersion = availableVersions.find(v => v <= version);
    
    if (!selectedVersion) {
      return res.status(400).json({
        error: 'No handler available for this version',
      });
    }
    
    return handlers[selectedVersion](req, res, next);
  };
};
```

---

## SECTION 5: MONITORING & INCIDENT RESPONSE
**Priority: CRITICAL | Implementation Time: 1 week**

### 5.1 Security Event Logging

```typescript
// logging/SecurityLogger.ts
import winston from 'winston';

export class SecurityLogger {
  private logger: winston.Logger;
  
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'security' },
      transports: [
        new winston.transports.File({ filename: 'security-audit.log' }),
        new winston.transports.Console(),
      ],
    });
  }
  
  logAuthEvent(event: {
    type: 'login' | 'logout' | 'mfa_success' | 'mfa_failure' | 'password_change';
    userId?: string;
    ip: string;
    userAgent: string;
    success: boolean;
    metadata?: Record<string, any>;
  }): void {
    this.logger.info('auth_event', {
      ...event,
      timestamp: new Date().toISOString(),
    });
  }
  
  logAccessEvent(event: {
    type: 'unauthorized_access' | 'forbidden_resource' | 'rate_limit_exceeded';
    userId?: string;
    resource: string;
    method: string;
    ip: string;
    details?: Record<string, any>;
  }): void {
    this.logger.warn('access_event', {
      ...event,
      severity: 'medium',
    });
  }
  
  logSuspiciousActivity(event: {
    type: 'sql_injection_attempt' | 'xss_attempt' | 'path_traversal' | 'csrf_attempt';
    ip: string;
    payload: string;
    detectionMethod: string;
  }): void {
    this.logger.error('suspicious_activity', {
      ...event,
      severity: 'high',
      requiresInvestigation: true,
    });
  }
}
```

### 5.2 WAF Rules (ModSecurity)

```apache
# modsecurity.conf
SecRuleEngine On
SecRequestBodyAccess On
SecResponseBodyAccess On

# SQL Injection Detection
SecRule REQUEST_COOKIES|REQUEST_COOKIES_NAMES|REQUEST_FILENAME|ARGS_NAMES|ARGS|XML:/* \
    "@rx (?i:(select\s*\*\s*from|union\s*select|insert\s*into|delete\s*from|drop\s*table))" \
    "id:942100,phase:2,deny,status:403,msg:'SQL Injection Attack Detected'"

# XSS Detection
SecRule REQUEST_COOKIES|REQUEST_COOKIES_NAMES|REQUEST_FILENAME|ARGS_NAMES|ARGS \
    "@rx (?i:<script|javascript:|on\w+\s*=)" \
    "id:941100,phase:2,deny,status:403,msg:'XSS Attack Detected'"

# Rate Limiting
SecAction "id:900700,phase:1,nolog,pass,setvar:ip.request_count=+1,expirevar:ip.request_count=60"
SecRule IP:REQUEST_COUNT "@gt 100" \
    "id:900701,phase:1,deny,status:429,msg:'Rate limit exceeded'"
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Immediate (24-48 hours)
- [ ] Reset all credentials (assume compromise)
- [ ] Enable comprehensive logging
- [ ] Apply firewall rules
- [ ] Patch critical vulnerabilities
- [ ] Enable MFA for all admin accounts
- [ ] Isolate compromised systems

### Phase 2: Short-term (1 week)
- [ ] Implement input validation framework
- [ ] Deploy WAF rules
- [ ] Configure SSL/TLS for all connections
- [ ] Implement rate limiting
- [ ] Deploy intrusion detection
- [ ] Set up security monitoring

### Phase 3: Medium-term (2-4 weeks)
- [ ] Complete code review for security issues
- [ ] Implement comprehensive authentication hardening
- [ ] Deploy database encryption
- [ ] Implement API versioning
- [ ] Complete penetration testing
- [ ] Security awareness training

### Phase 4: Long-term (1-3 months)
- [ ] Regular security audits
- [ ] Bug bounty program
- [ ] Automated security scanning
- [ ] Incident response drills
- [ ] Compliance certification (SOC2, ISO 27001)

---

## PRIORITY SUMMARY

| Priority | Area | Risk if Not Implemented |
|----------|------|------------------------|
| P0 | Credential reset, MFA | Complete system compromise |
| P0 | Input validation | SQL injection, XSS attacks |
| P0 | Firewall/Network | Unauthorized access |
| P1 | Session management | Session hijacking |
| P1 | Rate limiting | DoS, brute force |
| P1 | Logging/Monitoring | Undetected breaches |
| P2 | Encryption | Data exposure |
| P2 | API versioning | Breaking changes |
| P3 | Container security | Container escape |

---

*Document created: 2026-04-07*  
*Next review: 2026-07-07*  
*Classification: Internal Use Only*
