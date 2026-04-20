# 🎲 Dominó Real RD — Arquitectura Técnica Completa

## Visión General

**Dominó Real RD** es una app multiplayer online de dominó dominicano en parejas (2 vs 2), competitiva, viral y monetizable. Inspirada en Parchís Star, pero 100% enfocada en el mercado dominicano global.

---

## Stack Tecnológico

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Backend | Node.js + Express | Rápido, ideal para tiempo real |
| WebSocket | Socket.IO | Multiplayer en tiempo real |
| Base de datos | PostgreSQL + Redis | Persistencia + caché de cola |
| Frontend Web | React.js | Prototipo rápido y web app |
| App Móvil | React Native | iOS + Android desde mismo código |
| Auth | JWT + OAuth | Facebook, Google, email |
| Pagos | Stripe + In-App | USD + monedas del juego |
| Hosting | Railway / Render | Deploy simple, self-ping incluido |
| CDN/Assets | Cloudflare | Imágenes, sonidos, skins |

---

## Arquitectura del Backend

```
backend/
├── server.js                  # Entrada principal, Express + Socket.IO
├── src/
│   ├── game/
│   │   ├── DominoEngine.js    # ⭐ Motor de juego: reglas reales
│   │   └── DominoEngine.test.js # Tests unitarios completos
│   ├── ai/
│   │   ├── DominoAI.js        # IA: Fácil/Medio/Difícil
│   │   └── Arbitro.js         # Árbitro IA con personalidad caribeña
│   ├── socket/
│   │   └── GameSocket.js      # WebSocket: eventos en tiempo real
│   └── routes/
│       ├── auth.js            # Login: email, Facebook, Google, invitado
│       ├── ranking.js         # ELO, ligas, estadísticas
│       ├── torneos.js         # Torneos automáticos y privados
│       ├── tienda.js          # Monetización: skins, VIP, ads
│       ├── social.js          # Amigos, compartir, referidos, eventos
│       └── matchmaking.js     # Cola de emparejamiento por ELO
```

---

## Motor de Juego (DominoEngine.js)

### Reglas implementadas:
- ✅ Set completo doble-6 (28 fichas exactas)
- ✅ 4 jugadores, 2 vs 2 (equipos 0&2 vs 1&3)
- ✅ Distribución aleatoria: 7 fichas por jugador
- ✅ Sale primero: jugador con doble más alto
- ✅ Validación de jugadas en cada extremo
- ✅ Detección de capicúa (extremos iguales al cerrar)
- ✅ Bonus capicúa: +30 puntos
- ✅ Conteo automático de puntos (fichas restantes del perdedor)
- ✅ Tranque: gana equipo con menos puntos en mano
- ✅ Fin de match: primer equipo en 200 puntos
- ✅ Historial de jugadas
- ✅ Penalización por jugada inválida (pierde turno)

### API del Motor:
```js
engine.iniciarPartida(jugadores)     // Estado inicial completo
engine.ejecutarJugada(estado, jugadorId, ficha, lado)  // Jugada
engine.pasarTurno(estado, jugadorId) // Pasar turno
engine.obtenerJugadasValidas(estado, jugadorId) // Para IA y hints
engine.verificarCapicua(estado)      // Boolean
engine.calcularPuntos(estado, equipoGanador, capicua) // Puntos ronda
engine.resolverTranque(estado)       // Resultado de tranque
engine.verificarFinMatch(equipos)    // Match terminado?
```

---

## Inteligencia Artificial (DominoAI.js)

### Estrategias por nivel:

**Fácil (25% error):**
- Prioriza fichas de alto valor
- Sin análisis profundo

**Medio (10% error):**
- Evaluación heurística básica
- Considera bloqueo simple
- Reconoce dobles peligrosos

**Difícil (2% error):**
- Conteo mental de fichas (infiere lo que los rivales tienen)
- Bloqueo estratégico activo
- Sincronía con el compañero
- Fuerza capicúa cuando es posible
- Lee el historial de pasadas del adversario
- Preserva flexibilidad para evitar tranque propio

---

## Árbitro IA (Arbitro.js)

Personalidad: "Don Fello" — árbitro dominicano, divertido pero claro.

**Funciones:**
- `narrarJugada()` — Narración en tiempo real con frases caribeñas
- `explicarJugadaInvalida()` — Explica el error con estilo
- `explicarRegla()` — Modo aprendizaje: reglas en contexto
- `darConsejo()` — Estrategia para principiantes
- `verificarAlertas()` — Detección de tranque inminente, capicúa posible

---

## Sistema de WebSocket

### Eventos Cliente → Servidor:
```
join_room      { roomId, jugador, modo }
play_tile      { roomId, fichaId, lado }
pass_turn      { roomId }
request_hint   { roomId }
chat_message   { roomId, mensaje }
send_reaction  { roomId, emoji }
```

### Eventos Servidor → Cliente:
```
game_start         Estado inicial de la partida
game_state         Estado actualizado + narración + alertas
mano_privada       Fichas del jugador (solo para él)
play_result        Resultado de jugada inválida
round_over         Fin de ronda + puntos
game_over          Ganador del match completo
new_round          Inicio de nueva ronda
arbitro_narration  Narración del árbitro
chat               Mensaje de chat
reaction           Emoji de reacción
hint               Consejo del árbitro
player_joined      Jugador se unió
player_disconnected Jugador se desconectó
waiting_players    Cuántos faltan para empezar
```

---

## Sistema de Ranking ELO

- ELO base: 1200
- K-Factor: 32
- Ligas:
  - 🥉 Bronce: 0 - 999
  - 🥈 Plata: 1000 - 1499
  - 🥇 Oro: 1500 - 1999
  - 💎 Diamante: 2000+

---

## Monetización

### Fuentes de ingresos:
1. **Anuncios** (AdMob/Unity Ads) — banner, video corto, video largo
2. **Paquetes de monedas** — $0.99 a $44.99
3. **VIP** — $4.99/mes (sin ads, torneos exclusivos, +20% monedas)
4. **Skins de fichas y mesas** — $0.99 a $2.99 o en monedas
5. **Torneos pagos** — inscripción en monedas o USD
6. **Sistema de referidos** — bonos por traer nuevos jugadores

### Items de tienda:
- Mesas: Clásica (gratis), RD, Dorada, Diamante, Nocturna, Caribeña
- Fichas: Clásicas (gratis), Negras, RD (exclusiva torneo), Diamante, Madera, Neón
- Avatares: 6 disponibles + exclusivos por torneos
- Paquetes de emojis: Clásico, Dominicano, Premium

---

## Estrategia Viral

1. **Facebook/WhatsApp integration** — Compartir victorias y capicúas
2. **Sistema de referidos** — +500 monedas al referido, +200 al referidor
3. **Torneos semanales** — Incentivo semanal de retorno
4. **Bono diario** — Streak de 7 días con recompensas crecientes
5. **Eventos especiales** — Semana capicúa, Doble ELO, Día de la Independencia RD
6. **Ligas y temporadas** — Presión competitiva mensual

---

## Público Objetivo

**Dominicanos en:**
- 🇩🇴 República Dominicana
- 🇺🇸 USA (NYC, Miami, Boston)
- 🇪🇸 España (Madrid, Barcelona)
- 🇮🇹 Italia
- 🇵🇷 Puerto Rico

---

## Pasos para Producción

### Corto plazo (MVP):
1. `cd backend && npm install && npm start`
2. `cd frontend && npm install && npm start`
3. Conectar PostgreSQL (DATABASE_URL en .env)
4. Configurar Facebook/Google OAuth
5. Deploy en Railway.app

### Mediano plazo:
1. App móvil con React Native (mismo código lógico)
2. Integrar Stripe para pagos reales
3. Integrar AdMob para anuncios
4. Sistema de notificaciones push (Firebase)

### Largo plazo:
1. Torneos automáticos con bracket en tiempo real
2. Streaming de partidas espectador
3. Replay de partidas
4. Modo espectador en torneos
