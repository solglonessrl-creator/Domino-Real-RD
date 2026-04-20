# 🚀 Dominó Real RD — PASOS EXACTOS PARA LANZAR
## Lee esto de arriba a abajo y sigue en orden

---

## ═══════════════════════════════════════
## PASO 1 — SUBIR EL PROYECTO A GITHUB
## ═══════════════════════════════════════

GitHub es necesario para que Railway y Vercel puedan leer tu código.

1. Ir a **github.com** → crear cuenta gratuita si no tienes
2. Clic en "New repository"
3. Nombre: `domino-real-rd`
4. Marcar "Private" (para que nadie vea tu código)
5. Clic "Create repository"
6. Abrir **Git Bash** o el **Command Prompt** en tu computadora
7. Ejecutar estos comandos:

```bash
cd "C:\Users\King\Desktop\DOMINO DOMINICANO"
git init
git add .
git commit -m "Domino Real RD - Version inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/domino-real-rd.git
git push -u origin main
```

✅ **Resultado:** Tu código estará en GitHub

---

## ═══════════════════════════════════════
## PASO 2 — BASE DE DATOS (Neon.tech)
## ═══════════════════════════════════════

### CARPETA QUE USAS: `backend/src/models/schema.sql`

1. Ir a **neon.tech**
2. Clic "Sign Up" → usar cuenta de Google o GitHub
3. Clic "New Project"
4. Nombre: `domino-real-rd`
5. Region: `US East` (o la más cercana)
6. Clic "Create Project"
7. **COPIAR** la "Connection string" que aparece:
   ```
   postgresql://usuario:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
8. Ir a la pestaña "SQL Editor"
9. Abrir el archivo: `backend/src/models/schema.sql` con el bloc de notas
10. Copiar TODO el contenido
11. Pegarlo en el SQL Editor de Neon
12. Clic en el botón "Run" (▶)

✅ **Resultado:** Tu base de datos tiene todas las tablas creadas

---

## ═══════════════════════════════════════
## PASO 3 — BACKEND EN RAILWAY
## ═══════════════════════════════════════

### CARPETA QUE SUBES: `backend/`

1. Ir a **railway.app**
2. Clic "Login" → entrar con tu cuenta de GitHub
3. Clic "New Project"
4. Seleccionar "Deploy from GitHub repo"
5. Seleccionar tu repositorio `domino-real-rd`
6. Railway pregunta "Root Directory" → escribir: `backend`
7. Clic "Deploy Now"
8. Esperar 2-3 minutos a que termine de construir

### Agregar las Variables de Entorno:
1. En tu proyecto de Railway → clic en el servicio
2. Ir a la pestaña "Variables"
3. Clic "New Variable" y agregar UNA POR UNA:

| Variable | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `JWT_SECRET` | `dominorealrd_2024_SecretKey_Cambiame!` |
| `DATABASE_URL` | *(la que copiaste de Neon)* |
| `FRONTEND_URL` | `https://domino-real-rd.vercel.app` |
| `SELF_PING_URL` | *(tu URL de Railway, la ves en el dashboard)* |

4. Clic "Deploy" para que tome los cambios

### Verificar que funciona:
- Ir a la URL de Railway (algo como `https://domino-real-rd.railway.app`)
- Si ves `{"mensaje":"🎲 Domino Real RD API"...}` → ✅ FUNCIONA

✅ **Resultado:** Tu servidor está online 24/7

---

## ═══════════════════════════════════════
## PASO 4 — FRONTEND EN VERCEL
## ═══════════════════════════════════════

### CARPETA QUE SUBES: `frontend/`

1. Ir a **vercel.com**
2. Clic "Sign Up" → entrar con GitHub
3. Clic "Add New Project"
4. Importar tu repositorio `domino-real-rd`
5. En la configuración que aparece:
   - **Framework Preset:** Create React App
   - **Root Directory:** clic en "Edit" → escribir `frontend`
   - **Build Command:** `npm run build` (ya está por defecto)
   - **Output Directory:** `build` (ya está por defecto)
6. Expandir "Environment Variables" → agregar:
   - Nombre: `REACT_APP_SERVIDOR_URL`
   - Valor: `https://domino-real-rd.railway.app` *(tu URL de Railway)*
7. Clic "Deploy"
8. Esperar 2-3 minutos

✅ **Resultado:** Tu app web está en `https://domino-real-rd.vercel.app`

---

## ═══════════════════════════════════════
## PASO 5 — APK PARA ANDROID (Expo EAS)
## ═══════════════════════════════════════

### CARPETA QUE USAS: `mobile/`

### Antes de empezar, necesitas instalar:
1. **Node.js** → nodejs.org (descargar versión LTS)
2. **Git** → git-scm.com

### Pasos:

**A) Crear cuenta en Expo:**
1. Ir a **expo.dev**
2. Clic "Sign Up" → crear cuenta gratuita

**B) Instalar herramientas (en Command Prompt como Administrador):**
```bash
npm install -g eas-cli expo-cli
```

**C) Ir a la carpeta del móvil:**
```bash
cd "C:\Users\King\Desktop\DOMINO DOMINICANO\mobile"
```

**D) Instalar dependencias:**
```bash
npm install
```

**E) Iniciar sesión en Expo:**
```bash
eas login
```
*(te pide email y password de expo.dev)*

**F) Configurar el proyecto:**
```bash
eas build:configure
```
*(Seleccionar "All" cuando pregunta plataformas)*

**G) Antes del build, editar `App.js`:**
Abrir `mobile/App.js` y cambiar la línea:
```javascript
const SERVIDOR_URL = 'https://domino-real-rd.railway.app';
```
Poner tu URL real de Railway.

**H) Generar el APK (para pruebas - SIN necesitar Play Console):**
```bash
eas build --platform android --profile preview
```

**I) Esperar el build:**
- Expo tarda 5-15 minutos en construir
- Cuando termine te da un LINK para descargar el APK
- Ejemplo: `https://expo.dev/artifacts/eas/xxx.apk`

**J) Instalar el APK en tu teléfono:**
1. Descargar el APK desde el link
2. En tu teléfono Android → Ajustes → Seguridad → "Instalar apps desconocidas" → Activar
3. Abrir el APK descargado e instalar

✅ **Resultado:** La app instalada en tu teléfono para probar

---

## ═══════════════════════════════════════
## CUANDO QUIERAS VER CAMBIOS NUEVOS
## ═══════════════════════════════════════

### Para el backend (Railway actualiza automáticamente):
```bash
cd "C:\Users\King\Desktop\DOMINO DOMINICANO"
git add .
git commit -m "Descripcion del cambio"
git push
```
Railway detecta el push y redeploya solo en 2-3 minutos.

### Para el frontend (Vercel actualiza automáticamente):
Mismo proceso que el backend — push a GitHub y Vercel se actualiza solo.

### Para el APK (cuando hay cambios importantes):
Volver al paso 5-H y generar nuevo APK.

---

## ═══════════════════════════════════════
## ERRORES COMUNES Y SOLUCIONES
## ═══════════════════════════════════════

| Error | Solución |
|-------|---------|
| Railway: "Build failed" | Verificar que `ROOT DIRECTORY` está en `backend` |
| Vercel: "Build failed" | Verificar que `ROOT DIRECTORY` está en `frontend` |
| APK: "Error de conexión" | Cambiar `SERVIDOR_URL` en `App.js` con tu URL real de Railway |
| Neon: "connection refused" | Verificar que copiaste bien el `DATABASE_URL` incluyendo `?sslmode=require` |
| Login no funciona | Verificar que `FRONTEND_URL` en Railway coincide con tu URL de Vercel |

---

## ORDEN RESUMIDO EN 5 PASOS:

```
1. GitHub  →  subir el código
2. Neon    →  crear base de datos  (carpeta: schema.sql)
3. Railway →  backend online       (carpeta: backend/)
4. Vercel  →  frontend online      (carpeta: frontend/)
5. Expo    →  generar APK          (carpeta: mobile/)
```
