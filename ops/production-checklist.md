## ENVIRONMENT VARIABLES
- All secrets present in Azure
- Correct NODE_ENV
- Correct API URLs
- SignNow credentials validated
- Twilio credentials validated
- Office 365 credentials validated
- Application logging keys present

## HEALTH CHECKS
- /api/_int/health returns 200
- DB reachable
- Storage reachable
- Lender endpoints reachable
- Queue processing active

## SECURITY
- JWT validation tested
- Password reset tested
- MFA flows tested
- Lender portal isolation verified
- Silo isolation (BF / BI / SLF) verified
- No mixed data across silos
- HTTPS-only enforced

## DOCUMENT SYSTEM
- Upload → storage → DB record
- Preview + Download verified
- Re-upload recovery verified
- SHA256 checksum verification
- OCR triggered
- Banking analysis triggered

## CLIENT APP FLOW
- All steps (1 → 6) verified
- Resume session works
- Required docs logic verified
- AI chat safe + functional
- Talk-to-human routing to CRM
- Report-an-issue routing to CRM
- SignNow redirect + callback verified

## STAFF PORTAL
- Pipeline auto-moves
- Credit Summary generated
- Lender table filters working
- Communication center functional
- CRM timeline updated on all events

## MARKETING SYSTEM
- Ad channels connected
- Budget recommendations functional
- Marketing to-do system active
- Brand library loaded

## BACKUPS
- Daily DB backup configured
- Daily document backup configured
- 7-day retention
- Recovery tested

## ALERTING
- App Service alerts configured
- Error notifications enabled
- Storage quota alerts
- CPU/memory alerts

## ROLLBACK PLAN
- Document version control
- Database revert path
- Deployment undo instructions
