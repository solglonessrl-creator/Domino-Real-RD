/**
 * PremiumScreenNative.js — Dominó Real RD
 * ══════════════════════════════════════════
 * Pantalla VIP: muestra beneficios, cómo ganar monedas,
 * y permite activar VIP con monedas (sin Stripe).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Platform, StatusBar, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdService, {
  MONEDAS_POR_AD, MAX_ADS_DIA, COSTO_VIP_MES
} from '../services/AdService';

const C = {
  azul:   '#002D62', azulCl: '#1565C0',
  oro:    '#FFD700', negro:  '#0A0A0A',
  oscuro: '#1A1A2E', medio:  '#2C2C54',
  blanco: '#FFFFFF', verde:  '#2E7D32',
  verdeCl:'#4CAF50', morado: '#7B1FA2',
  rojoRD: '#CF142B',
};

const BENEFICIOS_VIP = [
  { emoji: '🚫', texto: 'Sin anuncios de ningún tipo' },
  { emoji: '🏘️', texto: 'Todas las mesas de barrio desbloqueadas' },
  { emoji: '💎', texto: 'Avatar exclusivo VIP Diamante' },
  { emoji: '👑', texto: 'Insignia VIP en el chat de barajado' },
  { emoji: '🪙', texto: '2× monedas al ganar torneos' },
  { emoji: '⚡', texto: 'Matchmaking prioritario (cola VIP)' },
  { emoji: '📊', texto: 'Estadísticas avanzadas de tu juego' },
  { emoji: '🎨', texto: 'Efectos visuales exclusivos al capicúa' },
  { emoji: '🔔', texto: 'Notificación anticipada de torneos live' },
  { emoji: '🇩🇴', texto: 'Badge "Orgulloso Dominicano" permanente' },
];

const FORMAS_GANAR = [
  { emoji: '📺', titulo: 'Ver anuncio',     monedas: `+${MONEDAS_POR_AD}`,  desc: `Hasta ${MAX_ADS_DIA} veces al día` },
  { emoji: '🏆', titulo: 'Ganar partida',   monedas: '+30',                  desc: 'Cada victoria online' },
  { emoji: '🎯', titulo: 'Ganar torneo',    monedas: '+500',                 desc: 'Premio del torneo' },
  { emoji: '🎁', titulo: 'Bono diario',     monedas: '+100',                 desc: 'Entra cada día' },
  { emoji: '👥', titulo: 'Referir amigo',   monedas: '+200',                 desc: 'Cuando se registra' },
  { emoji: '🎲', titulo: 'Capicúa',         monedas: '+50',                  desc: 'Extra por capicúa' },
];

export default function PremiumScreenNative({ navigation, jugador }) {
  const [monedas,       setMonedas]       = useState(jugador?.monedas || 0);
  const [esVIP,         setEsVIP]         = useState(false);
  const [diasRestantes, setDiasRestantes] = useState(0);
  const [adsHoy,        setAdsHoy]        = useState(0);
  const [viendo,        setViendo]        = useState(false);
  const [activando,     setActivando]     = useState(false);

  const brilloAnim = useRef(new Animated.Value(0)).current;
  const pulsoAnim  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    cargarEstado();
    animarBrillo();
    animarPulso();
  }, []);

  const cargarEstado = async () => {
    const [vip, dias, ads, moStr] = await Promise.all([
      AdService.esVIP(),
      AdService.diasVIPRestantes(),
      AdService.getAdsHoy(),
      AsyncStorage.getItem('domino_monedas_local'),
    ]);
    setEsVIP(vip);
    setDiasRestantes(dias);
    setAdsHoy(ads);
    if (moStr) setMonedas(parseInt(moStr) || jugador?.monedas || 0);
  };

  const animarBrillo = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(brilloAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(brilloAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  };

  const animarPulso = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulsoAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
        Animated.timing(pulsoAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    ).start();
  };

  const verAnuncio = async () => {
    if (viendo) return;
    setViendo(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await AdService.mostrarRewarded(({ monedas: ganadas, adsHoy: ads }) => {
      setAdsHoy(ads);
      const nuevas = monedas + ganadas;
      setMonedas(nuevas);
      AsyncStorage.setItem('domino_monedas_local', String(nuevas));
    });

    if (!result.exito) {
      if (result.razon === 'limite_diario') {
        Alert.alert('⏰ Límite diario', result.mensaje);
      } else if (result.razon === 'cerrado_sin_recompensa') {
        Alert.alert('ℹ️', 'Debes ver el anuncio completo para ganar monedas');
      }
    }
    setViendo(false);
  };

  const activarVIP = async () => {
    if (monedas < COSTO_VIP_MES) {
      Alert.alert(
        '🪙 Monedas insuficientes',
        `Necesitas ${(COSTO_VIP_MES - monedas).toLocaleString()} monedas más.\n\n¿Ves anuncios para ganar monedas?`,
        [
          { text: 'No ahora' },
          { text: '📺 Ver anuncio', onPress: verAnuncio }
        ]
      );
      return;
    }

    Alert.alert(
      '👑 Activar VIP',
      `¿Activar VIP por 30 días por 🪙 ${COSTO_VIP_MES.toLocaleString()} monedas?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: '¡Activar VIP! 👑',
          onPress: async () => {
            setActivando(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            try {
              const token = await AsyncStorage.getItem('domino_token');
              // Registrar en el servidor
              await fetch('https://domino-real-rd-production.up.railway.app/api/jugadores/activar-vip', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body:    JSON.stringify({ dias: 30, costo: COSTO_VIP_MES })
              });
            } catch {}
            // Guardar localmente independiente del servidor
            await AdService.activarVIP(30);
            const nuevas = monedas - COSTO_VIP_MES;
            setMonedas(nuevas);
            await AsyncStorage.setItem('domino_monedas_local', String(nuevas));
            setEsVIP(true);
            setDiasRestantes(30);
            setActivando(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('👑 ¡VIP Activado!', '¡Bienvenido al club de élite de Dominó Real RD! 🇩🇴\n\nYa no verás más anuncios y tienes acceso a todos los beneficios VIP.');
          }
        }
      ]
    );
  };

  const porcentajeVIP = Math.min((monedas / COSTO_VIP_MES) * 100, 100);
  const adsRestantes  = MAX_ADS_DIA - adsHoy;

  return (
    <View style={est.contenedor}>
      <StatusBar barStyle="light-content" />

      {/* ── HEADER PREMIUM ─────────────────────────────────── */}
      <LinearGradient
        colors={['#4A148C', '#7B1FA2', '#FF6F00']}
        style={est.header}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={est.btnBack}>
          <Text style={{ color: C.blanco, fontSize: 20 }}>‹</Text>
        </TouchableOpacity>

        <Animated.Text style={[est.headerEmoji, {
          opacity: brilloAnim.interpolate({ inputRange: [0,1], outputRange: [0.7,1] })
        }]}>
          👑
        </Animated.Text>
        <Text style={est.headerTitulo}>VIP DOMINÓ REAL RD</Text>
        <Text style={est.headerSub}>El club de élite dominicano 🇩🇴</Text>

        {/* Estado VIP */}
        {esVIP ? (
          <View style={est.vipActivo}>
            <Text style={est.vipActivoTexto}>✅ VIP ACTIVO — {diasRestantes} días restantes</Text>
          </View>
        ) : (
          <View style={est.monederoHeader}>
            <Text style={{ fontSize: 18 }}>🪙</Text>
            <Text style={est.monederoHeaderNum}>{monedas.toLocaleString()}</Text>
            <Text style={est.monederoHeaderLabel}>/ {COSTO_VIP_MES.toLocaleString()} para VIP</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── BOTÓN PRINCIPAL ────────────────────────────────── */}
        {!esVIP && (
          <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
            {/* Barra de progreso */}
            <View style={est.progresoBar}>
              <View style={[est.progresoFill, { width: `${porcentajeVIP}%` }]} />
            </View>
            <Text style={est.progresoTexto}>
              {monedas.toLocaleString()} / {COSTO_VIP_MES.toLocaleString()} monedas
              ({porcentajeVIP.toFixed(0)}%)
            </Text>

            {/* Botón activar VIP */}
            <Animated.View style={{ transform: [{ scale: pulsoAnim }], marginTop: 12 }}>
              <TouchableOpacity
                onPress={activarVIP}
                disabled={activando}
                style={{ borderRadius: 18, overflow: 'hidden' }}
              >
                <LinearGradient colors={['#FF6F00', '#FFD700', '#FF6F00']} style={est.btnVIP}>
                  <Text style={{ fontSize: 28 }}>👑</Text>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={est.btnVIPTitulo}>
                      {activando ? 'Activando...' : '¡Activar VIP 30 días!'}
                    </Text>
                    <Text style={est.btnVIPSub}>🪙 {COSTO_VIP_MES.toLocaleString()} monedas</Text>
                  </View>
                  <Text style={{ fontSize: 20 }}>→</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}

        {/* ── VIP ACTIVO BANNER ──────────────────────────────── */}
        {esVIP && (
          <View style={est.vipActivoCard}>
            <LinearGradient colors={['#FF6F00', '#FFD700']} style={est.vipActivoGrad}>
              <Text style={{ fontSize: 40 }}>👑</Text>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={est.vipActivoTitulo}>¡Eres VIP!</Text>
                <Text style={est.vipActivoSub}>
                  {diasRestantes} días restantes • Sin anuncios
                </Text>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* ── GANAR MONEDAS CON ANUNCIOS ─────────────────────── */}
        {!esVIP && (
          <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
            <Text style={est.seccionTitulo}>📺 GANAR MONEDAS VIENDO ANUNCIOS</Text>

            {/* Progreso de hoy */}
            <View style={est.adsProgreso}>
              <View style={{ flex: 1 }}>
                <Text style={est.adsProgresoTitulo}>
                  Anuncios de hoy: {adsHoy}/{MAX_ADS_DIA}
                </Text>
                <View style={est.adsBarContenedor}>
                  <View style={[est.adsBarFill, { width: `${(adsHoy/MAX_ADS_DIA)*100}%` }]} />
                </View>
                <Text style={est.adsProgresoSub}>
                  {adsRestantes > 0
                    ? `Puedes ganar ${(adsRestantes * MONEDAS_POR_AD).toLocaleString()} monedas más hoy`
                    : '✅ ¡Límite diario alcanzado! Vuelve mañana'}
                </Text>
              </View>
            </View>

            {/* Botón ver anuncio */}
            <TouchableOpacity
              onPress={verAnuncio}
              disabled={viendo || adsRestantes === 0}
              style={[
                est.btnVerAd,
                (viendo || adsRestantes === 0) && { opacity: 0.5 }
              ]}
            >
              <LinearGradient
                colors={adsRestantes > 0 ? [C.verde, C.verdeCl] : [C.oscuro, C.medio]}
                style={est.btnVerAdGrad}
              >
                <Text style={{ fontSize: 28 }}>📺</Text>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={est.btnVerAdTitulo}>
                    {viendo ? 'Cargando anuncio...' : `Ver anuncio → +${MONEDAS_POR_AD} 🪙`}
                  </Text>
                  <Text style={est.btnVerAdSub}>
                    {adsRestantes > 0
                      ? `${adsRestantes} disponibles hoy`
                      : 'Vuelve mañana para más'}
                  </Text>
                </View>
                {adsRestantes > 0 && <Text style={{ color: C.blanco, fontSize: 22 }}>▶</Text>}
              </LinearGradient>
            </TouchableOpacity>

            {/* Calculadora: ads para llegar a VIP */}
            {monedas < COSTO_VIP_MES && (
              <View style={est.calculadoraCard}>
                <Text style={est.calculadoraTitulo}>📊 ¿Cuánto falta para VIP?</Text>
                <View style={est.calculadoraRow}>
                  <View style={est.calculadoraItem}>
                    <Text style={est.calcNum}>
                      {Math.ceil((COSTO_VIP_MES - monedas) / MONEDAS_POR_AD)}
                    </Text>
                    <Text style={est.calcLabel}>anuncios</Text>
                  </View>
                  <Text style={{ color: `${C.blanco}40`, fontSize: 18 }}>o</Text>
                  <View style={est.calculadoraItem}>
                    <Text style={est.calcNum}>
                      {Math.ceil((COSTO_VIP_MES - monedas) / (MAX_ADS_DIA * MONEDAS_POR_AD + 100))}
                    </Text>
                    <Text style={est.calcLabel}>días de uso</Text>
                  </View>
                  <Text style={{ color: `${C.blanco}40`, fontSize: 18 }}>o</Text>
                  <View style={est.calculadoraItem}>
                    <Text style={est.calcNum}>
                      {Math.ceil((COSTO_VIP_MES - monedas) / 30)}
                    </Text>
                    <Text style={est.calcLabel}>partidas</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── BENEFICIOS VIP ─────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Text style={est.seccionTitulo}>✨ BENEFICIOS VIP</Text>
          <View style={est.beneficiosCard}>
            {BENEFICIOS_VIP.map((b, i) => (
              <View key={i} style={[est.beneficioFila, i > 0 && est.beneficioSep]}>
                <Text style={{ fontSize: 22 }}>{b.emoji}</Text>
                <Text style={est.beneficioTexto}>{b.texto}</Text>
                <Text style={{ color: C.verdeCl, fontSize: 14 }}>✓</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── TODAS LAS FORMAS DE GANAR MONEDAS ──────────────── */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Text style={est.seccionTitulo}>🪙 CÓMO GANAR MONEDAS</Text>
          <View style={est.ganarGrid}>
            {FORMAS_GANAR.map((f, i) => (
              <View key={i} style={est.ganarCard}>
                <Text style={{ fontSize: 28 }}>{f.emoji}</Text>
                <Text style={est.ganarMonedas}>{f.monedas}</Text>
                <Text style={est.ganarTitulo}>{f.titulo}</Text>
                <Text style={est.ganarDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── COMPARACIÓN FREE vs VIP ────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginTop: 20, marginBottom: 10 }}>
          <Text style={est.seccionTitulo}>⚖️ FREE vs VIP</Text>
          <View style={est.tablaComparacion}>
            {/* Cabecera */}
            <View style={est.tablaCabecera}>
              <Text style={[est.tablaCel, { flex: 2 }]}>Función</Text>
              <Text style={[est.tablaCel, { color: `${C.blanco}60` }]}>FREE</Text>
              <Text style={[est.tablaCel, { color: C.oro }]}>VIP 👑</Text>
            </View>
            {[
              ['Anuncios', '📺 Sí',   '🚫 No'],
              ['Mesas desbloqueadas', '3 gratis', '✅ Todas'],
              ['Monedas en torneo',   'x1',       'x2 🪙'],
              ['Matchmaking',         'Normal',   '⚡ VIP'],
              ['Avatares',            'Básicos',  '💎 Todos'],
              ['Estadísticas',        'Básicas',  '📊 Pro'],
            ].map(([func, free, vip], i) => (
              <View key={i} style={[est.tablaFila, i % 2 === 0 && est.tablaFilaOscura]}>
                <Text style={[est.tablaCel, { flex: 2, color: `${C.blanco}80` }]}>{func}</Text>
                <Text style={[est.tablaCel, { color: `${C.blanco}50` }]}>{free}</Text>
                <Text style={[est.tablaCel, { color: C.oro }]}>{vip}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const est = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.negro },
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : StatusBar.currentHeight + 10,
    paddingBottom: 20, paddingHorizontal: 20, alignItems: 'center',
    position: 'relative',
  },
  btnBack: {
    position: 'absolute', top: Platform.OS === 'ios' ? 54 : StatusBar.currentHeight + 10,
    left: 16, padding: 8
  },
  headerEmoji:  { fontSize: 60, marginBottom: 8 },
  headerTitulo: { color: C.oro, fontSize: 22, fontWeight: 'bold', letterSpacing: 2 },
  headerSub:    { color: `${C.blanco}80`, fontSize: 12, marginTop: 4 },
  vipActivo: {
    marginTop: 12, backgroundColor: `${C.verde}40`,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: C.verdeCl,
  },
  vipActivoTexto: { color: C.verdeCl, fontWeight: 'bold', fontSize: 13 },
  monederoHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  monederoHeaderNum:   { color: C.oro, fontWeight: 'bold', fontSize: 18 },
  monederoHeaderLabel: { color: `${C.blanco}60`, fontSize: 11 },

  seccionTitulo: {
    color: `${C.blanco}50`, fontSize: 10, letterSpacing: 2,
    marginBottom: 10, fontWeight: '600',
  },

  progresoBar: {
    height: 8, backgroundColor: `${C.blanco}15`, borderRadius: 4, overflow: 'hidden'
  },
  progresoFill: {
    height: '100%', backgroundColor: C.oro, borderRadius: 4
  },
  progresoTexto: { color: `${C.blanco}60`, fontSize: 11, textAlign: 'center', marginTop: 6 },
  btnVIP: {
    flexDirection: 'row', alignItems: 'center',
    padding: 18, borderRadius: 18
  },
  btnVIPTitulo: { color: C.negro, fontWeight: 'bold', fontSize: 17 },
  btnVIPSub:    { color: `${C.negro}90`, fontSize: 12, marginTop: 2 },

  vipActivoCard: { marginHorizontal: 16, marginTop: 20, borderRadius: 18, overflow: 'hidden' },
  vipActivoGrad: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  vipActivoTitulo: { color: C.negro, fontWeight: 'bold', fontSize: 20 },
  vipActivoSub:    { color: `${C.negro}80`, fontSize: 12, marginTop: 2 },

  adsProgreso: {
    backgroundColor: C.oscuro, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: `${C.blanco}15`
  },
  adsProgresoTitulo: { color: C.blanco, fontWeight: 'bold', fontSize: 13, marginBottom: 8 },
  adsBarContenedor:  { height: 6, backgroundColor: `${C.blanco}15`, borderRadius: 3, overflow: 'hidden' },
  adsBarFill:        { height: '100%', backgroundColor: C.verdeCl, borderRadius: 3 },
  adsProgresoSub:    { color: `${C.blanco}60`, fontSize: 11, marginTop: 6 },

  btnVerAd:    { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  btnVerAdGrad:{ flexDirection: 'row', alignItems: 'center', padding: 16 },
  btnVerAdTitulo:{ color: C.blanco, fontWeight: 'bold', fontSize: 16 },
  btnVerAdSub:   { color: `${C.blanco}80`, fontSize: 11, marginTop: 2 },

  calculadoraCard: {
    backgroundColor: `${C.azulCl}20`, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: `${C.azulCl}40`
  },
  calculadoraTitulo: { color: C.blanco, fontWeight: 'bold', fontSize: 12, marginBottom: 10 },
  calculadoraRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  calculadoraItem:   { alignItems: 'center' },
  calcNum:  { color: C.oro, fontWeight: 'bold', fontSize: 22 },
  calcLabel:{ color: `${C.blanco}60`, fontSize: 10, marginTop: 2 },

  beneficiosCard: {
    backgroundColor: C.oscuro, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: `${C.blanco}10`
  },
  beneficioFila: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12
  },
  beneficioSep:   { borderTopWidth: 1, borderTopColor: `${C.blanco}08` },
  beneficioTexto: { flex: 1, color: C.blanco, fontSize: 13 },

  ganarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ganarCard: {
    width: '30.5%', backgroundColor: C.oscuro, borderRadius: 14,
    alignItems: 'center', padding: 12,
    borderWidth: 1, borderColor: `${C.blanco}10`
  },
  ganarMonedas: { color: C.oro, fontWeight: 'bold', fontSize: 16, marginTop: 6 },
  ganarTitulo:  { color: C.blanco, fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  ganarDesc:    { color: `${C.blanco}50`, fontSize: 9, textAlign: 'center', marginTop: 2 },

  tablaComparacion: {
    backgroundColor: C.oscuro, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: `${C.blanco}10`
  },
  tablaCabecera: {
    flexDirection: 'row', backgroundColor: `${C.blanco}08`, padding: 12,
    borderBottomWidth: 1, borderBottomColor: `${C.blanco}15`
  },
  tablaCel:     { flex: 1, color: C.blanco, fontWeight: 'bold', fontSize: 12, textAlign: 'center' },
  tablaFila:    { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12 },
  tablaFilaOscura: { backgroundColor: `${C.blanco}04` },
});
