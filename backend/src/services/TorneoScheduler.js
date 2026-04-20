/**
 * Domino Real RD — Scheduler de Torneos Automáticos
 * Crea torneos semanales, notifica participantes, genera brackets
 */

const { Torneos, Notificaciones, Jugadores } = require('../models/Database');
const push = require('./NotificacionesPush');

class TorneoScheduler {
  constructor() {
    this.intervalos = [];
  }

  iniciar() {
    // Verificar torneos cada hora
    const intervalo = setInterval(() => this.verificarTorneos(), 60 * 60 * 1000);
    this.intervalos.push(intervalo);

    // Crear torneo semanal cada lunes a las 12:00
    const intervaloSemanal = setInterval(() => {
      const ahora = new Date();
      if (ahora.getDay() === 1 && ahora.getHours() === 12) {
        this.crearTorneoSemanal();
      }
    }, 60 * 60 * 1000);
    this.intervalos.push(intervaloSemanal);

    console.log('[TorneoScheduler] Iniciado — verificando torneos cada hora');
  }

  detener() {
    this.intervalos.forEach(clearInterval);
    this.intervalos = [];
  }

  async verificarTorneos() {
    try {
      const torneosActivos = await Torneos.listar('inscripcion');

      for (const torneo of torneosActivos) {
        const ahora = new Date();
        const inicio = new Date(torneo.fecha_inicio);
        const minRestantes = Math.floor((inicio - ahora) / 60000);

        if (minRestantes <= 30 && minRestantes > 0) {
          await this.notificarInicioProximo(torneo, minRestantes);
        }

        if (minRestantes <= 0) {
          await this.iniciarTorneo(torneo);
        }
      }
    } catch (err) {
      console.error('[TorneoScheduler] Error verificando:', err.message);
    }
  }

  async crearTorneoSemanal() {
    const semana = Math.ceil(new Date().getDate() / 7);
    const mes = new Date().toLocaleString('es', { month: 'long' });

    const torneo = {
      nombre: `🏆 Copa Dominó Real RD — ${mes} Semana ${semana}`,
      tipo: 'eliminacion_directa',
      esGratuito: true,
      inscripcion: 0,
      maxParticipantes: 64,
      minELO: 0,
      fechaInicio: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // en 2 días
      fechaFin: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      premios: {
        primero: { monedas: 5000, skin: 'mesa_oro' },
        segundo: { monedas: 2000 },
        tercero: { monedas: 1000 }
      },
      trofeoNombre: '🥇 Campeón Semanal'
    };

    try {
      const creado = await Torneos.crear(torneo);
      console.log(`[TorneoScheduler] Torneo semanal creado: ${creado.nombre}`);
    } catch (err) {
      console.error('[TorneoScheduler] Error creando torneo:', err.message);
    }
  }

  async notificarInicioProximo(torneo, minutos) {
    console.log(`[TorneoScheduler] Notificando inicio de "${torneo.nombre}" en ${minutos} min`);
    // En producción: obtener tokens FCM de todos los inscritos y enviar push
  }

  async iniciarTorneo(torneo) {
    console.log(`[TorneoScheduler] Iniciando torneo: ${torneo.nombre}`);

    // Generar bracket
    const bracket = this.generarBracket(torneo.max_participantes);

    // Actualizar estado
    // await db.query("UPDATE torneos SET estado='en_curso', bracket=$1 WHERE id=$2", [bracket, torneo.id]);
    console.log(`[TorneoScheduler] Bracket generado para ${torneo.nombre}`);
  }

  /**
   * Genera un bracket de eliminación directa
   */
  generarBracket(maxParticipantes) {
    const rondas = Math.log2(maxParticipantes);
    const bracket = [];

    for (let r = 0; r < rondas; r++) {
      const partidas = maxParticipantes / Math.pow(2, r + 1);
      const nombreRonda = r === rondas - 1 ? 'FINAL'
        : r === rondas - 2 ? 'Semifinal'
        : r === rondas - 3 ? 'Cuartos de Final'
        : `Ronda ${r + 1}`;

      bracket.push({
        numero: r + 1,
        nombre: nombreRonda,
        partidas: Array.from({ length: partidas }, (_, i) => ({
          id: `r${r + 1}_p${i + 1}`,
          equipo1: null,
          equipo2: null,
          ganador: null,
          estado: 'pendiente'
        }))
      });
    }

    return bracket;
  }
}

module.exports = new TorneoScheduler();
