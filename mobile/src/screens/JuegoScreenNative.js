/**
 * JuegoScreenNative.js — Dominó Real RD
 * ─────────────────────────────────────
 * Pantalla principal del juego. Muestra:
 *  • Tablero (mesa) con la cadena de fichas jugadas
 *  • Fichas privadas del jugador (solo él las ve)
 *  • Contadores de fichas de los oponentes (boca abajo)
 *  • Sistema anti-trampa (pausa automática si sale de la app)
 *  • Chat habilitado SOLO durante el barajado entre manos
 */

import React, {
  useState, useEffect, useRef, useCallback
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, TextInput, FlatList, AppState, Alert, Animated,
  Platform, StatusBar, Vibration, KeyboardAvoidingView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── COLORES ───────────────────────────────────────────────────
const C = {
  azul:      '#002D62',
  azulClaro: '#1565C0',
  rojo:      '#CF142B',
  blanco:    '#FFFFFF',
  oro:       '#FFD700',
  negro:     '#0A0A0A',
  oscuro:    '#1A1A2E',
  medio:     '#2C2C54',
  verde:     '#1B5E20',
  verdeClaro:'#4CAF50',
  naranja:   '#E65100',
};

// ── COMPONENTE: Ficha de Dominó ───────────────────────────────
// Muestra una ficha visualmente con sus puntos izq y derecha
function DominoFicha({
  izquierda, derecha, activa = false, valida = false,
  onPress, pequeña = false, boca_abajo = false
}) {
  const tam    = pequeña ? 38 : 52;
  const mitad  = tam / 2;
  const radio  = pequeña ? 4 : 6;

  if (boca_abajo) {
    return (
      <View style={[
        estilos.fichaContenedor,
        { width: tam, height: tam * 1.9, borderRadius: radio }
      ]}>
        <LinearGradient
          colors={['#1A237E', '#283593']}
          style={{ flex: 1, borderRadius: radio, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: pequeña ? 14 : 20 }}>🎲</Text>
        </LinearGradient>
      </View>
    );
  }

  const esDoble = izquierda === derecha;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!activa}
      activeOpacity={activa ? 0.7 : 1}
      style={[
        estilos.fichaContenedor,
        {
          width:        tam,
          height:       tam * 1.9,
          borderRadius: radio,
          borderWidth:  valida ? 2 : 1,
          borderColor:  valida ? C.verdeClaro : `${C.blanco}30`,
          shadowColor:  valida ? C.verdeClaro : 'transparent',
          shadowOpacity: valida ? 0.8 : 0,
          shadowRadius:  valida ? 8 : 0,
          elevation:     valida ? 6 : 1,
        }
      ]}
    >
      {/* Mitad superior */}
      <View style={[estilos.fichaMitad, { borderBottomWidth: 1.5, borderBottomColor: `${C.blanco}50` }]}>
        <Text style={[estilos.fichaPunto, pequeña && { fontSize: 14 }]}>{izquierda}</Text>
      </View>
      {/* Mitad inferior */}
      <View style={estilos.fichaMitad}>
        <Text style={[estilos.fichaPunto, pequeña && { fontSize: 14 }]}>{derecha}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── COMPONENTE: Ficha horizontal (para el tablero) ────────────
function FichaTablero({ izquierda, derecha, jugadorId }) {
  const colores = [C.azul, C.rojo, C.azulClaro, '#7B1FA2'];
  const color   = colores[jugadorId % 4] || C.medio;

  return (
    <View style={[estilos.fichaTablero, { borderColor: color }]}>
      <Text style={estilos.fichaTableroNum}>{izquierda}</Text>
      <View style={estilos.fichaTableroDivisor} />
      <Text style={estilos.fichaTableroNum}>{derecha}</Text>
    </View>
  );
}

// ── COMPONENTE: Jugador (boca abajo, muestra cantidad) ────────
function JugadorContrario({ nombre, cantidadFichas, equipo, posicion, esTurno }) {
  const colorEquipo = equipo === 0 ? C.azul : C.rojo;

  return (
    <View style={[estilos.jugadorContrario, posicion && estilos[`pos_${posicion}`]]}>
      <View style={[estilos.jugadorCirculo, { borderColor: colorEquipo, backgroundColor: esTurno ? colorEquipo : `${colorEquipo}40` }]}>
        <Text style={estilos.jugadorEmoji}>
          {posicion === 'arriba' ? '👤' : posicion === 'izquierda' ? '👤' : '👤'}
        </Text>
        {esTurno && <View style={estilos.turnoIndicador} />}
      </View>
      <Text style={estilos.jugadorNombre} numberOfLines={1}>{nombre || '—'}</Text>
      <View style={estilos.fichasBocaAbajo}>
        {Array.from({ length: Math.min(cantidadFichas || 0, 7) }).map((_, i) => (
          <View
            key={i}
            style={[estilos.fichaBocaAbajo, { marginLeft: i > 0 ? -8 : 0 }]}
          />
        ))}
        {(cantidadFichas || 0) === 0 && (
          <Text style={{ color: C.verdeClaro, fontSize: 10 }}>¡Dominó!</Text>
        )}
      </View>
    </View>
  );
}

// ── PANTALLA PRINCIPAL ────────────────────────────────────────
export default function JuegoScreenNative({ route, navigation }) {
  const { roomId, jugadores = [], modo = 'online', socket } = route.params || {};

  // ── SAFETY: si entramos sin socket (app reiniciada), volver al inicio ──
  useEffect(() => {
    if (!socket || !roomId) {
      console.warn('[JuegoScreen] socket/roomId faltante — volviendo al Main');
      navigation.replace('Main');
    }
  }, [socket, roomId]);

  // ── ESTADO DEL JUEGO ──────────────────────────────────────
  const [estadoJuego,  setEstadoJuego]  = useState(null);     // estado del servidor
  const [misManos,     setMisManos]     = useState([]);        // fichas privadas
  const [miPosicion,   setMiPosicion]   = useState(null);      // 0-3
  const [turno,        setTurno]        = useState(null);
  const [puntosAzul,   setPuntosAzul]   = useState(0);
  const [puntosRojo,   setPuntosRojo]   = useState(0);
  const [ronda,        setRonda]        = useState(1);

  // ── VOTOS TRAMPA ──────────────────────────────────────────
  const [modalVoto,    setModalVoto]    = useState(false);
  const [votosActuales,setVotosActuales]= useState({});        // { posicion: totalVotos }
  const [yaVote,       setYaVote]       = useState({});        // { posicion: true/false }
  const [trampaBanner, setTrampaBanner] = useState(null);

  // ── CHAT ──────────────────────────────────────────────────
  const [chatVisible,  setChatVisible]  = useState(false);
  const [chatMensajes, setChatMensajes] = useState([]);
  const [chatHabilitado, setChatHabilitado] = useState(false);
  const [chatTexto,    setChatTexto]    = useState('');
  const [chatBadge,    setChatBadge]    = useState(false);
  const [barajandoMsg, setBarajandoMsg] = useState('');

  // ── ESTADOS UI ────────────────────────────────────────────
  const [pausaVisible,    setPausaVisible]    = useState(false);
  const [pausaMensaje,    setPausaMensaje]    = useState('');
  const [resultadoRonda,  setResultadoRonda]  = useState(null);
  const [gameOver,        setGameOver]        = useState(null);
  const [fichaSeleccionada, setFichaSeleccionada] = useState(null);
  const [elegirLado,      setElegirLado]      = useState(false);
  const [fichasValidas,   setFichasValidas]   = useState([]);
  const [timerTurno,      setTimerTurno]      = useState(30);
  const [barajando,       setBarajando]       = useState(false);
  const [mensaje,         setMensaje]         = useState('');

  // ── TEMA DE BARRIO ────────────────────────────────────────
  const [fondoBarrio, setFondoBarrio] = useState(['#0A0A2E','#1A1A2E']);

  const FONDOS_BARRIO = {
    los_minas:       ['#1A0800','#3E1F00','#5D2E00'],
    villa_consuelo:  ['#0A0A2E','#002D62','#1565C0'],
    gazcue:          ['#0D1B4A','#1A237E','#283593'],
    cristo_rey:      ['#2E003E','#4A148C','#6A1B9A'],
    capotillo:       ['#2A1500','#E65100','#F57F17'],
    la_cienaga:      ['#001F3F','#01579B','#0288D1'],
    gualey:          ['#0A2000','#1B5E20','#2E7D32'],
    villa_juana:     ['#1A0A00','#4E342E','#6D4C41'],
    simon_bolivar:   ['#1A0000','#B71C1C','#CF142B'],
    ensanche_ozama:  ['#050505','#1A1A1A','#2E2E2E'],
    los_guaricanos:  ['#0A1500','#1B5E20','#33691E'],
    villa_francisca: ['#200010','#880E4F','#C2185B'],
  };

  const chatRef      = useRef(null);
  const tableRef     = useRef(null);
  const appState     = useRef(AppState.currentState);
  const timerRef     = useRef(null);
  const pulsoAnim    = useRef(new Animated.Value(1)).current;
  const barajandoAnim = useRef(new Animated.Value(0)).current;

  // ── EFECTO: Conectar Socket ───────────────────────────────
  useEffect(() => {
    // Cargar fondo de barrio seleccionado
    AsyncStorage.getItem('domino_mesa_activa').then(barrio => {
      if (barrio && FONDOS_BARRIO[barrio]) setFondoBarrio(FONDOS_BARRIO[barrio]);
    });

    if (!socket || !roomId) return;

    // Identificar mi posición en la partida
    AsyncStorage.getItem('domino_jugador').then(str => {
      if (str) {
        const yo = JSON.parse(str);
        const miJugador = jugadores.find(j => j.id === yo.id);
        if (miJugador) setMiPosicion(miJugador.posicion ?? miJugador.posicion);
      }
    });

    // Unirse a la sala de juego
    AsyncStorage.getItem('domino_jugador').then(str => {
      const yo = str ? JSON.parse(str) : { nombre: 'Jugador', id: 'anon' };
      socket.emit('join_room', { roomId, jugador: yo, modo });
    });

    // ── EVENTOS DEL SERVIDOR ────────────────────────────────

    socket.on('game_start', ({ estado, mensaje: msg }) => {
      actualizarEstado(estado);
      setMensaje(msg || '¡Empieza el juego!');
      setTimeout(() => setMensaje(''), 3000);
    });

    socket.on('game_state', ({ estado, narracion, alertas }) => {
      actualizarEstado(estado);
      if (narracion?.texto) {
        setMensaje(narracion.texto);
        setTimeout(() => setMensaje(''), 4000);
      }
    });

    socket.on('round_over', ({ resultado, puntosTotales, finMatch }) => {
      setPuntosAzul(puntosTotales?.equipo0 || 0);
      setPuntosRojo(puntosTotales?.equipo1 || 0);
      setResultadoRonda(resultado);
      setTimeout(() => setResultadoRonda(null), 4500);
    });

    socket.on('new_round', ({ estado, ronda: r, puntosTotales }) => {
      actualizarEstado(estado);
      setRonda(r);
      setBarajando(false);
      setPuntosAzul(puntosTotales?.equipo0 || 0);
      setPuntosRojo(puntosTotales?.equipo1 || 0);
    });

    socket.on('game_over', ({ campeon, puntosTotales, mensaje: msg }) => {
      setGameOver({ campeon, puntosTotales, mensaje: msg });
    });

    // ── CHAT ─────────────────────────────────────────────────
    socket.on('chat_estado', ({ habilitado, duracion, mensaje: msg }) => {
      setChatHabilitado(habilitado);
      if (habilitado) {
        setBarajando(true);
        setBarajandoMsg(msg || '🎲 Barajando fichas...');
        if (!chatVisible) setChatBadge(true);
        // Animación de barajado
        Animated.loop(
          Animated.sequence([
            Animated.timing(barajandoAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(barajandoAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]), { iterations: 10 }
        ).start();
      } else {
        setBarajando(false);
        setChatBadge(false);
      }
    });

    socket.on('chat', (msg) => {
      setChatMensajes(prev => [...prev, msg].slice(-100));
      if (!chatVisible) setChatBadge(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });

    socket.on('chat_historial', (hist) => {
      setChatMensajes(hist.slice(-100));
    });

    socket.on('chat_error', ({ error }) => {
      setMensaje(error);
      setTimeout(() => setMensaje(''), 3000);
    });

    // ── ANTI-TRAMPA ──────────────────────────────────────────
    socket.on('juego_pausa', ({ jugadorNombre, mensaje: msg }) => {
      setPausaMensaje(msg || `⚠️ ${jugadorNombre} salió de la app`);
      setPausaVisible(true);
      Vibration.vibrate([0, 300, 200, 300]);
    });

    socket.on('juego_reanudar', ({ jugadorNombre, mensaje: msg }) => {
      setPausaVisible(false);
      setMensaje(msg || `✅ ${jugadorNombre} volvió`);
      setTimeout(() => setMensaje(''), 3000);
    });

    socket.on('game_abandoned', ({ mensaje: msg }) => {
      Alert.alert(
        '⚠️ Partida Abandonada',
        msg || 'Un jugador abandonó la partida.',
        [{ text: 'Volver al inicio', onPress: () => navigation.navigate('Main') }],
        { cancelable: false }
      );
    });

    socket.on('player_disconnected', ({ nombre }) => {
      setMensaje(`📶 ${nombre || 'Jugador'} perdió conexión...`);
    });

    // ── VOTOS TRAMPA ───────────────────────────────────────
    socket.on('votos_trampa_update', ({ acusadoId, acusadoNombre, totalVotos, votantesIds }) => {
      setVotosActuales(prev => ({ ...prev, [acusadoId]: totalVotos }));
      setMensaje(`🚨 ${acusadoNombre} acusado de trampa: ${totalVotos}/3 votos`);
      Vibration.vibrate(200);
    });

    socket.on('trampa_confirmada', ({ acusadoNombre, mensaje }) => {
      setTrampaBanner(mensaje);
      Vibration.vibrate([0, 400, 200, 400]);
      setTimeout(() => navigation.navigate('Main'), 8000);
    });

    return () => {
      socket.off('game_start');
      socket.off('game_state');
      socket.off('round_over');
      socket.off('new_round');
      socket.off('game_over');
      socket.off('chat_estado');
      socket.off('chat');
      socket.off('chat_historial');
      socket.off('chat_error');
      socket.off('juego_pausa');
      socket.off('juego_reanudar');
      socket.off('game_abandoned');
      socket.off('player_disconnected');
      socket.off('votos_trampa_update');
      socket.off('trampa_confirmada');
    };
  }, [socket, roomId]);

  // ── ANTI-TRAMPA: Detectar cuando el jugador sale de la app ─
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      const anterior = appState.current;
      appState.current = nextState;

      if (!socket || !roomId) return;

      if (
        (anterior === 'active') &&
        (nextState === 'background' || nextState === 'inactive')
      ) {
        // ¡Jugador salió de la app durante la partida!
        socket.emit('app_background', { roomId });
        Vibration.vibrate(500);
      } else if (nextState === 'active' && anterior !== 'active') {
        // Volvió a la app
        socket.emit('app_foreground', { roomId });
      }
    });

    return () => subscription.remove();
  }, [socket, roomId]);

  // ── TIMER DE TURNO ────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (estadoJuego && estadoJuego.estadoJuego === 'jugando') {
      setTimerTurno(30);
      timerRef.current = setInterval(() => {
        setTimerTurno(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            // Si es mi turno y se agotó, pasar automáticamente
            if (turno === miPosicion && socket && roomId) {
              socket.emit('pass_turn', { roomId });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [turno]);

  // ── ANIMACIÓN PULSO (turno activo) ───────────────────────
  useEffect(() => {
    if (turno === miPosicion) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulsoAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
          Animated.timing(pulsoAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
        ])
      ).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      pulsoAnim.stopAnimation();
      pulsoAnim.setValue(1);
    }
  }, [turno]);

  // ── ACTUALIZAR ESTADO LOCAL ───────────────────────────────
  const actualizarEstado = useCallback((est) => {
    if (!est) return;
    setEstadoJuego(est);
    setTurno(est.turno);

    // Mis fichas privadas (el servidor nos las manda separado en el estado)
    if (miPosicion !== null && est.misFichas) {
      setMisManos(est.misFichas);
    }

    // Calcular fichas jugables si es mi turno
    if (est.turno === miPosicion && est.misFichas) {
      calcularFichasValidas(est.misFichas, est.extremoIzquierdo, est.extremoDerecho, est.mesa.length === 0);
    } else {
      setFichasValidas([]);
    }
  }, [miPosicion]);

  const calcularFichasValidas = (mano, extIzq, extDer, mesaVacia) => {
    if (mesaVacia) {
      setFichasValidas(mano.map(f => f.id));
      return;
    }
    const validas = mano.filter(f =>
      f.izquierda === extIzq || f.derecha === extIzq ||
      f.izquierda === extDer || f.derecha === extDer
    ).map(f => f.id);
    setFichasValidas(validas);
  };

  // ── JUGAR FICHA ───────────────────────────────────────────
  const handleFichaTap = (ficha) => {
    if (!socket || !roomId) return;
    if (turno !== miPosicion) {
      setMensaje('⏳ No es tu turno');
      setTimeout(() => setMensaje(''), 2000);
      return;
    }
    if (!fichasValidas.includes(ficha.id)) {
      setMensaje('❌ Esta ficha no encaja aquí');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => setMensaje(''), 2000);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const mesa = estadoJuego?.mesa || [];
    const extIzq = estadoJuego?.extremoIzquierdo;
    const extDer = estadoJuego?.extremoDerecho;

    if (mesa.length === 0) {
      // Primera ficha → jugar directo
      socket.emit('play_tile', { roomId, fichaId: ficha.id, lado: 'derecha' });
      return;
    }

    const encajaIzq = ficha.izquierda === extIzq || ficha.derecha === extIzq;
    const encajaDer = ficha.izquierda === extDer || ficha.derecha === extDer;

    if (encajaIzq && encajaDer) {
      // Puede ir en ambos lados → preguntar
      setFichaSeleccionada(ficha);
      setElegirLado(true);
    } else {
      // Solo un lado válido → auto-jugar
      const lado = encajaDer ? 'derecha' : 'izquierda';
      socket.emit('play_tile', { roomId, fichaId: ficha.id, lado });
    }
  };

  const confirmarLado = (lado) => {
    if (!fichaSeleccionada || !socket) return;
    socket.emit('play_tile', { roomId, fichaId: fichaSeleccionada.id, lado });
    setFichaSeleccionada(null);
    setElegirLado(false);
  };

  const handlePasar = () => {
    if (!socket || !roomId) return;
    if (turno !== miPosicion) return;
    Alert.alert(
      '¿Pasar turno?',
      'No tienes fichas que puedas jugar. ¿Pasar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pasar',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            socket.emit('pass_turn', { roomId });
          }
        }
      ]
    );
  };

  const enviarChat = () => {
    if (!chatTexto.trim() || !socket || !chatHabilitado) return;
    socket.emit('chat_message', { roomId, mensaje: chatTexto.trim(), tipo: 'texto' });
    setChatTexto('');
  };

  // ── RENDER TABLERO ────────────────────────────────────────
  const renderTablero = () => {
    const mesa = estadoJuego?.mesa || [];
    const extIzq = estadoJuego?.extremoIzquierdo;
    const extDer = estadoJuego?.extremoDerecho;

    if (mesa.length === 0) {
      return (
        <View style={estilos.mesaVacia}>
          <Text style={estilos.mesaVaciaTexto}>🎲</Text>
          <Text style={estilos.mesaVaciaSub}>
            {turno === miPosicion ? '¡Coloca la primera ficha!' : 'Esperando primera jugada...'}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        ref={tableRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={estilos.mesaScroll}
        onContentSizeChange={() => tableRef.current?.scrollToEnd({ animated: true })}
      >
        {/* Extremo izquierdo */}
        {extIzq !== null && (
          <View style={estilos.extremoIndicador}>
            <Text style={estilos.extremoNum}>{extIzq}</Text>
          </View>
        )}

        {/* Fichas en el tablero */}
        {mesa.map((ficha, i) => (
          <View key={`${ficha.id}_${i}`} style={estilos.fichaTableroWrap}>
            <FichaTablero
              izquierda={ficha.izquierda}
              derecha={ficha.derecha}
              jugadorId={ficha.jugadorId}
            />
            {i < mesa.length - 1 && (
              <View style={estilos.conector} />
            )}
          </View>
        ))}

        {/* Extremo derecho */}
        {extDer !== null && (
          <View style={estilos.extremoIndicador}>
            <Text style={estilos.extremoNum}>{extDer}</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  // ── INFORMACIÓN DE JUGADORES ──────────────────────────────
  const cantidades = estadoJuego?.cantidadFichasPorJugador || {};
  const esMiTurno  = turno === miPosicion;
  const noHayMov   = esMiTurno && fichasValidas.length === 0 && (estadoJuego?.mesa?.length || 0) > 0;

  // Calcular posiciones relativas (yo siempre abajo)
  const posArriba    = miPosicion !== null ? (miPosicion + 2) % 4 : 2;
  const posIzquierda = miPosicion !== null ? (miPosicion + 1) % 4 : 1;
  const posDerecha   = miPosicion !== null ? (miPosicion + 3) % 4 : 3;

  const jugadorArr   = jugadores.find(j => j.posicion === posArriba)    || { nombre: '—' };
  const jugadorIzq   = jugadores.find(j => j.posicion === posIzquierda) || { nombre: '—' };
  const jugadorDer   = jugadores.find(j => j.posicion === posDerecha)   || { nombre: '—' };

  // ── RENDER PRINCIPAL ──────────────────────────────────────
  if (!estadoJuego) {
    return (
      <View style={[estilos.contenedor, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 48 }}>🎲</Text>
        <Text style={{ color: C.blanco, fontSize: 16, marginTop: 12 }}>Conectando al juego...</Text>
      </View>
    );
  }

  return (
    <View style={estilos.contenedor}>
      {/* Fondo de barrio dinámico */}
      <LinearGradient
        colors={fondoBarrio}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── HEADER: Marcador ─────────────────────────────── */}
      <LinearGradient colors={[C.azul, C.oscuro]} style={estilos.header}>
        <View style={estilos.equipoScore}>
          <Text style={[estilos.scoreLabel, { color: '#64B5F6' }]}>🔵 AZUL</Text>
          <Text style={[estilos.scoreNum, { color: '#64B5F6' }]}>{puntosAzul}</Text>
        </View>

        <View style={estilos.headerCentro}>
          <Text style={estilos.rondaText}>MANO {ronda}</Text>
          <View style={[estilos.timerContenedor, timerTurno <= 10 && { backgroundColor: C.rojo }]}>
            <Text style={estilos.timerNum}>{timerTurno}s</Text>
          </View>
          <Text style={estilos.metaText}>Meta: 200 pts</Text>
        </View>

        <View style={estilos.equipoScore}>
          <Text style={[estilos.scoreLabel, { color: '#EF9A9A' }]}>🔴 ROJO</Text>
          <Text style={[estilos.scoreNum, { color: '#EF9A9A' }]}>{puntosRojo}</Text>
        </View>
      </LinearGradient>

      {/* ── MENSAJE FLOTANTE ─────────────────────────────── */}
      {!!mensaje && (
        <View style={estilos.mensajeFlotante}>
          <Text style={estilos.mensajeTexto}>{mensaje}</Text>
        </View>
      )}

      {/* ── BARAJANDO BANNER ─────────────────────────────── */}
      {barajando && (
        <LinearGradient colors={[C.verde, '#2E7D32']} style={estilos.barajandoBanner}>
          <Animated.Text style={[{ fontSize: 20 }, { opacity: barajandoAnim }]}>🎲</Animated.Text>
          <Text style={estilos.barajandoTexto}>{barajandoMsg}</Text>
          <TouchableOpacity
            onPress={() => { setChatBadge(false); setChatVisible(true); }}
            style={estilos.chatBannerBtn}
          >
            <Text style={{ color: C.oro, fontWeight: 'bold', fontSize: 12 }}>💬 Chatear</Text>
          </TouchableOpacity>
        </LinearGradient>
      )}

      {/* ── ÁREA DE JUEGO ────────────────────────────────── */}
      <View style={estilos.areaJuego}>

        {/* Jugador de arriba (compañero) */}
        <View style={estilos.filaCentral}>
          <JugadorContrario
            nombre={jugadorArr.nombre}
            cantidadFichas={cantidades[posArriba]}
            equipo={posArriba % 2}
            posicion="arriba"
            esTurno={turno === posArriba}
          />
        </View>

        {/* Fila media: Izq | Mesa | Der */}
        <View style={estilos.filaMesa}>
          {/* Jugador izquierda (rival) */}
          <JugadorContrario
            nombre={jugadorIzq.nombre}
            cantidadFichas={cantidades[posIzquierda]}
            equipo={posIzquierda % 2}
            posicion="izquierda"
            esTurno={turno === posIzquierda}
          />

          {/* TABLERO */}
          <View style={estilos.mesaContenedor}>
            {renderTablero()}
          </View>

          {/* Jugador derecha (rival) */}
          <JugadorContrario
            nombre={jugadorDer.nombre}
            cantidadFichas={cantidades[posDerecha]}
            equipo={posDerecha % 2}
            posicion="derecha"
            esTurno={turno === posDerecha}
          />
        </View>

        {/* ── MIS FICHAS ─────────────────────────────────── */}
        <View style={estilos.misFichasArea}>
          {/* Indicador de turno */}
          <View style={[estilos.turnoBar, { backgroundColor: esMiTurno ? C.verdeClaro : C.medio }]}>
            <Text style={estilos.turnoBarTexto}>
              {esMiTurno ? '👆 ¡TU TURNO!' : `⏳ Turno de ${jugadores.find(j => j.posicion === turno)?.nombre || '...'}`}
            </Text>
            <Text style={estilos.turnoBarFichas}>{misManos.length} fichas</Text>
          </View>

          <Animated.View style={{ transform: [{ scale: esMiTurno ? pulsoAnim : 1 }] }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={estilos.misFichasScroll}
            >
              {misManos.map((ficha) => (
                <View key={ficha.id} style={{ marginHorizontal: 4 }}>
                  <DominoFicha
                    izquierda={ficha.izquierda}
                    derecha={ficha.derecha}
                    activa={esMiTurno}
                    valida={fichasValidas.includes(ficha.id)}
                    onPress={() => handleFichaTap(ficha)}
                  />
                </View>
              ))}
              {misManos.length === 0 && (
                <Text style={{ color: C.oro, fontSize: 18, alignSelf: 'center', paddingHorizontal: 20 }}>
                  ¡DOMINÓ! 🏆
                </Text>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </View>

      {/* ── BOTONERA INFERIOR ────────────────────────────── */}
      <View style={estilos.botonera}>
        {/* Pasar */}
        <TouchableOpacity
          onPress={handlePasar}
          disabled={!noHayMov}
          style={[estilos.btnAccion, !noHayMov && { opacity: 0.4 }]}
        >
          <Text style={estilos.btnAccionEmoji}>⏭</Text>
          <Text style={estilos.btnAccionTexto}>Pasar</Text>
        </TouchableOpacity>

        {/* Chat — solo disponible al barajar */}
        <TouchableOpacity
          onPress={() => {
            if (!chatHabilitado) {
              setMensaje('🎲 El chat se activa mientras se barajan las fichas');
              setTimeout(() => setMensaje(''), 3000);
              return;
            }
            setChatBadge(false);
            setChatVisible(true);
          }}
          style={[
            estilos.btnAccion,
            chatHabilitado && { backgroundColor: `${C.verde}60`, borderColor: C.verdeClaro }
          ]}
        >
          <Text style={estilos.btnAccionEmoji}>
            {chatHabilitado ? '💬' : '🔇'}
          </Text>
          {chatBadge && <View style={estilos.chatBadge} />}
          <Text style={estilos.btnAccionTexto}>Chat</Text>
        </TouchableOpacity>

        {/* Reacción rápida */}
        <TouchableOpacity
          onPress={() => {
            const reacciones = ['🔥', '👏', '😅', '🤣', '😤', '🎲'];
            const emoji = reacciones[Math.floor(Math.random() * reacciones.length)];
            socket?.emit('send_reaction', { roomId, emoji });
          }}
          style={estilos.btnAccion}
        >
          <Text style={estilos.btnAccionEmoji}>🎉</Text>
          <Text style={estilos.btnAccionTexto}>Reacción</Text>
        </TouchableOpacity>

        {/* Votar trampa */}
        <TouchableOpacity
          onPress={() => setModalVoto(true)}
          style={estilos.btnAccion}
        >
          <Text style={estilos.btnAccionEmoji}>🚨</Text>
          <Text style={estilos.btnAccionTexto}>Trampa</Text>
        </TouchableOpacity>
      </View>

      {/* ── Banner trampa confirmada ────────────────────── */}
      {trampaBanner && (
        <View style={estilos.trampaBanner}>
          <Text style={estilos.trampaBannerTexto}>{trampaBanner}</Text>
          <Text style={{ color: `${C.blanco}70`, fontSize: 11, marginTop: 6 }}>
            Volviendo al inicio en 8 segundos...
          </Text>
        </View>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* MODAL: Votar trampa                                 */}
      {/* ════════════════════════════════════════════════════ */}
      <Modal visible={modalVoto} transparent animationType="slide">
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalBox}>
            <Text style={estilos.modalTitulo}>🚨 Reportar trampa</Text>
            <Text style={{ color: `${C.blanco}70`, fontSize: 12, textAlign: 'center', marginBottom: 16 }}>
              Si 3 de 4 jugadores votan, se aplica sanción automática
            </Text>

            {/* Lista de rivales (no incluye al propio jugador) */}
            {jugadores
              .filter(j => j.posicion !== miPosicion)
              .map(j => {
                const votos = votosActuales[j.posicion] || 0;
                const yoVoté = yaVote[j.posicion];
                return (
                  <TouchableOpacity
                    key={j.posicion}
                    disabled={yoVoté}
                    onPress={() => {
                      if (yoVoté) return;
                      Alert.alert(
                        '¿Reportar trampa?',
                        `¿Estás seguro de que ${j.nombre} está haciendo trampa?`,
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Votar trampa',
                            style: 'destructive',
                            onPress: () => {
                              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                              socket?.emit('voto_trampa', { roomId, acusadoId: j.posicion });
                              setYaVote(prev => ({ ...prev, [j.posicion]: true }));
                              setModalVoto(false);
                            }
                          }
                        ]
                      );
                    }}
                    style={[
                      estilos.votoFila,
                      yoVoté && { opacity: 0.5 }
                    ]}
                  >
                    <Text style={{ fontSize: 24 }}>👤</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ color: C.blanco, fontWeight: 'bold', fontSize: 14 }}>
                        {j.nombre}
                      </Text>
                      <Text style={{ color: `${C.blanco}60`, fontSize: 11 }}>
                        {j.posicion % 2 === 0 ? '🔵 Equipo Azul' : '🔴 Equipo Rojo'}
                      </Text>
                    </View>
                    <View style={estilos.votosChip}>
                      <Text style={estilos.votosChipNum}>{votos}/3</Text>
                      <Text style={estilos.votosChipLabel}>votos</Text>
                    </View>
                    {!yoVoté && (
                      <View style={estilos.votarBtn}>
                        <Text style={{ color: C.blanco, fontSize: 10, fontWeight: 'bold' }}>
                          VOTAR
                        </Text>
                      </View>
                    )}
                    {yoVoté && (
                      <Text style={{ color: C.verdeCl, fontSize: 11 }}>✓ Votado</Text>
                    )}
                  </TouchableOpacity>
                );
              })}

            <TouchableOpacity onPress={() => setModalVoto(false)} style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ color: `${C.blanco}60`, fontSize: 14 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════ */}
      {/* MODAL: Elegir lado de la ficha                      */}
      {/* ════════════════════════════════════════════════════ */}
      <Modal visible={elegirLado} transparent animationType="fade">
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalBox}>
            <Text style={estilos.modalTitulo}>¿Dónde colocar la ficha?</Text>
            {fichaSeleccionada && (
              <View style={estilos.fichaCentrada}>
                <DominoFicha
                  izquierda={fichaSeleccionada.izquierda}
                  derecha={fichaSeleccionada.derecha}
                  activa={false}
                />
              </View>
            )}
            <View style={estilos.modalBotones}>
              <TouchableOpacity
                onPress={() => confirmarLado('izquierda')}
                style={[estilos.ladoBtn, { borderColor: '#64B5F6' }]}
              >
                <Text style={estilos.ladoBtnTexto}>⬅ Izquierda</Text>
                <Text style={estilos.ladoBtnSub}>{estadoJuego?.extremoIzquierdo}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => confirmarLado('derecha')}
                style={[estilos.ladoBtn, { borderColor: '#EF9A9A' }]}
              >
                <Text style={estilos.ladoBtnTexto}>Derecha ➡</Text>
                <Text style={estilos.ladoBtnSub}>{estadoJuego?.extremoDerecho}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setElegirLado(false)} style={{ marginTop: 12 }}>
              <Text style={{ color: `${C.blanco}60` }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════ */}
      {/* MODAL: Chat (solo durante barajado)                 */}
      {/* ════════════════════════════════════════════════════ */}
      <Modal visible={chatVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View style={estilos.chatModal}>
            {/* Header */}
            <View style={estilos.chatHeader}>
              <Text style={estilos.chatTitulo}>💬 Chat entre manos</Text>
              <TouchableOpacity onPress={() => setChatVisible(false)}>
                <Text style={{ color: C.oro, fontSize: 16, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={estilos.chatAviso}>
              🎲 Solo disponible mientras se barajan las fichas
            </Text>

            {/* Mensajes */}
            <FlatList
              ref={chatRef}
              data={chatMensajes}
              keyExtractor={(_, i) => i.toString()}
              style={estilos.chatLista}
              onContentSizeChange={() => chatRef.current?.scrollToEnd({ animated: true })}
              renderItem={({ item }) => (
                <View style={[
                  estilos.chatBurbuja,
                  item.jugadorId === miPosicion && estilos.chatBurbujaPropia
                ]}>
                  {item.jugadorId !== miPosicion && (
                    <Text style={estilos.chatNombre}>{item.nombre}</Text>
                  )}
                  <Text style={estilos.chatTexto}>
                    {item.tipo === 'imagen' ? '📷 Foto' : item.mensaje}
                  </Text>
                </View>
              )}
              ListEmptyComponent={
                <Text style={estilos.chatVacio}>¡Llegó la hora de chachear! 🎲</Text>
              }
            />

            {/* Input */}
            <View style={estilos.chatInput}>
              <TextInput
                value={chatTexto}
                onChangeText={setChatTexto}
                placeholder="Escribe algo... 😄"
                placeholderTextColor={`${C.blanco}50`}
                style={estilos.chatInputField}
                onSubmitEditing={enviarChat}
                returnKeyType="send"
              />
              <TouchableOpacity onPress={enviarChat} style={estilos.chatEnviarBtn}>
                <Text style={{ fontSize: 20 }}>➤</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ════════════════════════════════════════════════════ */}
      {/* OVERLAY: Pausa por anti-trampa                      */}
      {/* ════════════════════════════════════════════════════ */}
      <Modal visible={pausaVisible} transparent animationType="fade">
        <View style={estilos.pausaOverlay}>
          <View style={estilos.pausaBox}>
            <Text style={{ fontSize: 48 }}>⚠️</Text>
            <Text style={estilos.pausaTitulo}>Juego Pausado</Text>
            <Text style={estilos.pausaMensaje}>{pausaMensaje}</Text>
            <Text style={estilos.pausaSub}>
              El juego se reanudará cuando el jugador vuelva a la app.
            </Text>
            <Text style={{ color: `${C.blanco}60`, fontSize: 11, marginTop: 8 }}>
              ⏱ 60 segundos para reconectarse
            </Text>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════ */}
      {/* OVERLAY: Fin de ronda                              */}
      {/* ════════════════════════════════════════════════════ */}
      {resultadoRonda && (
        <View style={estilos.resultadoOverlay}>
          <LinearGradient
            colors={resultadoRonda.equipoGanador === 0
              ? ['#1565C0', '#002D62']
              : ['#B71C1C', '#CF142B']}
            style={estilos.resultadoBox}
          >
            <Text style={{ fontSize: 40 }}>
              {resultadoRonda.capicua ? '🎯' : '🎲'}
            </Text>
            <Text style={estilos.resultadoTitulo}>
              {resultadoRonda.capicua ? '¡CAPICÚA!' : '¡DOMINÓ!'}
            </Text>
            <Text style={estilos.resultadoEquipo}>
              {resultadoRonda.equipoGanador === 0 ? '🔵 Equipo Azul' : '🔴 Equipo Rojo'} gana
            </Text>
            <Text style={estilos.resultadoPuntos}>
              +{resultadoRonda.puntos?.total || 0} puntos
              {resultadoRonda.capicua ? ' (¡CAPICÚA = DOBLE!)' : ''}
            </Text>
          </LinearGradient>
        </View>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* OVERLAY: Fin de partida                            */}
      {/* ════════════════════════════════════════════════════ */}
      {gameOver && (
        <View style={estilos.pausaOverlay}>
          <LinearGradient
            colors={[C.oscuro, C.azul]}
            style={estilos.gameOverBox}
          >
            <Text style={{ fontSize: 64 }}>🏆</Text>
            <Text style={estilos.gameOverTitulo}>¡FIN DE LA PARTIDA!</Text>
            <Text style={estilos.gameOverSub}>{gameOver.mensaje}</Text>
            <View style={estilos.gameOverScores}>
              <Text style={[estilos.gameOverScore, { color: '#64B5F6' }]}>
                🔵 Azul: {gameOver.puntosTotales?.equipo0 || 0}
              </Text>
              <Text style={[estilos.gameOverScore, { color: '#EF9A9A' }]}>
                🔴 Rojo: {gameOver.puntosTotales?.equipo1 || 0}
              </Text>
            </View>
            <TouchableOpacity
              style={estilos.btnResultados}
              onPress={() => navigation.replace('Resultados', {
                campeon: gameOver.campeon,
                puntosTotales: gameOver.puntosTotales,
                jugadores,
                miPosicion,
                rondas: ronda
              })}
            >
              <Text style={estilos.btnResultadosTexto}>Ver Resultados 🏆</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

// ── ESTILOS ───────────────────────────────────────────────────
const estilos = StyleSheet.create({
  contenedor: {
    flex: 1, backgroundColor: C.negro
  },
  header: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingTop:       Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 8,
    paddingHorizontal: 16,
    paddingBottom:    10,
  },
  equipoScore: {
    alignItems: 'center', flex: 1
  },
  scoreLabel: {
    fontSize: 10, fontWeight: 'bold', letterSpacing: 1
  },
  scoreNum: {
    fontSize: 28, fontWeight: 'bold'
  },
  headerCentro: {
    alignItems: 'center', flex: 1.2
  },
  rondaText: {
    color: `${C.blanco}80`, fontSize: 10, letterSpacing: 2
  },
  timerContenedor: {
    backgroundColor: C.medio,
    paddingHorizontal: 12, paddingVertical: 3,
    borderRadius: 10, marginVertical: 4,
    minWidth: 50, alignItems: 'center'
  },
  timerNum: {
    color: C.blanco, fontWeight: 'bold', fontSize: 16
  },
  metaText: {
    color: `${C.blanco}50`, fontSize: 9, letterSpacing: 1
  },
  mensajeFlotante: {
    position: 'absolute', top: Platform.OS === 'ios' ? 100 : 80,
    left: 20, right: 20,
    backgroundColor: `${C.oscuro}F0`,
    borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: C.oro,
    alignItems: 'center', zIndex: 100,
  },
  mensajeTexto: {
    color: C.blanco, fontSize: 13, textAlign: 'center'
  },
  barajandoBanner: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, paddingHorizontal: 16,
    gap: 8,
  },
  barajandoTexto: {
    color: C.blanco, fontSize: 12, flex: 1, fontWeight: '600'
  },
  chatBannerBtn: {
    backgroundColor: `${C.negro}40`, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 8
  },
  areaJuego: {
    flex: 1
  },
  filaCentral: {
    alignItems: 'center', paddingTop: 6
  },
  filaMesa: {
    flex: 1, flexDirection: 'row', alignItems: 'center'
  },
  mesaContenedor: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    height: '100%',
  },
  mesaVacia: {
    alignItems: 'center', justifyContent: 'center', padding: 20
  },
  mesaVaciaTexto: {
    fontSize: 44
  },
  mesaVaciaSub: {
    color: `${C.blanco}60`, fontSize: 12, marginTop: 8, textAlign: 'center'
  },
  mesaScroll: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8
  },
  fichaTableroWrap: {
    flexDirection: 'row', alignItems: 'center'
  },
  fichaTablero: {
    flexDirection:  'row',
    alignItems:     'center',
    backgroundColor: '#1A237E',
    borderRadius:   6,
    borderWidth:    1.5,
    paddingHorizontal: 5,
    paddingVertical:   2,
    marginHorizontal:  1,
  },
  fichaTableroNum: {
    color: C.blanco, fontWeight: 'bold', fontSize: 15, minWidth: 14, textAlign: 'center'
  },
  fichaTableroDivisor: {
    width: 1.5, height: 18, backgroundColor: `${C.blanco}60`, marginHorizontal: 3
  },
  conector: {
    width: 6, height: 2, backgroundColor: `${C.blanco}40`
  },
  extremoIndicador: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: C.oro, alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 4
  },
  extremoNum: {
    color: C.negro, fontWeight: 'bold', fontSize: 12
  },
  jugadorContrario: {
    alignItems: 'center', paddingHorizontal: 6
  },
  jugadorCirculo: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  jugadorEmoji: {
    fontSize: 20
  },
  turnoIndicador: {
    position: 'absolute', top: -4, right: -4,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: C.oro, borderWidth: 1.5, borderColor: C.negro
  },
  jugadorNombre: {
    color: `${C.blanco}80`, fontSize: 9, marginTop: 3, maxWidth: 60
  },
  fichasBocaAbajo: {
    flexDirection: 'row', marginTop: 4, alignItems: 'center'
  },
  fichaBocaAbajo: {
    width: 10, height: 16, backgroundColor: '#283593',
    borderRadius: 2, borderWidth: 1, borderColor: `${C.blanco}30`
  },
  misFichasArea: {
    paddingBottom: 8
  },
  turnoBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 6, marginBottom: 4
  },
  turnoBarTexto: {
    color: C.blanco, fontWeight: 'bold', fontSize: 12
  },
  turnoBarFichas: {
    color: `${C.blanco}80`, fontSize: 11
  },
  misFichasScroll: {
    paddingHorizontal: 12, paddingVertical: 6
  },
  fichaContenedor: {
    overflow: 'hidden', backgroundColor: '#1A237E'
  },
  fichaMitad: {
    flex: 1, alignItems: 'center', justifyContent: 'center'
  },
  fichaPunto: {
    color: C.blanco, fontWeight: 'bold', fontSize: 18
  },
  botonera: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: C.oscuro,
    paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: `${C.azul}60`,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  btnAccion: {
    alignItems: 'center', flex: 1, paddingVertical: 6,
    borderWidth: 1, borderColor: 'transparent',
    borderRadius: 10, marginHorizontal: 6,
    position: 'relative',
  },
  btnAccionEmoji: { fontSize: 22 },
  btnAccionTexto: { color: `${C.blanco}80`, fontSize: 10, marginTop: 2 },
  chatBadge: {
    position: 'absolute', top: 2, right: '25%',
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: C.rojo, borderWidth: 1.5, borderColor: C.negro
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center'
  },
  modalBox: {
    backgroundColor: C.oscuro, borderRadius: 18,
    padding: 24, width: '82%', alignItems: 'center',
    borderWidth: 1, borderColor: `${C.azul}80`
  },
  modalTitulo: {
    color: C.blanco, fontWeight: 'bold', fontSize: 16, marginBottom: 16
  },
  fichaCentrada: {
    alignItems: 'center', marginVertical: 12
  },
  modalBotones: {
    flexDirection: 'row', gap: 12, width: '100%'
  },
  ladoBtn: {
    flex: 1, borderWidth: 2, borderRadius: 12,
    padding: 14, alignItems: 'center'
  },
  ladoBtnTexto: {
    color: C.blanco, fontWeight: 'bold', fontSize: 14
  },
  ladoBtnSub: {
    color: C.oro, fontSize: 22, fontWeight: 'bold', marginTop: 4
  },
  chatModal: {
    backgroundColor: C.oscuro, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '80%', borderWidth: 1, borderColor: `${C.azul}60`
  },
  chatHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: `${C.blanco}15`
  },
  chatTitulo: {
    color: C.blanco, fontWeight: 'bold', fontSize: 16
  },
  chatAviso: {
    color: C.verdeClaro, fontSize: 11, textAlign: 'center', paddingVertical: 6,
    backgroundColor: `${C.verde}20`
  },
  chatLista: {
    maxHeight: 260, paddingHorizontal: 16
  },
  chatBurbuja: {
    backgroundColor: C.medio, borderRadius: 12,
    padding: 10, marginVertical: 4, maxWidth: '80%', alignSelf: 'flex-start'
  },
  chatBurbujaPropia: {
    backgroundColor: `${C.azul}CC`, alignSelf: 'flex-end'
  },
  chatNombre: {
    color: C.oro, fontSize: 10, fontWeight: 'bold', marginBottom: 2
  },
  chatTexto: {
    color: C.blanco, fontSize: 14
  },
  chatVacio: {
    color: `${C.blanco}50`, textAlign: 'center', padding: 20, fontSize: 13
  },
  chatInput: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderTopWidth: 1, borderTopColor: `${C.blanco}15`
  },
  chatInputField: {
    flex: 1, backgroundColor: C.medio, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    color: C.blanco, fontSize: 14, marginRight: 8
  },
  chatEnviarBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.azul, alignItems: 'center', justifyContent: 'center'
  },
  pausaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center', justifyContent: 'center', zIndex: 999
  },
  pausaBox: {
    backgroundColor: '#1A1A2E', borderRadius: 20,
    padding: 30, width: '85%', alignItems: 'center',
    borderWidth: 2, borderColor: '#FF5722'
  },
  pausaTitulo: {
    color: C.blanco, fontWeight: 'bold', fontSize: 22, marginTop: 12
  },
  pausaMensaje: {
    color: '#FF7043', fontSize: 14, textAlign: 'center', marginTop: 8
  },
  pausaSub: {
    color: `${C.blanco}70`, fontSize: 12, textAlign: 'center', marginTop: 10
  },
  resultadoOverlay: {
    position: 'absolute', top: '30%', left: 20, right: 20, zIndex: 500
  },
  resultadoBox: {
    borderRadius: 20, padding: 24, alignItems: 'center',
    borderWidth: 2, borderColor: C.oro
  },
  resultadoTitulo: {
    color: C.oro, fontWeight: 'bold', fontSize: 28, marginTop: 8
  },
  resultadoEquipo: {
    color: C.blanco, fontSize: 16, marginTop: 8
  },
  resultadoPuntos: {
    color: C.oro, fontSize: 22, fontWeight: 'bold', marginTop: 4
  },
  gameOverBox: {
    borderRadius: 24, padding: 32, width: '90%', alignItems: 'center',
    borderWidth: 2, borderColor: C.oro
  },
  gameOverTitulo: {
    color: C.oro, fontWeight: 'bold', fontSize: 26, marginTop: 10, letterSpacing: 2
  },
  gameOverSub: {
    color: C.blanco, fontSize: 13, textAlign: 'center', marginTop: 8
  },
  gameOverScores: {
    marginTop: 16, gap: 6
  },
  gameOverScore: {
    fontSize: 20, fontWeight: 'bold', textAlign: 'center'
  },
  btnResultados: {
    marginTop: 24, backgroundColor: C.oro,
    paddingHorizontal: 30, paddingVertical: 14, borderRadius: 20
  },
  btnResultadosTexto: {
    color: C.negro, fontWeight: 'bold', fontSize: 16
  },

  // Trampa
  trampaBanner: {
    position: 'absolute', bottom: 100, left: 16, right: 16,
    backgroundColor: '#B71C1C', borderRadius: 14,
    padding: 16, zIndex: 900,
    borderWidth: 2, borderColor: C.rojo,
    alignItems: 'center',
  },
  trampaBannerTexto: {
    color: C.blanco, fontWeight: 'bold', fontSize: 13, textAlign: 'center'
  },
  votoFila: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: `${C.blanco}08`, borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: `${C.blanco}15`
  },
  votosChip: { alignItems: 'center', marginRight: 10 },
  votosChipNum:   { color: C.rojo, fontWeight: 'bold', fontSize: 16 },
  votosChipLabel: { color: `${C.blanco}50`, fontSize: 9 },
  votarBtn: {
    backgroundColor: C.rojo, paddingHorizontal: 10,
    paddingVertical: 6, borderRadius: 8
  },
});
