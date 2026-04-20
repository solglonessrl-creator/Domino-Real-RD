# 📘 FACEBOOK — NIVEL PROFESIONAL PARA Domino Real RD
## Qué tiene Parchís Star que nosotros necesitamos implementar

---

## COMPARACIÓN: Lo que tienen las apps top vs lo que tenemos

| Función | Parchís Star | Nosotros ahora | Lo que falta |
|---------|-------------|----------------|-------------|
| Login con Facebook | ✅ | ✅ Estructura | Conectar SDK real |
| Ver amigos que juegan | ✅ | ❌ | Facebook Friends API |
| Invitación oficial Facebook | ✅ | ❌ | Game Requests API |
| Notificación en Facebook al invitar | ✅ | ❌ | Game Requests API |
| Compartir victoria (post en muro) | ✅ | ⚡ Texto plano | Open Graph API |
| Foto de victoria con tu avatar | ✅ | ❌ | Open Graph + imagen |
| Torneos con amigos de Facebook | ✅ | ❌ | Friends API + Torneos |
| Ranking entre tus amigos | ✅ | ❌ | Friends API + Ranking |

---

## LAS 4 CAPAS DE FACEBOOK PROFESIONAL

### CAPA 1 — Login (YA TIENES LA BASE)
**Estado actual:** El botón existe, la ruta del servidor existe  
**Lo que falta:** Conectar el SDK de Facebook en el frontend

**Costo de implementar:** 1 día de trabajo  
**Qué necesitas de Facebook:** Solo App ID (gratuito)

---

### CAPA 2 — Game Requests API (Invitaciones reales)
**Qué hace:** Cuando alguien te invita a jugar, te llega una notificación DENTRO de Facebook  
El amigo hace clic → la app se abre directo en la sala de juego  

**Ejemplo visual:**
```
[Notificación en Facebook]
👤 Pedro Pérez te invitó a jugar Dominó Real RD
[Jugar Ahora]   [Ignorar]
```

**Para activarlo necesitas:**
1. App de Facebook aprobada (Facebook la revisa, tarda 1-5 días)
2. Declarar que tu app es un "juego"
3. El permiso `user_friends` aprobado por Facebook
4. Deep linking configurado en la app móvil

**Costo de implementar:** 3-5 días de trabajo  
**Costo económico:** $0 (es gratuito)

---

### CAPA 3 — Open Graph (Compartir victorias con imagen)
**Qué hace:** En lugar de compartir solo texto, se comparte una imagen personalizada:

```
┌─────────────────────────────────────┐
│  🎲 Dominó Real RD               │
│  ┌──────────────────────────────┐  │
│  │  👑 PEDRO ganó con CAPICÚA  │  │
│  │  200 puntos vs 145          │  │
│  │  +25 ELO  •  Liga Plata     │  │
│  └──────────────────────────────┘  │
│  "¡Juega conmigo!" →  [Descargar]  │
└─────────────────────────────────────┘
```

**Para activarlo necesitas:**
1. Un servidor para generar la imagen (backend ya tienes)
2. Instalar la librería `canvas` o `sharp` en el backend
3. Configurar Open Graph meta tags
4. La app aprobada por Facebook

**Costo de implementar:** 2-3 días de trabajo

---

### CAPA 4 — Ranking entre amigos
**Qué hace:** "Entre tus amigos de Facebook, estás en puesto #3"

**Para activarlo necesitas:**
1. El permiso `user_friends` de Facebook (aprobado)
2. Que tus amigos también tengan la app instalada
3. Guardar en tu DB cuáles usuarios están conectados por Facebook

---

## PLAN DE IMPLEMENTACIÓN REALISTA

### FASE A (Semana 1) — Login funcional:
```
✅ Ya está la estructura en el servidor
Pendiente: instalar Facebook SDK en el frontend
```

**En `mobile/`, ejecutar:**
```bash
npx expo install expo-auth-session expo-crypto
npm install react-native-fbsdk-next
```

**En `mobile/app.json`, agregar dentro de "plugins":**
```json
["react-native-fbsdk-next", {
  "appID": "TU_APP_ID_DE_FACEBOOK",
  "clientToken": "TU_CLIENT_TOKEN",
  "displayName": "Dominó Real RD",
  "scheme": "fb_TU_APP_ID"
}]
```

---

### FASE B (Semana 2-3) — Invitaciones y Game Requests:

**Necesitas crear en developers.facebook.com:**

1. **Ir a:** developers.facebook.com
2. **"My Apps"** → "Create App"
3. **Tipo:** "Gaming" (importante, no "Consumer")
4. **Nombre:** Dominó Real RD
5. **Categoría:** Juegos de mesa

**En la app de Facebook, completar:**
- App Icon: 1024×1024 px (tu logo azul con el dominó)
- Privacy Policy URL: `https://dominorealrd.com/privacidad`
- Terms of Service URL: `https://dominorealrd.com/terminos`
- Category: Games → Board Games

**Permisos que necesitas solicitar a Facebook:**
| Permiso | Para qué | Aprobación |
|---------|---------|-----------|
| `email` | Login básico | ✅ Automático |
| `public_profile` | Nombre y foto | ✅ Automático |
| `user_friends` | Ver amigos que juegan | ⏳ Revisión manual (1-5 días) |
| `gaming.user_picture` | Foto de juego | ⏳ Revisión manual |

**Para solicitar revisión de permisos:**
- En tu app de Facebook → "App Review" → "Permissions and Features"
- Seleccionar `user_friends`
- Grabar un video de 2-5 minutos mostrando cómo se usa en tu app
- Escribir explicación en inglés de por qué lo necesitas
- Esperar 1-5 días hábiles

---

### FASE C (Mes 2) — Open Graph con imágenes:

**En el backend, instalar:**
```bash
npm install canvas
```

**En `backend/src/services/ImagenVictoria.js` (nuevo archivo que crearemos):**
```javascript
// Genera una imagen PNG de la victoria
// 1200×630 px (tamaño óptimo para Facebook)
// Con: nombre del jugador, puntos, capicúa, liga, logo del juego
```

**Registrar en Facebook:**
- En tu app → "Open Graph" → "Object Types"
- Crear objeto: `dominorealrd:partida`
- Action: `ganar`

---

## LO QUE FACEBOOK REVISA ANTES DE APROBARTE

Para tener el nivel profesional Facebook necesita ver:

### 1. Política de Privacidad (OBLIGATORIO)
Necesitas una página web con tu política de privacidad.
Puedes generarla gratis en: **privacypolicytemplate.net**

### 2. Términos de Servicio (OBLIGATORIO)
Similar a la privacidad — página web con los términos.

### 3. La app tiene que estar publicada
Facebook no aprueba apps que no están en Google Play o App Store.
**Primero publica en Google Play, luego pide la revisión de Facebook.**

### 4. Video demostrativo (para permisos avanzados)
Grabar un video de 2-5 minutos mostrando:
- El flujo completo de login con Facebook
- Cómo se usa el permiso `user_friends` en la app
- Que no recolectas datos de más

---

## CRONOGRAMA REALISTA

```
Semana 1:  Lanzar MVP (Railway + Vercel + APK básico)
Semana 2:  Publicar en Google Play (modo interno/beta)
Semana 3:  Completar login Facebook + política privacidad
Semana 4:  Solicitar revisión de Facebook
Mes 2:     Game Requests + Ranking entre amigos
Mes 3:     Open Graph con imágenes de victoria
```

---

## RESUMEN: ¿Qué necesitas de Facebook ahora mismo?

Para el **MVP que funcione hoy:**
- Solo el **App ID** y **Client Token** de Facebook (gratis, toma 5 minutos)

Para **nivel Parchís Star:**
1. App publicada en Google Play
2. Política de privacidad en tu web
3. Solicitar permiso `user_friends` con video
4. Esperar aprobación (1-5 días)

**El 80% del trabajo de Facebook es documentación y cumplimiento de sus reglas, no código.**
