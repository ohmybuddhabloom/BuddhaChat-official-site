# Buddha Chat Site Deployment

## Recommended topology

- One Vercel project for this repo.
- Supabase remains a separate managed database service.
- RevenueCat handles hosted donation checkout.

This repo now supports:

- `POST /api/chat-prompts`
- `POST /api/download-submissions`
- `POST /api/donation-intents`
- `POST /api/revenuecat-webhook`

## Required Vercel environment variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REVENUECAT_WEB_PURCHASE_LINK`
- `REVENUECAT_PACKAGE_MAP_JSON`
- `REVENUECAT_WEBHOOK_AUTH`

Optional:

- `APP_DOWNLOAD_URL`
- `REVENUECAT_SKIP_PURCHASE_SUCCESS`

## Example RevenueCat package map

```json
{
  "light-a-candle": "$rc_light_a_candle",
  "open-a-gate": "$rc_open_a_gate",
  "support-a-retreat": "$rc_support_a_retreat"
}
```

The keys must match the donation tier ids in the site content. The values must match the RevenueCat package ids configured in your web offering.

## Supabase setup

Run the SQL in [001_marketing_capture.sql](/F:/buddhachat-官网/sql/migrations/001_marketing_capture.sql) against the target Supabase project before testing the live forms.

Tables created:

- `contacts`
- `chat_prompts`
- `download_submissions`
- `donation_intents`
- `donation_events`

## RevenueCat setup

1. Create a hosted Web Purchase Link for the donation offering.
2. Ensure each website tier maps to a RevenueCat package id.
3. Set the link URL as `REVENUECAT_WEB_PURCHASE_LINK`.
4. Add a RevenueCat webhook pointing to:

```text
https://<your-domain>/api/revenuecat-webhook
```

5. Configure the webhook authorization header value to exactly match `REVENUECAT_WEBHOOK_AUTH`.

## Local verification

Use `vercel dev` for full-stack local testing because `npm run dev` only runs the Vite frontend flow.

Verification commands:

```bash
npm run test
npm run build
npx eslint api src/lib/siteApi.js src/lib/siteApi.test.js src/components/sunyata/SunyataAppPreviews.jsx src/components/sunyata/SunyataAppPreviews.test.jsx src/components/sunyata/SunyataInterlude.jsx src/components/sunyata/SunyataInterlude.test.jsx src/components/sunyata/SunyataVisual.jsx src/components/sunyata/SunyataVisual.test.jsx src/content/sunyata.js
```

## Production smoke checklist

1. Submit one Ask Buddha message and confirm a new `chat_prompts` row exists.
2. Submit one download email and confirm `contacts` and `download_submissions` update.
3. Submit one donation email and confirm `donation_intents` is created before redirect.
4. Complete one sandbox RevenueCat payment and confirm `donation_events` inserts and the matching `donation_intents.status` changes.
