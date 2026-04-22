/**
 * TorneosScreenNative.js — Dominó Real RD
 * ─────────────────────────────────────────
 * Torneos con bracket visual eliminatorio,
 * invitación por ronda y countdown en vivo.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ActivityIndicator, Alert, ScrollView,
  Share, Platform, StatusBar, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'https://domino-real-rd-production.up.railway.app/api';

const C = {
  azul:    '#002D62', azulCl: '#1565C0',
  rojo:    '#CF142B', blanco: '#FFFFFF',
  oro:     '#FFD700', negro:  '#0A0A0A',
  oscuro:  '#1A1A2E', medio:  '#2C2C54',
  morado:  '#7B1FA2', verde:  '#2E7D32',
  verdeCl: '#4CAF50',
};

// ── Countdown en tiempo real ──────────────────────────────────
function useCountdown(fechaObjetivo) {
  const [restante, setRestante] = useState('');
  useEffect(() => {
    if (!fechaObjetivo) return;
    const tick = () => {
      const diff = new Date(fechaObjetivo) - Date.now();
      if (diff <= 0) { setRestante('¡Comenzó!'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRestante(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [fechaObjetivo]);
  return restante;
}

// ── Componente: Tarjeta de torneo ─────────────────────────────
function TorneoCard({ torneo, onBracket, onInscribir, inscribiendo, jugadorId }) {
  const countdown = useCountdown(
    torneo.estado === 'inscripcion' ? torneo.fecha_inicio : null
  );

  const yaInscrito = torneo.inscrito;
  const estadoColor = {
    inscripcion: C.verdeCl,
    en_curso:    C.oro,
    finalizado:  'rgba(255,255,255,0.3)',
  }[torneo.estado] || C.blanco;

  return (
    <View style={est.torneoCard}>
      <LinearGradient colors={[C.morado, '#4A148C']} style={est.torneoHeader}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={est.torneoNombre}>{torneo.nombre}</Text>
            {torneo.descripcion && (
              <Text style={est.torneoDesc} numberOfLines={1}>{torneo.descripcion}</Text>
            )}
          </View>
          <View style={[est.estadoBadge, { backgroundColor: estadoColor }]}>
            <Text style={est.estadoTexto}>
              {torneo.estado === 'inscripcion' ? '🟢 Abierto'
               : torneo.estado === 'en_curso' ? '⚡ En curso' : '✅ Finalizado'}
            </Text>
          </View>
        </View>

        {/* Countdown */}
        {torneo.estado === 'inscripcion' && (
          <View style={est.countdownRow}>
            <Text style={est.countdownEmoji}>⏱</Text>
            <Text style={est.countdownTexto}>Empieza en {countdown}</Text>
          </View>
        )}
      </LinearGradient>

      <View style={est.torneoBody}>
        {/* Info */}
        <View style={est.infoRow}>
          <View style={est.infoChip}>
            <Text style={est.infoChipTexto}>
              👥 {torneo.participantes_actuales || 0}/{torneo.max_participantes || 64}
            </Text>
          </View>
          <View style={est.infoChip}>
            <Text style={est.infoChipTexto}>
              {torneo.es_gratuito ? '🆓 Gratis' : `💰 ${torneo.inscripcion_monedas || 0} monedas`}
            </Text>
          </View>
          <View style={est.infoChip}>
            <Text style={est.infoChipTexto}>
              📅 {new Date(torneo.fecha_inicio).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })}
            </Text>
          </View>
        </View>

        {/* Premios */}
        <View style={est.premiosRow}>
          <View style={[est.premioBox, { borderColor: '#FFD700' }]}>
            <Text style={{ fontSize: 20 }}>🥇</Text>
            <Text style={[est.premioMonto, { color: C.oro }]}>
              {(torneo.premio_1ro_monedas || 5000).toLocaleString()}
            </Text>
            <Text style={est.premioLabel}>monedas</Text>
          </View>
          <View style={[est.premioBox, { borderColor: '#B0BEC5' }]}>
            <Text style={{ fontSize: 20 }}>🥈</Text>
            <Text style={[est.premioMonto, { color: '#B0BEC5' }]}>
              {(torneo.premio_2do_monedas || 2000).toLocaleString()}
            </Text>
            <Text style={est.premioLabel}>monedas</Text>
          </View>
          <View style={[est.premioBox, { borderColor: '#CD7F32' }]}>
            <Text style={{ fontSize: 20 }}>🥉</Text>
            <Text style={[est.premioMonto, { color: '#CD7F32' }]}>
              {(torneo.premio_3ro_monedas || 1000).toLocaleString()}
            </Text>
            <Text style={est.premioLabel}>monedas</Text>
          </View>
        </View>

        {/* Botones */}
        <View style={est.botonesRow}>
          <TouchableOpacity style={est.btnBracket} onPress={() => onBracket(torneo)}>
            <Text style={est.btnBracketTexto}>📊 Ver Bracket</Text>
          </TouchableOpacity>

          {torneo.estado === 'inscripcion' && (
            yaInscrito ? (
              <View style={[est.btnInscribir, { backgroundColor: C.verde, flex: 2 }]}>
                <Text style={est.btnInscribirTexto}>✅ Inscrito</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[est.btnInscribir, inscribiendo && { opacity: 0.6 }]}
                onPress={() => onInscribir(torneo)}
                disabled={inscribiendo}
              >
                <Text style={est.btnInscribirTexto}>
                  {inscribiendo ? '...' : '🏆 Inscribirme'}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    </View>
  );
}

// ── Componente: Bracket Visual ────────────────────────────────
function BracketVisual({ bracket }) {
  if (!bracket || bracket.length === 0) {
    return (
      <View style={{ alignItems: 'center', padding: 30 }}>
        <Text style={{ fontSize: 36 }}>🎲</Text>
        <Text style={{ color: C.blanco, fontSize: 15, marginTop: 12, textAlign: 'center' }}>
          El bracket se genera cuando hay suficientes inscritos
        </Text>
        <Text style={{ color: `${C.blanco}50`, fontSize: 12, marginTop: 6, textAlign: 'center' }}>
          Mínimo 4 equipos / parejas
        </Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', padding: 12, alignItems: 'center' }}>
        {bracket.map((ronda, ri) => (
          <View key={ri} style={{ marginRight: ri < bracket.length - 1 ? 0 : 0 }}>
            {/* Nombre de la ronda */}
            <Text style={est.rondaTitulo}>{ronda.nombre || `Ronda ${ri + 1}`}</Text>

            {/* Partidas de la ronda */}
            <View style={{ justifyContent: 'space-around', flex: 1 }}>
              {(ronda.partidas || []).map((p, pi) => (
                <View key={pi} style={est.bracketPareja}>
                  {/* Jugador / Equipo 1 */}
                  <View style={[
                    est.bracketSlot,
                    p.ganador?.id === p.jugador1?.id && est.bracketSlotGanador
                  ]}>
                    <Text style={[
                      est.bracketNombre,
                      p.ganador?.id === p.jugador1?.id && { color: C.oro }
                    ]} numberOfLines={1}>
                      {p.jugador1?.nombre || '???'}
                    </Text>
                    {p.jugador1?.elo && (
                      <Text style={est.bracketElo}>{p.jugador1.elo}</Text>
                    )}
                  </View>

                  {/* VS separador */}
                  <View style={est.vsContenedor}>
                    <Text style={est.vsTexto}>
                      {p.estado === 'completado' ? '✅' : p.estado === 'en_curso' ? '⚡' : 'VS'}
                    </Text>
                  </View>

                  {/* Jugador / Equipo 2 */}
                  <View style={[
                    est.bracketSlot,
                    p.ganador?.id === p.jugador2?.id && est.bracketSlotGanador
                  ]}>
                    <Text style={[
                      est.bracketNombre,
                      p.ganador?.id === p.jugador2?.id && { color: C.oro }
                    ]} numberOfLines={1}>
                      {p.jugador2?.nombre || (p.estado === 'completado' ? 'BYE' : '???')}
                    </Text>
                    {p.jugador2?.elo && (
                      <Text style={est.bracketElo}>{p.jugador2.elo}</Text>
                    )}
                  </View>

                  {/* Conector derecho */}
                  {ri < bracket.length - 1 && (
                    <View style={est.conector} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Trofeo final */}
        <View style={est.trofeoFinal}>
          <Text style={{ fontSize: 36 }}>🏆</Text>
          <Text style={{ color: C.oro, fontWeight: 'bold', fontSize: 11, marginTop: 4 }}>
            CAMPEÓN
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ── PANTALLA PRINCIPAL ─────────────────────────────────────────
export default function TorneosScreenNative({ navigation, jugador }) {
  const [torneos,          setTorneos]          = useState([]);
  const [cargando,         setCargando]          = useState(true);
  const [torneoSel,        setTorneoSel]         = useState(null);
  const [modalBracket,     setModalBracket]      = useState(false);
  const [bracket,          setBracket]           = useState([]);
  const [inscribiendo,     setInscribiendo]      = useState(false);
  const [cargandoBracket,  setCargandoBracket]   = useState(false);
  const [tabActiva,        setTabActiva]         = useState('activos'); // activos | mis_torneos | historial

  useEffect(() => { cargarTorneos(); }, []);

  const cargarTorneos = async () => {
    setCargando(true);
    try {
      const token = await AsyncStorage.getItem('domino_token');
      const resp  = await fetch(`${API}/torneos`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await resp.json();
      if (data.exito) setTorneos(data.torneos || []);
    } catch (e) { console.error(e); }
    setCargando(false);
  };

  const verBracket = async (torneo) => {
    setTorneoSel(torneo);
    setCargandoBracket(true);
    setBracket([]);
    setModalBracket(true);
    try {
      const resp = await fetch(`${API}/torneos/${torneo.id}`);
      const data = await resp.json();
      if (data.exito) setBracket(data.bracket || []);
    } catch (e) {}
    setCargandoBracket(false);
  };

  const inscribirse = async (torneo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setInscribiendo(true);
    try {
      const token = await AsyncStorage.getItem('domino_token');
      const resp  = await fetch(`${API}/torneos/${torneo.id}/inscribir`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ jugadorId: jugador?.id })
      });
      const data = await resp.json();
      if (data.exito) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('🏆 ¡Inscrito!', data.mensaje || 'Te inscribiste correctamente.');
        cargarTorneos();
      } else {
        Alert.alert('Error', data.error || 'No se pudo inscribir');
      }
    } catch { Alert.alert('Error', 'Sin conexión'); }
    setInscribiendo(false);
  };

  const invitarAmigo = async (torneo) => {
    try {
      await Share.share({
        message:
          `🏆 ¡Te invito al torneo "${torneo.nombre}" en Dominó Real RD!\n\n` +
          `🥇 Premio: ${(torneo.premio_1ro_monedas || 5000).toLocaleString()} monedas\n` +
          `📅 ${new Date(torneo.fecha_inicio).toLocaleDateString('es-DO')}\n\n` +
          `🇩🇴 Descarga Dominó Real RD y únete`
      });
    } catch {}
  };

  const torneosFiltrados = torneos.filter(t => {
    if (tabActiva === 'activos')     return t.estado !== 'finalizado';
    if (tabActiva === 'mis_torneos') return t.inscrito;
    if (tabActiva === 'historial')   return t.estado === 'finalizado';
    return true;
  });

  return (
    <View style={est.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor={C.morado} />

      {/* ── HEADER ─────────────────────────────────────────── */}
      <LinearGradient
        colors={[C.morado, '#4A148C', C.oscuro]}
        style={est.header}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <Text style={est.headerTitulo}>🏆 TORNEOS</Text>
        <Text style={est.headerSub}>Compite · Demuestra · Gana</Text>

        {/* Tabs */}
        <View style={est.tabs}>
          {[
            { key: 'activos',     label: 'Activos' },
            { key: 'mis_torneos', label: 'Mis torneos' },
            { key: 'historial',   label: 'Historial' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setTabActiva(tab.key)}
              style={[est.tab, tabActiva === tab.key && est.tabActiva]}
            >
              <Text style={[est.tabTexto, tabActiva === tab.key && est.tabTextoActivo]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* ── LISTA ──────────────────────────────────────────── */}
      {cargando ? (
        <View style={est.loader}>
          <ActivityIndicator color={C.oro} size="large" />
          <Text style={{ color: `${C.blanco}60`, marginTop: 12 }}>Cargando torneos...</Text>
        </View>
      ) : (
        <FlatList
          data={torneosFiltrados}
          keyExtractor={(item, i) => item.id?.toString() || String(i)}
          renderItem={({ item }) => (
            <TorneoCard
              torneo={item}
              jugadorId={jugador?.id}
              inscribiendo={inscribiendo}
              onBracket={verBracket}
              onInscribir={inscribirse}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          onRefresh={cargarTorneos}
          refreshing={cargando}
          ListEmptyComponent={
            <View style={est.vacio}>
              <Text style={{ fontSize: 48 }}>🏆</Text>
              <Text style={est.vacioTexto}>
                {tabActiva === 'mis_torneos'
                  ? 'No estás inscrito en ningún torneo'
                  : tabActiva === 'historial'
                  ? 'No hay torneos finalizados'
                  : 'No hay torneos activos ahora mismo'}
              </Text>
              <Text style={est.vacioSub}>Vuelve pronto 🇩🇴</Text>
            </View>
          }
        />
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* MODAL: Bracket Visual                               */}
      {/* ════════════════════════════════════════════════════ */}
      <Modal visible={modalBracket} animationType="slide" transparent>
        <View style={est.modalOverlay}>
          <View style={est.modalContenido}>
            {/* Header */}
            <View style={est.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={est.modalTitulo} numberOfLines={1}>
                  {torneoSel?.nombre}
                </Text>
                <Text style={est.modalSub}>BRACKET ELIMINATORIO</Text>
              </View>
              <TouchableOpacity onPress={() => setModalBracket(false)} style={est.modalCerrarBtn}>
                <Text style={{ color: C.blanco, fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Bracket */}
            {cargandoBracket ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator color={C.oro} size="large" />
                <Text style={{ color: `${C.blanco}60`, marginTop: 12 }}>Cargando bracket...</Text>
              </View>
            ) : (
              <View style={{ maxHeight: 420 }}>
                <BracketVisual bracket={bracket} />
              </View>
            )}

            {/* Leyenda */}
            <View style={est.leyenda}>
              <View style={est.leyendaItem}>
                <View style={[est.leyendaDot, { backgroundColor: C.oro }]} />
                <Text style={est.leyendaTexto}>Ganador</Text>
              </View>
              <View style={est.leyendaItem}>
                <View style={[est.leyendaDot, { backgroundColor: C.verdeCl }]} />
                <Text style={est.leyendaTexto}>En curso</Text>
              </View>
              <View style={est.leyendaItem}>
                <View style={[est.leyendaDot, { backgroundColor: `${C.blanco}40` }]} />
                <Text style={est.leyendaTexto}>Pendiente</Text>
              </View>
            </View>

            {/* Botones */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              {torneoSel && (
                <TouchableOpacity
                  style={[est.btnModal, { flex: 1, backgroundColor: `${C.azulCl}60` }]}
                  onPress={() => invitarAmigo(torneoSel)}
                >
                  <Text style={est.btnModalTexto}>📤 Invitar amigo</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[est.btnModal, { flex: 1 }]}
                onPress={() => setModalBracket(false)}
              >
                <Text style={est.btnModalTexto}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── ESTILOS ───────────────────────────────────────────────────
const est = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.negro },
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : StatusBar.currentHeight + 10,
    paddingHorizontal: 20, paddingBottom: 0,
  },
  headerTitulo: { color: C.blanco, fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  headerSub:    { color: `${C.blanco}70`, fontSize: 12, textAlign: 'center', marginTop: 4 },
  tabs: {
    flexDirection: 'row', marginTop: 14,
    borderTopWidth: 1, borderTopColor: `${C.blanco}15`,
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center'
  },
  tabActiva:       { borderBottomWidth: 2, borderBottomColor: C.oro },
  tabTexto:        { color: `${C.blanco}60`, fontSize: 12, fontWeight: '600' },
  tabTextoActivo:  { color: C.oro },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vacio:  { alignItems: 'center', marginTop: 60, padding: 20 },
  vacioTexto: { color: C.blanco, fontSize: 15, marginTop: 12, textAlign: 'center' },
  vacioSub:   { color: `${C.blanco}40`, fontSize: 12, marginTop: 6 },

  // Card
  torneoCard: {
    backgroundColor: C.oscuro, borderRadius: 18, marginBottom: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: `${C.morado}60`
  },
  torneoHeader: { padding: 16 },
  torneoNombre: { color: C.blanco, fontSize: 16, fontWeight: 'bold' },
  torneoDesc:   { color: `${C.blanco}70`, fontSize: 12, marginTop: 3 },
  estadoBadge:  {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, marginTop: 8
  },
  estadoTexto:  { color: C.blanco, fontSize: 10, fontWeight: '700' },
  countdownRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 },
  countdownEmoji: { fontSize: 14 },
  countdownTexto: { color: C.oro, fontSize: 12, fontWeight: '600' },
  torneoBody: { padding: 14 },
  infoRow:    { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  infoChip:   { backgroundColor: `${C.blanco}10`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  infoChipTexto: { color: `${C.blanco}80`, fontSize: 11 },
  premiosRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  premioBox:  {
    flex: 1, backgroundColor: `${C.blanco}05`, borderRadius: 12,
    alignItems: 'center', padding: 10, borderWidth: 1
  },
  premioMonto: { fontWeight: 'bold', fontSize: 15, marginTop: 4 },
  premioLabel: { color: `${C.blanco}50`, fontSize: 9, marginTop: 2 },
  botonesRow:  { flexDirection: 'row', gap: 10 },
  btnBracket:  {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: `${C.blanco}30`, alignItems: 'center'
  },
  btnBracketTexto:   { color: C.blanco, fontSize: 13 },
  btnInscribir:      { flex: 2, paddingVertical: 10, borderRadius: 12, backgroundColor: C.oro, alignItems: 'center' },
  btnInscribirTexto: { color: C.negro, fontSize: 13, fontWeight: 'bold' },

  // Modal bracket
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContenido: {
    backgroundColor: C.oscuro, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderWidth: 1, borderColor: `${C.morado}60`
  },
  modalHeader:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  modalTitulo:    { color: C.blanco, fontSize: 16, fontWeight: 'bold' },
  modalSub:       { color: C.oro, fontSize: 10, letterSpacing: 2, marginTop: 3 },
  modalCerrarBtn: { padding: 6 },

  // Bracket
  rondaTitulo: {
    color: C.oro, fontSize: 10, fontWeight: 'bold',
    letterSpacing: 1.5, textAlign: 'center',
    marginBottom: 8, paddingHorizontal: 4,
  },
  bracketPareja: {
    alignItems: 'center', marginVertical: 6,
    position: 'relative',
  },
  bracketSlot: {
    width: 110, backgroundColor: `${C.blanco}08`,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: `${C.blanco}20`,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  bracketSlotGanador: {
    backgroundColor: `${C.oro}15`, borderColor: C.oro
  },
  bracketNombre: { color: C.blanco, fontSize: 12, flex: 1 },
  bracketElo:    { color: `${C.blanco}40`, fontSize: 9 },
  vsContenedor:  { paddingVertical: 2 },
  vsTexto:       { color: `${C.blanco}40`, fontSize: 10, textAlign: 'center' },
  conector: {
    position: 'absolute', right: -12,
    top: '50%', width: 12, height: 1,
    backgroundColor: `${C.blanco}30`
  },
  trofeoFinal: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16,
  },
  leyenda: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 16, marginTop: 12, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: `${C.blanco}15`
  },
  leyendaItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leyendaDot:   { width: 8, height: 8, borderRadius: 4 },
  leyendaTexto: { color: `${C.blanco}60`, fontSize: 11 },
  btnModal: {
    backgroundColor: `${C.blanco}10`, borderRadius: 12,
    padding: 12, alignItems: 'center'
  },
  btnModalTexto: { color: C.blanco, fontWeight: '600', fontSize: 13 },
});
