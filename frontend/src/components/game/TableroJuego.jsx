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

  const width = enMesa ? 40 : 60;
  const height = enMesa ? 80 : 120;

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
    backgroundColor: '#F9F6EE',
    backgroundImage: 'linear-gradient(135deg, #FFFAF0 0%, #F3E5AB 100%)',
    borderRadius: 8,
    display: 'flex',
    flexDirection: esVertical ? 'column' : 'row',
    cursor: onClick ? 'pointer' : 'default',
    transform: seleccionada ? 'translateY(-12px) scale(1.05)' : (ficha.x !== undefined ? `translate(-50%, -50%) rotate(${ficha.rotation}deg)` : 'none'),
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
    boxShadow: seleccionada
      ? `0 15px 25px rgba(0,0,0,0.4), inset -2px -4px 6px rgba(0,0,0,0.1), inset 2px 4px 6px rgba(255,255,255,0.7), 0 0 0 3px ${COLORES.oro}`
      : `0 6px 10px rgba(0,0,0,0.3), inset -2px -4px 5px rgba(0,0,0,0.15), inset 2px 4px 5px rgba(255,255,255,0.8)`,
    userSelect: 'none',
    position: ficha.x !== undefined ? 'absolute' : 'relative',
    left: ficha.x !== undefined ? `calc(50% + ${ficha.x}px)` : 'auto',
    top: ficha.y !== undefined ? `calc(50% + ${ficha.y}px)` : 'auto',
    overflow: 'hidden',
    border: '1px solid #D4C4A8',
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
    width: esVertical ? '85%' : '3px',
    height: esVertical ? '3px' : '85%',
    backgroundColor: '#1A1A1A',
    alignSelf: 'center',
    boxShadow: 'inset 0px 1px 2px rgba(255,255,255,0.3), 0px 1px 1px rgba(0,0,0,0.5)',
    borderRadius: 2
  };

  const renderPuntos = (numero) => {
    return puntos(numero).map(([x, y], i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          width: enMesa ? 7 : 11,
          height: enMesa ? 7 : 11,
          borderRadius: '50%',
          backgroundColor: '#111',
          left: `${x}%`,
          top: `${y}%`,
          transform: 'translate(-50%, -50%)',
          boxShadow: 'inset 1px 2px 3px rgba(0,0,0,0.8), 0.5px 1px 1px rgba(255,255,255,0.8)'
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
    gap: 16,
    padding: '8px 16px',
    backgroundColor: COLORES.negro,
    borderRadius: 12,
    border: `1px solid ${COLORES.azulRD}40`
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: COLORES.azulRD, fontSize: 12, fontWeight: 'bold' }}>⚡ EQUIPO AZUL</div>
      <div style={{ color: COLORES.blanco, fontSize: 28, fontWeight: 'bold' }}>
        {puntosTotales?.equipo0 || 0}
      </div>
      <div style={{ color: COLORES.blanco + '80', fontSize: 10 }}>/ 200</div>
    </div>

    <div style={{ textAlign: 'center', padding: '0 8px' }}>
      <div style={{ color: COLORES.oro, fontSize: 11, marginBottom: 4 }}>Ronda {ronda || 1}</div>
      <div style={{ color: COLORES.blanco + '60', fontSize: 18 }}>VS</div>
    </div>

    <div style={{ textAlign: 'center' }}>
      <div style={{ color: COLORES.rojoRD, fontSize: 12, fontWeight: 'bold' }}>🔥 EQUIPO ROJO</div>
      <div style={{ color: COLORES.blanco, fontSize: 28, fontWeight: 'bold' }}>
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
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12
  }}>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
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

  // 1. Algoritmo de Layout 2D (Snake)
  const fichasMesa = useMemo(() => {
    if (!estado || !estado.mesa || estado.mesa.length === 0) return [];

    const W = 40; 
    const H = 80; 
    const SPACE = 4;

    const result = [];
    let tipRight = { x: 0, y: 0, dir: 'R', num: null };
    let tipLeft = { x: 0, y: 0, dir: 'L', num: null };

    // Limites de la pantalla (aprox) para empezar a doblar la culebra
    const BOUND_RIGHT = 220; 
    const BOUND_CENTER_RIGHT = 60;
    const BOUND_LEFT = -220;
    const BOUND_CENTER_LEFT = -60;

    estado.mesa.forEach((ficha, index) => {
      let x, y, rot;
      
      if (index === 0) {
        x = 0; y = 0;
        if (ficha.esDoble) {
          rot = 0;
          tipRight = { x: W/2 + SPACE, y: 0, dir: 'R', num: ficha.derecha };
          tipLeft = { x: -W/2 - SPACE, y: 0, dir: 'L', num: ficha.izquierda };
        } else {
          rot = -90;
          tipRight = { x: H/2 + SPACE, y: 0, dir: 'R', num: ficha.derecha };
          tipLeft = { x: -H/2 - SPACE, y: 0, dir: 'L', num: ficha.izquierda };
        }
        result.push({ ...ficha, x, y, rotation: rot });
        return;
      }

      const isRight = ficha.posicion === 'derecha';
      let tip = isRight ? tipRight : tipLeft;
      let { x: tx, y: ty, dir, num } = tip;

      // Lógica de Giro (Snake)
      if (isRight) {
        if (dir === 'R' && tx > BOUND_RIGHT) dir = 'D';
        else if (dir === 'L' && tx < BOUND_CENTER_RIGHT) dir = 'D';
      } else {
        if (dir === 'L' && tx < BOUND_LEFT) dir = 'U';
        else if (dir === 'R' && tx > BOUND_CENTER_LEFT) dir = 'U';
      }
      
      const matchIzquierda = ficha.izquierda === num;
      let wHalf = W/2;
      let hHalf = H/2;
      
      if (ficha.esDoble) {
        if (dir === 'R') {
          rot = 0; x = tx + wHalf; y = ty;
          tip.x = x + wHalf + SPACE; tip.y = y;
        } else if (dir === 'L') {
          rot = 0; x = tx - wHalf; y = ty;
          tip.x = x - wHalf - SPACE; tip.y = y;
        } else if (dir === 'D') {
          rot = 90; x = tx; y = ty + wHalf;
          tip.x = x; tip.y = y + wHalf + SPACE;
          dir = (tip.dir === 'R') ? 'L' : 'R';
        } else if (dir === 'U') {
          rot = 90; x = tx; y = ty - wHalf;
          tip.x = x; tip.y = y - wHalf - SPACE;
          dir = (tip.dir === 'L') ? 'R' : 'L';
        }
      } else {
        if (dir === 'R') {
          rot = matchIzquierda ? -90 : 90;
          x = tx + hHalf; y = ty;
          tip.x = x + hHalf + SPACE; tip.y = y;
        } else if (dir === 'L') {
          rot = matchIzquierda ? 90 : -90;
          x = tx - hHalf; y = ty;
          tip.x = x - hHalf - SPACE; tip.y = y;
        } else if (dir === 'D') {
          rot = matchIzquierda ? 0 : 180;
          x = tx; y = ty + hHalf;
          tip.x = x; tip.y = y + hHalf + SPACE;
          dir = (tip.dir === 'R') ? 'L' : 'R';
        } else if (dir === 'U') {
          rot = matchIzquierda ? 180 : 0;
          x = tx; y = ty - hHalf;
          tip.x = x; tip.y = y - hHalf - SPACE;
          dir = (tip.dir === 'L') ? 'R' : 'L';
        }
      }
      
      tip.dir = dir;
      tip.num = matchIzquierda ? ficha.derecha : ficha.izquierda;

      if (isRight) tipRight = tip;
      else tipLeft = tip;

      result.push({ ...ficha, x, y, rotation: rot });
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
        padding: '8px 16px',
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
        {fichaSeleccionada && esMiTurno && estado.mesa?.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 16
          }}>
            <button
              onClick={() => handleColocarFicha('izquierda')}
              style={{
                padding: '10px 20px', backgroundColor: COLORES.azulRD,
                color: COLORES.blanco, border: 'none', borderRadius: 20,
                fontSize: 14, fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              ← Izquierda ({estado.extremoIzquierdo})
            </button>
            <button
              onClick={() => handleColocarFicha('derecha')}
              style={{
                padding: '10px 20px', backgroundColor: COLORES.rojoRD,
                color: COLORES.blanco, border: 'none', borderRadius: 20,
                fontSize: 14, fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              Derecha ({estado.extremoDerecho}) →
            </button>
          </div>
        )}

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
        padding: '8px 16px',
        borderTop: `1px solid ${COLORES.azulRD}40`,
        maxHeight: 100,
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 2, marginBottom: 8 }}>
          {chat.slice(-3).reverse().map((msg, i) => (
            <div key={i} style={{ color: COLORES.blanco + 'CC', fontSize: 12 }}>
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
            borderRadius: 8,
            padding: '6px 12px',
            color: COLORES.blanco,
            fontSize: 13,
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
