# 🔧 Dominó Real RD — Guía Completa de Configuración
## Todo lo que necesitas configurar para lanzar la app

---

## ✅ RESUMEN RÁPIDO

| Plataforma | Para qué | Urgente para MVP |
|-----------|---------|-----------------|
| Railway / Render | Hosting del backend | ✅ SÍ |
| Neon / Supabase | Base de datos PostgreSQL | ✅ SÍ |
| Vercel / Netlify | Hosting del frontend web | ✅ SÍ |
| Facebook Developers | Login con Facebook | ⚡ Recomendado |
| Google Cloud | Login con Google | ⚡ Recomendado |
| Stripe | Pagos reales (compras in-app) | 💰 Para monetizar |
| Firebase | Push notifications | 📱 Para móvil |
| AdMob | Anuncios y recompensas por video | 💰 Para monetizar |
| Google Play Console | Publicar en Android | 📱 Para móvil |
| Apple App Store | Publicar en iOS | 📱 Para móvil |
| Expo EAS | Build de la app móvil | 📱 Para móvil |

---

## 1️⃣ HOSTING DEL BACKEND — Railway.app (GRATIS al inicio)

### Pasos:
1. Ir a **railway.app** → crear cuenta gratuita
2. "New Project" → "Deploy from GitHub repo"
3. Conectar tu repositorio de GitHub con el proyecto
4. Seleccionar la carpeta `/backend` como root
5. Railway detecta automáticamente Node.js
6. En "Variables" agregar todas las variables del `.env`

### Variables de entorno a poner en Railway:
```
PORT=3001
NODE_ENV=production
JWT_SECRET=pon_una_clave_muy_larga_y_aleatoria_aqui_2024
DATABASE_URL=(la obtienes en el paso de Neon abajo)
FRONTEND_URL=https://tu-app.vercel.app
SELF_PING_URL=https://tu-app.railway.app
```

### Resultado:
Tu backend estará en: `https://tu-app.railway.app`

---

## 2️⃣ BASE DE DATOS — Neon.tech (PostgreSQL GRATIS)

### Pasos:
1. Ir a **neon.tech** → crear cuenta gratuita
2. "New Project" → nombre: `domino-real-rd`
3. Copiar el "Connection String" que se parece a:
   `postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb`
4. En Railway, poner esa URL como `DATABASE_URL`
5. Ejecutar el schema: abre "SQL Editor" en Neon y pega el contenido de:
   `backend/src/models/schema.sql`

### Resultado:
Tu base de datos queda lista con todas las tablas.

---

## 3️⃣ HOSTING FRONTEND — Vercel (GRATIS)

### Pasos:
1. Ir a **vercel.com** → crear cuenta con GitHub
2. "New Project" → importar tu repositorio
3. Framework Preset: **Create React App**
4. Root Directory: `frontend`
5. En "Environment Variables" agregar:
   ```
   REACT_APP_SERVIDOR_URL=https://tu-app.railway.app
   ```
6. "Deploy"

### Resultado:
Tu frontend estará en: `https://domino-real-rd.vercel.app`

---

## 4️⃣ FACEBOOK LOGIN

### Pasos:
1. Ir a **developers.facebook.com**
2. "My Apps" → "Create App" → tipo: "Consumer"
3. Nombre: `Domino Real RD`
4. Agregar producto "Facebook Login"
5. En Settings → Basic:
   - Copiar **App ID** y **App Secret**
6. En Facebook Login → Settings:
   - Valid OAuth Redirect URIs: `https://tu-app.vercel.app`
7. Agregar en `.env` y Railway:
   ```
   FACEBOOK_APP_ID=123456789012345
   FACEBOOK_APP_SECRET=abc123def456...
   ```

### En el frontend:
Instalar el SDK:
```bash
npm install react-facebook-login
```
El botón de Facebook en `LoginScreen.jsx` ya está listo para conectar.

---

## 5️⃣ GOOGLE LOGIN

### Pasos:
1. Ir a **console.cloud.google.com**
2. Crear proyecto: `Domino Real RD`
3. APIs & Services → Credentials → "Create Credentials" → OAuth Client ID
4. Tipo: Web Application
5. Authorized origins: `https://tu-app.vercel.app`
6. Authorized redirect URIs: `https://tu-app.vercel.app/auth/google`
7. Copiar **Client ID** (termina en `.apps.googleusercontent.com`)
8. Agregar en `.env`:
   ```
   GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
   ```

### En el frontend:
```bash
npm install @react-oauth/google
```

---

## 6️⃣ STRIPE — Pagos Reales

### Pasos:
1. Ir a **stripe.com** → crear cuenta
2. En el Dashboard → Developers → API Keys:
   - Copiar **Publishable key** (empieza con `pk_test_...`)
   - Copiar **Secret key** (empieza con `sk_test_...`)
3. Agregar en Railway:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLIC_KEY=pk_test_...
   ```
4. Para el Webhook:
   - Dashboard → Developers → Webhooks
   - "Add endpoint": `https://tu-app.railway.app/api/pagos/webhook`
   - Eventos a escuchar: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copiar **Webhook Secret** (empieza con `whsec_...`)
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### En el frontend:
```bash
npm install @stripe/react-stripe-js @stripe/stripe-js
```

### Para pruebas usar tarjeta: `4242 4242 4242 4242`

---

## 7️⃣ FIREBASE — Notificaciones Push

### Pasos:
1. Ir a **console.firebase.google.com**
2. "Add project" → nombre: `domino-real-rd`
3. En la app:
   - "Add app" → Web (para el frontend)
   - "Add app" → Android (package: `com.dominorealrd.app`)
   - "Add app" → iOS (bundle ID: `com.dominorealrd.app`)
4. En Project Settings → Service Accounts → "Generate new private key"
   → Descargar el archivo JSON
5. Agregar en Railway:
   ```
   FIREBASE_PROJECT_ID=domino-real-rd
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@domino-real-rd.iam.gserviceaccount.com
   ```
6. En el backend, descomentar el código de Firebase en `NotificacionesPush.js`:
   ```bash
   cd backend && npm install firebase-admin
   ```

---

## 8️⃣ GOOGLE ADMOB — Anuncios

### Pasos:
1. Ir a **admob.google.com** → crear cuenta
2. "Add app" → plataforma: Android / iOS
3. Nombre de la app: `Dominó Real RD`
4. Crear Ad Units:
   - Banner: `ca-app-pub-xxx/yyy` (para pantallas)
   - Interstitial: para entre rondas
   - Rewarded Video: para ganar monedas (YA IMPLEMENTADO en `tienda.js`)
5. Copiar el App ID y los Ad Unit IDs
6. En `mobile/app.json` ya está el campo `"ADMOB_APP_ID"` listo

### En la app móvil:
```bash
cd mobile && npx expo install expo-ads-admob
```

---

## 9️⃣ GOOGLE PLAY CONSOLE — Android

### Pasos:
1. Ir a **play.google.com/console** → pagar $25 (único pago)
2. "Create app" → nombre: `Dominó Real RD`
3. Completar información de la app (descripción, screenshots)
4. Para generar el APK/AAB:
   ```bash
   cd mobile
   npm install -g eas-cli
   eas login
   eas build --platform android --profile production
   ```
5. Descargar el `.aab` y subirlo en el Play Console

### Información necesaria para el store:
- **Nombre:** Dominó Real RD
- **Descripción corta:** El dominó dominicano online más completo del mundo
- **Categoría:** Juegos de mesa
- **Clasificación:** PEGI 3 (todo público)
- **Screenshots:** mínimo 2 pantallas (tablero, home)
- **Icon:** 512×512 px (fondo azul #002D62 con ficha de dominó)
- **Feature Graphic:** 1024×500 px

---

## 🍎 10. APPLE APP STORE — iOS

### Pasos:
1. Necesitas un **Mac** o Mac en la nube (MacinCloud.com ~$1/hora)
2. Crear cuenta en **developer.apple.com** → $99/año
3. Crear App ID en Certificates, Identifiers & Profiles:
   - Bundle ID: `com.dominorealrd.app`
4. En App Store Connect:
   - "New App" → plataforma iOS
   - Bundle ID: `com.dominorealrd.app`
5. Build con EAS:
   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios
   ```

---

## 📱 11. EXPO EAS — Build de la App Móvil

### Pasos:
1. Crear cuenta en **expo.dev** (gratis)
2. En el proyecto:
   ```bash
   cd mobile
   npm install -g eas-cli
   eas login
   eas build:configure
   ```
3. Crear archivo `mobile/eas.json`:
   ```json
   {
     "build": {
       "development": { "developmentClient": true },
       "preview": { "android": { "buildType": "apk" } },
       "production": {}
     }
   }
   ```
4. Para generar APK de prueba (sin Play Console):
   ```bash
   eas build --platform android --profile preview
   ```
   → Obtendrás un link para descargar el APK directamente

---

## 🔐 VARIABLES DE ENTORNO COMPLETAS (.env)

Copia esto en Railway como Variables de Entorno:

```env
# Servidor
PORT=3001
NODE_ENV=production

# JWT (CAMBIA ESTO — genera una cadena aleatoria larga)
JWT_SECRET=dominorealrd_SecretKey_2024_CambiaMeAhora!

# Base de datos (de Neon.tech)
DATABASE_URL=postgresql://usuario:password@ep-xxx.us-east-1.aws.neon.tech/neondb

# CORS
FRONTEND_URL=https://domino-real-rd.vercel.app

# Self-ping (poner tu URL de Railway)
SELF_PING_URL=https://domino-real-rd.railway.app

# Facebook Login
FACEBOOK_APP_ID=TU_APP_ID_DE_FACEBOOK
FACEBOOK_APP_SECRET=TU_APP_SECRET_DE_FACEBOOK

# Google Login
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com

# Stripe
STRIPE_SECRET_KEY=sk_test_TU_CLAVE_SECRETA
STRIPE_PUBLIC_KEY=pk_test_TU_CLAVE_PUBLICA
STRIPE_WEBHOOK_SECRET=whsec_TU_WEBHOOK_SECRET

# Firebase
FIREBASE_PROJECT_ID=domino-real-rd
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_CLAVE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@domino-real-rd.iam.gserviceaccount.com
```

---

## 📋 ORDEN RECOMENDADO PARA LANZAR

### Semana 1 — MVP funcionando:
- [x] Neon.tech → base de datos
- [x] Railway.app → backend online
- [x] Vercel → frontend web
- [x] Probar juego en el navegador

### Semana 2 — Usuarios reales:
- [ ] Facebook Login
- [ ] Google Login
- [ ] Dominio propio (namecheap.com ~$10/año: `dominorealrd.com`)

### Semana 3 — Monetización:
- [ ] Stripe en modo TEST
- [ ] AdMob configurado
- [ ] Stripe en modo LIVE (necesitas verificar identidad)

### Semana 4 — Lanzamiento móvil:
- [ ] APK de prueba con Expo EAS
- [ ] Subir a Google Play (Android primero, más fácil)
- [ ] Apple App Store (requiere Mac)

---

## 💰 COSTOS ESTIMADOS

| Servicio | Costo |
|---------|-------|
| Railway (backend) | Gratis hasta 500h/mes, luego ~$5/mes |
| Neon (PostgreSQL) | Gratis (0.5GB), luego $19/mes |
| Vercel (frontend) | Gratis para proyectos pequeños |
| Firebase | Gratis hasta límites generosos |
| Stripe | 2.9% + $0.30 por transacción |
| AdMob | Gratis (te pagan a ti) |
| Dominio .com | ~$10/año en Namecheap |
| Google Play | $25 (único pago) |
| Apple Developer | $99/año |
| **TOTAL MVP** | **~$0-35/mes para empezar** |

---

## 🆘 SOPORTE

Si algo falla o necesitas ayuda configurando alguna plataforma, dime cuál y te guío paso a paso.
