# MASAR Auth, Print, AI Fix Notes

## Firebase social login

Google login can fail after account selection when the live domain is not listed in Firebase Authentication authorized domains. The fix is:

1. Open Firebase Console.
2. Go to Authentication > Settings > Authorized domains.
3. Add `masarplatform.org` and any active Vercel preview domain used for testing.
4. Go to Authentication > Sign-in method and confirm Google is enabled.

Apple login requires the Apple Developer configuration inside Firebase:

1. Enable Apple in Authentication > Sign-in method.
2. Add Services ID, Apple Team ID, Key ID, and Private Key.
3. Copy Firebase callback URL into Apple Developer Console for the same Services ID.
4. Keep `masarplatform.org` in Firebase authorized domains.

## Password recovery

Firebase email accounts use Firebase password reset links. Generated/local MASAR accounts now receive a one-time temporary password inside the reset modal, because these accounts are stored in the platform credential store rather than Firebase Auth.

## Print layout

Analytical reports now use the full branded MASAR header only on page 1. Later pages use a compact header to keep the printable A4 layout aligned and prevent content from being cut.

English certificates now use `studentNameEn` when available. If it is missing, the certificate uses a safe English fallback name instead of printing Arabic inside the English certificate.

## AI assistant

The AI route now has a deterministic first layer for simple direct questions and platform routing. It answers day/time questions directly and avoids generic filler such as "تم تحليل استفسارك". Platform actions now dispatch with the correct `action` key so pages can open the matching module.
