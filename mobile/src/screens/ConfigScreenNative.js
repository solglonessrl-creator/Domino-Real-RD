/**
 * ConfigScreenNative.js — Dominó Real RD
 * ────────────────────────────────────────
 * Pantalla de configuración: sonido, avatar,
 * tema de mesa, fichas y cerrar sesión.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, Alert, Platform, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const C = {
  azul:    '#002D62', azulCl: '#1565C0',
  rojo:    '#CF142B', blanco: '#FFFFFF',
  oro:     '#FFD700', negro:  '#0A0A0A',
  oscuro:  '#1A1A2E', medio:  '#2C2C54',
  verde:   '#2E7D32', verdeCl:'#4CAF50',
};

const CONFIG_KEY = 'domino_config';

// ── Opciones ──────────────────────────────────────────────────
const AVATARES = [
  { id: 'avatar_default', emoji: '👤', nombre: 'Clásico' },
  { id: 'avatar_rey',     emoji: '👑', nombre: 'Rey' },
  { id: 'avatar_fuego',   emoji: '🔥', nombre: 'Fuego' },
  { id: 'avatar_aguila',  emoji: '🦅', nombre: 'Águila' },
  { id: 'avatar_tigre',   emoji: '🐯', nombre: 'Tigre' },
  { id: 'avatar_domino',  emoji: '🎲', nombre: 'Dado' },
  { id: 'avatar_estella', emoji: '⭐', nombre: 'Estrella' },
  { id: 'avatar_rd',      emoji: '🇩🇴', nombre: 'RD' },
];

const TEMAS_MESA = [
  { id: 'azul_clasico',   colores: ['#002D62','#1565C0'], nombre: 'Azul RD',       emoji: '🔵' },
  { id: 'verde_selva',    colores: ['#1B5E20','#2E7D32'], nombre: 'Verde Selva',   emoji: '🌿' },
  { id: 'rojo_dominicano',colores: ['#7B1C1C','#CF142B'], nombre: 'Rojo RD',       emoji: '🔴' },
  { id: 'dorado_premium', colores: ['#5D4037','#FF8F00'], nombre: 'Dorado Premium',emoji: '✨' },
  { id: 'noche_oscura',   colores: ['#0A0A0A','#1A1A2E'], nombre: 'Noche',         emoji: '🌙' },
  { id: 'morado_real',    colores: ['#4A148C','#7B1FA2'], nombre: 'Real',           emoji: '💜' },
];

const DISENOS_FICHA = [
  { id: 'clasico',    nombre: 'Clásico',  emoji: '⬛' },
  { id: 'marfil',     nombre: 'Marfil',   emoji: '⬜' },
  { id: 'azul_neon',  nombre: 'Azul Neon',emoji: '🔷' },
  { id: 'rojo_fuego', nombre: 'Rojo Fuego',emoji: '🟥' },
];

// ── Componente: Sección ───────────────────────────────────────
function Seccion({ titulo, children }) {
  return (
    <View style={est.seccion}>
      <Text style={est.seccionTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

// ── Componente: Fila de toggle ────────────────────────────────
function FilaToggle({ emoji, label, sub, valor, onChange }) {
  return (
    <View style={est.filaToggle}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={est.filaLabel}>{label}</Text>
        {sub && <Text style={est.filaSub}>{sub}</Text>}
      </View>
      <Switch
        value={valor}
        onValueChange={onChange}
        trackColor={{ false: `${C.blanco}20`, true: `${C.verdeCl}80` }}
        thumbColor={valor ? C.verdeCl : `${C.blanco}60`}
      />
    </View>
  );
}

// ── PANTALLA PRINCIPAL ─────────────────────────────────────────
export default function ConfigScreenNative({ navigation, jugador }) {
  // Configuración guardada
  const [sonido,      setSonido]      = useState(true);
  const [vibracion,   setVibracion]   = useState(true);
  const [animaciones, setAnimaciones] = useState(true);
  const [notifPush,   setNotifPush]   = useState(true);
  const [avatar,      setAvatar]      = useState('avatar_default');
  const [temaMesa,    setTemaMesa]    = useState('azul_clasico');
  const [disenioFicha,setDisenioFicha]= useState('clasico');
  const [guardando,   setGuardando]   = useState(false);

  // Cargar config al montar
  useEffect(() => {
    AsyncStorage.getItem(CONFIG_KEY).then(str => {
      if (!str) return;
      const cfg = JSON.parse(str);
      if (cfg.sonido      !== undefined) setSonido(cfg.sonido);
      if (cfg.vibracion   !== undefined) setVibracion(cfg.vibracion);
      if (cfg.animaciones !== undefined) setAnimaciones(cfg.animaciones);
      if (cfg.notifPush   !== undefined) setNotifPush(cfg.notifPush);
      if (cfg.avatar)      setAvatar(cfg.avatar);
      if (cfg.temaMesa)    setTemaMesa(cfg.temaMesa);
      if (cfg.disenioFicha)setDisenioFicha(cfg.disenioFicha);
    });
  }, []);

  // Guardar cada vez que cambia algo
  const guardar = async (updates) => {
    const actual = {
      sonido, vibracion, animaciones, notifPush,
      avatar, temaMesa, disenioFicha, ...updates
    };
    await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(actual));
  };

  const cambiar = (setter, key) => async (val) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter(val);
    await guardar({ [key]: val });
  };

  const cerrarSesion = () => {
    Alert.alert(
      '¿Cerrar sesión?',
      'Tendrás que iniciar sesión de nuevo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await AsyncStorage.multiRemove([
              'domino_token', 'domino_jugador', 'domino_fb_token'
            ]);
            // La app detecta que no hay token y muestra Login automáticamente
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          }
        }
      ]
    );
  };

  const temaActual = TEMAS_MESA.find(t => t.id === temaMesa) || TEMAS_MESA[0];

  return (
    <View style={est.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor={C.azul} />

      {/* ── HEADER ─────────────────────────────────────────── */}
      <LinearGradient colors={[C.azul, C.oscuro]} style={est.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={est.btnBack}
        >
          <Text style={{ color: C.blanco, fontSize: 18 }}>‹</Text>
        </TouchableOpacity>
        <Text style={est.headerTitulo}>⚙️ Configuración</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── PERFIL ─────────────────────────────────────────── */}
        <View style={est.perfilCard}>
          <View style={est.perfilAvatar}>
            <Text style={{ fontSize: 40 }}>
              {AVATARES.find(a => a.id === avatar)?.emoji || '👤'}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={est.perfilNombre}>{jugador?.nombre || 'Jugador'}</Text>
            <Text style={est.perfilElo}>🏅 ELO: {jugador?.elo || 1200}</Text>
            <Text style={est.perfilLiga}>{jugador?.liga || 'Bronce'}</Text>
          </View>
          <View style={est.perfilMonedas}>
            <Text style={{ fontSize: 20 }}>🪙</Text>
            <Text style={est.monedasNum}>{(jugador?.monedas || 0).toLocaleString()}</Text>
          </View>
        </View>

        {/* ── AVATAR ─────────────────────────────────────────── */}
        <Seccion titulo="👤 AVATAR">
          <View style={est.avatarGrid}>
            {AVATARES.map(a => (
              <TouchableOpacity
                key={a.id}
                onPress={() => cambiar(setAvatar, 'avatar')(a.id)}
                style={[est.avatarBtn, avatar === a.id && est.avatarBtnActivo]}
              >
                <Text style={{ fontSize: 28 }}>{a.emoji}</Text>
                <Text style={[est.avatarNombre, avatar === a.id && { color: C.oro }]}>
                  {a.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Seccion>

        {/* ── TEMA DE MESA ──────────────────────────────────── */}
        <Seccion titulo="🎮 TEMA DE MESA">
          <View style={est.temaGrid}>
            {TEMAS_MESA.map(t => (
              <TouchableOpacity
                key={t.id}
                onPress={() => cambiar(setTemaMesa, 'temaMesa')(t.id)}
                style={est.temaBtn}
              >
                <LinearGradient
                  colors={t.colores}
                  style={[
                    est.temaGrad,
                    temaMesa === t.id && est.temaGradActivo
                  ]}
                >
                  <Text style={{ fontSize: 22 }}>{t.emoji}</Text>
                  {temaMesa === t.id && (
                    <View style={est.temaCheck}>
                      <Text style={{ fontSize: 10 }}>✓</Text>
                    </View>
                  )}
                </LinearGradient>
                <Text style={[est.temaNombre, temaMesa === t.id && { color: C.oro }]}>
                  {t.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Seccion>

        {/* ── DISEÑO DE FICHAS ──────────────────────────────── */}
        <Seccion titulo="🎲 DISEÑO DE FICHAS">
          <View style={est.fichaGrid}>
            {DISENOS_FICHA.map(d => (
              <TouchableOpacity
                key={d.id}
                onPress={() => cambiar(setDisenioFicha, 'disenioFicha')(d.id)}
                style={[
                  est.fichaBtn,
                  disenioFicha === d.id && est.fichaBtnActivo
                ]}
              >
                <Text style={{ fontSize: 28 }}>{d.emoji}</Text>
                <Text style={[est.fichaBtnNombre, disenioFicha === d.id && { color: C.oro }]}>
                  {d.nombre}
                </Text>
                {disenioFicha === d.id && (
                  <Text style={{ color: C.oro, fontSize: 10 }}>✓ Activo</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Seccion>

        {/* ── SONIDO Y VIBRACIÓN ────────────────────────────── */}
        <Seccion titulo="🔔 SONIDO Y NOTIFICACIONES">
          <View style={est.togglesBox}>
            <FilaToggle
              emoji="🔊"
              label="Efectos de sonido"
              sub="Sonido al jugar fichas y eventos"
              valor={sonido}
              onChange={cambiar(setSonido, 'sonido')}
            />
            <View style={est.separador} />
            <FilaToggle
              emoji="📳"
              label="Vibración"
              sub="Vibra al jugar y recibir notificaciones"
              valor={vibracion}
              onChange={cambiar(setVibracion, 'vibracion')}
            />
            <View style={est.separador} />
            <FilaToggle
              emoji="✨"
              label="Animaciones"
              sub="Animaciones de fichas y efectos visuales"
              valor={animaciones}
              onChange={cambiar(setAnimaciones, 'animaciones')}
            />
            <View style={est.separador} />
            <FilaToggle
              emoji="🔔"
              label="Notificaciones Push"
              sub="Torneos, amigos, revancha"
              valor={notifPush}
              onChange={cambiar(setNotifPush, 'notifPush')}
            />
          </View>
        </Seccion>

        {/* ── CUENTA ────────────────────────────────────────── */}
        <Seccion titulo="👤 CUENTA">
          <View style={est.togglesBox}>
            {/* Versión */}
            <View style={est.filaInfo}>
              <Text style={{ fontSize: 18 }}>📱</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={est.filaLabel}>Versión de la app</Text>
                <Text style={est.filaSub}>v1.0.0 — Dominó Real RD</Text>
              </View>
            </View>

            <View style={est.separador} />

            {/* Soporte */}
            <TouchableOpacity style={est.filaToggle}>
              <Text style={{ fontSize: 18 }}>💬</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={est.filaLabel}>Soporte</Text>
                <Text style={est.filaSub}>solglones.s.r.l@gmail.com</Text>
              </View>
              <Text style={{ color: `${C.blanco}40` }}>›</Text>
            </TouchableOpacity>

            <View style={est.separador} />

            {/* Privacidad */}
            <TouchableOpacity style={est.filaToggle}>
              <Text style={{ fontSize: 18 }}>🔒</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={est.filaLabel}>Política de privacidad</Text>
                <Text style={est.filaSub}>domino-real-rd.vercel.app/privacidad</Text>
              </View>
              <Text style={{ color: `${C.blanco}40` }}>›</Text>
            </TouchableOpacity>
          </View>
        </Seccion>

        {/* ── BOTÓN CERRAR SESIÓN ───────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          <TouchableOpacity style={est.btnCerrarSesion} onPress={cerrarSesion}>
            <Text style={est.btnCerrarTexto}>🚪 Cerrar sesión</Text>
          </TouchableOpacity>

          <Text style={est.footer}>
            🇩🇴 Dominó Real RD — El dominó dominicano del mundo
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── ESTILOS ───────────────────────────────────────────────────
const est = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.negro },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : StatusBar.currentHeight + 10,
    paddingHorizontal: 16, paddingBottom: 14,
  },
  btnBack:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitulo: { color: C.blanco, fontWeight: 'bold', fontSize: 17 },

  perfilCard: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, backgroundColor: C.oscuro,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: `${C.azulCl}40`
  },
  perfilAvatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: `${C.oro}20`, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.oro
  },
  perfilNombre: { color: C.blanco, fontWeight: 'bold', fontSize: 16 },
  perfilElo:    { color: C.oro, fontSize: 13, marginTop: 2 },
  perfilLiga:   { color: `${C.blanco}50`, fontSize: 11, marginTop: 2 },
  perfilMonedas:{ alignItems: 'center' },
  monedasNum:   { color: C.oro, fontWeight: 'bold', fontSize: 14 },

  seccion: { marginBottom: 6 },
  seccionTitulo: {
    color: `${C.blanco}50`, fontSize: 10, letterSpacing: 2,
    paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4,
  },

  avatarGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 8
  },
  avatarBtn: {
    width: '22%', backgroundColor: C.oscuro, borderRadius: 12,
    alignItems: 'center', padding: 10,
    borderWidth: 1.5, borderColor: `${C.blanco}15`
  },
  avatarBtnActivo: { borderColor: C.oro, backgroundColor: `${C.oro}15` },
  avatarNombre:    { color: `${C.blanco}70`, fontSize: 9, marginTop: 4 },

  temaGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 10
  },
  temaBtn:      { width: '30%', alignItems: 'center' },
  temaGrad: {
    width: '100%', aspectRatio: 1.5, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
    position: 'relative',
  },
  temaGradActivo: { borderColor: C.oro },
  temaCheck: {
    position: 'absolute', top: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: C.oro, alignItems: 'center', justifyContent: 'center'
  },
  temaNombre: { color: `${C.blanco}70`, fontSize: 10, marginTop: 5, textAlign: 'center' },

  fichaGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 10
  },
  fichaBtn: {
    width: '22%', backgroundColor: C.oscuro, borderRadius: 12,
    alignItems: 'center', padding: 10,
    borderWidth: 1.5, borderColor: `${C.blanco}15`
  },
  fichaBtnActivo:  { borderColor: C.oro, backgroundColor: `${C.oro}10` },
  fichaBtnNombre:  { color: `${C.blanco}70`, fontSize: 9, marginTop: 4 },

  togglesBox: {
    backgroundColor: C.oscuro, marginHorizontal: 16,
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: `${C.blanco}10`
  },
  filaToggle: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14
  },
  filaInfo: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14
  },
  filaLabel: { color: C.blanco, fontSize: 14, fontWeight: '600' },
  filaSub:   { color: `${C.blanco}50`, fontSize: 11, marginTop: 2 },
  separador: { height: 1, backgroundColor: `${C.blanco}08`, marginLeft: 54 },

  btnCerrarSesion: {
    backgroundColor: `${C.rojo}20`, borderRadius: 16,
    padding: 16, alignItems: 'center',
    borderWidth: 1.5, borderColor: `${C.rojo}60`, marginBottom: 16
  },
  btnCerrarTexto: { color: '#EF9A9A', fontWeight: 'bold', fontSize: 15 },
  footer: { color: `${C.blanco}30`, fontSize: 11, textAlign: 'center' },
});
