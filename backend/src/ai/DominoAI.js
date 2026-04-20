/**
 * Domino Real RD - Inteligencia Artificial
 * IA que juega como un dominicano real
 *
 * Estrategias implementadas:
 * - Bloqueo estratégico
 * - Conteo mental de fichas
 * - Forzar capicúa
 * - Leer jugadas del compañero
 * - Modos: Fácil, Medio, Difícil
 */

class DominoAI {
  constructor(dificultad = 'medio') {
    this.dificultad = dificultad; // 'facil' | 'medio' | 'dificil'

    // Probabilidad de error por dificultad (simula errores humanos)
    this.tasaError = {
      facil: 0.25,    // 25% jugada subóptima
      medio: 0.10,    // 10% jugada subóptima
      dificil: 0.02   // 2% jugada subóptima (casi perfecto)
    }[dificultad];
  }

  /**
   * Decide la mejor jugada para la IA
   * @returns { ficha, lado } o null si debe pasar
   */
  decidirJugada(estado, jugadorId, jugadasValidas) {
    if (jugadasValidas.length === 0) return null;

    // Error intencional para simular jugador humano imperfecto
    if (Math.random() < this.tasaError) {
      return this.jugadaAleatoria(jugadasValidas);
    }

    // Analizar estado del juego
    const analisis = this.analizarEstado(estado, jugadorId);

    // Seleccionar estrategia según dificultad
    switch (this.dificultad) {
      case 'facil':
        return this.estrategiaFacil(jugadasValidas, analisis);
      case 'medio':
        return this.estrategiaMedio(estado, jugadorId, jugadasValidas, analisis);
      case 'dificil':
        return this.estrategiaDificil(estado, jugadorId, jugadasValidas, analisis);
      default:
        return this.jugadaAleatoria(jugadasValidas);
    }
  }

  /**
   * Estrategia fácil: preferir fichas con más puntos, sin análisis profundo
   */
  estrategiaFacil(jugadasValidas, analisis) {
    // Ordenar por puntos descendente (deshacerse de fichas pesadas)
    const ordenadas = [...jugadasValidas].sort((a, b) => b.ficha.puntos - a.ficha.puntos);
    return ordenadas[0];
  }

  /**
   * Estrategia media: análisis básico de bloqueo y puntos
   */
  estrategiaMedio(estado, jugadorId, jugadasValidas, analisis) {
    const jugadasPuntuadas = jugadasValidas.map(jugada => ({
      ...jugada,
      puntuacion: this.evaluarJugada(estado, jugadorId, jugada, analisis)
    }));

    jugadasPuntuadas.sort((a, b) => b.puntuacion - a.puntuacion);
    return jugadasPuntuadas[0];
  }

  /**
   * Estrategia difícil: IA nivel competitivo dominicano
   * - Cuenta fichas mentalmente
   * - Bloqueo estratégico
   * - Fuerza capicúa cuando conviene
   * - Lee al compañero
   */
  estrategiaDificil(estado, jugadorId, jugadasValidas, analisis) {
    const jugadasPuntuadas = jugadasValidas.map(jugada => ({
      ...jugada,
      puntuacion: this.evaluarJugadaAvanzada(estado, jugadorId, jugada, analisis)
    }));

    jugadasPuntuadas.sort((a, b) => b.puntuacion - a.puntuacion);

    // Verificar si podemos forzar capicúa
    const jugadaCapicua = this.intentarForzarCapicua(estado, jugadasValidas, analisis);
    if (jugadaCapicua) {
      return jugadaCapicua;
    }

    return jugadasPuntuadas[0];
  }

  /**
   * Evalúa una jugada con puntuación heurística básica
   */
  evaluarJugada(estado, jugadorId, jugada, analisis) {
    let puntuacion = 0;
    const { ficha, lado } = jugada;
    const equipoJugador = jugadorId % 2;
    const compañeroId = jugadorId === 0 ? 2 : jugadorId === 2 ? 0 : jugadorId === 1 ? 3 : 1;

    // 1. Valor de la ficha (deshacerse de fichas pesadas)
    puntuacion += ficha.puntos * 2;

    // 2. Dobles son peligrosos: colocarlos antes
    if (ficha.esDoble) puntuacion += 15;

    // 3. Si tenemos muchas fichas de un número, priorizar ese número
    const { frecuencia } = analisis;
    if (frecuencia[ficha.izquierda] >= 3 || frecuencia[ficha.derecha] >= 3) {
      puntuacion += 10;
    }

    // 4. Bloqueo: si el adversario parece no tener ese número
    const numExpuesto = lado === 'izquierda' ? estado.extremoDerecho : estado.extremoIzquierdo;
    if (analisis.posiblesBloqueosAdversario.includes(numExpuesto)) {
      puntuacion += 20;
    }

    return puntuacion;
  }

  /**
   * Evaluación avanzada para modo difícil
   */
  evaluarJugadaAvanzada(estado, jugadorId, jugada, analisis) {
    let puntuacion = this.evaluarJugada(estado, jugadorId, jugada, analisis);
    const { ficha, lado } = jugada;

    // 5. Sincronía con el compañero
    const compañeroId = jugadorId === 0 ? 2 : jugadorId === 2 ? 0 : jugadorId === 1 ? 3 : 1;
    const numQueExpone = lado === 'derecha' ? ficha.derecha : ficha.izquierda;
    if (analisis.numerosDelCompanero[compañeroId]?.includes(numQueExpone)) {
      puntuacion += 25; // Ayudar al compañero
    }

    // 6. Preservar flexibilidad: no cerrar el tablero innecesariamente
    if (ficha.esDoble) {
      const otroExtremo = lado === 'derecha' ? estado.extremoIzquierdo : estado.extremoDerecho;
      if (this.cantFichasConNumero(analisis, otroExtremo) <= 1) {
        puntuacion -= 15; // Peligro de tranque en nuestra contra
      }
    }

    // 7. Conteo de fichas jugadas: evitar números ya agotados
    const numAgotados = analisis.numerosAgotados;
    if (!numAgotados.includes(ficha.izquierda) && !numAgotados.includes(ficha.derecha)) {
      puntuacion += 5;
    }

    // 8. Final de partida: si estamos cerca de ganar, ser más agresivo
    if (analisis.fichasEnMano <= 3) {
      puntuacion += ficha.puntos * 3; // Urge deshacerse de fichas
    }

    return puntuacion;
  }

  /**
   * Intenta forzar una capicúa si es posible
   */
  intentarForzarCapicua(estado, jugadasValidas, analisis) {
    if (estado.extremoIzquierdo !== estado.extremoDerecho) {
      // Buscar jugada que iguale los extremos
      for (const jugada of jugadasValidas) {
        const { ficha, lado } = jugada;
        let nuevoExtremo;

        if (lado === 'derecha') {
          nuevoExtremo = ficha.derecha === estado.extremoDerecho ? ficha.izquierda : ficha.derecha;
          if (nuevoExtremo === estado.extremoIzquierdo) {
            // ¡Esta jugada iguala los extremos! Preparamos capicúa
            if (analisis.fichasEnMano <= 2) {
              return jugada; // Forzar capicúa en siguiente turno
            }
          }
        }
      }
    }

    // Verificar si podemos cerrar con capicúa ahora
    for (const jugada of jugadasValidas) {
      const { ficha, lado } = jugada;
      if (analisis.fichasEnMano === 1) { // Esta es la última ficha
        const extremoQueQueda = lado === 'derecha' ? estado.extremoIzquierdo : estado.extremoDerecho;
        const extremoQueColoca = lado === 'derecha'
          ? (ficha.izquierda === estado.extremoDerecho ? ficha.derecha : ficha.izquierda)
          : (ficha.derecha === estado.extremoIzquierdo ? ficha.izquierda : ficha.derecha);

        if (extremoQueColoca === extremoQueQueda) {
          return jugada; // ¡Capicúa garantizada!
        }
      }
    }

    return null;
  }

  /**
   * Analiza el estado del juego para extraer información útil
   */
  analizarEstado(estado, jugadorId) {
    const manoActual = estado.manos[`jugador${jugadorId}`];

    // Frecuencia de números en mano
    const frecuencia = {};
    for (let i = 0; i <= 6; i++) frecuencia[i] = 0;
    for (const ficha of manoActual) {
      frecuencia[ficha.izquierda]++;
      frecuencia[ficha.derecha]++;
    }

    // Números ya jugados en la mesa
    const numerosEnMesa = new Set();
    for (const ficha of estado.mesa) {
      numerosEnMesa.add(ficha.izquierda);
      numerosEnMesa.add(ficha.derecha);
    }

    // Calcular fichas disponibles por número (28 total, 2 de cada par)
    const fichasPorNumero = {};
    for (let i = 0; i <= 6; i++) {
      let total = 7; // 7 fichas contienen cada número (0-0,0-1,...,0-6 para el 0)
      fichasPorNumero[i] = total;
    }

    // Números que probablemente los adversarios no tienen (basado en lo que han pasado)
    const historialPasos = estado.historial.filter(h => h.tipo === 'paso');
    const posiblesBloqueosAdversario = [];

    for (const paso of historialPasos) {
      const adversario = paso.jugadorId;
      if (adversario % 2 !== jugadorId % 2) {
        // El adversario pasó, quizás no tiene los extremos actuales
        if (!posiblesBloqueosAdversario.includes(estado.extremoIzquierdo)) {
          posiblesBloqueosAdversario.push(estado.extremoIzquierdo);
        }
        if (!posiblesBloqueosAdversario.includes(estado.extremoDerecho)) {
          posiblesBloqueosAdversario.push(estado.extremoDerecho);
        }
      }
    }

    // Números que el compañero puede tener (inferencia)
    const compañeroId = jugadorId === 0 ? 2 : jugadorId === 2 ? 0 : jugadorId === 1 ? 3 : 1;
    const numerosDelCompanero = {};
    numerosDelCompanero[compañeroId] = [];

    // El compañero jugó números específicos
    for (const jugada of estado.historial) {
      if (jugada.jugadorId === compañeroId && jugada.ficha) {
        const [iz, de] = jugada.ficha.split('-').map(Number);
        // Si jugó ese número, probablemente tiene más
        if (!numerosDelCompanero[compañeroId].includes(iz)) {
          numerosDelCompanero[compañeroId].push(iz);
        }
        if (!numerosDelCompanero[compañeroId].includes(de)) {
          numerosDelCompanero[compañeroId].push(de);
        }
      }
    }

    // Números agotados (todas las fichas con ese número ya están en mesa)
    const numerosAgotados = [];
    for (let i = 0; i <= 6; i++) {
      const fichasConI = estado.mesa.filter(f => f.izquierda === i || f.derecha === i).length;
      // Cada número aparece en 7 fichas del set completo
      if (fichasConI >= 7) numerosAgotados.push(i);
    }

    return {
      frecuencia,
      fichasEnMano: manoActual.length,
      numerosEnMesa: Array.from(numerosEnMesa),
      posiblesBloqueosAdversario,
      numerosDelCompanero,
      numerosAgotados,
      compañeroId
    };
  }

  cantFichasConNumero(analisis, numero) {
    return analisis.frecuencia[numero] || 0;
  }

  jugadaAleatoria(jugadasValidas) {
    return jugadasValidas[Math.floor(Math.random() * jugadasValidas.length)];
  }

  /**
   * Genera comentario en estilo dominicano según la jugada
   */
  generarComentario(jugada, contexto) {
    const comentariosDomino = {
      capicua: [
        '¡Capicúaaaa! ¡Qué cosa más bella!',
        '¡Eso es dominó fino, papi!',
        '¡Capicúa! ¡Llamen a los vecinos!',
        '¡La capicúa del año! ¡Ajúa!'
      ],
      doble: [
        '¡El doble, papá! ¿Qué van a hacer?',
        '¡Doble seis, eso manda!',
        '¡Ahí ta el doble! ¡Cójanlo!'
      ],
      bloqueo: [
        '¡Se trancó! ¡Ajá!',
        '¡Eso es juego de inteligencia!',
        '¡Los cerré como una puerta!'
      ],
      domino: [
        '¡Dominóóó! ¡Qué clase de partida!',
        '¡Fuera! ¡A recoger fichas!',
        '¡Dominó! ¡Estamos anotando!'
      ],
      normal: [
        '¡Dale que es tuyo!',
        '¡Piénsalo bien!',
        '¡Tú sabes lo que hay!'
      ]
    };

    const tipo = contexto.capicua ? 'capicua'
      : contexto.esDomino ? 'domino'
      : contexto.esBloqueo ? 'bloqueo'
      : jugada.ficha.esDoble ? 'doble'
      : 'normal';

    const opciones = comentariosDomino[tipo];
    return opciones[Math.floor(Math.random() * opciones.length)];
  }
}

module.exports = DominoAI;
