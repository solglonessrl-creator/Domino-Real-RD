-- ============================================================
-- Dominó Real RD — Esquema PostgreSQL Completo
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── JUGADORES ────────────────────────────────────────────────
CREATE TABLE jugadores (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        VARCHAR(20)  NOT NULL,
  email         VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  pais          CHAR(2)      DEFAULT 'RD',
  foto_url      TEXT,
  login_method  VARCHAR(20)  DEFAULT 'email',
  social_id     VARCHAR(100),

  elo           INTEGER      DEFAULT 1200,
  liga          VARCHAR(20)  DEFAULT 'Bronce',
  nivel         INTEGER      DEFAULT 1,
  experiencia   INTEGER      DEFAULT 0,

  monedas       INTEGER      DEFAULT 500,
  gemas         INTEGER      DEFAULT 0,
  es_vip        BOOLEAN      DEFAULT FALSE,
  vip_expira_en TIMESTAMPTZ,

  avatar        VARCHAR(50)  DEFAULT 'avatar_default',
  mesa          VARCHAR(50)  DEFAULT 'mesa_clasica',
  fichas        VARCHAR(50)  DEFAULT 'fichas_clasicas',
  emojis        TEXT[]       DEFAULT '{"👏","😂","😤","🎉","🔥"}',

  ultimo_login  TIMESTAMPTZ  DEFAULT NOW(),
  creado_en     TIMESTAMPTZ  DEFAULT NOW(),
  activo        BOOLEAN      DEFAULT TRUE
);

CREATE INDEX idx_jugadores_elo    ON jugadores (elo DESC);
CREATE INDEX idx_jugadores_pais   ON jugadores (pais);
CREATE INDEX idx_jugadores_nombre ON jugadores USING gin (nombre gin_trgm_ops);

-- ── ESTADÍSTICAS ─────────────────────────────────────────────
CREATE TABLE estadisticas (
  jugador_id         UUID PRIMARY KEY REFERENCES jugadores(id) ON DELETE CASCADE,
  partidas_jugadas   INTEGER DEFAULT 0,
  partidas_ganadas   INTEGER DEFAULT 0,
  partidas_perdidas  INTEGER DEFAULT 0,
  rondas_jugadas     INTEGER DEFAULT 0,
  capicuas_hechas    INTEGER DEFAULT 0,
  capicuas_recibidas INTEGER DEFAULT 0,
  tranques_ganados   INTEGER DEFAULT 0,
  puntos_totales     INTEGER DEFAULT 0,
  mayor_capicua      INTEGER DEFAULT 0,
  racha_actual       INTEGER DEFAULT 0,
  mejor_racha        INTEGER DEFAULT 0,
  tiempo_jugado_min  INTEGER DEFAULT 0,
  ficha_favorita     VARCHAR(10),
  actualizado_en     TIMESTAMPTZ DEFAULT NOW()
);

-- ── TORNEOS (va antes que matches porque matches la referencia) ──
CREATE TABLE torneos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre              VARCHAR(100) NOT NULL,
  tipo                VARCHAR(30)  DEFAULT 'eliminacion_directa',
  estado              VARCHAR(20)  DEFAULT 'inscripcion',
  es_gratuito         BOOLEAN      DEFAULT TRUE,
  inscripcion_monedas INTEGER      DEFAULT 0,
  max_participantes   INTEGER      DEFAULT 64,
  min_elo             INTEGER      DEFAULT 0,
  liga_requerida      VARCHAR(20),
  pais_requerido      CHAR(2),

  fecha_inicio        TIMESTAMPTZ NOT NULL,
  fecha_fin           TIMESTAMPTZ,

  premio_1ro_monedas  INTEGER DEFAULT 0,
  premio_2do_monedas  INTEGER DEFAULT 0,
  premio_3ro_monedas  INTEGER DEFAULT 0,
  premio_1ro_item     VARCHAR(50),
  trofeo_nombre       VARCHAR(100),

  creador_id          UUID REFERENCES jugadores(id),
  es_privado          BOOLEAN DEFAULT FALSE,
  codigo_invitacion   VARCHAR(10),
  bracket             JSONB,

  creado_en           TIMESTAMPTZ DEFAULT NOW()
);

-- ── MATCHES ──────────────────────────────────────────────────
CREATE TABLE matches (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id        VARCHAR(100) UNIQUE NOT NULL,
  modo           VARCHAR(20)  DEFAULT 'online',
  estado         VARCHAR(20)  DEFAULT 'en_curso',
  torneo_id      UUID REFERENCES torneos(id),

  equipo0_j0     UUID REFERENCES jugadores(id),
  equipo0_j2     UUID REFERENCES jugadores(id),
  equipo1_j1     UUID REFERENCES jugadores(id),
  equipo1_j3     UUID REFERENCES jugadores(id),

  equipo_ganador INTEGER,
  puntos_equipo0 INTEGER DEFAULT 0,
  puntos_equipo1 INTEGER DEFAULT 0,
  total_rondas   INTEGER DEFAULT 0,
  hubo_capicua   BOOLEAN DEFAULT FALSE,

  elo_antes      JSONB,
  elo_despues    JSONB,

  iniciado_en    TIMESTAMPTZ DEFAULT NOW(),
  terminado_en   TIMESTAMPTZ,
  duracion_min   INTEGER
);

CREATE INDEX idx_matches_estado  ON matches (estado);
CREATE INDEX idx_matches_torneo  ON matches (torneo_id);

-- ── RONDAS ───────────────────────────────────────────────────
CREATE TABLE rondas (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id       UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  numero         INTEGER NOT NULL,
  equipo_ganador INTEGER,
  razon_fin      VARCHAR(30),
  puntos         INTEGER DEFAULT 0,
  puntos_capicua INTEGER DEFAULT 0,
  historial      JSONB,
  estado_final   JSONB,
  duracion_seg   INTEGER,
  creada_en      TIMESTAMPTZ DEFAULT NOW()
);

-- ── INSCRIPCIONES A TORNEOS ───────────────────────────────────
CREATE TABLE torneo_inscripciones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  torneo_id   UUID NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
  jugador_id  UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  equipo_id   UUID,
  inscrito_en TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (torneo_id, jugador_id)
);

-- ── AMISTADES ────────────────────────────────────────────────
CREATE TABLE amistades (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  solicitante_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  receptor_id    UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  estado         VARCHAR(20) DEFAULT 'pendiente',
  creada_en      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (solicitante_id, receptor_id),
  CHECK (solicitante_id != receptor_id)
);

CREATE INDEX idx_amistades_jugador ON amistades (solicitante_id, receptor_id);

-- ── INVENTARIO ───────────────────────────────────────────────
CREATE TABLE inventario (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jugador_id  UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  item_id     VARCHAR(50) NOT NULL,
  categoria   VARCHAR(30) NOT NULL,
  obtenido_en TIMESTAMPTZ DEFAULT NOW(),
  origen      VARCHAR(30) DEFAULT 'tienda',
  UNIQUE (jugador_id, item_id)
);

-- ── TRANSACCIONES ────────────────────────────────────────────
CREATE TABLE transacciones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jugador_id  UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  tipo        VARCHAR(30) NOT NULL,
  monto       INTEGER NOT NULL,
  descripcion TEXT,
  referencia  VARCHAR(100),
  creada_en   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transacciones_jugador ON transacciones (jugador_id, creada_en DESC);

-- ── HISTORIAL DE ELO ──────────────────────────────────────────
CREATE TABLE historial_elo (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jugador_id  UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  elo_antes   INTEGER NOT NULL,
  elo_despues INTEGER NOT NULL,
  delta       INTEGER NOT NULL,
  match_id    UUID REFERENCES matches(id),
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_elo_jugador ON historial_elo (jugador_id, creado_en DESC);

-- ── LOGROS ───────────────────────────────────────────────────
CREATE TABLE logros_definicion (
  id          VARCHAR(50) PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  descripcion TEXT,
  icono       VARCHAR(10),
  tipo        VARCHAR(30),
  condicion   JSONB
);

CREATE TABLE logros_jugador (
  jugador_id  UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  logro_id    VARCHAR(50) NOT NULL REFERENCES logros_definicion(id),
  obtenido_en TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (jugador_id, logro_id)
);

-- ── REFERIDOS ────────────────────────────────────────────────
CREATE TABLE referidos (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referidor_id UUID NOT NULL REFERENCES jugadores(id),
  referido_id  UUID NOT NULL REFERENCES jugadores(id),
  bono_otorgado BOOLEAN DEFAULT FALSE,
  creado_en    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (referido_id)
);

-- ── NOTIFICACIONES ────────────────────────────────────────────
CREATE TABLE notificaciones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jugador_id  UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  tipo        VARCHAR(50) NOT NULL,
  titulo      VARCHAR(100) NOT NULL,
  cuerpo      TEXT,
  leida       BOOLEAN DEFAULT FALSE,
  datos       JSONB,
  creada_en   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notificaciones_jugador ON notificaciones (jugador_id, leida, creada_en DESC);

-- ── DATOS INICIALES ───────────────────────────────────────────

INSERT INTO logros_definicion (id, nombre, descripcion, icono, tipo, condicion) VALUES
  ('primera_victoria',  'Primera Victoria',     'Gana tu primera partida',          '🏆', 'partidas', '{"campo":"partidas_ganadas","valor":1}'),
  ('diez_victorias',    '10 Victorias',          'Acumula 10 victorias',             '🥇', 'partidas', '{"campo":"partidas_ganadas","valor":10}'),
  ('cien_victorias',    '100 Victorias',         'Leyenda del domino',               '👑', 'partidas', '{"campo":"partidas_ganadas","valor":100}'),
  ('primera_capicua',   'Primera Capicua',       'Haz tu primera capicua',           '🎉', 'capicua',  '{"campo":"capicuas_hechas","valor":1}'),
  ('capicua_maestro',   'Maestro de Capicuas',   '10 capicuas en total',             '🎲', 'capicua',  '{"campo":"capicuas_hechas","valor":10}'),
  ('racha_cinco',       'Racha de 5',            '5 victorias seguidas',             '🔥', 'partidas', '{"campo":"mejor_racha","valor":5}'),
  ('plata',             'Liga Plata',            'Alcanza la liga Plata',            '🥈', 'elo',      '{"campo":"elo","valor":1000}'),
  ('oro',               'Liga Oro',              'Alcanza la liga Oro',              '🥇', 'elo',      '{"campo":"elo","valor":1500}'),
  ('diamante',          'Liga Diamante',         'La cima del domino dominicano',    '💎', 'elo',      '{"campo":"elo","valor":2000}'),
  ('campeon_torneo',    'Campeon de Torneo',     'Gana un torneo',                   '🏟', 'torneo',   '{"tipo":"torneo_ganado"}'),
  ('social_invitador',  'El Que Invita',         'Trae 5 amigos al juego',           '👥', 'social',   '{"campo":"referidos","valor":5}');

INSERT INTO torneos (nombre, tipo, estado, es_gratuito, max_participantes, fecha_inicio, fecha_fin, premio_1ro_monedas, premio_2do_monedas, premio_3ro_monedas, trofeo_nombre)
VALUES (
  'Copa Domino Real RD - Semana 1',
  'eliminacion_directa',
  'inscripcion',
  TRUE, 64,
  NOW() + INTERVAL '2 days',
  NOW() + INTERVAL '4 days',
  5000, 2000, 1000,
  'Campeon Semanal'
);
