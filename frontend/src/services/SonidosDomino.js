/**
 * Domino Real RD — Motor de Sonidos
 * Sonidos reales de dominó usando Web Audio API
 * No requiere archivos externos para los efectos básicos
 */

class SonidosDomino {
  constructor() {
    this.ctx = null;
    this.habilitado = true;
    this.volumen = 0.7;
    this.inicializado = false;
  }

  /**
   * Inicializar contexto de audio (requiere interacción del usuario)
   */
  inicializar() {
    if (this.inicializado) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.inicializado = true;
      console.log('[Audio] Motor de sonidos iniciado');
    } catch (err) {
      console.warn('[Audio] No disponible:', err.message);
      this.habilitado = false;
    }
  }

  /**
   * Crear un oscilador con forma y frecuencia
   */
  _crearTono(frecuencia, duracion, tipo = 'sine', volumen = this.volumen) {
    if (!this.habilitado || !this.ctx) return;

    const oscilador = this.ctx.createOscillator();
    const ganancia = this.ctx.createGain();

    oscilador.connect(ganancia);
    ganancia.connect(this.ctx.destination);

    oscilador.type = tipo;
    oscilador.frequency.setValueAtTime(frecuencia, this.ctx.currentTime);

    ganancia.gain.setValueAtTime(0, this.ctx.currentTime);
    ganancia.gain.linearRampToValueAtTime(volumen * 0.3, this.ctx.currentTime + 0.01);
    ganancia.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duracion);

    oscilador.start(this.ctx.currentTime);
    oscilador.stop(this.ctx.currentTime + duracion);
  }

  /**
   * Crear ruido blanco (para golpe de ficha en mesa)
   */
  _ruido(duracion, volumen = 0.3) {
    if (!this.habilitado || !this.ctx) return;

    const bufferSize = this.ctx.sampleRate * duracion;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filtro = this.ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = 800;
    filtro.Q.value = 0.5;

    const ganancia = this.ctx.createGain();
    ganancia.gain.setValueAtTime(volumen, this.ctx.currentTime);
    ganancia.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duracion);

    source.connect(filtro);
    filtro.connect(ganancia);
    ganancia.connect(this.ctx.destination);
    source.start();
  }

  // ── SONIDOS DEL JUEGO ──────────────────────────────────────

  /**
   * Golpe de ficha al colocarla en la mesa
   * Sonido: clack de madera/marfil
   */
  fichaColocada() {
    if (!this.habilitado) return;
    this._ruido(0.08, 0.4);
    this._crearTono(400, 0.06, 'square', 0.15);
  }

  /**
   * Seleccionar una ficha de la mano
   */
  fichaSeleccionada() {
    this._crearTono(600, 0.1, 'sine', 0.2);
  }

  /**
   * Error: ficha inválida
   */
  fichaInvalida() {
    this._crearTono(180, 0.3, 'sawtooth', 0.25);
    setTimeout(() => this._crearTono(150, 0.2, 'sawtooth', 0.2), 200);
  }

  /**
   * Tu turno — alerta suave
   */
  tuTurno() {
    this._crearTono(700, 0.15, 'sine', 0.3);
    setTimeout(() => this._crearTono(900, 0.15, 'sine', 0.3), 200);
  }

  /**
   * ¡CAPICÚA! — fanfarria dramática
   */
  capicua() {
    const notas = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notas.forEach((nota, i) => {
      setTimeout(() => this._crearTono(nota, 0.3, 'sine', 0.5), i * 120);
    });
    // Redoble final
    setTimeout(() => {
      this._ruido(0.5, 0.6);
      this._crearTono(1047, 0.6, 'sine', 0.4);
    }, 500);
  }

  /**
   * ¡DOMINÓ! — victoria de ronda
   */
  domino() {
    const notas = [523, 659, 784, 659, 784, 1047];
    notas.forEach((nota, i) => {
      setTimeout(() => this._crearTono(nota, 0.25, 'triangle', 0.45), i * 100);
    });
    setTimeout(() => this._ruido(0.4, 0.5), 600);
  }

  /**
   * Tranque — sonido tenso
   */
  tranque() {
    this._crearTono(220, 0.8, 'sawtooth', 0.3);
    setTimeout(() => this._crearTono(196, 0.6, 'sawtooth', 0.25), 300);
  }

  /**
   * Ganar el match completo — fanfarria épica
   */
  victoriaMatch() {
    const notas = [523, 659, 784, 880, 1047, 880, 784, 659, 1047, 1047];
    notas.forEach((nota, i) => {
      setTimeout(() => this._crearTono(nota, 0.35, 'sine', 0.5), i * 130);
    });
    setTimeout(() => {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => this._ruido(0.15, 0.6), i * 200);
      }
    }, 1300);
  }

  /**
   * Derrota — sonido triste
   */
  derrota() {
    const notas = [392, 349, 330, 294];
    notas.forEach((nota, i) => {
      setTimeout(() => this._crearTono(nota, 0.4, 'triangle', 0.3), i * 200);
    });
  }

  /**
   * Notificación de chat
   */
  mensajeChat() {
    this._crearTono(880, 0.08, 'sine', 0.2);
    setTimeout(() => this._crearTono(1100, 0.08, 'sine', 0.15), 100);
  }

  /**
   * Reacción de emoji
   */
  reaccion() {
    this._crearTono(1200, 0.12, 'sine', 0.25);
  }

  /**
   * Subida de liga
   */
  subidaLiga() {
    const notas = [523, 659, 784, 1047];
    notas.forEach((nota, i) => {
      setTimeout(() => this._crearTono(nota, 0.2, 'triangle', 0.4), i * 80);
    });
  }

  /**
   * Sonido de monedas ganadas
   */
  monedasGanadas() {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this._crearTono(1200 + i * 100, 0.1, 'sine', 0.2);
        this._ruido(0.05, 0.15);
      }, i * 60);
    }
  }

  /**
   * Click de botón
   */
  click() {
    this._crearTono(800, 0.04, 'square', 0.1);
  }

  /**
   * Barajando fichas al inicio
   */
  barajando() {
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        this._ruido(0.06, 0.3);
      }, i * 80);
    }
  }

  // ── CONTROL ────────────────────────────────────────────────

  setVolumen(vol) {
    this.volumen = Math.max(0, Math.min(1, vol));
  }

  toggle() {
    this.habilitado = !this.habilitado;
    return this.habilitado;
  }

  silenciar() {
    this.habilitado = false;
  }

  activar() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
    this.habilitado = true;
    this.inicializar();
  }
}

// Singleton global
const sonidos = new SonidosDomino();

export default sonidos;
export { SonidosDomino };
