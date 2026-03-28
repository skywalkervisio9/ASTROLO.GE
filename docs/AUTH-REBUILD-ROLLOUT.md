# Auth Rebuild Rollout

This document defines incremental rollout checkpoints and rollback knobs for the auth rebuild.

## Feature Flags

- `AUTH_REBUILD_V2` (default: enabled)
  - `1` or unset: new auth guard/session/profile pipeline enabled.
  - `0`: fallback behavior where supported.
- `AUTH_SERVER_ONBOARDING` (default: enabled)
  - `1` or unset: onboarding uses server-issued token flow (`/api/onboarding/start`).
  - `0`: legacy fallback can still use localStorage handoff.
- `AUTH_CSRF_ENFORCE`
  - `1`: enforce CSRF checks for mutation routes.
  - `0`: disable CSRF checks (emergency only).
  - unset: enabled in production, disabled in non-production.
- `AUTH_AUDIT_LOGS` (default: enabled)
  - `1` or unset: emits auth audit logs.
  - `0`: silence auth audit events.
- `PAYMENT_WEBHOOK_SECRET`
  - HMAC secret for `POST /api/payment/webhook`.
  - Required in production.

## Rollout Stages

1. Stage A: Shadow and observe
   - Deploy with `AUTH_AUDIT_LOGS=1`.
   - Keep `AUTH_CSRF_ENFORCE=0` in staging while validating client headers.
2. Stage B: Enable new session/profile path
   - Set `AUTH_REBUILD_V2=1` and verify `/api/auth/session` is healthy.
3. Stage C: Enable server onboarding flow
   - Set `AUTH_SERVER_ONBOARDING=1`.
   - Validate `/api/onboarding/start`, `/api/onboarding/pending`, `/api/onboarding/status`.
4. Stage D: Enforce CSRF in production
   - Set `AUTH_CSRF_ENFORCE=1`.
   - Ensure all mutation clients send `x-csrf-token`.
5. Stage E: Payment webhook hardening
   - Set `PAYMENT_WEBHOOK_SECRET` and validate signature flow with provider sandbox.

## Rollback

- Critical auth regressions:
  - Set `AUTH_REBUILD_V2=0`.
- Onboarding issues:
  - Set `AUTH_SERVER_ONBOARDING=0` (legacy fallback path in client remains).
- CSRF-related client regressions:
  - Set `AUTH_CSRF_ENFORCE=0` temporarily while fixing clients.
- Webhook verification issues:
  - Rotate `PAYMENT_WEBHOOK_SECRET` after incident; replay only signed events.
