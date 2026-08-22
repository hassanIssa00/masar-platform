# Production Auth And Cloud Sync Fix

## المشكلة

كان تسجيل الدخول على `masarplatform.org` يفشل برسائل عامة مثل "تعذر الاتصال بالسيرفر" أو "بيانات الدخول غير صحيحة"، وكانت الحسابات المولدة لا تعمل من أجهزة أخرى لأن السيرفر لم يكن يملك مفاتيح التشغيل الأساسية في Vercel Production.

## السبب

Production كان ناقصه:

- `SESSION_SECRET`: توقيع جلسات الدخول الآمنة.
- `OWNER_PASSWORD_HASH`: هاش كلمة مرور حساب د. إسماعيل.
- `FIREBASE_SERVICE_ACCOUNT_KEY`: صلاحية Firebase Admin لقراءة/كتابة حسابات المستخدمين، الطلاب، التقارير، وبيانات المولد على السحابة.

بدون `FIREBASE_SERVICE_ACCOUNT_KEY` تبقى بيانات المتصفح cache محلي فقط، ولا تصبح Firestore هي مصدر الحقيقة بين الأجهزة.

## الحل المطبق

- إضافة `SESSION_SECRET` في Vercel Production.
- إضافة `OWNER_PASSWORD_HASH` في Vercel Production.
- إنشاء مفتاح Firebase Admin لمشروع `masar-platform-8e642` وإضافته في Vercel Production باسم `FIREBASE_SERVICE_ACCOUNT_KEY`.
- إعادة نشر production deployment حتى يلتقط Vercel المتغيرات الجديدة.

## التحقق بعد النشر

نفذ فحص تسجيل الدخول:

```bash
curl -i https://masarplatform.org/api/auth/login
```

واختبر `POST /api/auth/login` بحساب صحيح. النتيجة الصحيحة تكون:

```json
{ "ok": true, "account": { "role": "doctor" } }
```

ثم اختبر قراءة السحابة بنفس cookie الجلسة:

```bash
curl -i https://masarplatform.org/api/data/snapshot
```

النتيجة الصحيحة تكون `200` مع `ok: true`.

## ملاحظات تشغيل

- لا تحفظ مفاتيح Firebase أو كلمات المرور داخل git.
- أي تغيير في Vercel env يحتاج production redeploy جديد.
- `localStorage` داخل الواجهة يستخدم كـ cache فقط بعد نجاح `pullServerSnapshotToLocal`; مصدر البيانات الفعلي في الإنتاج هو Firestore.
- حسابات مولد الحسابات تحفظ في Firestore داخل `accounts` و `account_credentials`، وتعمل من أي جهاز بعد النشر الصحيح.
