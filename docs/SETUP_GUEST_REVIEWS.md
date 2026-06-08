# Guest Reviews Setup Checklist

## 1) Supabase Vault Secrets

Add secrets in `Project Settings -> Vault`:

| Secret name | Value |
| --- | --- |
| `FIRECRAWL_API_KEY` | `<your_firecrawl_api_key>` |
| `SLACK_GUEST_REVIEWS_WEBHOOK` | `<your_slack_incoming_webhook_url>` |

If any secret was committed or shared in plain text, rotate it immediately.

## 2) Edge Function Environment Variables

Set these env vars for guest review functions:

| Variable | Value |
| --- | --- |
| `APP_BASE_URL` | `https://<your-intranet-domain>` |
| `SUPABASE_URL` | auto-provided |
| `SUPABASE_SERVICE_ROLE_KEY` | auto-provided |
| `SUPABASE_ANON_KEY` | auto-provided |

## 3) Run Migration

Apply migrations normally from repo root:

```bash
npm run db:push
```

## 4) Configure Review Sources

You can add sources from UI (`/reviews`, Sources tab), or insert directly:

```sql
INSERT INTO public.guest_review_sources (
  property_id,
  platform,
  source_name,
  source_url,
  polling_enabled,
  firecrawl_extract_schema
) VALUES (
  '<PROPERTY_UUID>',
  'google',
  'Google Reviews',
  'https://www.google.com/maps/place/...',
  true,
  '{"type":"object","properties":{"reviews":{"type":"array","items":{"type":"object","properties":{"review_text":{"type":"string"},"reviewer_name":{"type":"string"},"rating":{"type":"number"},"published_at":{"type":"string"}}}}}}'
);
```

### Active PHG Source Links (Configured)

#### Medhal Qurtuba by Prime Hotels
- Google: `https://www.google.com/maps/search/?api=1&query=Medhal+Qurtuba+by+Prime+Hotels+Riyadh`
- Booking: `https://www.booking.com/hotel/sa/medhal-qurtuba-by-prime-hotels.html`
- Expedia: `https://www.expedia.com/Riyadh-Hotels-Medhal-Qurtuba-By-Prime-Hotels.h125614688.Hotel-Information`
- TripAdvisor: `https://www.tripadvisor.com/Hotel_Review-g293995-d23854123-Reviews-Medhal_Qurtuba_by_Prime_Hotels-Riyadh_Riyadh_Province.html`
- Hotels.com: `https://www.hotels.com/en/ho4020670016/`

#### Prime Al Corniche Hotel Jeddah
- Google: `https://www.google.com/maps/search/?api=1&query=Prime+Al+Corniche+Hotel+Jeddah`
- Booking: `https://www.booking.com/hotel/sa/prime-alcorniche.html`
- Expedia: `https://www.expedia.com/Jeddah-Hotels-Prime-Al-Corniche-Hotel.h95419817.Hotel-Information`
- TripAdvisor: `https://www.tripadvisor.com/Hotel_Review-g295419-d24183450-Reviews-Prime_Al_Corniche_Hotel-Jeddah_Makkah_Province.html`
- Hotels.com: `https://www.hotels.com/ho3054434144/prime-al-corniche-hotel-jeddah-saudi-arabia/`

#### Prime Al Hamra Hotel Jeddah
- Google: `https://www.google.com/maps/search/?api=1&query=Prime+Al+Hamra+Hotel+Jeddah`
- Booking: `https://www.booking.com/hotel/sa/prime-jeddah-al-hamra.html`
- Expedia: `https://www.expedia.com/Jeddah-Hotels-Prime-Hotel-Al-Hamra-Jeddah.h18152968.Hotel-Information`
- TripAdvisor: `https://www.tripadvisor.com/Hotel_Review-g295419-d12300665-Reviews-Prime_Al_Hamra_Hotel-Jeddah_Makkah_Province.html`
- Agoda: `https://www.agoda.com/en-in/prime-hotel-jaddah-al-hamra/reviews/jeddah-sa.html`
- Hotels.com: `https://www.hotels.com/ho687934/prime-hotel-al-hamra-jeddah-jeddah-saudi-arabia/`

#### Prime Al Hamra Hotel Riyadh
- Google: `https://www.google.com/maps/search/?api=1&query=Prime+Al+Hamra+Hotel+Riyadh`
- Booking: `https://www.booking.com/hotel/sa/imperial.html`
- TripAdvisor: `https://www.tripadvisor.com/Hotel_Review-g293995-d25064560-Reviews-Prime_Al_Hamra_Hotel-Riyadh_Riyadh_Province.html`
- Hotels.com: `https://www.hotels.com/ho3956093824/`

### Important Crawl Note

Some OTA platforms enforce anti-bot pages and may return blocked/empty results through Firecrawl even with correct links. In those cases, use the `guest-review-import` fallback to keep review operations running.

## 5) Configure Owner Mappings

```sql
INSERT INTO public.property_review_owner_mappings (
  property_id,
  responsibility_code,
  primary_profile_id
) VALUES (
  '<PROPERTY_UUID>',
  'general_manager',
  '<PROFILE_UUID>'
)
ON CONFLICT (property_id, responsibility_code)
DO UPDATE SET primary_profile_id = EXCLUDED.primary_profile_id, is_active = true;
```

## 6) End-to-End Test

### Manual import (no Firecrawl needed)

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/guest-review-import" \
  -H "Authorization: Bearer <USER_JWT_OR_SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": "<PROPERTY_UUID>",
    "platform": "google",
    "rows": [
      {
        "review_text": "Great stay and friendly staff.",
        "reviewer_name": "John Doe",
        "rating": 5,
        "published_at": "2026-03-28T10:00:00Z"
      }
    ]
  }'
```

### Trigger collector

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/guest-review-collector" \
  -H "Authorization: Bearer <USER_JWT_OR_SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"run_mode":"backfill"}'
```

### Trigger analyzer

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/guest-review-analyzer" \
  -H "Authorization: Bearer <USER_JWT_OR_SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"review_id":"<REVIEW_UUID>","force":true}'
```

### Send Slack test

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/guest-review-notifier" \
  -H "Authorization: Bearer <USER_JWT_OR_SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"test_mode":true}'
```

## 7) UI Verification

1. Open `/reviews`.
2. Add or sync sources.
3. Open a review and run `Re-Analyze`.
4. Confirm issues, assignments, SLA due time, and response draft are present.
5. Save response and mark `Posted externally` to set review status to `responded`.

## 8) Scheduled Jobs (already in migration)

- Collector: `00:05, 05:00, 10:00, 15:00, 20:00` Asia/Riyadh.
- SLA monitor: hourly.
- Daily report: `07:00` Asia/Riyadh.

If jobs do not run, verify the Vault secret `service_role_key` exists for cron HTTP calls.
