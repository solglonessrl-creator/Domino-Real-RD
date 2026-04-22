/**
 * ResultadosScreenNative.js — Dominó Real RD
 * ──────────────────────────────────────────
 * Pantalla post-partida: muestra ganador, ELO, stats, capicúas,
 * opciones de revancha y compartir resultado.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Share, Platform, StatusBar, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const C = {
  azul:       '#002D62',
  azulClaro:  '#1565C0',
  rojo:       '#CF142B',
  blanco:     '#FFFFFF',
  oro:        '#FFD700',
  negro:      '#0A0A0A',
  oscuro:     '#1A1A2E',
  medio:      '#2C2C54',
  verde:      '#1B5E20',
  verdeClaro: '#4CAF50',
};

// ── Determinar nombre del equipo ───────────────────────────────
function nombreEquipo(clave) {
  return clave === 'equipo0' ? 'Equipo Azul 🔵' : 'Equipo Rojo 🔴';
}
function colorEquipo(clave) {
  return clave === 'equipo0' ? '#64B5F6' : '#EF9A9A';
}

// ── Componente: Stat card ──────────────────────────────────────
function StatCard({ emoji, label, valor, color = C.oro }) {
  return (
    <View style={est.statCard}>
      <Text style={{ fontSize: 26 }}>{emoji}</Text>
      <Text style={[est.statValor, { color }]}>{valor}</Text>
      <Text style={est.statLabel}>{label}</Text>
    </View>
  );
}

// ── Componente: Jugador resultado ──────────────────────────────
function JugadorResult({ nombre, pais, elo, eloChange, ganador }) {
  const eloPos = (eloChange || 0) >= 0;
  return (
    <View style={[est.jugadorRow, ganador && est.jugadorRowGanador]}>
      <View style={est.jugadorAvatar}>
        <Text style={{ fontSize: 22 }}>👤</Text>
        {ganador && <Text style={est.ganadorBadge}>🏆</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={est.jugadorNombre}>{nombre}</Text>
        <Text style={est.jugadorPais}>{pais || '🇩🇴'} · ELO: {elo || 1200}</Text>
      </View>
      {eloChange !== undefined && (
        <View style={[est.eloChip, { backgroundColor: eloPos ? `${C.verde}60` : `${C.rojo}40` }]}>
          <Text style={[est.eloChipTexto, { color: eloPos ? C.verdeClaro : '#EF9A9A' }]}>
            {eloPos ? '+' : ''}{eloChange}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── PANTALLA PRINCIPAL ─────────────────────────────────────────
export default function ResultadosScreenNative({ route, navigation }) {
  const {
    campeon       = 'equipo0',
    puntosTotales = { equipo0: 200, equipo1: 120 },
    jugadores     = [],
    miPosicion    = 0,
    rondas        = 1,
    socket,
    roomId,
  } = route.params || {};

  const miEquipo = miPosicion % 2 === 0 ? 'equipo0' : 'equipo1';
  const yoGané   = campeon === miEquipo;

  // ── Animaciones de entrada ──────────────────────────────────
  const trofeoAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const scaleAnim  = useRef(new Animated.Value(0.5)).current;

  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  useEffect(() => {
    // Secuencia de entrada dramática
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(trofeoAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(trofeoAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // Vibración al entrar
    if (yoGané) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    setTimeout(() => setMostrarDetalle(true), 800);
  }, []);

  const compartir = async () => {
    try {
      const ganadorNombre = nombreEquipo(campeon);
      const misPoints     = puntosTotales[miEquipo] || 0;
      await Share.share({
        message: `🎲 ¡Terminé una partida en Dominó Real RD!\n\n` +
          `🏆 Ganó: ${ganadorNombre}\n` +
          `📊 Azul: ${puntosTotales.equipo0} pts · Rojo: ${puntosTotales.equipo1} pts\n` +
          `🎮 ${rondas} mano${rondas !== 1 ? 's' : ''} jugada${rondas !== 1 ? 's' : ''}\n\n` +
          `Descarga Dominó Real RD 🇩🇴 ¡El dominó dominicano del mundo!`
      });
    } catch (e) {}
  };

  const irInicio = () => navigation.navigate('Main');

  // ── Simulación de cambio de ELO (el servidor lo da; aquí mockeamos) ──────
  const eloGanador  = 25;
  const eloPerdedor = -18;

  const ptsGanador  = puntosTotales[campeon] || 0;
  const ptsPerdedor = puntosTotales[campeon === 'equipo0' ? 'equipo1' : 'equipo0'] || 0;

  const jugEquipo0 = jugadores.filter(j => j.posicion % 2 === 0);
  const jugEquipo1 = jugadores.filter(j => j.posicion % 2 !== 0);

  return (
    <View style={est.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor={C.azul} />

      {/* ── HEADER GANADOR ─────────────────────────────────── */}
      <LinearGradient
        colors={yoGané
          ? [C.verde, '#2E7D32', C.oscuro]
          : [C.rojo, '#7B1FA2', C.oscuro]}
        style={est.header}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <Animated.Text style={[
          { fontSize: 70 },
          {
            transform: [{
              translateY: trofeoAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -10]
              })
            }]
          }
        ]}>
          {yoGané ? '🏆' : '😤'}
        </Animated.Text>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
          <Text style={est.resultadoTexto}>
            {yoGané ? '¡GANASTE!' : 'Perdiste...'}
          </Text>
          <Text style={est.equipoGanadorTexto}>
            {nombreEquipo(campeon)} gana la partida
          </Text>
          <View style={est.puntajeRow}>
            <Text style={[est.puntaje, { color: '#64B5F6' }]}>{puntosTotales.equipo0}</Text>
            <Text style={est.puntajeSep}>—</Text>
            <Text style={[est.puntaje, { color: '#EF9A9A' }]}>{puntosTotales.equipo1}</Text>
          </View>
          <Text style={est.rondasText}>{rondas} mano{rondas !== 1 ? 's' : ''} jugada{rondas !== 1 ? 's' : ''}</Text>
        </Animated.View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── STATS RÁPIDAS ─────────────────────────────────── */}
        {mostrarDetalle && (
          <View style={est.statsRow}>
            <StatCard emoji="📊" label="Puntos ganador" valor={ptsGanador} color={C.oro} />
            <StatCard emoji="🏅" label="Puntos perdedor" valor={ptsPerdedor} color={`${C.blanco}70`} />
            <StatCard emoji="🎲" label="Manos" valor={rondas} color={C.azulClaro} />
          </View>
        )}

        {/* ── CAMBIO DE ELO ─────────────────────────────────── */}
        <View style={est.eloSeccion}>
          <Text style={est.seccionTitulo}>⚡ CAMBIO DE ELO</Text>
          <View style={est.eloRow}>
            <View style={[est.eloBox, { borderColor: '#4CAF50' }]}>
              <Text style={est.eloBoxLabel}>Ganador</Text>
              <Text style={[est.eloBoxNum, { color: C.verdeClaro }]}>+{eloGanador}</Text>
              <Text style={est.eloBoxEquipo}>{nombreEquipo(campeon)}</Text>
            </View>
            <View style={[est.eloBox, { borderColor: '#EF9A9A' }]}>
              <Text style={est.eloBoxLabel}>Perdedor</Text>
              <Text style={[est.eloBoxNum, { color: '#EF9A9A' }]}>{eloPerdedor}</Text>
              <Text style={est.eloBoxEquipo}>{nombreEquipo(campeon === 'equipo0' ? 'equipo1' : 'equipo0')}</Text>
            </View>
          </View>
        </View>

        {/* ── JUGADORES ─────────────────────────────────────── */}
        <View style={est.jugadoresSeccion}>
          <Text style={est.seccionTitulo}>👥 JUGADORES</Text>

          <View style={est.equipoCard}>
            <Text style={[est.equipoCardTitulo, { color: '#64B5F6' }]}>
              🔵 Equipo Azul — {puntosTotales.equipo0} pts
            </Text>
            {jugEquipo0.map(j => (
              <JugadorResult
                key={j.id || j.posicion}
                nombre={j.nombre}
                pais={j.pais}
                elo={j.elo}
                eloChange={campeon === 'equipo0' ? eloGanador : eloPerdedor}
                ganador={campeon === 'equipo0'}
              />
            ))}
          </View>

          <View style={[est.equipoCard, { marginTop: 10 }]}>
            <Text style={[est.equipoCardTitulo, { color: '#EF9A9A' }]}>
              🔴 Equipo Rojo — {puntosTotales.equipo1} pts
            </Text>
            {jugEquipo1.map(j => (
              <JugadorResult
                key={j.id || j.posicion}
                nombre={j.nombre}
                pais={j.pais}
                elo={j.elo}
                eloChange={campeon === 'equipo1' ? eloGanador : eloPerdedor}
                ganador={campeon === 'equipo1'}
              />
            ))}
          </View>
        </View>

        {/* ── MENSAJE MOTIVACIONAL ──────────────────────────── */}
        <View style={est.mensajeMotiv}>
          <Text style={est.mensajeMotivTexto}>
            {yoGané
              ? '🔥 ¡Dominó Real RD! ¡Así se juega en las calles dominicanas!'
              : '💪 El que se cae se levanta. ¡Revancha!'}
          </Text>
        </View>

        {/* ── BOTONES ───────────────────────────────────────── */}
        <View style={est.botones}>
          <TouchableOpacity
            style={est.btnPrimario}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              irInicio();
            }}
          >
            <LinearGradient colors={[C.azul, C.azulClaro]} style={est.btnGrad}>
              <Text style={est.btnTexto}>🏠 Volver al inicio</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={est.botonesRow}>
            <TouchableOpacity style={[est.btnSecundario, { flex: 1 }]} onPress={compartir}>
              <Text style={est.btnSecTexto}>📤 Compartir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[est.btnSecundario, { flex: 1, marginLeft: 10, borderColor: C.oro }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                // Revancha: ir al Lobby con el mismo roomId
                navigation.navigate('Lobby', {
                  roomId: roomId ? `rev_${roomId}_${Date.now()}` : `rev_${Date.now()}`,
                  modo:   'online',
                  socket,
                  jugadores,
                });
              }}
            >
              <Text style={[est.btnSecTexto, { color: C.oro }]}>🔄 Revancha</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const est = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.negro },
  header: {
    paddingTop:    Platform.OS === 'ios' ? 54 : StatusBar.currentHeight + 16,
    paddingBottom: 30,
    alignItems:    'center',
    paddingHorizontal: 20,
  },
  resultadoTexto: {
    color: C.blanco, fontWeight: 'bold',
    fontSize: 34, letterSpacing: 3, marginTop: 12
  },
  equipoGanadorTexto: {
    color: `${C.blanco}90`, fontSize: 14, marginTop: 6
  },
  puntajeRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 16
  },
  puntaje:    { fontSize: 42, fontWeight: 'bold' },
  puntajeSep: { color: `${C.blanco}50`, fontSize: 24 },
  rondasText: { color: `${C.blanco}60`, fontSize: 12, marginTop: 6, letterSpacing: 1 },
  statsRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 20, gap: 10
  },
  statCard: {
    flex: 1, backgroundColor: C.oscuro, borderRadius: 14,
    alignItems: 'center', padding: 14,
    borderWidth: 1, borderColor: `${C.blanco}15`
  },
  statValor:  { fontWeight: 'bold', fontSize: 22, marginTop: 4 },
  statLabel:  { color: `${C.blanco}60`, fontSize: 10, marginTop: 2, textAlign: 'center' },
  eloSeccion: { paddingHorizontal: 16, marginTop: 20 },
  seccionTitulo: {
    color: `${C.blanco}60`, fontSize: 11, letterSpacing: 2, marginBottom: 10
  },
  eloRow: { flexDirection: 'row', gap: 10 },
  eloBox: {
    flex: 1, backgroundColor: C.oscuro, borderRadius: 14,
    padding: 16, alignItems: 'center',
    borderWidth: 1.5,
  },
  eloBoxLabel: { color: `${C.blanco}70`, fontSize: 11 },
  eloBoxNum:   { fontSize: 30, fontWeight: 'bold', marginVertical: 4 },
  eloBoxEquipo: { color: `${C.blanco}60`, fontSize: 10, textAlign: 'center' },
  jugadoresSeccion: { paddingHorizontal: 16, marginTop: 20 },
  equipoCard: {
    backgroundColor: C.oscuro, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: `${C.blanco}15`
  },
  equipoCardTitulo: { fontWeight: 'bold', fontSize: 13, marginBottom: 10 },
  jugadorRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: `${C.blanco}10`
  },
  jugadorRowGanador: { backgroundColor: `${C.verde}15`, borderRadius: 10, paddingHorizontal: 6 },
  jugadorAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.medio, alignItems: 'center', justifyContent: 'center',
    marginRight: 12, position: 'relative'
  },
  ganadorBadge: {
    position: 'absolute', top: -6, right: -6, fontSize: 14
  },
  jugadorNombre: { color: C.blanco, fontWeight: 'bold', fontSize: 13 },
  jugadorPais:   { color: `${C.blanco}60`, fontSize: 11, marginTop: 2 },
  eloChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10
  },
  eloChipTexto: { fontWeight: 'bold', fontSize: 14 },
  mensajeMotiv: {
    margin: 16, padding: 16,
    backgroundColor: `${C.azul}40`, borderRadius: 14,
    borderWidth: 1, borderColor: `${C.azul}80`
  },
  mensajeMotivTexto: {
    color: `${C.blanco}90`, textAlign: 'center', fontSize: 13, lineHeight: 20
  },
  botones: { paddingHorizontal: 16 },
  btnPrimario: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  btnGrad: { padding: 16, alignItems: 'center' },
  btnTexto: { color: C.blanco, fontWeight: 'bold', fontSize: 16 },
  botonesRow: { flexDirection: 'row' },
  btnSecundario: {
    backgroundColor: C.oscuro, borderRadius: 16,
    padding: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: `${C.blanco}30`
  },
  btnSecTexto: { color: C.blanco, fontWeight: 'bold', fontSize: 14 },
});
