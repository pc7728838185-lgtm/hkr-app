# HKR Tournaments V3 — Online Supabase Edition

This is an APK-conversion-ready web/PWA project backed by Supabase. Unlike the localStorage prototype, tournaments, registrations and payment requests are stored online so different phones see the same data.

## 1. Create Supabase project
Create a project at https://supabase.com. Open SQL Editor and run `supabase/schema.sql`.

## 2. Create your admin account
Use the app's Sign up form with your admin email. Then in Supabase SQL Editor run:
`update public.profiles set role='admin' where id=(select id from auth.users where email='YOUR_ADMIN_EMAIL');`
Never put a service/secret key in the app.

## 3. Configure app
Copy `config.js` to `config.local.js` (or edit config.js) and set the Supabase project URL and publishable/anon key. Only the publishable/anon key belongs in a client app. Supabase's security model relies on Auth + RLS; the secret/service key must stay server-side.

## 4. Configure UPI
Log in as admin → Admin → Settings. Enter your UPI ID and the URL of your QR image. The app generates an `upi://pay` link and shows the QR. UTR is submitted for manual admin verification.

## 5. APK
The simplest route is to host this project over HTTPS, then wrap it with Capacitor or another WebView wrapper. `APK_CONVERSION.md` has the exact commands.

## Important production note
This project intentionally uses manual UTR verification. A UPI QR/deep link does not by itself prove that money was received. For automatic payment verification, connect a compliant payment gateway/server and verify payments server-side before marking a registration paid.
