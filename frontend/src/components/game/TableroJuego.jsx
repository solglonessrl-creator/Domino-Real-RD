/**
 * Domino Real RD - Tablero de Juego Principal
 * Componente React Native / React Web
 *
 * Muestra: mesa, fichas, mano del jugador, scoreboard, árbitro
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import sonidos from '../../services/SonidosDomino';

// Colores de la bandera dominicana
const COLORES = {
  azulRD: '#002D62',
  rojoRD: '#CF142B',
  blanco: '#FFFFFF',
  oro: '#FFD700',
  verdeMesa: '#1B5E20',
  verdeClaro: '#2E7D32',
  negro: '#1A1A1A',
  grisOscuro: '#2C2C2C',
  fichaMarfil: '#FFF8E7',
  fichaMarfilOscuro: '#E8DCC8',
  sombra: 'rgba(0,0,0,0.4)'
};

/**
 * Componente de una ficha individual del dominó
 */
const Ficha = ({ ficha, seleccionada, onClick, enMesa = false }) => {
  if (!ficha) return null;

  const { izquierda, derecha, esDoble } = ficha;

  // En la mano siempre verticales, en mesa podemos usar flex-wrap
  const esVertical = true; 

  const width = enMesa ? 40 : 56;
  const height = enMesa ? 80 : 112;

  const puntos = (numero) => {
    const patrones = {
      0: [],
      1: [[50, 50]],
      2: [[25, 25], [75, 75]],
      3: [[25, 25], [50, 50], [75, 75]],
      4: [[25, 25], [75, 25], [25, 75], [75, 75]],
      5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
      6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]]
    };
    return patrones[numero] || [];
  };

  const estiloFicha = {
    width: width,
    height: height,
    backgroundColor: '#FFFFFF',
    backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #F8F8F8 100%)',
    borderRadius: 6,
    display: 'flex',
    flexDirection: esVertical ? 'column' : 'row',
    cursor: onClick ? 'pointer' : 'default',
    transform: seleccionada ? 'translateY(-12px) scale(1.05)' : (ficha.x !== undefined ? `translate(-50%, -50%) rotate(${ficha.rotation}deg)` : 'none'),
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
    boxShadow: seleccionada
      ? `0 20px 30px rgba(0,0,0,0.5), inset -1px -2px 4px rgba(0,0,0,0.1), inset 1px 2px 4px rgba(255,255,255,1), 0 0 0 3px ${COLORES.oro}`
      : (enMesa 
          ? `0 4px 6px rgba(0,0,0,0.25), inset -1px -2px 2px rgba(0,0,0,0.05), inset 1px 2px 2px rgba(255,255,255,1)`
          : `0 8px 12px rgba(0,0,0,0.3), inset -1px -2px 3px rgba(0,0,0,0.05), inset 1px 2px 3px rgba(255,255,255,1)`),
    userSelect: 'none',
    position: ficha.x !== undefined ? 'absolute' : 'relative',
    left: ficha.x !== undefined ? `calc(50% + ${ficha.x}px)` : 'auto',
    top: ficha.y !== undefined ? `calc(50% + ${ficha.y}px)` : 'auto',
    overflow: 'hidden',
    border: '1px solid #D0D0D0',
    zIndex: ficha.x !== undefined ? ficha.timestamp || 1 : 1
  };

  const mitadEstilo = {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const divisorEstilo = {
    width: esVertical ? '90%' : '1px',
    height: esVertical ? '1px' : '90%',
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    boxShadow: 'none',
    borderRadius: 0
  };

  const renderPuntos = (numero) => {
    return puntos(numero).map(([x, y], i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          width: enMesa ? 8 : 11,
          height: enMesa ? 8 : 11,
          borderRadius: '50%',
          backgroundColor: '#0F0F0F',
          left: `${x}%`,
          top: `${y}%`,
          transform: 'translate(-50%, -50%)',
          boxShadow: 'inset 1px 2px 2px rgba(0,0,0,0.6)'
        }}
      />
    ));
  };

  return (
    <div
      style={estiloFicha}
      onClick={() => onClick && onClick(ficha)}
      title={`Ficha ${izquierda}-${derecha}`}
    >
      <div style={mitadEstilo}>
        {renderPuntos(izquierda)}
      </div>
      <div style={divisorEstilo} />
      <div style={mitadEstilo}>
        {renderPuntos(derecha)}
      </div>
    </div>
  );
};

/**
 * Panel del marcador / scoreboard
 */
const Scoreboard = ({ equipos, puntosTotales, ronda }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 16px',
    backgroundColor: COLORES.negro,
    borderBottom: `2px solid ${COLORES.oro}`
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: COLORES.azulRD, fontSize: 12, fontWeight: 'bold' }}>🛡️ EQUIPO AZUL</div>
      <div style={{ color: COLORES.blanco, fontSize: 24, fontWeight: 'bold' }}>
        {puntosTotales?.equipo0 || 0}
      </div>
      <div style={{ color: COLORES.blanco + '80', fontSize: 10 }}>/ 200</div>
    </div>

    <div style={{ textAlign: 'center' }}>
      <div style={{ color: COLORES.oro, fontSize: 11, marginBottom: 2 }}>Ronda {ronda || 1}</div>
      <div style={{ color: COLORES.blanco + '60', fontSize: 18 }}>VS</div>
    </div>

    <div style={{ textAlign: 'center' }}>
      <div style={{ color: COLORES.rojoRD, fontSize: 12, fontWeight: 'bold' }}>🔥 EQUIPO ROJO</div>
      <div style={{ color: COLORES.blanco, fontSize: 24, fontWeight: 'bold' }}>
        {puntosTotales?.equipo1 || 0}
      </div>
      <div style={{ color: COLORES.blanco + '80', fontSize: 10 }}>/ 200</div>
    </div>
  </div>
);

/**
 * Indicador de turno
 */
const IndicadorTurno = ({ turno, jugadorActual, nombreJugadores }) => {
  const esTuTurno = turno === jugadorActual;

  return (
    <div style={{
      padding: '8px 20px',
      borderRadius: 20,
      backgroundColor: esTuTurno ? COLORES.oro : COLORES.grisOscuro,
      color: esTuTurno ? COLORES.negro : COLORES.blanco,
      fontSize: 14,
      fontWeight: 'bold',
      textAlign: 'center',
      animation: esTuTurno ? 'pulse 1.5s infinite' : 'none'
    }}>
      {esTuTurno ? '⚡ ¡TU TURNO!' : `⏳ Turno de ${nombreJugadores?.[turno] || `Jugador ${turno + 1}`}`}
    </div>
  );
};

/**
 * Narración del árbitro
 */
const NarracionArbitro = ({ narracion, alertas }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (narracion) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [narracion]);

  if (!visible || !narracion) return null;

  const esImportante = ['capicua', 'domino', 'tranque'].includes(narracion.tipo);

  return (
    <div style={{
      position: 'fixed',
      top: '15%',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      backgroundColor: esImportante ? COLORES.oro : COLORES.grisOscuro,
      color: esImportante ? COLORES.negro : COLORES.blanco,
      padding: '12px 24px',
      borderRadius: 16,
      maxWidth: 320,
      textAlign: 'center',
      fontSize: esImportante ? 18 : 14,
      fontWeight: esImportante ? 'bold' : 'normal',
      boxShadow: `0 8px 32px ${COLORES.sombra}`,
      animation: 'slideDown 0.3s ease'
    }}>
      <span style={{ marginRight: 8 }}>🎙️</span>
      {narracion.texto}
    </div>
  );
};

/**
 * Panel de mano del jugador
 */
const ManoJugador = ({ fichas, fichaSeleccionada, onSeleccionar, puedePasar, onPasar, onPedirConsejo }) => (
  <div style={{
    backgroundColor: COLORES.negro,
    borderTop: `3px solid ${COLORES.azulRD}`,
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    boxShadow: `0 -4px 12px ${COLORES.sombra}`
  }}>
    {fichaSeleccionada && (
      <div style={{ color: COLORES.oro, fontSize: 13, fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}>
        👇 Confirma la jugada en la mesa 👇
      </div>
    )}
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
      {fichas?.map(ficha => (
        <Ficha
          key={ficha.id}
          ficha={ficha}
          seleccionada={fichaSeleccionada?.id === ficha.id}
          onClick={onSeleccionar}
        />
      ))}
    </div>

    <div style={{ display: 'flex', gap: 12 }}>
      {puedePasar && (
        <button
          onClick={onPasar}
          style={{
            padding: '10px 24px',
            backgroundColor: COLORES.rojoRD,
            color: COLORES.blanco,
            border: 'none',
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          ⏭️ Pasar
        </button>
      )}

      <button
        onClick={onPedirConsejo}
        style={{
          padding: '10px 24px',
          backgroundColor: COLORES.azulRD,
          color: COLORES.blanco,
          border: 'none',
          borderRadius: 20,
          fontSize: 14,
          cursor: 'pointer'
        }}
      >
        💡 Consejo
      </button>
    </div>
  </div>
);

/**
 * Tablero principal del juego
 */
const TableroJuego = ({ socket, roomId, jugadorId, jugadores }) => {
  const [estado, setEstado] = useState(null);
  const [manoPrivada, setManoPrivada] = useState([]);
  const [fichaSeleccionada, setFichaSeleccionada] = useState(null);
  const [narracion, setNarracion] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [chat, setChat] = useState([]);
  const [consejo, setConsejo] = useState(null);
  const [puntosTotales, setPuntosTotales] = useState({ equipo0: 0, equipo1: 0 });
  const [resultadoFinal, setResultadoFinal] = useState(null);

  const mensajeRef = useRef('');

  // 1. Algoritmo de Layout 2D Matemático de Cuadrícula (Grid)
  const fichasMesa = useMemo(() => {
    if (!estado || !estado.mesa || estado.mesa.length === 0) return [];

    const result = [];
    const UNIT = 40; // 1 unidad de grilla = 40px (medio dominó)
    
    let curR = { x: 0, y: 0, dx: 1, dy: 0, num: null };
    let curL = { x: 0, y: 0, dx: -1, dy: 0, num: null };

    // Límites para hacer la curva S de forma segura (en unidades)
    const MAX_X = 6.5;
    const MIN_X = -6.5;

    estado.mesa.forEach((ficha, index) => {
      if (index === 0) {
        if (ficha.esDoble) {
          result.push({ ...ficha, x: 0, y: 0, rotation: 0 });
          curR = { x: 0, y: 0, dx: 1, dy: 0, num: ficha.derecha };
          curL = { x: 0, y: 0, dx: -1, dy: 0, num: ficha.izquierda };
        } else {
          result.push({ ...ficha, x: 0, y: 0, rotation: -90 });
          curR = { x: 0.5, y: 0, dx: 1, dy: 0, num: ficha.derecha };
          curL = { x: -0.5, y: 0, dx: -1, dy: 0, num: ficha.izquierda };
        }
        return;
      }

      const isRight = ficha.posicion === 'derecha';
      let cur = isRight ? curR : curL;

      // Planificar giros de la serpiente
      if (!ficha.esDoble) {
        if (cur.dx === 1 && cur.x >= MAX_X) {
           cur.dx = 0; cur.dy = 1;
        } else if (cur.dx === -1 && cur.x <= MIN_X) {
           cur.dx = 0; cur.dy = 1;
        } else if (cur.dy === 1) { 
           cur.dx = isRight ? -1 : 1; 
           cur.dy = 0;
        }
      }

      const matchIzquierda = ficha.izquierda === cur.num;
      let rot, fx, fy;

      if (ficha.esDoble) {
         // Ocupa una celda en la grilla y se pone transversal
         cur.x += cur.dx; cur.y += cur.dy;
         fx = cur.x; fy = cur.y;
         rot = (cur.dx !== 0) ? 0 : 90;
      } else {
         // Ficha normal: ocupa dos celdas a lo largo
         const p1x = cur.x + cur.dx; const p1y = cur.y + cur.dy;
         const p2x = cur.x + cur.dx*2; const p2y = cur.y + cur.dy*2;
         fx = (p1x + p2x) / 2;
         fy = (p1y + p2y) / 2;
         cur.x = p2x; cur.y = p2y; 

         if (cur.dx === 1) rot = matchIzquierda ? -90 : 90;
         else if (cur.dx === -1) rot = matchIzquierda ? 90 : -90;
         else if (cur.dy === 1) rot = matchIzquierda ? 0 : 180;
         else rot = 0;
      }

      cur.num = matchIzquierda ? ficha.derecha : ficha.izquierda;

      if (isRight) curR = cur; else curL = cur;

      result.push({ ...ficha, x: fx * UNIT, y: fy * UNIT, rotation: rot });
    });

    return result;
  }, [estado?.mesa]);

  // 2. Calcular escala dinámica para que todas las fichas quepan en pantalla
  const scale = useMemo(() => {
    if (fichasMesa.length === 0) return 1;
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    fichasMesa.forEach(f => {
      if (f.x < minX) minX = f.x;
      if (f.x > maxX) maxX = f.x;
      if (f.y < minY) minY = f.y;
      if (f.y > maxY) maxY = f.y;
    });
    // Añadir margen
    const width = maxX - minX + 160;
    const height = maxY - minY + 160;
    // Asumimos contenedor de 600x300 en desktop aprox
    const scaleX = Math.min(1, 600 / width);
    const scaleY = Math.min(1, 300 / height);
    return Math.min(scaleX, scaleY);
  }, [fichasMesa]);

  // Conectar a los eventos del socket
  useEffect(() => {
    if (!socket) return;

    socket.on('game_start', ({ estado: nuevoEstado }) => {
      sonidos.inicializar();
      sonidos.barajando();
      setEstado(nuevoEstado);
    });

    socket.on('game_state', ({ estado: nuevoEstado, narracion: nueva, alertas: nuevasAlertas, comentarioBot }) => {
      // Sonidos según tipo de jugada
      if (nueva?.tipo === 'capicua') sonidos.capicua();
      else if (nueva?.tipo === 'domino') sonidos.domino();
      else if (nueva?.tipo === 'tranque') sonidos.tranque();
      else if (nueva?.tipo !== 'paso') sonidos.fichaColocada();

      // Sonido de tu turno
      if (nuevoEstado?.turno === jugadorId && estado?.turno !== jugadorId) {
        setTimeout(() => sonidos.tuTurno(), 300);
      }

      setEstado(nuevoEstado);
      if (nueva) setNarracion(nueva);
      if (nuevasAlertas?.length) setAlertas(nuevasAlertas);
    });

    socket.on('mano_privada', ({ fichas }) => {
      setManoPrivada(fichas);
    });

    socket.on('round_over', ({ resultado, puntosTotales: pts, narracion: n }) => {
      setPuntosTotales(pts);
      if (n) setNarracion(n);
    });

    socket.on('game_over', ({ campeon, puntosTotales: pts, mensaje }) => {
      const esGanador = campeon === (jugadorId < 2 ? 'equipo0' : 'equipo1');
      setTimeout(() => esGanador ? sonidos.victoriaMatch() : sonidos.derrota(), 500);
      setResultadoFinal({ campeon, puntosTotales: pts, mensaje });
    });

    socket.on('chat', (mensaje) => {
      sonidos.mensajeChat();
      setChat(prev => [...prev.slice(-50), mensaje]);
    });

    socket.on('hint', (hint) => {
      setConsejo(hint);
      setTimeout(() => setConsejo(null), 6000);
    });

    return () => {
      socket.off('game_start');
      socket.off('game_state');
      socket.off('mano_privada');
      socket.off('round_over');
      socket.off('game_over');
      socket.off('chat');
      socket.off('hint');
    };
  }, [socket]);

  const handleSeleccionarFicha = useCallback((ficha) => {
    if (estado?.turno !== jugadorId) return;
    sonidos.fichaSeleccionada();
    setFichaSeleccionada(prev => prev?.id === ficha.id ? null : ficha);
  }, [estado, jugadorId]);

  const handleColocarFicha = useCallback((lado) => {
    if (!fichaSeleccionada || !socket) return;
    socket.emit('play_tile', { roomId, fichaId: fichaSeleccionada.id, lado });
    setFichaSeleccionada(null);
  }, [fichaSeleccionada, socket, roomId]);

  const handlePasar = useCallback(() => {
    socket?.emit('pass_turn', { roomId });
  }, [socket, roomId]);

  const handlePedirConsejo = useCallback(() => {
    socket?.emit('request_hint', { roomId });
  }, [socket, roomId]);

  const handleEnviarChat = useCallback((e) => {
    if (e.key === 'Enter' && mensajeRef.current.value.trim()) {
      socket?.emit('chat_message', { roomId, mensaje: mensajeRef.current.value });
      mensajeRef.current.value = '';
    }
  }, [socket, roomId]);

  const handleReaccion = useCallback((emoji) => {
    socket?.emit('send_reaction', { roomId, emoji });
  }, [socket, roomId]);

  if (!estado) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORES.negro,
        color: COLORES.blanco,
        fontSize: 20
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎲</div>
          <div>Conectando a la partida...</div>
          <div style={{ fontSize: 14, color: COLORES.blanco + '60', marginTop: 8 }}>
            Esperando jugadores...
          </div>
        </div>
      </div>
    );
  }

  if (resultadoFinal) {
    const esGanador = resultadoFinal.campeon === (jugadorId < 2 ? 'equipo0' : 'equipo1');
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: esGanador ? COLORES.azulRD : COLORES.rojoRD,
        flexDirection: 'column',
        gap: 24,
        padding: 32
      }}>
        <div style={{ fontSize: 80 }}>{esGanador ? '🏆' : '😤'}</div>
        <div style={{ color: COLORES.blanco, fontSize: 32, fontWeight: 'bold', textAlign: 'center' }}>
          {esGanador ? '¡GANASTE!' : '¡PERDISTE!'}
        </div>
        <div style={{ color: COLORES.blanco + 'CC', fontSize: 16, textAlign: 'center' }}>
          {resultadoFinal.mensaje}
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 24, fontWeight: 'bold' }}>
          <span style={{ color: COLORES.azulRD === COLORES.azulRD ? COLORES.blanco : COLORES.azulRD }}>
            Azul: {resultadoFinal.puntosTotales?.equipo0}
          </span>
          <span>-</span>
          <span style={{ color: COLORES.blanco }}>
            Rojo: {resultadoFinal.puntosTotales?.equipo1}
          </span>
        </div>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: '14px 32px',
            backgroundColor: COLORES.oro,
            color: COLORES.negro,
            border: 'none',
            borderRadius: 24,
            fontSize: 16,
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          🎲 Jugar de Nuevo
        </button>
      </div>
    );
  }

  const esMiTurno = estado.turno === jugadorId;

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: COLORES.negro,
      overflow: 'hidden',
      fontFamily: "'Segoe UI', sans-serif"
    }}>
      {/* Narración árbitro */}
      <NarracionArbitro narracion={narracion} alertas={alertas} />

      {/* Consejo del árbitro */}
      {consejo && (
        <div style={{
          position: 'fixed', bottom: 200, left: '50%',
          transform: 'translateX(-50%)', zIndex: 999,
          backgroundColor: COLORES.azulRD, color: COLORES.blanco,
          padding: '10px 20px', borderRadius: 12, maxWidth: 300,
          textAlign: 'center', fontSize: 13
        }}>
          💡 <strong>Don Fello:</strong> {consejo.consejo}
        </div>
      )}

      {/* Header: Scoreboard + Turno */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 16px',
        backgroundColor: COLORES.grisOscuro,
        borderBottom: `2px solid ${COLORES.azulRD}`
      }}>
        <Scoreboard
          equipos={estado.equipos}
          puntosTotales={puntosTotales}
          ronda={estado.ronda}
        />
        <IndicadorTurno
          turno={estado.turno}
          jugadorActual={jugadorId}
          nombreJugadores={jugadores?.reduce((acc, j) => ({ ...acc, [j.posicion]: j.nombre }), {})}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          {['👏', '😂', '😤', '🎉', '🔥'].map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReaccion(emoji)}
              style={{
                background: 'none', border: 'none', fontSize: 20,
                cursor: 'pointer', padding: 4
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Mesa de juego */}
      <div style={{
        flex: 1,
        backgroundColor: COLORES.verdeClaro,
        backgroundImage: 'radial-gradient(circle at 50% 50%, #2E7D32 0%, #1B5E20 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Fichas en la mesa */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          transform: `scale(${scale})`,
          transition: 'transform 0.5s ease',
          transformOrigin: 'center center'
        }}>
          {fichasMesa.map((ficha, idx) => (
            <Ficha key={ficha.id || idx} ficha={ficha} enMesa />
          ))}

          {fichasMesa.length === 0 && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              color: COLORES.blanco + '80',
              fontSize: 18,
              textAlign: 'center',
              fontWeight: 'bold'
            }}>
              🎲 Esperando primera ficha...
            </div>
          )}
        </div>

        {/* Indicadores de fichas por jugador */}
        <div style={{
          position: 'absolute', top: 8, left: 8,
          display: 'flex', flexDirection: 'column', gap: 4
        }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 8px',
              borderRadius: 8, fontSize: 12,
              border: estado.turno === i ? `1px solid ${COLORES.oro}` : 'none'
            }}>
              <span style={{ color: COLORES.blanco }}>
                {i === jugadorId ? '👤' : `J${i + 1}`}
              </span>
              <span style={{ color: COLORES.oro }}>
                🀱 × {estado.cantidadFichasPorJugador?.[i] || 0}
              </span>
              {estado.turno === i && <span style={{ color: COLORES.oro }}>⚡</span>}
            </div>
          ))}
        </div>

        {/* Extremos del tablero */}
        {estado.mesa?.length > 0 && (
          <div style={{
            position: 'absolute', bottom: 8, right: 8,
            backgroundColor: 'rgba(0,0,0,0.7)', padding: '6px 12px',
            borderRadius: 8, color: COLORES.blanco, fontSize: 13
          }}>
            {estado.extremoIzquierdo} ← Mesa → {estado.extremoDerecho}
          </div>
        )}

        {/* Selector de lado cuando hay ficha seleccionada */}
        {(() => {
          if (!fichaSeleccionada || !esMiTurno || estado.mesa?.length === 0) return null;
          
          const encajaIzq = fichaSeleccionada.izquierda === estado.extremoIzquierdo || fichaSeleccionada.derecha === estado.extremoIzquierdo;
          const encajaDer = fichaSeleccionada.izquierda === estado.extremoDerecho || fichaSeleccionada.derecha === estado.extremoDerecho;

          if (!encajaIzq && !encajaDer) {
            return (
              <div style={{
                position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
                backgroundColor: 'rgba(200,0,0,0.8)', padding: '12px 24px', borderRadius: '24px',
                color: 'white', fontWeight: 'bold', zIndex: 10
              }}>
                ❌ Esta ficha no encaja
              </div>
            );
          }

          return (
            <div style={{
              position: 'absolute',
              bottom: 40,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 12,
              backgroundColor: 'rgba(0,0,0,0.8)',
              padding: '12px',
              borderRadius: '24px',
              boxShadow: `0 4px 12px ${COLORES.sombra}`,
              zIndex: 10
            }}>
              {encajaIzq && (
                <button
                  onClick={() => handleColocarFicha('izquierda')}
                  style={{
                    padding: '12px 24px', backgroundColor: COLORES.azulRD,
                    color: COLORES.blanco, border: '2px solid white', borderRadius: 20,
                    fontSize: 15, fontWeight: 'bold', cursor: 'pointer',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                  }}
                >
                  ← Poner en ({estado.extremoIzquierdo})
                </button>
              )}
              {encajaDer && (
                <button
                  onClick={() => handleColocarFicha('derecha')}
                  style={{
                    padding: '12px 24px', backgroundColor: COLORES.rojoRD,
                    color: COLORES.blanco, border: '2px solid white', borderRadius: 20,
                    fontSize: 15, fontWeight: 'bold', cursor: 'pointer',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                  }}
                >
                  Poner en ({estado.extremoDerecho}) →
                </button>
              )}
            </div>
          );
        })()}

        {/* Primera jugada: solo botón de colocar */}
        {fichaSeleccionada && esMiTurno && estado.mesa?.length === 0 && (
          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)' }}>
            <button
              onClick={() => handleColocarFicha('centro')}
              style={{
                padding: '12px 32px', backgroundColor: COLORES.oro,
                color: COLORES.negro, border: 'none', borderRadius: 20,
                fontSize: 16, fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              🎲 ¡Abrir con {fichaSeleccionada.id}!
            </button>
          </div>
        )}
      </div>

      {/* Mano del jugador */}
      <ManoJugador
        fichas={manoPrivada}
        fichaSeleccionada={fichaSeleccionada}
        onSeleccionar={esMiTurno ? handleSeleccionarFicha : null}
        puedePasar={esMiTurno && manoPrivada?.length > 0}
        onPasar={handlePasar}
        onPedirConsejo={handlePedirConsejo}
      />

      {/* Chat */}
      <div style={{
        backgroundColor: COLORES.grisOscuro,
        padding: '6px 12px',
        borderTop: `1px solid ${COLORES.azulRD}40`,
        maxHeight: 80,
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 2, marginBottom: 4 }}>
          {chat.slice(-2).reverse().map((msg, i) => (
            <div key={i} style={{ color: COLORES.blanco + 'CC', fontSize: 11 }}>
              <span style={{ color: COLORES.oro, fontWeight: 'bold' }}>{msg.nombre}: </span>
              {msg.mensaje}
            </div>
          ))}
        </div>
        <input
          ref={mensajeRef}
          type="text"
          placeholder="Escribe un mensaje..."
          onKeyPress={handleEnviarChat}
          maxLength={200}
          style={{
            width: '100%',
            backgroundColor: COLORES.negro,
            border: `1px solid ${COLORES.azulRD}40`,
            borderRadius: 6,
            padding: '4px 8px',
            color: COLORES.blanco,
            fontSize: 12,
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes slideDown {
          from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default TableroJuego;
export { Ficha, Scoreboard, COLORES };
