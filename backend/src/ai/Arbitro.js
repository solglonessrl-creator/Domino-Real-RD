/**
 * Domino Real RD - Árbitro IA
 * Asistente árbitro con personalidad caribeña/dominicana
 *
 * Funciones:
 * - Detectar jugadas inválidas
 * - Explicar reglas en tiempo real
 * - Narrar jugadas importantes
 * - Actuar como árbitro automático
 */

class Arbitro {
  constructor() {
    this.nombreArbitro = 'Don Fello';
    this.eventos = [];
  }

  /**
   * Narrar una jugada en tiempo real
   */
  narrarJugada(jugada, estado, jugadores) {
    const jugador = jugadores[jugada.jugadorId];
    const nombre = jugador?.nombre || `Jugador ${jugada.jugadorId + 1}`;

    const narraciones = {
      primera_ficha: [
        `¡${nombre} abre con el ${jugada.ficha.id}! ¡Empieza el show!`,
        `¡Sale ${nombre} con el ${jugada.ficha.id}! ¡A darle!`,
        `¡Primer ficha de ${nombre}! ¡El ${jugada.ficha.id} en la mesa!`
      ],
      doble: [
        `¡${nombre} juega el DOBLE ${jugada.ficha.izquierda}! ¡Los rivales que tiemblen!`,
        `¡El doble-${jugada.ficha.izquierda} de ${nombre}! ¡Eso sí es dominó!`,
        `¡Doble ${jugada.ficha.izquierda}! ¡${nombre} lo pone en el ${jugada.lado}!`
      ],
      normal: [
        `${nombre} juega el ${jugada.ficha.id} al ${jugada.lado}.`,
        `¡Va el ${jugada.ficha.id}! ${nombre} lo pone al ${jugada.lado}.`,
        `${nombre} coloca ${jugada.ficha.id} — extremos: ${estado.extremoIzquierdo}...${estado.extremoDerecho}`
      ],
      capicua: [
        `🎉 ¡¡CAPICÚAAAA!! ¡${nombre} cierra con el ${jugada.ficha.id}! ¡${this.BONUS_CAPICUA} puntos extra! ¡Eso no lo hacen en ningún sitio!`,
        `🎉 ¡¡LA CAPICÚA DE ${nombre.toUpperCase()}!! ¡Mismos números en ambos lados! ¡Ajúa! ¡+30 puntos!`,
        `🎉 ¡¡CAPICÚA SEÑORES!! ¡${nombre} cerró igual por los dos lados! ¡Eso es dominó de verdad!`
      ],
      domino: [
        `🏆 ¡¡DOMINÓÓÓ!! ¡${nombre} se queda sin fichas! ¡El equipo ${Math.floor(jugada.jugadorId / 2) === 0 ? 'A' : 'B'} gana la ronda!`,
        `🏆 ¡¡DOMINÓ!! ¡${nombre} lo logró! ¡A sumar los puntos del equipo contrario!`,
        `🏆 ¡Dominó de ${nombre}! ¡Fuera fichas del otro equipo!`
      ],
      paso: [
        `${nombre} no tiene ficha que jugar... ¡Pasa el turno!`,
        `¡${nombre} pasa! No le entra nada.`,
        `Sin ficha, ${nombre} se ve obligado a pasar.`
      ],
      tranque: [
        `🔒 ¡¡TRANQUE!! ¡El juego se bloqueó! Nadie puede mover. ¡A contar fichas!`,
        `🔒 ¡Tranque total! ¡Todos están bloqueados! Gana el equipo con menos puntos en mano.`,
        `🔒 ¡Se trancó! ¡Eso es lo que hay! A ver quién tiene menos puntos...`
      ]
    };

    let tipo = 'normal';
    if (estado.mesa.length === 1) tipo = 'primera_ficha';
    else if (jugada.tipo === 'paso') tipo = 'paso';
    else if (jugada.tipo === 'tranque') tipo = 'tranque';
    else if (jugada.capicua) tipo = 'capicua';
    else if (jugada.esDomino) tipo = 'domino';
    else if (jugada.ficha?.esDoble) tipo = 'doble';

    const opciones = narraciones[tipo] || narraciones.normal;
    const texto = opciones[Math.floor(Math.random() * opciones.length)];

    return {
      tipo,
      texto,
      narrador: this.nombreArbitro,
      timestamp: Date.now()
    };
  }

  /**
   * Detectar y explicar jugada inválida con estilo caribeño
   */
  explicarJugadaInvalida(codigo, contexto = {}) {
    const explicaciones = {
      NO_ENCAJA: {
        corta: '¡Esa ficha no entra ahí!',
        larga: `¡Oye! La ficha ${contexto.ficha || ''} no encaja en ese extremo. El tablero muestra ${contexto.extremoIzq || '?'}...${contexto.extremoDer || '?'}. Solo puedes colocar fichas que tengan esos números.`,
        regla: 'Regla: La ficha debe tener al menos un número igual al extremo donde la colocas.'
      },
      NO_ES_TURNO: {
        corta: '¡Espera tu turno, socio!',
        larga: `¡Calma! Todavía no es tu turno. Espera a que los demás jugadores hagan su movida.`,
        regla: 'Regla: Cada jugador debe esperar su turno en el orden establecido.'
      },
      NO_TIENE_FICHA: {
        corta: '¡Esa ficha no es tuya!',
        larga: `¡Epa! Esa ficha no está en tu mano. Solo puedes jugar las fichas que te tocaron.`,
        regla: 'Regla: Solo puedes jugar fichas que estén en tu mano.'
      },
      PUEDE_JUGAR: {
        corta: '¡Tienes fichas que puedes usar!',
        larga: `¡No puedes pasar! Tienes fichas que encajan en el tablero. Búscalas bien — ¡te quedan jugadas!`,
        regla: 'Regla: Solo puedes pasar el turno si no tienes ninguna ficha válida para colocar.'
      }
    };

    const exp = explicaciones[codigo] || {
      corta: '¡Jugada inválida!',
      larga: 'Esa jugada no está permitida por las reglas del dominó.',
      regla: 'Revisa las reglas del juego.'
    };

    return {
      codigo,
      ...exp,
      narrador: this.nombreArbitro,
      timestamp: Date.now()
    };
  }

  /**
   * Explicar reglas en tiempo real según el contexto
   */
  explicarRegla(contexto) {
    const reglas = {
      inicio: `¡Bienvenidos al Dominó Real RD! Aquí se juega con 28 fichas doble-6, en equipos de 2 contra 2. Cada jugador tiene 7 fichas. Sale primero quien tenga el doble más alto.`,

      turnos: `Los turnos van en sentido horario. En tu turno debes colocar una ficha válida o pasar si no tienes ninguna.`,

      fichas_validas: `Para colocar una ficha, uno de sus números debe coincidir con alguno de los extremos libres del tablero.`,

      capicua: `¡La capicúa es especial! Si cierras la partida y ambos extremos del tablero muestran el mismo número → ¡Bonus de ${30} puntos para tu equipo! ¡El dominó más valioso!`,

      tranque: `El tranque ocurre cuando ningún jugador puede mover. Gana el equipo con menos puntos sumados en sus fichas restantes.`,

      puntos: `Al final de cada ronda, se suman las fichas que le quedan al equipo perdedor. El primer equipo en llegar a 200 puntos gana el partido.`,

      pase: `Solo puedes pasar tu turno si NO tienes ninguna ficha que encaje en los extremos del tablero. ¡Ojo con eso!`,

      dobles: `Los dobles (0-0, 1-1, etc.) son fichas especiales: colocarlas puede darte ventaja, pero también te deja en riesgo si nadie más tiene ese número.`
    };

    return {
      contexto,
      explicacion: reglas[contexto] || 'Pregunta específica no disponible. ¡Pero Don Fello siempre está aquí!',
      narrador: this.nombreArbitro
    };
  }

  /**
   * Dar consejo estratégico (modo aprendizaje)
   */
  darConsejo(estado, jugadorId, jugadasValidas) {
    const consejos = [];

    if (jugadasValidas.length === 0) {
      return {
        consejo: '¡No tienes jugadas! Solo te queda pasar el turno.',
        tipo: 'obligatorio'
      };
    }

    // Detectar si hay dobles peligrosos en mano
    const mano = estado.manos[`jugador${jugadorId}`];
    const dobles = mano.filter(f => f.esDoble);
    if (dobles.length >= 3) {
      consejos.push('¡Cuidado! Tienes muchos dobles en mano. Busca deshacerte de ellos antes de que se tranche.');
    }

    // Detectar si podemos hacer capicúa
    if (estado.extremoIzquierdo === estado.extremoDerecho) {
      const capicuasFichas = jugadasValidas.filter(j =>
        mano.length === 1 // Es la última ficha
      );
      if (capicuasFichas.length > 0) {
        consejos.push('¡Oportunidad de CAPICÚA! Si colocas la ficha correcta puedes ganar 30 puntos extra.');
      }
    }

    // Detectar fichas de alto valor que conviene jugar
    const fichasAltoValor = mano.filter(f => f.puntos >= 10);
    if (fichasAltoValor.length > 0 && mano.length <= 3) {
      consejos.push('¡Tengo fichas pesadas! Intenta jugarlas antes de que cierren la partida.');
    }

    return {
      consejo: consejos.length > 0 ? consejos.join(' ') : '¡Buen juego! Mantén el control de la mesa.',
      tipo: 'estrategia',
      narrador: this.nombreArbitro
    };
  }

  /**
   * Verificar estado del juego y emitir alertas
   */
  verificarAlertas(estado) {
    const alertas = [];

    // Alerta de tranque inminente
    const totalPasadas = Object.values(estado.pasadas).reduce((a, b) => a + b, 0);
    if (totalPasadas >= 2) {
      alertas.push({
        tipo: 'tranque_inminente',
        mensaje: '¡Cuidado! El juego está cerca del tranque. Varios jugadores sin jugadas.',
        urgencia: 'alta'
      });
    }

    // Alerta de capicúa posible
    if (estado.extremoIzquierdo === estado.extremoDerecho && estado.mesa.length > 2) {
      alertas.push({
        tipo: 'capicua_posible',
        mensaje: `¡Los extremos son iguales (${estado.extremoIzquierdo})! ¡Posible capicúa si alguien cierra!`,
        urgencia: 'media'
      });
    }

    // Jugador con pocas fichas
    for (let i = 0; i < 4; i++) {
      const fichas = estado.manos[`jugador${i}`]?.length;
      if (fichas === 1) {
        alertas.push({
          tipo: 'jugador_casi_gana',
          mensaje: `¡El Jugador ${i + 1} solo le queda UNA ficha! ¡Estén atentos!`,
          jugadorId: i,
          urgencia: 'alta'
        });
      }
    }

    return alertas;
  }
}

module.exports = Arbitro;
