# Supabase Auth Production Checklist

This project expects password recovery and magic/invite links to resolve on:

- `https://app.mind2muscle.se`

## Required dashboard values

In Supabase Dashboard -> Authentication -> URL Configuration:

- `Site URL`: `https://app.mind2muscle.se`
- `Redirect URLs`: include at least:
  - `https://app.mind2muscle.se`
  - `https://app.mind2muscle.se/`

If you use a callback path in templates later, add that exact URL too.

## Required Edge Function secret

Set this secret in the project where these functions run:

- `AUTH_INVITE_REDIRECT_URL=https://app.mind2muscle.se`

Used by:

- `supabase/functions/pt-upload-screening/index.ts`
- `supabase/functions/pt-upload-movement-assessment/index.ts`

## Email sender notes

- Sender domain can be `m2mperform.com`.
- Ensure SPF, DKIM and DMARC pass for that domain.
- In email templates, clearly state that users are redirected to `app.mind2muscle.se`.

## Screening upload invite (Coach → Bild-screening)

When a PT uploads screening images for a **new** email address, `pt-upload-screening` calls `auth.admin.inviteUserByEmail`. Supabase sends the **Invite user** template (not a custom welcome email with results). The athlete sets their password via the link.

**Do not deploy** the old Perform version that used `createUser` with `email_confirm: false` — it creates auth users **without sending any email**.

Deploy the Coach version:

```bash
cd M2M-Coach-fel
npx supabase functions deploy pt-upload-screening --project-ref cqpiejeiwtcopjnhccgn
npx supabase secrets set AUTH_INVITE_REDIRECT_URL=https://app.mind2muscle.se --project-ref cqpiejeiwtcopjnhccgn
```

**Authentication → Email Templates → Invite user:** paste HTML from `M2M-Perform/ai-screening-live/ai-screening-nextjs/supabase/email-templates/invite-user.html` (subject: "You're invited to Mind2Muscle Perform").

After upload, API returns `invite_sent: true` for new users. Coach app shows "Inbjudan skickad till …".

## Verification steps

1. Trigger "forgot password" from login screen.
2. Open link on mobile browser and desktop browser.
3. Confirm app shows update password screen and allows password change.
4. Reopen same link and confirm it is rejected with resend option.
5. Trigger batch invite and confirm invite link lands on same domain.
6. Upload screening in Coach for a **new** test email → Auth → Users shows `invited` → invite email received → set password on `app.mind2muscle.se`.
