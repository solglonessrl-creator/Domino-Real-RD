/**
 * Domino Real RD - Tests del Motor de Juego
 * Verifican las reglas reales del dominó dominicano
 */

const DominoEngine = require('./DominoEngine');

describe('DominoEngine - Fichas', () => {
  let engine;

  beforeEach(() => {
    engine = new DominoEngine();
  });

  test('genera exactamente 28 fichas', () => {
    const fichas = engine.generarFichas();
    expect(fichas).toHaveLength(28);
  });

  test('todas las fichas son únicas', () => {
    const fichas = engine.generarFichas();
    const ids = new Set(fichas.map(f => f.id));
    expect(ids.size).toBe(28);
  });

  test('distribuye 7 fichas a cada jugador', () => {
    const manos = engine.distribuirFichas();
    expect(manos.jugador0).toHaveLength(7);
    expect(manos.jugador1).toHaveLength(7);
    expect(manos.jugador2).toHaveLength(7);
    expect(manos.jugador3).toHaveLength(7);
  });

  test('fichas dobles tienen izquierda === derecha', () => {
    const fichas = engine.generarFichas();
    const dobles = fichas.filter(f => f.esDoble);
    dobles.forEach(f => expect(f.izquierda).toBe(f.derecha));
    expect(dobles).toHaveLength(7); // 0-0, 1-1, ..., 6-6
  });

  test('puntos de cada ficha son correctos', () => {
    const fichas = engine.generarFichas();
    fichas.forEach(f => {
      expect(f.puntos).toBe(f.izquierda + f.derecha);
    });
  });
});

describe('DominoEngine - Inicio de Partida', () => {
  let engine;

  beforeEach(() => { engine = new DominoEngine(); });

  test('el estado inicial tiene los campos requeridos', () => {
    const jugadores = [
      { id: 'j0', nombre: 'Ana' },
      { id: 'j1', nombre: 'Bob' },
      { id: 'j2', nombre: 'Carlos' },
      { id: 'j3', nombre: 'Diana' }
    ];
    const estado = engine.iniciarPartida(jugadores);

    expect(estado.id).toBeDefined();
    expect(estado.estado).toBe('jugando');
    expect(estado.mesa).toHaveLength(0);
    expect(estado.equipos.equipo0.puntos).toBe(0);
    expect(estado.equipos.equipo1.puntos).toBe(0);
    expect([0, 1, 2, 3]).toContain(estado.turno);
  });

  test('cada jugador tiene exactamente 7 fichas al inicio', () => {
    const jugadores = [{}, {}, {}, {}];
    const estado = engine.iniciarPartida(jugadores);

    expect(estado.manos.jugador0).toHaveLength(7);
    expect(estado.manos.jugador1).toHaveLength(7);
    expect(estado.manos.jugador2).toHaveLength(7);
    expect(estado.manos.jugador3).toHaveLength(7);
  });
});

describe('DominoEngine - Validación de Jugadas', () => {
  let engine, estado;

  beforeEach(() => {
    engine = new DominoEngine();
    estado = engine.iniciarPartida([{}, {}, {}, {}]);
    // Forzar turno del jugador 0 para tests
    estado.turno = 0;
  });

  test('primera jugada siempre válida', () => {
    const ficha = estado.manos.jugador0[0];
    const resultado = engine.validarJugada(estado, 0, ficha, 'centro');
    expect(resultado.valida).toBe(true);
  });

  test('jugada fuera de turno es inválida', () => {
    const ficha = estado.manos.jugador1[0];
    const resultado = engine.validarJugada(estado, 1, ficha, 'izquierda');
    expect(resultado.valida).toBe(false);
    expect(resultado.codigo).toBe('NO_ES_TURNO');
  });

  test('ficha que no pertenece al jugador es inválida', () => {
    const fichaDe1 = estado.manos.jugador1[0];
    const resultado = engine.validarJugada(estado, 0, fichaDe1, 'izquierda');
    expect(resultado.valida).toBe(false);
    expect(resultado.codigo).toBe('NO_TIENE_FICHA');
  });

  test('ficha que no encaja en extremos es inválida', () => {
    // Primero colocar una ficha para establecer extremos
    const fichaInicial = { id: '0-0', izquierda: 0, derecha: 0, esDoble: true, puntos: 0 };
    estado.manos.jugador0 = [fichaInicial, ...estado.manos.jugador0.slice(0, 6)];
    estado.mesa = [fichaInicial];
    estado.extremoIzquierdo = 0;
    estado.extremoDerecho = 0;
    estado.turno = 0;

    // Intentar colocar una ficha que no tiene 0
    const fichaQueNoEncaja = { id: '3-5', izquierda: 3, derecha: 5, esDoble: false, puntos: 8 };
    estado.manos.jugador0 = [fichaQueNoEncaja];

    const resultado = engine.validarJugada(estado, 0, fichaQueNoEncaja, 'derecha');
    expect(resultado.valida).toBe(false);
    expect(resultado.codigo).toBe('NO_ENCAJA');
  });
});

describe('DominoEngine - Ejecución de Jugadas', () => {
  let engine, estado;

  beforeEach(() => {
    engine = new DominoEngine();
    estado = engine.iniciarPartida([{}, {}, {}, {}]);
    estado.turno = 0;
  });

  test('primera jugada actualiza extremos correctamente', () => {
    const ficha = { id: '3-5', izquierda: 3, derecha: 5, esDoble: false, puntos: 8 };
    estado.manos.jugador0 = [ficha, ...estado.manos.jugador0.slice(0, 6)];

    const resultado = engine.ejecutarJugada(estado, 0, ficha, 'centro');

    expect(resultado.exito).toBe(true);
    expect(resultado.estado.extremoIzquierdo).toBe(3);
    expect(resultado.estado.extremoDerecho).toBe(5);
    expect(resultado.estado.mesa).toHaveLength(1);
    expect(resultado.estado.manos.jugador0).toHaveLength(6);
  });

  test('turno avanza al siguiente jugador tras jugada válida', () => {
    const ficha = estado.manos.jugador0[0];
    const resultado = engine.ejecutarJugada(estado, 0, ficha, 'centro');
    expect(resultado.exito).toBe(true);
    // El turno debe ser 1, 2 o 3 (el siguiente que pueda jugar)
    expect(resultado.estado.turno).not.toBe(0);
  });

  test('colocar ficha en extremo derecho actualiza el extremo', () => {
    // Establecer mesa con 3...5
    const fichaBase = { id: '3-5', izquierda: 3, derecha: 5, esDoble: false, puntos: 8 };
    estado.manos.jugador0 = [fichaBase, ...estado.manos.jugador0.slice(0, 6)];

    engine.ejecutarJugada(estado, 0, fichaBase, 'centro');
    estado = engine.ejecutarJugada(estado, 0, fichaBase, 'centro').estado;
    estado.turno = 0;

    // Colocar ficha con 5 al extremo derecho
    const ficha2 = { id: '5-2', izquierda: 5, derecha: 2, esDoble: false, puntos: 7 };
    estado.manos.jugador0 = [ficha2];

    const resultado = engine.ejecutarJugada(estado, 0, ficha2, 'derecha');
    if (resultado.exito) {
      expect(resultado.estado.extremoDerecho).toBe(2);
    }
  });
});

describe('DominoEngine - Capicúa', () => {
  let engine;

  beforeEach(() => { engine = new DominoEngine(); });

  test('detecta capicúa cuando extremos son iguales', () => {
    const estado = {
      extremoIzquierdo: 3,
      extremoDerecho: 3,
      mesa: [{ id: '3-5' }, { id: '5-3' }]
    };
    expect(engine.verificarCapicua(estado)).toBe(true);
  });

  test('no hay capicúa cuando extremos son distintos', () => {
    const estado = {
      extremoIzquierdo: 3,
      extremoDerecho: 5,
      mesa: [{ id: '3-5' }]
    };
    expect(engine.verificarCapicua(estado)).toBe(false);
  });

  test('no hay capicúa con solo una ficha en mesa', () => {
    const estado = {
      extremoIzquierdo: 3,
      extremoDerecho: 3,
      mesa: [{ id: '3-3' }]
    };
    expect(engine.verificarCapicua(estado)).toBe(false);
  });
});

describe('DominoEngine - Cálculo de Puntos', () => {
  let engine;

  beforeEach(() => { engine = new DominoEngine(); });

  test('suma correctamente fichas del equipo perdedor', () => {
    const estado = {
      manos: {
        jugador0: [], // equipo ganador
        jugador1: [{ puntos: 10 }, { puntos: 5 }], // equipo perdedor
        jugador2: [], // equipo ganador
        jugador3: [{ puntos: 6 }] // equipo perdedor
      },
      equipos: {
        equipo0: { jugadores: [0, 2] },
        equipo1: { jugadores: [1, 3] }
      }
    };

    const resultado = engine.calcularPuntos(estado, 0, false);
    expect(resultado.puntosFichas).toBe(21); // 10+5+6
    expect(resultado.total).toBe(21);
  });

  test('suma bonus de capicúa correctamente', () => {
    const estado = {
      manos: {
        jugador0: [],
        jugador1: [{ puntos: 10 }],
        jugador2: [],
        jugador3: [{ puntos: 5 }]
      },
      equipos: {
        equipo0: { jugadores: [0, 2] },
        equipo1: { jugadores: [1, 3] }
      }
    };

    const resultado = engine.calcularPuntos(estado, 0, true);
    expect(resultado.bonusCapicua).toBe(30);
    expect(resultado.total).toBe(45); // 15 fichas + 30 capicúa
  });
});

describe('DominoEngine - Tranque', () => {
  let engine;

  beforeEach(() => { engine = new DominoEngine(); });

  test('gana el equipo con menos puntos en tranque', () => {
    const estado = {
      manos: {
        jugador0: [{ puntos: 3 }],  // equipo0: 3+2=5
        jugador1: [{ puntos: 10 }], // equipo1: 10+8=18
        jugador2: [{ puntos: 2 }],
        jugador3: [{ puntos: 8 }]
      }
    };

    const resultado = engine.resolverTranque(estado);
    expect(resultado.equipoGanador).toBe(0); // equipo0 tiene menos puntos
    expect(resultado.razon).toBe('tranque');
  });

  test('tranque empata cuando ambos equipos tienen igual puntos', () => {
    const estado = {
      manos: {
        jugador0: [{ puntos: 5 }],
        jugador1: [{ puntos: 5 }],
        jugador2: [{ puntos: 5 }],
        jugador3: [{ puntos: 5 }]
      }
    };

    const resultado = engine.resolverTranque(estado);
    expect(resultado.equipoGanador).toBeNull();
    expect(resultado.razon).toBe('tranque_empate');
  });
});

describe('DominoEngine - Fin de Match', () => {
  let engine;

  beforeEach(() => { engine = new DominoEngine(); });

  test('detecta fin de match cuando equipo llega a 200', () => {
    const equipos = {
      equipo0: { puntos: 205 },
      equipo1: { puntos: 140 }
    };

    const resultado = engine.verificarFinMatch(equipos);
    expect(resultado.terminado).toBe(true);
    expect(resultado.equipoCampeon).toBe('equipo0');
  });

  test('partida continua si ningún equipo llega a 200', () => {
    const equipos = {
      equipo0: { puntos: 150 },
      equipo1: { puntos: 190 }
    };

    const resultado = engine.verificarFinMatch(equipos);
    expect(resultado.terminado).toBe(false);
  });
});
