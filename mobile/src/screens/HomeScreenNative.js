/**
 * Domino Real RD — Home Screen (React Native)
 * Versión nativa optimizada para Android/iOS
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, StatusBar, Dimensions, Platform, Vibration
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const COLORES = {
  azulRD: '#002D62', azulClaro: '#1565C0',
  rojoRD: '#CF142B', blanco: '#FFFFFF',
  oro: '#FFD700', negro: '#0A0A0A',
  grisOscuro: '#1A1A2E', grisMedio: '#2C2C54'
};

const modosBotones = [
  { id: 'rapida',   icono: '⚡', titulo: 'Partida Rápida',     sub: 'Matchmaking automático',    colores: ['#002D62', '#1565C0'] },
  { id: 'amigos',   icono: '👥', titulo: 'Jugar con Amigos',   sub: 'Sala privada',              colores: ['#2C2C54', '#4A4A8A'] },
  { id: 'vs_ia',    icono: '🤖', titulo: 'Vs Inteligencia IA', sub: 'Fácil · Medio · Difícil',  colores: ['#1B5E20', '#2E7D32'] },
  { id: 'torneos',  icono: '🏆', titulo: 'Torneos',            sub: 'Competir y ganar',          colores: ['#7B1FA2', '#9C27B0'] },
  { id: 'ranking',  icono: '📊', titulo: 'Ranking Global',     sub: 'Clasificación mundial',     colores: ['#CF142B', '#E53935'] },
  { id: 'tienda',   icono: '🛒', titulo: 'Tienda',             sub: 'Fichas, mesas y más',       colores: ['#E65100', '#FF6D00'] }
];

export default function HomeScreenNative({ navigation, jugador }) {
  const [monedas, setMonedas] = useState(jugador?.monedas || 500);
  const [bonoDiario, setBonoDiario] = useState(true);

  const handleBoton = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate(id === 'rapida' ? 'Buscando' : id.charAt(0).toUpperCase() + id.slice(1));
  };

  return (
    <View style={styles.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor={COLORES.azulRD} />

      {/* Header con gradiente dominicano */}
      <LinearGradient
        colors={[COLORES.azulRD, COLORES.grisOscuro, COLORES.rojoRD]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.logoContenedor}>
            <Text style={styles.logoEmoji}>🎲</Text>
            <View>
              <Text style={styles.logoTitulo}>Dominó Real RD</Text>
              <Text style={styles.logoSub}>🇩🇴 EL DOMINÓ DOMINICANO DEL MUNDO</Text>
            </View>
          </View>

          {/* Perfil */}
          <TouchableOpacity onPress={() => navigation.navigate('Perfil')} style={styles.perfilBtn}>
            <View style={styles.avatarCircle}>
              <Text style={{ fontSize: 24 }}>👤</Text>
            </View>
            <Text style={styles.perfilNombre}>{jugador?.nombre || 'Jugador'}</Text>
            <Text style={styles.perfilElo}>🥈 {jugador?.elo || 1200}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValor}>{jugador?.ganadas || 0}</Text>
            <Text style={styles.statLabel}>Ganadas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValor}>{jugador?.elo || 1200}</Text>
            <Text style={styles.statLabel}>ELO</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={[styles.statItem, { flex: 2 }]}>
            <Text style={[styles.statValor, { color: COLORES.oro }]}>🪙 {monedas.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Monedas</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Tienda')}
            style={styles.botonMas}
          >
            <Text style={styles.botonMasTexto}>+ Obtener</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner bono diario */}
        {bonoDiario && (
          <TouchableOpacity style={styles.bannerBono} activeOpacity={0.85}>
            <Text style={{ fontSize: 28 }}>🎁</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.bannerTitulo}>¡Bono diario disponible!</Text>
              <Text style={styles.bannerSub}>Reclama tus 100 monedas gratis</Text>
            </View>
            <Text style={styles.bannerFlecha}>→</Text>
          </TouchableOpacity>
        )}

        {/* Grid de modos */}
        <View style={styles.gridTitulo}>
          <Text style={styles.gridTituloTexto}>MODOS DE JUEGO</Text>
        </View>

        <View style={styles.grid}>
          {modosBotones.map((modo) => (
            <TouchableOpacity
              key={modo.id}
              onPress={() => handleBoton(modo.id)}
              activeOpacity={0.8}
              style={styles.gridItemWrapper}
            >
              <LinearGradient
                colors={modo.colores}
                style={styles.gridItem}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Text style={styles.gridIcono}>{modo.icono}</Text>
                <Text style={styles.gridTituloItem}>{modo.titulo}</Text>
                <Text style={styles.gridSubItem}>{modo.sub}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Banner torneo */}
        <TouchableOpacity
          style={styles.bannerTorneo}
          onPress={() => navigation.navigate('Torneos')}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#7B1FA2', '#9C27B0']} style={styles.bannerTorneoGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitulo}>🏆 Copa Semanal RD</Text>
              <Text style={styles.bannerSub}>Empieza en 2h 30min · 38 inscritos</Text>
            </View>
            <TouchableOpacity style={styles.botonInscribir}>
              <Text style={styles.botonInscribirTexto}>¡Inscribirse!</Text>
            </TouchableOpacity>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.negro },
  header: { paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10, paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  logoContenedor: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoEmoji: { fontSize: 32 },
  logoTitulo: { color: COLORES.blanco, fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  logoSub: { color: COLORES.oro, fontSize: 9, letterSpacing: 1.5, marginTop: 2 },
  perfilBtn: { alignItems: 'flex-end' },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${COLORES.oro}30`, borderWidth: 2, borderColor: COLORES.oro, alignItems: 'center', justifyContent: 'center' },
  perfilNombre: { color: COLORES.blanco, fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  perfilElo: { color: COLORES.oro, fontSize: 11 },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 14, padding: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statValor: { color: COLORES.oro, fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: `${COLORES.blanco}70`, fontSize: 10, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: `${COLORES.blanco}20`, marginHorizontal: 8 },
  botonMas: { backgroundColor: COLORES.oro, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  botonMasTexto: { color: COLORES.negro, fontSize: 11, fontWeight: 'bold' },
  bannerBono: { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 8, backgroundColor: '#1B5E20', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#4CAF50' },
  bannerTitulo: { color: COLORES.blanco, fontSize: 14, fontWeight: 'bold' },
  bannerSub: { color: '#81C784', fontSize: 12, marginTop: 2 },
  bannerFlecha: { color: COLORES.oro, fontSize: 18, fontWeight: 'bold' },
  gridTitulo: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  gridTituloTexto: { color: `${COLORES.blanco}50`, fontSize: 11, letterSpacing: 1.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  gridItemWrapper: { width: (width - 34) / 2 },
  gridItem: { borderRadius: 18, padding: 20, minHeight: 110 },
  gridIcono: { fontSize: 32, marginBottom: 8 },
  gridTituloItem: { color: COLORES.blanco, fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  gridSubItem: { color: `${COLORES.blanco}80`, fontSize: 11 },
  bannerTorneo: { margin: 16, marginTop: 10, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#CE93D8' },
  bannerTorneoGrad: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  botonInscribir: { backgroundColor: COLORES.oro, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  botonInscribirTexto: { color: COLORES.negro, fontWeight: 'bold', fontSize: 13 }
});
