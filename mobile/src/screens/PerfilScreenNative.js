/**
 * Domino Real RD — Perfil Screen Native
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://domino-real-rd-production.up.railway.app/api';
const COLORES = { azulRD: '#002D62', rojoRD: '#CF142B', blanco: '#FFFFFF', oro: '#FFD700', negro: '#0A0A0A', grisOscuro: '#1A1A2E' };

export default function PerfilScreenNative({ navigation, jugador: jugadorProp }) {
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [codigoRef, setCodigoRef] = useState('');

  useEffect(() => { cargarPerfil(); cargarCodigo(); }, []);

  const cargarPerfil = async () => {
    try {
      const token = await AsyncStorage.getItem('domino_token');
      const resp = await fetch(`${API_URL}/ranking/jugador/${jugadorProp?.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await resp.json();
      if (data.exito) setPerfil(data.perfil);
    } catch (e) { console.error(e); }
    setCargando(false);
  };

  const cargarCodigo = async () => {
    try {
      const token = await AsyncStorage.getItem('domino_token');
      const resp = await fetch(`${API_URL}/social/codigo-referido`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json();
      if (data.exito) setCodigoRef(data.codigo);
    } catch (e) {}
  };

  const compartirReferido = async () => {
    try {
      await Share.share({
        message: `¡Juega dominó dominicano conmigo en Dominó Real RD! Usa mi código ${codigoRef} y gana 500 monedas extra 🎲🇩🇴 https://domino-real-rd.vercel.app/?ref=${codigoRef}`
      });
    } catch (e) {}
  };

  const cerrarSesion = () => {
    Alert.alert('Cerrar Sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['domino_token', 'domino_jugador']);
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        }
      }
    ]);
  };

  if (cargando) return (
    <View style={{ flex: 1, backgroundColor: COLORES.negro, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={COLORES.oro} size="large" />
    </View>
  );

  const stats = perfil?.stats || {};
  const logros = perfil?.logros || [];

  const statItems = [
    { label: 'Partidas', valor: stats.partidas_jugadas || 0 },
    { label: 'Ganadas', valor: stats.partidas_ganadas || 0 },
    { label: 'Win Rate', valor: `${stats.win_rate || 0}%` },
    { label: 'ELO', valor: jugadorProp?.elo || 1200 },
    { label: 'Capicúas', valor: stats.capicuas_hechas || 0 },
    { label: 'Mejor Racha', valor: stats.mejor_racha || 0 },
  ];

  return (
    <ScrollView style={styles.contenedor} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={[COLORES.azulRD, COLORES.grisOscuro, COLORES.rojoRD]} style={styles.header}>
        <View style={styles.avatarGrande}>
          <Text style={{ fontSize: 48 }}>👤</Text>
        </View>
        <Text style={styles.nombre}>{jugadorProp?.nombre || 'Jugador'}</Text>
        <Text style={styles.liga}>{jugadorProp?.liga || 'Bronce'} • #{perfil?.posicion_global || '—'} Global</Text>
        {jugadorProp?.es_vip && <Text style={styles.vip}>👑 VIP</Text>}
      </LinearGradient>

      {/* Stats */}
      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>ESTADÍSTICAS</Text>
        <View style={styles.statsGrid}>
          {statItems.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statValor}>{s.valor}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Logros */}
      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>LOGROS ({logros.filter(l => l.obtenido).length}/{logros.length})</Text>
        <View style={styles.logrosGrid}>
          {logros.slice(0, 8).map((l, i) => (
            <View key={i} style={[styles.logroCard, !l.obtenido && styles.logroNoObtenido]}>
              <Text style={{ fontSize: 24, opacity: l.obtenido ? 1 : 0.3 }}>{l.icono || '🏆'}</Text>
              <Text style={[styles.logroNombre, !l.obtenido && { opacity: 0.4 }]}>{l.nombre}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Referidos */}
      {codigoRef ? (
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>CÓDIGO DE REFERIDO</Text>
          <View style={styles.refCard}>
            <Text style={styles.refCodigo}>{codigoRef}</Text>
            <Text style={styles.refSub}>Invita amigos y gana 200 monedas por cada uno</Text>
            <TouchableOpacity style={styles.refBoton} onPress={compartirReferido}>
              <Text style={styles.refBotonTexto}>📤 Compartir por WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Cerrar sesión */}
      <TouchableOpacity style={styles.botonSalir} onPress={cerrarSesion}>
        <Text style={styles.botonSalirTexto}>🚪 Cerrar Sesión</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.negro },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 30 },
  avatarGrande: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,215,0,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: COLORES.oro, marginBottom: 12 },
  nombre: { color: COLORES.blanco, fontSize: 22, fontWeight: 'bold' },
  liga: { color: COLORES.oro, fontSize: 14, marginTop: 4 },
  vip: { color: COLORES.oro, fontSize: 13, marginTop: 6, backgroundColor: 'rgba(255,215,0,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  seccion: { padding: 16 },
  seccionTitulo: { color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 1.5, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flex: 1, minWidth: '30%', backgroundColor: '#1A1A2E', borderRadius: 12, padding: 14, alignItems: 'center' },
  statValor: { color: COLORES.oro, fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 },
  logrosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  logroCard: { width: '22%', backgroundColor: '#1A1A2E', borderRadius: 12, padding: 10, alignItems: 'center' },
  logroNoObtenido: { backgroundColor: 'rgba(255,255,255,0.04)' },
  logroNombre: { color: COLORES.blanco, fontSize: 9, textAlign: 'center', marginTop: 4 },
  refCard: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: COLORES.oro + '40' },
  refCodigo: { color: COLORES.oro, fontSize: 28, fontWeight: 'bold', letterSpacing: 4 },
  refSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 16 },
  refBoton: { backgroundColor: '#25D366', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  refBotonTexto: { color: COLORES.blanco, fontWeight: 'bold', fontSize: 14 },
  botonSalir: { margin: 16, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: COLORES.rojoRD, alignItems: 'center' },
  botonSalirTexto: { color: COLORES.rojoRD, fontSize: 15, fontWeight: '600' },
});
