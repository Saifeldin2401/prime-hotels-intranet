# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by emailing security@altus-advisory.com. Do not open a public issue.

## Security Measures

### Authentication & Authorization
- JWT-based authentication with Supabase Auth
- Session timeout: 24 hours
- Maximum session age: 7 days
- Rate limiting on login attempts (5 attempts per 15 minutes)
- Email verification required

### Content Security Policy (CSP)
We implement a strict CSP to prevent XSS attacks:
- `default-src 'self'`
- `script-src 'self'` (with nonce support where possible)
- `style-src 'self' 'unsafe-inline'` (required for Tailwind)
- `frame-ancestors 'none'` (clickjacking protection)

### Security Headers
All responses include these security headers:
- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (restricted camera, microphone, geolocation)
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

**Note:** `X-XSS-Protection` is intentionally omitted as it's deprecated and can introduce vulnerabilities. CSP provides better protection.

### CORS Configuration
- Strict origin whitelist in production
- No wildcard (`*`) origins in production
- Credentials only sent to allowed origins

### Environment Variables
- Never commit `.env` files with real credentials
- Use `.env.example` as a template
- All secrets stored in deployment platform secrets
- Client-side env vars prefixed with `VITE_`
- Server-side secrets never exposed to browser

### Dependency Security
- Regular `npm audit` scans
- Automated vulnerability fixes via `npm audit fix`
- CI/CD pipeline includes security checks

### File Upload Security
- File type validation (whitelist approach)
- Maximum file size: 5MB
- Filename sanitization
- Malware scanning enabled

## Security Checklist

Before deploying to production:

- [ ] All environment variables use production values
- [ ] No hardcoded secrets in source code
- [ ] `VITE_DEV_MODE=false`
- [ ] Analytics and error reporting enabled
- [ ] CSP headers configured and tested
- [ ] HTTPS enforced with HSTS
- [ ] Rate limiting enabled
- [ ] Dependency audit passed (`npm audit`)
- [ ] Source maps not exposed in production

## Incident Response

In case of a security breach:

1. Immediately rotate all API keys and credentials
2. Review access logs for suspicious activity
3. Notify affected users within 72 hours
4. Document the incident and remediation steps
5. Update security measures to prevent recurrence

## Compliance

This application follows security best practices for:
- OWASP Top 10
- GDPR data protection
- SOC 2 Type II controls
