/**
 * Domino Real RD — Ranking Screen Native
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BannerAdComponent from '../components/BannerAdComponent';

const API_URL = 'https://domino-real-rd-production.up.railway.app/api';
const COLORES = { azulRD: '#002D62', rojoRD: '#CF142B', blanco: '#FFFFFF', oro: '#FFD700', negro: '#0A0A0A', grisOscuro: '#1A1A2E' };

const PAISES = [
  { code: null, label: '🌎 Todos' },
  { code: 'RD', label: '🇩🇴 RD' },
  { code: 'US', label: '🇺🇸 USA' },
  { code: 'ES', label: '🇪🇸 España' },
  { code: 'PR', label: '🇵🇷 Puerto Rico' },
];

const LIGAS_FILTRO = [null, 'Bronce', 'Plata', 'Oro', 'Diamante'];

export default function RankingScreenNative({ navigation, jugador }) {
  const [ranking, setRanking] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [paisFiltro, setPaisFiltro] = useState(null);
  const [miPosicion, setMiPosicion] = useState(null);

  useEffect(() => { cargarRanking(); }, [paisFiltro]);

  const cargarRanking = async () => {
    setCargando(true);
    try {
      const token = await AsyncStorage.getItem('domino_token');
      const url = `${API_URL}/ranking/global${paisFiltro ? `?pais=${paisFiltro}` : ''}`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json();
      if (data.exito) setRanking(data.ranking);

      // Mi posición
      const posResp = await fetch(`${API_URL}/ranking/mi-posicion`, { headers: { Authorization: `Bearer ${token}` } });
      const posData = await posResp.json();
      if (posData.exito) setMiPosicion(posData);
    } catch (e) { console.error(e); }
    setCargando(false);
  };

  const medallaIcono = (pos) => pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : null;

  const renderItem = ({ item, index }) => {
    const esMio = item.id === jugador?.id;
    const medalla = medallaIcono(item.posicion || index + 1);
    return (
      <TouchableOpacity
        style={[styles.fila, esMio && styles.filaMia]}
        onPress={() => navigation.navigate('PerfilJugador', { jugadorId: item.id })}
      >
        <Text style={styles.posicion}>{medalla || `#${item.posicion || index + 1}`}</Text>
        <View style={styles.avatarCirculo}>
          <Text style={{ fontSize: 18 }}>👤</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.nombre, esMio && { color: COLORES.oro }]}>
            {item.nombre} {esMio ? '(Tú)' : ''}
          </Text>
          <Text style={styles.sub}>{item.pais || 'RD'} • {item.ganadas || 0}W {item.win_rate || 0}%</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.elo}>{item.elo}</Text>
          <Text style={styles.liga}>{item.liga || 'Bronce'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.contenedor}>
      <LinearGradient colors={[COLORES.azulRD, COLORES.grisOscuro]} style={styles.header}>
        <Text style={styles.titulo}>📊 RANKING GLOBAL</Text>
        {miPosicion && (
          <View style={styles.miPosicionCard}>
            <Text style={styles.miPosTexto}>Tu posición: #{miPosicion.posicion}</Text>
            <Text style={styles.miPosElo}>{miPosicion.elo} ELO • {miPosicion.liga}</Text>
          </View>
        )}
        <View style={styles.filtros}>
          {PAISES.map(p => (
            <TouchableOpacity
              key={p.code || 'todos'}
              style={[styles.filtroBtn, paisFiltro === p.code && styles.filtroBtnActivo]}
              onPress={() => setPaisFiltro(p.code)}
            >
              <Text style={[styles.filtroTexto, paisFiltro === p.code && { color: COLORES.negro }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {cargando ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORES.oro} size="large" />
          <Text style={{ color: COLORES.blanco, marginTop: 16 }}>Cargando ranking...</Text>
        </View>
      ) : (
        <FlatList
          data={ranking}
          keyExtractor={(item, i) => item.id || String(i)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={{ color: COLORES.blanco, textAlign: 'center', marginTop: 40 }}>
              No hay jugadores aún
            </Text>
          }
        />
      )}

      {/* Banner publicitario inferior */}
      <BannerAdComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.negro },
  header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 16 },
  titulo: { color: COLORES.blanco, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  miPosicionCard: { backgroundColor: 'rgba(255,215,0,0.15)', borderRadius: 12, padding: 12, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORES.oro },
  miPosTexto: { color: COLORES.oro, fontSize: 16, fontWeight: 'bold' },
  miPosElo: { color: COLORES.blanco, fontSize: 13, marginTop: 2 },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filtroBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  filtroBtnActivo: { backgroundColor: COLORES.oro },
  filtroTexto: { color: COLORES.blanco, fontSize: 12 },
  fila: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', gap: 12 },
  filaMia: { backgroundColor: 'rgba(255,215,0,0.08)' },
  posicion: { color: COLORES.oro, fontSize: 16, fontWeight: 'bold', width: 36, textAlign: 'center' },
  avatarCirculo: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  nombre: { color: COLORES.blanco, fontSize: 15, fontWeight: '600' },
  sub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  elo: { color: COLORES.oro, fontSize: 16, fontWeight: 'bold' },
  liga: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
});
