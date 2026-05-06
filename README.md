# Tea Token Platform (Firebase Realtime DB)

## 1) Install

```bash
npm install
npm run dev
```

## 2) Environment Variables (`.env.local`)

Use:

- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `ADMIN_PIN`
- `SHOP_PIN`

The app reads and writes all token data from Firebase Realtime Database only.

## 3) Firebase Realtime DB Structure

The app auto-creates these paths if missing:

- `app_settings`
- `token_transactions`

`app_settings` stores:

- `balance_tokens`
- `tea_cost`
- `coffee_cost`
- `packet_5_cost`
- `packet_10_cost`
- `packet_20_cost`
- `updated_at`

## 4) Vercel Deployment

1. Push project to GitHub.
2. Import project in Vercel.
3. Add the same environment variables in Vercel Project Settings.
4. Deploy.

## 5) APK / WebView

- Admin app URL: `/admin`
- Shop app URL: `/shop`

## 6) Security Note

Your Firebase service-account private key has been exposed in chat and files. Rotate this key immediately in Google Cloud IAM and update env values.