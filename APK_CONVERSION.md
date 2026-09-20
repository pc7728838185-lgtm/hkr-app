# Android APK conversion with Capacitor

Requirements: Node.js + Android Studio + JDK 17.

1. `npm install`
2. `npx cap add android`
3. `npx cap copy`
4. `npx cap open android`
5. In Android Studio choose Build → Build APK(s).

For a live app, host/deploy the web build on HTTPS or package the files directly with Capacitor. Keep the Supabase publishable/anon key only; NEVER package a Supabase secret/service_role key in the APK.
