/**
 * Domino Real RD - Motor de Juego Principal
 * Implementa las reglas REALES del dominó dominicano doble-6
 *
 * Modalidad: 4 jugadores en parejas (2 vs 2)
 * Fichas: 28 piezas doble-6
 * Puntuación máxima: 200 puntos
 */

class DominoEngine {
  constructor() {
    this.TOTAL_FICHAS = 28;
    this.MAX_PUNTOS = 200;
    this.BONUS_CAPICUA = 30;
    this.FICHAS_POR_JUGADOR = 7;
  }

  /**
   * Genera el set completo de 28 fichas doble-6
   */
  generarFichas() {
    const fichas = [];
    for (let i = 0; i <= 6; i++) {
      for (let j = i; j <= 6; j++) {
        fichas.push({
          id: `${i}-${j}`,
          izquierda: i,
          derecha: j,
          esDoble: i === j,
          puntos: i + j
        });
      }
    }
    return fichas; // 28 fichas exactas
  }

  /**
   * Baraja y distribuye fichas a 4 jugadores
   */
  distribuirFichas() {
    const fichas = this.generarFichas();

    // Fisher-Yates shuffle
    for (let i = fichas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fichas[i], fichas[j]] = [fichas[j], fichas[i]];
    }

    return {
      jugador0: fichas.slice(0, 7),
      jugador1: fichas.slice(7, 14),
      jugador2: fichas.slice(14, 21),
      jugador3: fichas.slice(21, 28)
    };
  }

  /**
   * Determina quién sale primero (tiene el doble más alto)
   */
  determinarPrimerTurno(manos) {
    let maxDoble = -1;
    let jugadorInicial = 0;

    for (let i = 0; i < 4; i++) {
      const mano = manos[`jugador${i}`];
      for (const ficha of mano) {
        if (ficha.esDoble && ficha.izquierda > maxDoble) {
          maxDoble = ficha.izquierda;
          jugadorInicial = i;
        }
      }
    }

    return { jugadorInicial, fichaInicial: maxDoble };
  }

  /**
   * Inicializa el estado completo de una partida
   */
  iniciarPartida(jugadores) {
    const manos = this.distribuirFichas();
    const { jugadorInicial } = this.determinarPrimerTurno(manos);

    return {
      id: this.generarId(),
      estado: 'jugando',
      turno: jugadorInicial,
      ronda: 1,
      mesa: [], // fichas colocadas en el tablero
      extremoIzquierdo: null, // número disponible en extremo izq
      extremoDerecho: null,   // número disponible en extremo der
      manos: {
        jugador0: manos.jugador0,
        jugador1: manos.jugador1,
        jugador2: manos.jugador2,
        jugador3: manos.jugador3
      },
      jugadores: jugadores,
      equipos: {
        equipo0: { jugadores: [0, 2], puntos: 0 }, // jugadores 0 y 2
        equipo1: { jugadores: [1, 3], puntos: 0 }  // jugadores 1 y 3
      },
      historial: [],
      pasadas: { 0: 0, 1: 0, 2: 0, 3: 0 }, // veces que cada jugador pasó
      ultimaJugada: null,
      capicua: false
    };
  }

  /**
   * Verifica si una ficha puede colocarse en el tablero
   * @returns { valida, lado } o { valida: false, razon }
   */
  validarJugada(estado, jugadorId, ficha, lado) {
    const manoJugador = estado.manos[`jugador${jugadorId}`];

    // Verificar que el jugador tiene la ficha
    const tieneFicha = manoJugador.some(f => f.id === ficha.id);
    if (!tieneFicha) {
      return { valida: false, razon: 'El jugador no tiene esa ficha', codigo: 'NO_TIENE_FICHA' };
    }

    // Verificar que es su turno
    if (estado.turno !== jugadorId) {
      return { valida: false, razon: 'No es tu turno', codigo: 'NO_ES_TURNO' };
    }

    // Primera jugada: cualquier ficha es válida
    if (estado.mesa.length === 0) {
      return { valida: true, lado: 'centro', orientacion: 'normal' };
    }

    const { extremoIzquierdo, extremoDerecho } = estado;

    // Verificar si la ficha encaja en algún extremo
    const encajaIzquierda = (ficha.izquierda === extremoIzquierdo || ficha.derecha === extremoIzquierdo);
    const encajaDerecha = (ficha.izquierda === extremoDerecho || ficha.derecha === extremoDerecho);

    if (lado === 'izquierda' && !encajaIzquierda) {
      return { valida: false, razon: `La ficha no encaja en el extremo izquierdo (${extremoIzquierdo})`, codigo: 'NO_ENCAJA' };
    }
    if (lado === 'derecha' && !encajaDerecha) {
      return { valida: false, razon: `La ficha no encaja en el extremo derecho (${extremoDerecho})`, codigo: 'NO_ENCAJA' };
    }
    if (lado !== 'izquierda' && lado !== 'derecha') {
      // Auto-detectar lado
      if (!encajaIzquierda && !encajaDerecha) {
        return { valida: false, razon: 'La ficha no encaja en ningún extremo', codigo: 'NO_ENCAJA' };
      }
      lado = encajaDerecha ? 'derecha' : 'izquierda';
    }

    // Determinar orientación de la ficha
    let orientacion = 'normal';
    if (lado === 'izquierda') {
      orientacion = ficha.derecha === extremoIzquierdo ? 'normal' : 'invertida';
    } else {
      orientacion = ficha.izquierda === extremoDerecho ? 'normal' : 'invertida';
    }

    return { valida: true, lado, orientacion };
  }

  /**
   * Ejecuta una jugada y actualiza el estado
   */
  ejecutarJugada(estado, jugadorId, ficha, lado) {
    const validacion = this.validarJugada(estado, jugadorId, ficha, lado);

    if (!validacion.valida) {
      return {
        exito: false,
        error: validacion.razon,
        codigo: validacion.codigo,
        penalizacion: this.aplicarPenalizacion(estado, jugadorId)
      };
    }

    // Clonar estado para inmutabilidad
    const nuevoEstado = JSON.parse(JSON.stringify(estado));

    // Remover ficha de la mano del jugador
    nuevoEstado.manos[`jugador${jugadorId}`] = nuevoEstado.manos[`jugador${jugadorId}`]
      .filter(f => f.id !== ficha.id);

    // Calcular nuevos extremos
    let fichaOrientada = { ...ficha };

    if (nuevoEstado.mesa.length === 0) {
      // Primera ficha
      nuevoEstado.extremoIzquierdo = ficha.izquierda;
      nuevoEstado.extremoDerecho = ficha.derecha;
      fichaOrientada.posicion = 'centro';
    } else if (validacion.lado === 'izquierda') {
      if (validacion.orientacion === 'invertida') {
        fichaOrientada = { ...ficha, izquierda: ficha.derecha, derecha: ficha.izquierda };
      }
      nuevoEstado.extremoIzquierdo = fichaOrientada.izquierda;
      fichaOrientada.posicion = 'izquierda';
    } else {
      if (validacion.orientacion === 'invertida') {
        fichaOrientada = { ...ficha, izquierda: ficha.derecha, derecha: ficha.izquierda };
      }
      nuevoEstado.extremoDerecho = fichaOrientada.derecha;
      fichaOrientada.posicion = 'derecha';
    }

    // Agregar ficha a la mesa
    nuevoEstado.mesa.push({
      ...fichaOrientada,
      jugadorId,
      timestamp: Date.now()
    });

    // Registrar en historial
    nuevoEstado.historial.push({
      turno: nuevoEstado.turno,
      jugadorId,
      ficha: ficha.id,
      lado: validacion.lado,
      timestamp: Date.now()
    });

    // Resetear contador de pasadas
    nuevoEstado.pasadas = { 0: 0, 1: 0, 2: 0, 3: 0 };
    nuevoEstado.ultimaJugada = { jugadorId, ficha, lado: validacion.lado };

    // Verificar fin de partida
    const resultado = this.verificarFinPartida(nuevoEstado, jugadorId);

    if (resultado.terminada) {
      nuevoEstado.estado = 'terminada';
      nuevoEstado.resultado = resultado;
    } else {
      // Siguiente turno
      nuevoEstado.turno = (jugadorId + 1) % 4;
      // Si el siguiente no puede jugar, lo saltamos automáticamente
      nuevoEstado.turno = this.siguienteTurnoValido(nuevoEstado, nuevoEstado.turno);
    }

    return { exito: true, estado: nuevoEstado, jugada: fichaOrientada };
  }

  /**
   * Maneja cuando un jugador pasa su turno
   */
  pasarTurno(estado, jugadorId) {
    // Verificar que realmente no puede jugar
    const puedJugar = this.puedeJugar(estado, jugadorId);
    if (puedJugar) {
      return { exito: false, error: 'Tienes fichas que puedes jugar', codigo: 'PUEDE_JUGAR' };
    }

    const nuevoEstado = JSON.parse(JSON.stringify(estado));
    nuevoEstado.pasadas[jugadorId]++;

    nuevoEstado.historial.push({
      tipo: 'paso',
      jugadorId,
      timestamp: Date.now()
    });

    // Verificar tranque (todos pasan consecutivamente)
    const totalPasadas = Object.values(nuevoEstado.pasadas).reduce((a, b) => a + b, 0);
    if (totalPasadas >= 4) {
      // TRANQUE - gana equipo con menos puntos en mano
      const resultado = this.resolverTranque(nuevoEstado);
      nuevoEstado.estado = 'terminada';
      nuevoEstado.resultado = resultado;
    } else {
      nuevoEstado.turno = (jugadorId + 1) % 4;
    }

    return { exito: true, estado: nuevoEstado };
  }

  /**
   * Verifica si un jugador puede realizar alguna jugada
   */
  puedeJugar(estado, jugadorId) {
    if (estado.mesa.length === 0) return true;

    const mano = estado.manos[`jugador${jugadorId}`];
    const { extremoIzquierdo, extremoDerecho } = estado;

    return mano.some(ficha =>
      ficha.izquierda === extremoIzquierdo ||
      ficha.derecha === extremoIzquierdo ||
      ficha.izquierda === extremoDerecho ||
      ficha.derecha === extremoDerecho
    );
  }

  /**
   * Encuentra el siguiente jugador que puede jugar
   * NOTA: Eliminado el auto-salto. Ahora el jugador debe presionar "Pasar"
   * explícitamente para emular la experiencia real del dominó y no robar el turno.
   */
  siguienteTurnoValido(estado, turnoActual) {
    return turnoActual;
  }

  /**
   * Verifica si la partida ha terminado
   */
  verificarFinPartida(estado, ultimoJugador) {
    // 1. El jugador colocó su última ficha
    if (estado.manos[`jugador${ultimoJugador}`].length === 0) {
      const capicua = this.verificarCapicua(estado);
      const equipoGanador = ultimoJugador % 2 === 0 ? 0 : 1;
      const puntos = this.calcularPuntos(estado, equipoGanador, capicua);

      return {
        terminada: true,
        razon: capicua ? 'capicua' : 'dominó',
        equipoGanador,
        capicua,
        puntos,
        bonus: capicua ? this.BONUS_CAPICUA : 0,
        jugadorQueGano: ultimoJugador
      };
    }

    return { terminada: false };
  }

  /**
   * Verifica si hubo capicúa (misma ficha en ambos extremos)
   */
  verificarCapicua(estado) {
    const { extremoIzquierdo, extremoDerecho, mesa } = estado;

    // Solo puede ser capicúa si hay más de una ficha
    if (mesa.length <= 1) return false;

    return extremoIzquierdo === extremoDerecho;
  }

  /**
   * Calcula puntos al ganar una ronda
   * Suma fichas restantes del equipo perdedor
   */
  calcularPuntos(estado, equipoGanador, capicua = false) {
    const equipoPerdedor = equipoGanador === 0 ? 1 : 0;
    const jugadoresPerdedores = estado.equipos[`equipo${equipoPerdedor}`].jugadores;

    let puntosFichas = 0;
    for (const jugId of jugadoresPerdedores) {
      const mano = estado.manos[`jugador${jugId}`];
      puntosFichas += mano.reduce((sum, ficha) => sum + ficha.puntos, 0);
    }

    // Redondear a múltiplos de 5 (regla dominicana opcional)
    const puntosFinales = puntosFichas + (capicua ? this.BONUS_CAPICUA : 0);

    return {
      puntosFichas,
      bonusCapicua: capicua ? this.BONUS_CAPICUA : 0,
      total: puntosFinales,
      desglose: this.desgloseManosRestantes(estado, jugadoresPerdedores)
    };
  }

  /**
   * Desglose detallado de manos restantes para mostrar en UI
   */
  desgloseManosRestantes(estado, jugadores) {
    return jugadores.map(jugId => ({
      jugadorId: jugId,
      fichas: estado.manos[`jugador${jugId}`],
      subtotal: estado.manos[`jugador${jugId}`].reduce((s, f) => s + f.puntos, 0)
    }));
  }

  /**
   * Resuelve un tranque (bloqueo total)
   */
  resolverTranque(estado) {
    const puntosEquipo0 = this.calcularPuntosMano(estado, [0, 2]);
    const puntosEquipo1 = this.calcularPuntosMano(estado, [1, 3]);

    let equipoGanador, razon;

    if (puntosEquipo0 < puntosEquipo1) {
      equipoGanador = 0;
    } else if (puntosEquipo1 < puntosEquipo0) {
      equipoGanador = 1;
    } else {
      // Empate en tranque: nadie anota (o variante: anota el que causó el tranque)
      return {
        terminada: true,
        razon: 'tranque_empate',
        equipoGanador: null,
        puntos: { total: 0 },
        puntosEquipo0,
        puntosEquipo1
      };
    }

    const puntosDiferencia = Math.abs(puntosEquipo0 - puntosEquipo1);

    return {
      terminada: true,
      razon: 'tranque',
      equipoGanador,
      puntos: { total: puntosDiferencia, puntosFichas: puntosDiferencia },
      puntosEquipo0,
      puntosEquipo1
    };
  }

  /**
   * Suma puntos totales en mano de un equipo
   */
  calcularPuntosMano(estado, jugadores) {
    return jugadores.reduce((total, jugId) => {
      const mano = estado.manos[`jugador${jugId}`] || [];
      return total + mano.reduce((s, f) => s + f.puntos, 0);
    }, 0);
  }

  /**
   * Aplica penalización por jugada inválida
   */
  aplicarPenalizacion(estado, jugadorId) {
    // Regla dominicana: jugada inválida = pierde turno
    return {
      tipo: 'pierde_turno',
      jugadorId,
      mensaje: '¡Jugada inválida! Pierdes el turno.'
    };
  }

  /**
   * Verifica si la partida/match completo ha terminado (200 puntos)
   */
  verificarFinMatch(equipos) {
    for (const [nombre, equipo] of Object.entries(equipos)) {
      if (equipo.puntos >= this.MAX_PUNTOS) {
        return {
          terminado: true,
          equipoCampeon: nombre,
          puntos: equipo.puntos
        };
      }
    }
    return { terminado: false };
  }

  /**
   * Obtiene jugadas válidas para un jugador (útil para IA y hints)
   */
  obtenerJugadasValidas(estado, jugadorId) {
    const mano = estado.manos[`jugador${jugadorId}`];
    const jugadasValidas = [];

    for (const ficha of mano) {
      for (const lado of ['izquierda', 'derecha']) {
        const validacion = this.validarJugada(estado, jugadorId, ficha, lado);
        if (validacion.valida) {
          jugadasValidas.push({ ficha, lado, orientacion: validacion.orientacion });
          break; // Evitar duplicados si encaja en ambos lados (se agrega una vez por lado)
        }
      }
      // También revisar el otro lado si no se agregó ya
      for (const lado of ['derecha', 'izquierda']) {
        const validacion = this.validarJugada(estado, jugadorId, ficha, lado);
        if (validacion.valida) {
          const yaAgregado = jugadasValidas.some(j => j.ficha.id === ficha.id && j.lado === lado);
          if (!yaAgregado) {
            jugadasValidas.push({ ficha, lado, orientacion: validacion.orientacion });
          }
        }
      }
    }

    // Eliminar duplicados
    const unicos = [];
    const vistos = new Set();
    for (const j of jugadasValidas) {
      const key = `${j.ficha.id}-${j.lado}`;
      if (!vistos.has(key)) {
        vistos.add(key);
        unicos.push(j);
      }
    }

    return unicos;
  }

  generarId() {
    return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = DominoEngine;
