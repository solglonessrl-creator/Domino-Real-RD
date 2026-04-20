# 🎲 Dominó Real RD — Inicio Rápido

## Levantar el proyecto en 5 minutos

### Backend (Node.js):
```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus credenciales
npm run dev
# Servidor en http://localhost:3001
```

### Frontend (React):
```bash
cd frontend
npm install
npm start
# App en http://localhost:3000
```

### Verificar que funciona:
- Abrir http://localhost:3001/health → debe mostrar `status: OK`
- Abrir http://localhost:3001/ → lista los endpoints de la API
- Abrir http://localhost:3000 → pantalla de login del juego

### Ejecutar tests:
```bash
cd backend
npm test
# Ejecuta todos los tests del motor de juego
```

---

## Estructura de Archivos Creados

```
DOMINO DOMINICANO/
├── backend/
│   ├── server.js                         # Servidor principal
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── game/
│       │   ├── DominoEngine.js           # ⭐ Motor de juego completo
│       │   └── DominoEngine.test.js      # Tests unitarios
│       ├── ai/
│       │   ├── DominoAI.js               # IA Fácil/Medio/Difícil
│       │   └── Arbitro.js               # Árbitro "Don Fello"
│       ├── socket/
│       │   └── GameSocket.js             # WebSocket tiempo real
│       └── routes/
│           ├── auth.js                   # Login/Registro
│           ├── ranking.js                # ELO + Ligas
│           ├── torneos.js                # Torneos
│           ├── tienda.js                 # Monetización
│           ├── social.js                 # Amigos + Viral
│           └── matchmaking.js            # Emparejamiento
├── frontend/
│   ├── package.json
│   └── src/
│       ├── App.jsx                       # Router principal
│       ├── screens/
│       │   └── HomeScreen.jsx            # Pantalla principal
│       ├── components/
│       │   └── game/
│       │       └── TableroJuego.jsx      # ⭐ Tablero completo
│       └── services/
│           └── socket.js                 # Cliente WebSocket + APIs
└── docs/
    └── ARQUITECTURA.md                   # Documentación técnica completa
```
