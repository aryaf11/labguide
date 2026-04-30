# LabGuide

تطبيق تدريبي تفاعلي على أجهزة المختبر (راسم الإشارة، الملتيميتر، مزود الطاقة، مولّد الإشارة، محلل الطيف، لوحة التجارب) — يعمل في المتصفح وكتطبيق Android عبر Capacitor.

- نماذج 3D إجرائية في `Three.js` يمكن التفاعل معها مباشرة (أزرار طاقة، مداخل، مقابض).
- شاشات LCD حقيقية مرسومة عبر `CanvasTexture` تعرض القراءات (موجة جيبية، أرقام، طيف…).
- وضع AR لمحاكاة استخدام الجهاز الحقيقي عبر كاميرا الهاتف.
- تنقّل عربي RTL وواجهة تدريب متعددة الخطوات.

## المتطلبات

- Node.js 18 أو أحدث
- npm (مرفق مع Node)
- لبناء Android: Android Studio + JDK 17+ (اختياري)

## التشغيل المحلي

```bash
npm install
npm run dev
# يفتح على http://127.0.0.1:3456
```

## البناء

```bash
npm run build
```

ينسخ `www/` إلى `dist/` ويتحقّق من سلامة `index.html`، ثم تستطيع معاينة المُنتج النهائي:

```bash
npm run preview
# يفتح على http://127.0.0.1:4173
```

## التقاط لقطات للأجهزة (اختياري)

```bash
npm install --no-save puppeteer-core
npm run dev      # في طرفية منفصلة
npm run capture:screens
# يحفظ الصور في assets/screens/
```

## مزامنة Android

```bash
npm run android
# = npm run build ثم npx cap sync android ثم cap open android
```

## بنية المشروع

```
www/                واجهة الويب (HTML/CSS/JS) — تُنسخ إلى dist عند البناء
android/            مشروع Android من Capacitor
scripts/
  build.js          سكربت البناء الذي ينسخ www→dist
  capture-screens.js  أتمتة التقاط شاشات الأجهزة
assets/
  devices/          أيقونات SVG للأجهزة
  screens/          لقطات شاشات الأجهزة (تُولَّد بـ capture:screens)
capacitor.config.json   إعدادات Capacitor
```

## التراخيص

نموذج تعليمي. الشكل الافتراضي للأجهزة مولَّد إجرائياً عبر Three.js.
