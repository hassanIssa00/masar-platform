# توثيق إصلاح الدخول والمزامنة السحابية والأمان

## المشكلة

كان جزء من المنصة يعتمد على `localStorage` في بيانات تشغيل مهمة مثل الحسابات، كلمات المرور، الطلاب، التقارير، وبعض حالة Face ID. هذا جعل البيانات تظهر على جهاز واحد فقط ولا تصل للدكتور أو أي جهاز آخر، كما أن أي جلسة تُنشأ من المتصفح لا تعتبر آمنة للإنتاج.

## الحل المطبق

- أصبحت الحسابات المولدة تحفظ في Firestore عبر Firebase Admin داخل `accounts` و `account_credentials`.
- كلمات المرور تحفظ كـ bcrypt hash فقط، ولا يتم عرض كلمة المرور بعد الإنشاء.
- تسجيل الدخول بالبريد وكلمة المرور يتم عبر `/api/auth/login` ويصدر Cookie آمن من السيرفر باسم `masar_session`.
- تم إلغاء الاعتماد على أي مخزن كلمات مرور محلي مثل `masar.credentials.v1`.
- مزامنة الطلاب والتقارير والاستبيانات والرسائل والحسابات تتم من `/api/data/snapshot`، و`localStorage` أصبح مجرد Cache للعرض السريع.
- إضافة/تعديل/حذف البيانات يتم عبر `/api/data/doc` أولاً، ثم Firestore Client فقط كمسار احتياطي عند وجود Firebase Auth.
- دخول Google و Apple يعتمد على Firebase Auth ثم اعتماد السيرفر عبر `/api/auth/social`.
- Face ID أصبح يعتمد على `/api/auth/face` لمطابقة البصمة المحفوظة في Firestore وإصدار Session حقيقي من السيرفر.
- تم إيقاف قبول Session غير موقعة أو منشأة من المتصفح.

## متغيرات البيئة المطلوبة في الإنتاج

اضبط هذه القيم في Vercel أو السيرفر:

```env
SESSION_SECRET=ضع_قيمة_طويلة_عشوائية_سرية
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
OWNER_PASSWORD_HASH=$2b$10$...
```

بديل `FIREBASE_SERVICE_ACCOUNT_KEY`:

```env
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

ملاحظة: كلمة مرور الدكتور الثابتة `123456` لا تعمل في الإنتاج. لو احتجتها محلياً فقط للتطوير استخدم:

```env
ALLOW_DEV_MASTER_PASSWORD=true
```

## إعداد Google في Firebase

1. افتح Firebase Console.
2. Authentication > Sign-in method.
3. فعّل Google.
4. من Authentication > Settings > Authorized domains أضف:
   - `masarplatform.org`
   - أي دومين Vercel مستخدم للاختبار.
5. تأكد أن إعدادات Firebase في `.env.local` أو Vercel تخص نفس المشروع.

## إعداد Apple في Firebase

1. من Apple Developer فعّل Sign in with Apple.
2. أنشئ Services ID للويب.
3. أضف Return URL الخاص بفirebase:
   - `https://PROJECT_ID.firebaseapp.com/__/auth/handler`
4. في Firebase Authentication > Sign-in method > Apple أضف:
   - Services ID
   - Apple Team ID
   - Key ID
   - Private Key
5. أعد نشر الموقع بعد حفظ الإعدادات.

## قاعدة التشغيل

أي بيانات تخص المستخدمين أو الطلاب أو التقارير أو الجلسات لا تعتبر صحيحة إلا إذا كانت محفوظة على Firestore أو صادرة من API السيرفر. التخزين المحلي مسموح فقط كنسخة عرض مؤقتة، وليس كمصدر بيانات أساسي.
