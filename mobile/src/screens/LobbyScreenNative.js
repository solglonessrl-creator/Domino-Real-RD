/**
 * Domino Real RD — Pantalla Lobby / Sala de Espera
 * Los 4 jugadores se ven, eligen equipo y marcan "Listo"
 * Soporta: online 4v4, vs IA, amigos privado
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Alert, Platform, ScrollView, Share
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORES = {
  azulRD:    '#002D62',
  azulClaro: '#1565C0',
  azulEquipo:'#1976D2',
  rojoRD:    '#CF142B',
  rojoEquipo:'#C62828',
  blanco:    '#FFFFFF',
  oro:       '#FFD700',
  negro:     '#0A0A0A',
  grisOscuro:'#1A1A2E',
  grisMedio: '#2C2C54',
  verde:     '#2E7D32'
};

// Equipo según posición: 0,2 → Azul | 1,3 → Rojo
const equipoPorPosicion = (pos) => pos % 2 === 0 ? 'azul' : 'rojo';

// Slots de la mesa de dominó:
//   Pos 0 (Azul Sur)  Pos 1 (Rojo Sur)
//   Pos 2 (Azul Norte) Pos 3 (Rojo Norte)
const POSICIONES_INFO = {
  0: { equipo: 'azul', lugar: 'Equipo Azul — Lugar 1', lado: 'Sur' },
  1: { equipo: 'rojo', lugar: 'Equipo Rojo — Lugar 1', lado: 'Sur' },
  2: { equipo: 'azul', lugar: 'Equipo Azul — Lugar 2', lado: 'Norte' },
  3: { equipo: 'rojo', lugar: 'Equipo Rojo — Lugar 2', lado: 'Norte' }
};

export default function LobbyScreenNative({ navigation, route, jugador, socket }) {
  const { roomId, modo = 'online' } = route.params || {};

  const [lobbyState,  setLobbyState]  = useState({ jugadores: [], totalListos: 0, total: 0, modo });
  const [yoListo,     setYoListo]     = useState(false);
  const [countdown,   setCountdown]   = useState(null); // null | 3 | 2 | 1
  const [cargando,    setCargando]    = useState(true);

  const pulsoListo = useRef(new Animated.Value(1)).current;

  const maxJugadores = modo === 'vs_ia' || modo === 'practica' ? 1 : 4;

  // ── CONECTAR AL LOBBY VÍA SOCKET ──────────────────────────────
  useEffect(() => {
    if (!socket || !roomId) return;

    // Unirse al lobby
    socket.emit('lobby_join', {
      roomId,
      jugador: {
        id:     jugador?.id,
        nombre: jugador?.nombre,
        pais:   jugador?.pais  || 'RD',
        elo:    jugador?.elo   || 1200,
        liga:   jugador?.liga  || 'Bronce',
        avatar: jugador?.avatar || 'avatar_default'
      },
      modo
    });

    // Recibir estado del lobby
    socket.on('lobby_state', (state) => {
      setLobbyState(state);
      setCargando(false);
      const yo = state.jugadores.find(j => j.id === jugador?.id);
      if (yo) setYoListo(yo.listo);
    });

    // Cuenta regresiva
    socket.on('lobby_countdown', ({ segundos }) => {
      setCountdown(segundos);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    });

    // ¡Empezar el juego!
    socket.on('lobby_start', ({ roomId: rId, jugadores: jugs, modo: m }) => {
      setCountdown(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace('Juego', {
        roomId: rId,
        jugadores: jugs,
        modo: m,
        socket,
        jugador
      });
    });

    // Alguien salió
    socket.on('lobby_player_left', ({ nombre }) => {
      setYoListo(false);
    });

    socket.on('lobby_error', ({ error }) => {
      Alert.alert('Lobby', error);
    });

    return () => {
      socket.off('lobby_state');
      socket.off('lobby_countdown');
      socket.off('lobby_start');
      socket.off('lobby_player_left');
      socket.off('lobby_error');
    };
  }, [socket, roomId]);

  // Animación botón listo
  useEffect(() => {
    if (yoListo) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulsoListo, { toValue: 1.05, duration: 700, useNativeDriver: true }),
          Animated.timing(pulsoListo, { toValue: 1,    duration: 700, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulsoListo.stopAnimation();
      pulsoListo.setValue(1);
    }
  }, [yoListo]);

  // ── CAMBIAR POSICIÓN ──────────────────────────────────────────
  const cambiarPosicion = (nuevaPosicion) => {
    if (!socket || yoListo) return; // No cambiar si ya está listo
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    socket.emit('lobby_switch', { roomId, posicion: nuevaPosicion });
  };

  // ── MARCAR LISTO ──────────────────────────────────────────────
  const toggleListo = () => {
    if (!socket) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    socket.emit('lobby_ready', { roomId });
  };

  // ── SALIR DEL LOBBY ───────────────────────────────────────────
  const salir = () => {
    Alert.alert(
      'Salir del lobby',
      '¿Seguro que quieres salir? Perderás tu lugar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir', style: 'destructive', onPress: () => {
            socket?.emit('lobby_cancel', { roomId });
            navigation.goBack();
          }
        }
      ]
    );
  };

  // ── COMPARTIR CÓDIGO DE SALA ──────────────────────────────────
  const compartirSala = async () => {
    try {
      await Share.share({
        message: `¡Únete a mi sala de dominó! 🎲\nCódigo: ${roomId.toUpperCase()}\nDescarga Dominó Real RD 🇩🇴`
      });
    } catch (e) {}
  };

  // ── RENDER: SLOT DE JUGADOR ───────────────────────────────────
  const renderSlot = (posicion) => {
    const jugEn = lobbyState.jugadores.find(j => j.posicion === posicion);
    const esEquipoAzul = posicion % 2 === 0;
    const esYo = jugEn?.id === jugador?.id;
    const info = POSICIONES_INFO[posicion];
    const colorEquipo = esEquipoAzul ? COLORES.azulEquipo : COLORES.rojoEquipo;

    return (
      <TouchableOpacity
        key={posicion}
        style={[
          estilos.slot,
          { borderColor: colorEquipo },
          jugEn && estilos.slotOcupado,
          !jugEn && estilos.slotVacio
        ]}
        onPress={() => !jugEn && cambiarPosicion(posicion)}
        activeOpacity={jugEn ? 1 : 0.7}
        disabled={!!jugEn && !esYo}
      >
        {jugEn ? (
          // Slot ocupado
          <View style={estilos.slotContenido}>
            <View style={[estilos.slotAvatar, { backgroundColor: colorEquipo }]}>
              <Text style={estilos.slotAvatarEmoji}>👤</Text>
              {jugEn.listo && (
                <View style={estilos.listoIndicador}>
                  <Text style={{ fontSize: 10 }}>✅</Text>
                </View>
              )}
            </View>
            <Text style={estilos.slotNombre} numberOfLines={1}>
              {jugEn.nombre}{esYo ? ' (Tú)' : ''}
            </Text>
            <Text style={estilos.slotElo}>⚡{jugEn.elo} · {jugEn.pais}</Text>
            <Text style={[estilos.slotEstado, jugEn.listo ? { color: '#4CAF50' } : { color: '#888' }]}>
              {jugEn.listo ? '✅ Listo' : '⏳ Esperando...'}
            </Text>
          </View>
        ) : (
          // Slot vacío — toca para cambiarte aquí
          <View style={estilos.slotContenido}>
            <Text style={estilos.slotVacioEmoji}>➕</Text>
            <Text style={[estilos.slotVacioTexto, { color: colorEquipo }]}>
              {info.lugar}
            </Text>
            <Text style={estilos.slotVacioSub}>Toca para unirte aquí</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ── MAIN RENDER ───────────────────────────────────────────────
  return (
    <View style={estilos.contenedor}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <LinearGradient
        colors={[COLORES.negro, COLORES.grisOscuro]}
        style={estilos.header}
      >
        <TouchableOpacity onPress={salir} style={estilos.backBtn}>
          <Text style={estilos.backTexto}>←</Text>
        </TouchableOpacity>

        <View style={estilos.headerInfo}>
          <Text style={estilos.headerTitulo}>
            {modo === 'vs_ia'    ? '🤖 Vs Inteligencia IA' :
             modo === 'practica' ? '🏋️ Modo Práctica' :
                                   '🎲 Sala de Espera'}
          </Text>
          <Text style={estilos.headerSub}>
            {lobbyState.total}/{maxJugadores} jugadores
            {lobbyState.totalListos > 0 ? ` · ${lobbyState.totalListos} listo${lobbyState.totalListos !== 1 ? 's' : ''}` : ''}
          </Text>
        </View>

        {modo === 'online' && (
          <TouchableOpacity onPress={compartirSala} style={estilos.shareBtn}>
            <Text style={estilos.shareBtnTexto}>📤</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* ── CUENTA REGRESIVA ────────────────────────────────── */}
      {countdown !== null && (
        <View style={estilos.countdownOverlay}>
          <Text style={estilos.countdownNumero}>{countdown}</Text>
          <Text style={estilos.countdownTexto}>¡Comenzando!</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={estilos.scroll} showsVerticalScrollIndicator={false}>

        {/* ── MESA DE DOMINÓ (4 slots en forma de cruz) ─────── */}
        <View style={estilos.mesa}>

          {/* Cabecera: Equipo Azul vs Equipo Rojo */}
          <View style={estilos.equiposHeader}>
            <View style={[estilos.equipoBadge, { backgroundColor: COLORES.azulEquipo }]}>
              <Text style={estilos.equipoBadgeTexto}>🔵 Equipo Azul</Text>
            </View>
            <Text style={estilos.vsTexto}>VS</Text>
            <View style={[estilos.equipoBadge, { backgroundColor: COLORES.rojoEquipo }]}>
              <Text style={estilos.equipoBadgeTexto}>🔴 Equipo Rojo</Text>
            </View>
          </View>

          {/* Fila superior: pos 2 (Azul Norte) y pos 3 (Rojo Norte) */}
          <View style={estilos.filaSlots}>
            {renderSlot(2)}
            {renderSlot(3)}
          </View>

          {/* Mesa visual */}
          <View style={estilos.mesaVisual}>
            <LinearGradient
              colors={['#2E7D32', '#1B5E20']}
              style={estilos.tableroMesa}
            >
              <Text style={estilos.tableroTexto}>🎲</Text>
              <Text style={estilos.tableroSub}>Mesa de Dominó</Text>
            </LinearGradient>
          </View>

          {/* Fila inferior: pos 0 (Azul Sur) y pos 1 (Rojo Sur) */}
          <View style={estilos.filaSlots}>
            {renderSlot(0)}
            {renderSlot(1)}
          </View>
        </View>

        {/* ── CÓDIGO DE SALA ──────────────────────────────────── */}
        {modo === 'online' && (
          <TouchableOpacity onPress={compartirSala} style={estilos.codigoWrap}>
            <Text style={estilos.codigoLabel}>Código de sala (comparte con amigos)</Text>
            <Text style={estilos.codigoCodigo}>{roomId?.toUpperCase()}</Text>
            <Text style={estilos.codigoToca}>Toca para compartir 📤</Text>
          </TouchableOpacity>
        )}

        {/* ── BOTÓN LISTO ─────────────────────────────────────── */}
        <Animated.View style={{ transform: [{ scale: pulsoListo }] }}>
          <TouchableOpacity
            onPress={toggleListo}
            style={[estilos.btnListo, yoListo && estilos.btnListoActivo]}
            activeOpacity={0.8}
          >
            <Text style={estilos.btnListoTexto}>
              {yoListo ? '✅  ¡Estoy Listo! (toca para desmarcar)' : '🎲  Marcar como Listo'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Hint de cambio de equipo */}
        {!yoListo && (
          <Text style={estilos.hint}>
            💡 Toca un slot vacío para cambiar de posición o equipo
          </Text>
        )}

        {/* Progreso de listos */}
        {modo === 'online' && (
          <View style={estilos.progresoWrap}>
            <Text style={estilos.progresoTexto}>
              {lobbyState.totalListos}/{maxJugadores} listos para jugar
            </Text>
            <View style={estilos.progresoBar}>
              <View
                style={[
                  estilos.progresoFill,
                  { width: `${(lobbyState.totalListos / maxJugadores) * 100}%` }
                ]}
              />
            </View>
            {lobbyState.total < maxJugadores && (
              <Text style={estilos.esperandoMasTexto}>
                Esperando {maxJugadores - lobbyState.total} jugador{maxJugadores - lobbyState.total !== 1 ? 'es' : ''} más...
              </Text>
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

// ── ESTILOS ───────────────────────────────────────────────────
const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.negro },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 38,
    paddingBottom: 14, paddingHorizontal: 16, gap: 10
  },
  backBtn:    { padding: 8 },
  backTexto:  { color: COLORES.blanco, fontSize: 24, fontWeight: 'bold' },
  headerInfo: { flex: 1 },
  headerTitulo: { color: COLORES.blanco, fontSize: 18, fontWeight: 'bold' },
  headerSub:    { color: COLORES.oro, fontSize: 13, marginTop: 2 },
  shareBtn:   { padding: 10 },
  shareBtnTexto: { fontSize: 22 },

  // Cuenta regresiva overlay
  countdownOverlay: {
    position: 'absolute', zIndex: 100,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center', justifyContent: 'center'
  },
  countdownNumero: {
    color: COLORES.oro, fontSize: 120, fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 20
  },
  countdownTexto: { color: COLORES.blanco, fontSize: 24, fontWeight: '600', marginTop: -20 },

  // Scroll
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },

  // Mesa
  mesa: { gap: 12 },

  equiposHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 4
  },
  equipoBadge: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, flex: 1
  },
  equipoBadgeTexto: {
    color: COLORES.blanco, fontSize: 13, fontWeight: 'bold', textAlign: 'center'
  },
  vsTexto: {
    color: COLORES.oro, fontSize: 18, fontWeight: 'bold', marginHorizontal: 10
  },

  filaSlots: {
    flexDirection: 'row', gap: 10
  },

  // Slot
  slot: {
    flex: 1, borderRadius: 14, borderWidth: 2,
    padding: 12, minHeight: 120,
    alignItems: 'center', justifyContent: 'center'
  },
  slotOcupado: { backgroundColor: 'rgba(255,255,255,0.05)' },
  slotVacio:   { backgroundColor: 'rgba(255,255,255,0.03)', borderStyle: 'dashed' },

  slotContenido: { alignItems: 'center', gap: 4 },
  slotAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative'
  },
  slotAvatarEmoji:  { fontSize: 22 },
  listoIndicador: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#000', borderRadius: 8, padding: 1
  },
  slotNombre: {
    color: COLORES.blanco, fontSize: 13, fontWeight: 'bold', textAlign: 'center'
  },
  slotElo:    { color: '#aaa', fontSize: 11 },
  slotEstado: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  slotVacioEmoji: { fontSize: 24, marginBottom: 4 },
  slotVacioTexto: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  slotVacioSub:   { color: '#555', fontSize: 11, textAlign: 'center', marginTop: 2 },

  // Mesa visual (centro)
  mesaVisual: { alignItems: 'center', marginVertical: 4 },
  tableroMesa: {
    width: 120, height: 60, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', gap: 2
  },
  tableroTexto: { fontSize: 22 },
  tableroSub:   { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '600' },

  // Código de sala
  codigoWrap: {
    backgroundColor: COLORES.grisMedio,
    borderRadius: 14, padding: 14, alignItems: 'center', gap: 4
  },
  codigoLabel:  { color: '#888', fontSize: 12 },
  codigoCodigo: { color: COLORES.oro, fontSize: 24, fontWeight: 'bold', letterSpacing: 4 },
  codigoToca:   { color: '#666', fontSize: 12, marginTop: 2 },

  // Botón listo
  btnListo: {
    backgroundColor: COLORES.grisMedio,
    borderRadius: 16, padding: 18, alignItems: 'center',
    borderWidth: 2, borderColor: '#444'
  },
  btnListoActivo: {
    backgroundColor: COLORES.verde,
    borderColor: '#4CAF50'
  },
  btnListoTexto: { color: COLORES.blanco, fontSize: 16, fontWeight: 'bold' },

  hint: { color: '#555', fontSize: 12, textAlign: 'center', marginTop: -8 },

  // Progreso
  progresoWrap:   { gap: 6 },
  progresoTexto:  { color: '#aaa', fontSize: 13, textAlign: 'center' },
  progresoBar: {
    height: 8, backgroundColor: '#2A2A3A',
    borderRadius: 4, overflow: 'hidden'
  },
  progresoFill: {
    height: '100%', backgroundColor: COLORES.oro,
    borderRadius: 4
  },
  esperandoMasTexto: {
    color: '#666', fontSize: 12, textAlign: 'center', fontStyle: 'italic'
  }
});
