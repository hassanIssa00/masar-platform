# Firebase Social Auth Setup

## ملخص المشكلة

كان تسجيل الدخول بحساب Google يفتح اختيار الحساب ثم يرجع بخطأ من Firebase. السبب كان أن سياسة الحماية `Content-Security-Policy` لا تسمح بتحميل سكريبت Google المستخدم داخل Firebase Auth popup، وكانت نافذة OAuth تحتاج هيدر يسمح بالتواصل مع النافذة المنبثقة.

تم حل Google داخل الكود عبر:

- إضافة `https://apis.google.com` إلى `script-src` في `next.config.ts`.
- إضافة هيدر `Cross-Origin-Opener-Policy: same-origin-allow-popups`.
- التأكد من أن دومين الإنتاج `masarplatform.org` موجود في Firebase Authorized domains وأن Redirect URI الخاص بـ Google OAuth مضبوط على:
  `https://masarplatform.org/__/auth/handler`

## حالة Apple الحالية

زر Apple في النظام يعمل ويفتح Firebase Auth popup، لكن Firebase يرجع أن مزود Apple غير مفعل أو أن إعداداته غير مكتملة. هذا ليس خطأ واجهة، بل يحتاج بيانات Apple Developer داخل Firebase.

## خطوات تفعيل Apple Sign-In

1. افتح Firebase Console.
2. اختر مشروع `masar-platform-8e642`.
3. ادخل إلى `Authentication`.
4. افتح تبويب `Sign-in method`.
5. اضغط على `Apple`.
6. فعّل المزود `Enable`.
7. ستحتاج القيم التالية من Apple Developer:
   - `Services ID`
   - `Apple Team ID`
   - `Key ID`
   - ملف أو محتوى `Private Key`
8. من شاشة Apple provider في Firebase انسخ Callback URL، وغالبا يكون بالشكل:
   `https://masar-platform-8e642.firebaseapp.com/__/auth/handler`
   وقد تحتاج أيضا لإضافة:
   `https://masarplatform.org/__/auth/handler`
9. افتح Apple Developer Console.
10. ادخل إلى `Certificates, Identifiers & Profiles`.
11. أنشئ أو افتح `Services ID` الخاص بالمنصة.
12. فعّل `Sign in with Apple`.
13. أضف الدومينات:
   - `masarplatform.org`
   - `www.masarplatform.org`
   - `masar-platform-8e642.firebaseapp.com`
14. أضف Callback URL الذي أخذته من Firebase.
15. أنشئ `Key` مفعل عليه `Sign in with Apple` وخذ منه:
   - `Key ID`
   - ملف `AuthKey_XXXXXXXXXX.p8`
16. ارجع إلى Firebase وضع:
   - `Services ID`
   - `Team ID`
   - `Key ID`
   - محتوى ملف `.p8` في خانة Private Key
17. احفظ الإعدادات.
18. اختبر من:
   `https://masarplatform.org/login`

## ملاحظات مهمة

- Google لا يحتاج تعديل كود إضافي بعد التحديث الحالي، إلا إذا تغير الدومين أو مشروع Firebase.
- Apple لن يعمل بدون حساب Apple Developer مفعل وإعداد `Services ID` و `Private Key`.
- بعد أي تعديل في الدومينات أو OAuth credentials انتظر دقيقة إلى عدة دقائق قبل إعادة الاختبار.

## تحقق Google على الإنتاج

إذا ظهرت رسالة مثل: `راجع تفعيل المزود وإضافة الدومين في Authorized domains` بعد اختيار حساب Google، راجع الآتي:

1. من Firebase Console افتح `Authentication`.
2. افتح `Settings` ثم `Authorized domains`.
3. تأكد من وجود:
   - `masarplatform.org`
   - `www.masarplatform.org`
   - `masar-platform-8e642.firebaseapp.com`
4. من `Authentication > Sign-in method` تأكد أن مزود `Google` مفعل.
5. من Google Cloud Console تأكد أن OAuth redirect URI يحتوي:
   - `https://masarplatform.org/__/auth/handler`
   - `https://masar-platform-8e642.firebaseapp.com/__/auth/handler`

الكود الحالي يحفظ بيانات مزود الدخول داخل سجل المستخدم المحلي:

- `createdVia`: نوع الدخول مثل `google` أو `apple` أو `face`.
- `providerId`: اسم مزود Firebase.
- `firebaseUid`: رقم المستخدم داخل Firebase.
- `lastLoginAt`: آخر وقت دخول.

هذا يجعل لوحة المستخدمين تعرض أن الحساب تم إنشاؤه أو استخدامه عبر Google/Apple بدلاً من ظهوره كحساب بريد عادي فقط.

## Face ID

Face ID في المنصة ليس مزود Firebase خارجي، بل طبقة دخول محلية فوق حساب المستخدم المسجل:

1. المستخدم يدخل بحساب عادي أو اجتماعي.
2. يفتح صفحة `face-enroll`.
3. يتم حفظ بصمة الوجه وربطها بالحساب الحالي.
4. عند تسجيل الدخول بالوجه، النظام يبحث عن البصمة المرتبطة ثم يفتح نفس حساب المستخدم.

تمت معالجة مشكلة تكرار الالتقاط أثناء التسجيل بإيقاف استدعاء النجاح أكثر من مرة أثناء جلسة الكاميرا الواحدة. ولو لم تكن هناك جلسة دخول، صفحة التسجيل بالوجه ترجع المستخدم إلى `/auth/login`.
