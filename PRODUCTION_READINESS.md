# Production readiness plan

## Current status

CampusSync is a local single-college application under active development. It is not ready for deployment with real student records or biometric data.

## Completed in this hardening pass

- Access tokens are short-lived and backed by revocable, rotating refresh sessions.
- Browser CORS uses explicitly configured origins; production startup rejects unsafe defaults.
- Attendance hardware must authenticate with an active device key. The database stores only a hash; keys are returned only when an administrator provisions or rotates them.
- Attendance requests must identify the authenticated device and use its registered modality.
- Student and teacher accounts no longer receive preset passwords. Initial passwords require at least 12 characters and are not silently truncated before hashing.
- Admin password changes revoke the user's existing sessions.
- Business records now carry an institution ID. Authenticated ORM reads and bulk updates/deletes are filtered by the logged-in institution, new records inherit that scope, and cross-institution foreign-key links are rejected.
- Course AI uses server-side Gemini credentials, daily per-user limits, bounded output, course permissions, and verified citations. Biometric data must never be sent to the provider. Review Google's current data-use terms and institution policy before sending course materials, especially when using the free tier.

## Release gates before real student data

1. **Institution rollout:** Add institution slug selection to public sign-in/branding, create audited institution provisioning and lifecycle controls, and run a full cross-tenant matrix for every API route before onboarding a second college. The current release uses default first-college branding.
2. **Biometric governance:** Decide whether facial recognition is lawful and necessary for the institution; obtain documented consent and an alternative attendance path; define retention/deletion, access audit, liveness/anti-spoofing, accuracy evaluation, and incident handling. Recognition should run at a trusted edge service; do not accept arbitrary browser-supplied student IDs as proof of identity.
3. **Account lifecycle:** Configure verified password reset and invitation flows, rate limits, account recovery, and MFA policy for administrators.
4. **Operations:** Deploy behind TLS, use managed secrets, enforce database least privilege, configure backups and tested restores, centralized redacted logs, monitoring/alerts, and incident response.
5. **Data protection:** Review role permissions for grades, fees, disciplinary records, and exports; add audit trails and retention rules; malware-scan uploads and enforce storage quotas.
6. **Release validation:** Run migrations against a staging copy, execute backend and frontend checks, test restore and rollback procedures, and obtain an institutional privacy/security review.

## Recommended next milestone

Expand the cross-tenant security tests to every admin, teacher, student, attendance, announcement, and download route. In parallel, keep the AI vertical slice limited to instructor-uploaded course materials with citations and an explicit abstain response. Treat facial attendance as a separate, consent-gated subsystem rather than a prerequisite for the classroom product.
