/**
 * Domino Real RD — Torneos Screen Native
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://domino-real-rd-production.up.railway.app/api';
const COLORES = { azulRD: '#002D62', rojoRD: '#CF142B', blanco: '#FFFFFF', oro: '#FFD700', negro: '#0A0A0A', grisOscuro: '#1A1A2E', morado: '#7B1FA2' };

export default function TorneosScreenNative({ navigation, jugador }) {
  const [torneos, setTorneos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [torneoSeleccionado, setTorneoSeleccionado] = useState(null);
  const [modalBracket, setModalBracket] = useState(false);
  const [bracket, setBracket] = useState([]);
  const [inscribiendo, setInscribiendo] = useState(false);

  useEffect(() => { cargarTorneos(); }, []);

  const cargarTorneos = async () => {
    setCargando(true);
    try {
      const resp = await fetch(`${API_URL}/torneos`);
      const data = await resp.json();
      if (data.exito) setTorneos(data.torneos);
    } catch (e) { console.error(e); }
    setCargando(false);
  };

  const verBracket = async (torneo) => {
    setTorneoSeleccionado(torneo);
    try {
      const resp = await fetch(`${API_URL}/torneos/${torneo.id}`);
      const data = await resp.json();
      if (data.exito) setBracket(data.bracket || []);
    } catch (e) {}
    setModalBracket(true);
  };

  const inscribirse = async (torneo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setInscribiendo(true);
    try {
      const token = await AsyncStorage.getItem('domino_token');
      const resp = await fetch(`${API_URL}/torneos/${torneo.id}/inscribir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jugadorId: jugador?.id })
      });
      const data = await resp.json();
      if (data.exito) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('¡Inscrito!', data.mensaje);
        cargarTorneos();
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (e) { Alert.alert('Error', 'No se pudo conectar'); }
    setInscribiendo(false);
  };

  const estadoColor = (estado) => ({
    inscripcion: '#4CAF50', en_curso: COLORES.oro, finalizado: 'rgba(255,255,255,0.3)'
  }[estado] || COLORES.blanco);

  const renderTorneo = ({ item }) => (
    <View style={styles.torneoCard}>
      <LinearGradient colors={[COLORES.morado, '#4A148C']} style={styles.torneoHeader}>
        <Text style={styles.torneoNombre}>{item.nombre}</Text>
        <View style={[styles.estadoBadge, { backgroundColor: estadoColor(item.estado) }]}>
          <Text style={styles.estadoTexto}>
            {item.estado === 'inscripcion' ? '🟢 Inscripciones' : item.estado === 'en_curso' ? '⚡ En curso' : '✅ Finalizado'}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.torneoBody}>
        <View style={styles.infoRow}>
          <Text style={styles.infoItem}>👥 {item.participantes_actuales || 0}/{item.max_participantes || 64}</Text>
          <Text style={styles.infoItem}>{item.es_gratuito ? '🆓 Gratis' : `💰 ${item.inscripcion_monedas || 0} monedas`}</Text>
          <Text style={styles.infoItem}>📅 {new Date(item.fecha_inicio).toLocaleDateString('es-DO')}</Text>
        </View>

        <View style={styles.premiosRow}>
          <Text style={styles.premioItem}>🥇 {item.premio_1ro_monedas || 5000}</Text>
          <Text style={styles.premioItem}>🥈 {item.premio_2do_monedas || 2000}</Text>
          <Text style={styles.premioItem}>🥉 {item.premio_3ro_monedas || 1000}</Text>
        </View>

        <View style={styles.botonesRow}>
          <TouchableOpacity style={styles.botonBracket} onPress={() => verBracket(item)}>
            <Text style={styles.botonBracketTexto}>📊 Bracket</Text>
          </TouchableOpacity>
          {item.estado === 'inscripcion' && (
            <TouchableOpacity
              style={[styles.botonInscribir, inscribiendo && { opacity: 0.6 }]}
              onPress={() => inscribirse(item)}
              disabled={inscribiendo}
            >
              <Text style={styles.botonInscribirTexto}>
                {inscribiendo ? '...' : '🏆 Inscribirme'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.contenedor}>
      <LinearGradient colors={[COLORES.morado, COLORES.negro]} style={styles.headerGrad}>
        <Text style={styles.titulo}>🏆 TORNEOS</Text>
        <Text style={styles.subtitulo}>Compite y gana grandes premios</Text>
      </LinearGradient>

      {cargando ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORES.oro} size="large" />
        </View>
      ) : (
        <FlatList
          data={torneos}
          keyExtractor={(item, i) => item.id || String(i)}
          renderItem={renderTorneo}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Text style={{ fontSize: 48 }}>🏆</Text>
              <Text style={{ color: COLORES.blanco, fontSize: 16, marginTop: 12 }}>No hay torneos activos</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 8 }}>Vuelve pronto</Text>
            </View>
          }
        />
      )}

      {/* Modal Bracket */}
      <Modal visible={modalBracket} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContenido}>
            <Text style={styles.modalTitulo}>{torneoSeleccionado?.nombre}</Text>
            <Text style={styles.modalSub}>BRACKET</Text>

            <ScrollView style={{ maxHeight: 400 }}>
              {bracket.length === 0 ? (
                <Text style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 20 }}>
                  El bracket se generará cuando haya suficientes participantes
                </Text>
              ) : (
                bracket.map((ronda, ri) => (
                  <View key={ri} style={styles.rondaContenedor}>
                    <Text style={styles.rondaNombre}>{ronda.nombre}</Text>
                    {ronda.partidas?.map((p, pi) => (
                      <View key={pi} style={styles.partida}>
                        <Text style={[styles.partidaJugador, p.ganador?.id === p.jugador1?.id && { color: COLORES.oro }]}>
                          {p.jugador1?.nombre || '?'}
                        </Text>
                        <Text style={styles.vsTexto}>VS</Text>
                        <Text style={[styles.partidaJugador, p.ganador?.id === p.jugador2?.id && { color: COLORES.oro }]}>
                          {p.jugador2?.nombre || (p.estado === 'completado' ? 'BYE' : '?')}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity style={styles.botonCerrar} onPress={() => setModalBracket(false)}>
              <Text style={styles.botonCerrarTexto}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.negro },
  headerGrad: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' },
  titulo: { color: COLORES.blanco, fontSize: 22, fontWeight: 'bold' },
  subtitulo: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },
  torneoCard: { backgroundColor: '#1A1A2E', borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(124,31,162,0.4)' },
  torneoHeader: { padding: 16 },
  torneoNombre: { color: COLORES.blanco, fontSize: 16, fontWeight: 'bold' },
  estadoBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  estadoTexto: { color: COLORES.blanco, fontSize: 11, fontWeight: '600' },
  torneoBody: { padding: 16 },
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  infoItem: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  premiosRow: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  premioItem: { color: COLORES.oro, fontSize: 13, fontWeight: '600' },
  botonesRow: { flexDirection: 'row', gap: 10 },
  botonBracket: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center' },
  botonBracketTexto: { color: COLORES.blanco, fontSize: 13 },
  botonInscribir: { flex: 2, padding: 10, borderRadius: 10, backgroundColor: COLORES.oro, alignItems: 'center' },
  botonInscribirTexto: { color: COLORES.negro, fontSize: 13, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContenido: { backgroundColor: COLORES.grisOscuro, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitulo: { color: COLORES.blanco, fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  modalSub: { color: COLORES.oro, fontSize: 12, letterSpacing: 2, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  rondaContenedor: { marginBottom: 16 },
  rondaNombre: { color: COLORES.oro, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  partida: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 12, marginBottom: 6 },
  partidaJugador: { flex: 1, color: COLORES.blanco, fontSize: 13 },
  vsTexto: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginHorizontal: 8 },
  botonCerrar: { marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  botonCerrarTexto: { color: COLORES.blanco, fontSize: 15 },
});
