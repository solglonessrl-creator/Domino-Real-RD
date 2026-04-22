/**
 * Domino Real RD — Pantalla "Buscando Partida"
 * Matchmaking automático por ELO + navegación al Lobby
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, Alert, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://domino-real-rd-production.up.railway.app/api';

const COLORES = {
  azulRD:    '#002D62',
  azulClaro: '#1565C0',
  rojoRD:    '#CF142B',
  blanco:    '#FFFFFF',
  oro:       '#FFD700',
  negro:     '#0A0A0A',
  grisOscuro:'#1A1A2E',
  grisMedio: '#2C2C54'
};

const MENSAJES_ESPERA = [
  '🎲 Buscando rivales dignos...',
  '🔥 Preparando el dominó...',
  '🇩🇴 Conectando dominicanos...',
  '♟️ Analizando ELO de jugadores...',
  '⚡ Casi listos para jugar...',
  '🏆 Buscando el mejor match...',
  '💪 Los mejores jugadores están llegando...',
  '🎯 Encontrando tu pareja ideal...'
];

export default function BuscandoScreenNative({ navigation, route, jugador, socket }) {
  const { modo = 'online' } = route.params || {};

  const [estado,        setEstado]        = useState('buscando'); // buscando | encontrado | timeout
  const [jugadoresEncontrados, setJugadoresEncontrados] = useState(0);
  const [segundos,      setSegundos]      = useState(0);
  const [mensajeIdx,    setMensajeIdx]    = useState(0);
  const [cancelando,    setCancelando]    = useState(false);

  const jugadorIdRef = useRef(jugador?.id);
  const pollingRef   = useRef(null);
  const mensajeRef   = useRef(null);
  const cronómetroRef = useRef(null);
  const buscandoRef  = useRef(true);

  // Animaciones
  const pulso    = useRef(new Animated.Value(1)).current;
  const rotacion = useRef(new Animated.Value(0)).current;
  const opacidad = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacidad, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    iniciarAnimaciones();
    iniciarBusqueda();

    return () => detener();
  }, []);

  // ── ANIMACIONES ───────────────────────────────────────────────
  const iniciarAnimaciones = () => {
    // Pulso del dado
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1.18, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 1,    duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();

    // Rotación del ring
    Animated.loop(
      Animated.timing(rotacion, { toValue: 1, duration: 2500, easing: Easing.linear, useNativeDriver: true })
    ).start();
  };

  const spinInterpolado = rotacion.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg']
  });

  // ── LÓGICA DE BÚSQUEDA ────────────────────────────────────────
  const iniciarBusqueda = async () => {
    buscandoRef.current = true;

    // Cronómetro
    cronómetroRef.current = setInterval(() => {
      setSegundos(prev => prev + 1);
    }, 1000);

    // Rotar mensajes
    mensajeRef.current = setInterval(() => {
      setMensajeIdx(prev => (prev + 1) % MENSAJES_ESPERA.length);
    }, 3000);

    // Primera búsqueda
    await buscarPartida();

    // Polling cada 3 segundos
    pollingRef.current = setInterval(async () => {
      if (!buscandoRef.current) return;
      await buscarPartida();
    }, 3000);
  };

  const buscarPartida = async () => {
    if (!buscandoRef.current) return;

    try {
      const token = await AsyncStorage.getItem('domino_token');

      const resp = await fetch(`${API_URL}/matchmaking/buscar`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          jugadorId: jugador?.id,
          elo:       jugador?.elo || 1200,
          modo
        })
      });

      if (!resp.ok) return;
      const data = await resp.json();

      if (!data.exito) return;

      setJugadoresEncontrados(data.jugadores?.length || (data.posicionEnCola ? 1 : 0));

      if (data.emparejado && data.roomId) {
        // ¡Match encontrado!
        buscandoRef.current = false;
        setEstado('encontrado');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        detener();

        // Ir al Lobby
        setTimeout(() => {
          navigation.replace('Lobby', {
            roomId:    data.roomId,
            jugadores: data.jugadores,
            modo,
            socket
          });
        }, 800);
      }
    } catch (e) {
      console.warn('[Matchmaking]', e.message);
    }
  };

  const detener = () => {
    buscandoRef.current = false;
    clearInterval(pollingRef.current);
    clearInterval(mensajeRef.current);
    clearInterval(cronómetroRef.current);
  };

  // ── CANCELAR ─────────────────────────────────────────────────
  const cancelar = async () => {
    if (cancelando) return;
    setCancelando(true);
    detener();

    try {
      const token = await AsyncStorage.getItem('domino_token');
      await fetch(`${API_URL}/matchmaking/cancelar/${jugador?.id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {}

    navigation.goBack();
  };

  // ── JUGAR VS IA (timeout) ────────────────────────────────────
  const jugarVsIA = () => {
    detener();
    const roomId = `ia_${Date.now()}`;
    navigation.replace('Lobby', {
      roomId,
      modo:   'vs_ia',
      socket
    });
  };

  const formatearTiempo = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ── UI ───────────────────────────────────────────────────────
  return (
    <LinearGradient
      colors={[COLORES.negro, COLORES.grisOscuro, COLORES.azulRD]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={estilos.contenedor}
    >
      <Animated.View style={[estilos.todo, { opacity: opacidad }]}>

        {/* Título */}
        <Text style={estilos.titulo}>
          {estado === 'encontrado' ? '¡Partida Encontrada! 🎉' : 'Buscando Partida'}
        </Text>
        <Text style={estilos.subtitulo}>
          {estado === 'encontrado' ? 'Entrando al lobby...' : modo === 'online' ? 'Matchmaking por ELO' : 'Modo vs Inteligencia Artificial'}
        </Text>

        {/* Dado animado con ring */}
        <View style={estilos.dadoWrap}>
          <Animated.View style={[estilos.ring, { transform: [{ rotate: spinInterpolado }] }]} />
          <Animated.Text style={[estilos.dado, { transform: [{ scale: pulso }] }]}>
            {estado === 'encontrado' ? '✅' : '🎲'}
          </Animated.Text>
        </View>

        {/* Jugadores encontrados */}
        {modo === 'online' && estado !== 'encontrado' && (
          <View style={estilos.jugadoresWrap}>
            {[0, 1, 2, 3].map(i => (
              <View
                key={i}
                style={[
                  estilos.jugadorSlot,
                  i < jugadoresEncontrados ? estilos.jugadorSlotLleno : estilos.jugadorSlotVacio
                ]}
              >
                <Text style={estilos.jugadorSlotTexto}>
                  {i < jugadoresEncontrados ? '👤' : '?'}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={estilos.contadorTexto}>
          {modo === 'online' && estado !== 'encontrado'
            ? `${jugadoresEncontrados}/4 jugadores`
            : estado === 'encontrado' ? '4/4 ¡Todos listos!' : ''}
        </Text>

        {/* Mensaje dinámico */}
        {estado !== 'encontrado' && (
          <Text style={estilos.mensajeEspera}>
            {MENSAJES_ESPERA[mensajeIdx]}
          </Text>
        )}

        {/* Cronómetro */}
        {estado !== 'encontrado' && (
          <Text style={estilos.cronometro}>⏱ {formatearTiempo(segundos)}</Text>
        )}

        {/* ELO del jugador */}
        <View style={estilos.eloWrap}>
          <Text style={estilos.eloTexto}>
            Tu ELO: ⚡ {jugador?.elo || 1200} · {jugador?.liga || 'Bronce'}
          </Text>
          {modo === 'online' && (
            <Text style={estilos.eloRango}>
              Buscando jugadores entre {(jugador?.elo || 1200) - 200} – {(jugador?.elo || 1200) + 200} ELO
            </Text>
          )}
        </View>

        {/* Botones */}
        {estado !== 'encontrado' && (
          <View style={estilos.botones}>
            {/* Si lleva más de 25 segundos, ofrecer vs IA */}
            {segundos > 25 && modo === 'online' && (
              <TouchableOpacity onPress={jugarVsIA} style={estilos.btnIA}>
                <Text style={estilos.btnIATexto}>🤖 Jugar vs IA mientras espero</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={cancelar}
              style={estilos.btnCancelar}
              disabled={cancelando}
            >
              <Text style={estilos.btnCancelarTexto}>
                {cancelando ? 'Cancelando...' : '✕ Cancelar búsqueda'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

      </Animated.View>
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1 },
  todo: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 30, gap: 16
  },

  titulo: {
    color: COLORES.blanco, fontSize: 26, fontWeight: 'bold',
    textAlign: 'center', letterSpacing: 0.5
  },
  subtitulo: {
    color: COLORES.oro, fontSize: 14, textAlign: 'center', marginTop: -8
  },

  // Dado con ring
  dadoWrap: {
    width: 140, height: 140,
    alignItems: 'center', justifyContent: 'center',
    marginVertical: 10
  },
  ring: {
    position: 'absolute',
    width: 130, height: 130, borderRadius: 65,
    borderWidth: 3,
    borderColor: COLORES.oro,
    borderTopColor:   'transparent',
    borderRightColor: 'transparent'
  },
  dado: { fontSize: 72 },

  // Slots jugadores
  jugadoresWrap: {
    flexDirection: 'row', gap: 12, marginTop: 4
  },
  jugadorSlot: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2
  },
  jugadorSlotLleno: {
    backgroundColor: COLORES.azulClaro,
    borderColor: COLORES.oro
  },
  jugadorSlotVacio: {
    backgroundColor: COLORES.grisMedio,
    borderColor: '#444'
  },
  jugadorSlotTexto: { fontSize: 22 },

  contadorTexto: {
    color: COLORES.blanco, fontSize: 16, fontWeight: '600', marginTop: -4
  },

  mensajeEspera: {
    color: '#aaa', fontSize: 15, textAlign: 'center', fontStyle: 'italic'
  },

  cronometro: {
    color: COLORES.oro, fontSize: 20, fontWeight: 'bold',
    fontVariant: ['tabular-nums']
  },

  eloWrap: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 4,
    width: '100%', marginTop: 4
  },
  eloTexto: { color: COLORES.blanco, fontSize: 15, fontWeight: '600' },
  eloRango: { color: '#888', fontSize: 12 },

  botones: { width: '100%', gap: 12, marginTop: 8 },

  btnIA: {
    backgroundColor: '#1B5E20',
    borderRadius: 14, padding: 14, alignItems: 'center'
  },
  btnIATexto: { color: COLORES.blanco, fontSize: 15, fontWeight: '600' },

  btnCancelar: {
    backgroundColor: 'rgba(207,20,43,0.2)',
    borderRadius: 14, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: COLORES.rojoRD
  },
  btnCancelarTexto: { color: COLORES.rojoRD, fontSize: 15, fontWeight: '600' }
});
