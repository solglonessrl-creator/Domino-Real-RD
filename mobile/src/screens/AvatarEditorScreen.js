/**
 * AvatarEditorScreen.js — Dominó Real RD
 * ──────────────────────────────────────────────────────────────
 * Editor de avatar con 4 métodos:
 *   📷 Cámara    — expo-image-picker
 *   🖼️ Galería   — expo-image-picker
 *   🤖 IA        — Pollinations.ai (GRATIS) + rewarded ad requerido
 *   👤 Emoji     — 30+ avatares predefinidos
 *
 * El avatar se guarda tanto en AsyncStorage (cache local) como
 * en el backend vía PUT /api/jugadores/personalizar
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, TextInput, Alert, ActivityIndicator, Platform,
  StatusBar, Animated, Dimensions, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdService from '../services/AdService';

const { width } = Dimensions.get('window');
const API_URL  = 'https://domino-real-rd-production.up.railway.app/api';

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
  morado:     '#7B1FA2',
};

// ── Emojis premium dominicanos ────────────────────────────────────
const EMOJIS_AVATAR = [
  '👤','👑','🔥','🦅','🐯','🎲','⭐','🇩🇴',
  '🏆','💎','😎','🧢','⚡','🎯','💪','🚀',
  '🎰','🎪','🎩','🕶️','🥇','🎖️','🌟','✨',
  '🦁','🐺','🐉','🦈','⚽','🏀','🎸','🥁',
];

// ── Prompts dominicanos sugeridos ─────────────────────────────────
const PROMPTS_SUGERIDOS = [
  { emoji: '🧢', texto: 'Dominican man wearing cap, smiling, casual style, 3D portrait, studio lighting, 8K' },
  { emoji: '👑', texto: 'Dominican king character, royal crown, gold accessories, portrait, epic style, 8K' },
  { emoji: '🎲', texto: 'Dominican domino player, experienced man, holding domino tile, portrait, cinematic, 8K' },
  { emoji: '🦸', texto: 'Dominican superhero, red and blue suit, flag of Dominican Republic, portrait, 8K' },
  { emoji: '🎩', texto: 'Dominican gentleman, elegant suit, classic hat, 1950s style, portrait, 8K' },
  { emoji: '🔥', texto: 'Dominican warrior, intense eyes, battle ready, epic portrait, dramatic lighting, 8K' },
];

// ── Pollinations.ai — URL de generación (GRATIS, sin API key) ─────
function getPollinationsUrl(prompt) {
  const clean = encodeURIComponent(prompt.trim());
  const seed  = Math.floor(Math.random() * 1_000_000);
  return `https://image.pollinations.ai/prompt/${clean}?width=512&height=512&nologo=true&seed=${seed}`;
}

// ═══════════════════════════════════════════════════════════════════
export default function AvatarEditorScreen({ navigation, route, jugador }) {
  const [tab,        setTab]        = useState('emoji');
  const [avatarSel,  setAvatarSel]  = useState(null);   // { tipo, valor }
  const [guardando,  setGuardando]  = useState(false);

  // IA state
  const [promptIA,   setPromptIA]   = useState(PROMPTS_SUGERIDOS[0].texto);
  const [generando,  setGenerando]  = useState(false);
  const [imagenIA,   setImagenIA]   = useState(null);
  const [modalAd,    setModalAd]    = useState(false);

  // Animación de la previsualización
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Cargar avatar actual
    AsyncStorage.getItem('domino_avatar_activo').then(raw => {
      if (raw) {
        try { setAvatarSel(JSON.parse(raw)); }
        catch { setAvatarSel({ tipo: 'emoji', valor: '👤' }); }
      } else {
        setAvatarSel({ tipo: 'emoji', valor: jugador?.avatar || '👤' });
      }
    });
  }, []);

  // Pulse al cambiar avatar
  useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.1, duration: 150, useNativeDriver: true }),
      Animated.spring(scaleAnim,  { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [avatarSel]);

  // ══════════════════════════════════════════════════════════════
  // CÁMARA
  // ══════════════════════════════════════════════════════════════
  const abrirCamara = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a la cámara para tomar foto');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes:    ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect:        [1, 1],
        quality:       0.7,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setAvatarSel({ tipo: 'foto', valor: result.assets[0].uri });
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo abrir la cámara: ' + e.message);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // GALERÍA
  // ══════════════════════════════════════════════════════════════
  const abrirGaleria = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tus fotos');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:    ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect:        [1, 1],
        quality:       0.7,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setAvatarSel({ tipo: 'foto', valor: result.assets[0].uri });
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo abrir la galería: ' + e.message);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // IA — requiere ver un rewarded ad primero
  // ══════════════════════════════════════════════════════════════
  const iniciarGeneracionIA = () => {
    if (!promptIA.trim()) {
      Alert.alert('Prompt vacío', 'Escribe cómo quieres tu avatar');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setModalAd(true);  // modal de confirmación "Ver anuncio para generar"
  };

  const verAdYGenerar = async () => {
    setModalAd(false);
    setGenerando(true);

    // Mostrar rewarded — si no se completa, abortamos
    let adCompletado = false;
    await AdService.mostrarRewarded(() => { adCompletado = true; });

    // Si el usuario cerró el ad sin completarlo, VIP salta este paso
    const esVip = await AdService.esVIP();
    if (!adCompletado && !esVip) {
      setGenerando(false);
      Alert.alert(
        'Ad no completado',
        'Necesitas ver el anuncio completo para generar. Los VIP pueden saltar este paso.'
      );
      return;
    }

    // Generar imagen con Pollinations (gratis, sin API key)
    try {
      const url = getPollinationsUrl(promptIA);

      // Verificar que la imagen se genere correctamente (HEAD request)
      // Pollinations puede tardar 5-15s en generar
      const resp = await fetch(url, { method: 'GET' });
      if (!resp.ok) throw new Error('Pollinations respondió ' + resp.status);

      setImagenIA(url);
      setAvatarSel({ tipo: 'ia', valor: url });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Error generando', 'Intenta con otro prompt o más tarde');
    } finally {
      setGenerando(false);
    }
  };

  const regenerarIA = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Para regenerar también se requiere otro ad
    iniciarGeneracionIA();
  };

  // ══════════════════════════════════════════════════════════════
  // GUARDAR en backend + AsyncStorage
  // ══════════════════════════════════════════════════════════════
  const guardar = async () => {
    if (!avatarSel) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGuardando(true);
    try {
      // 1. Cache local
      await AsyncStorage.setItem('domino_avatar_activo', JSON.stringify(avatarSel));

      // 2. Sincronizar con backend (solo para tipos 'ia' y 'emoji'
      //    — fotos locales no se suben aún; futuro: upload a CDN)
      const token = await AsyncStorage.getItem('domino_token');
      if (token && (avatarSel.tipo === 'emoji' || avatarSel.tipo === 'ia')) {
        // Guardamos formato "tipo:valor" para distinguir
        const avatarStr = `${avatarSel.tipo}:${avatarSel.valor}`;
        await fetch(`${API_URL}/jugadores/personalizar`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ avatar: avatarStr }),
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Guardado', 'Tu avatar se actualizó correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar: ' + e.message);
    } finally {
      setGuardando(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  const renderPreview = () => {
    if (!avatarSel) return <Text style={{ fontSize: 80 }}>👤</Text>;
    if (avatarSel.tipo === 'emoji') return <Text style={{ fontSize: 80 }}>{avatarSel.valor}</Text>;
    if (avatarSel.tipo === 'foto' || avatarSel.tipo === 'ia') {
      return <Image source={{ uri: avatarSel.valor }} style={est.previewImg} />;
    }
    return null;
  };

  return (
    <View style={est.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor={C.azul} />

      {/* ── HEADER ─────────────────────────────────────────── */}
      <LinearGradient
        colors={[C.azul, C.oscuro]}
        style={est.header}
      >
        <View style={est.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={est.btnVolver}>
            <Text style={{ color: C.blanco, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={est.headerTitulo}>Editar Avatar</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Preview grande */}
        <Animated.View style={[est.previewWrap, { transform: [{ scale: scaleAnim }] }]}>
          <View style={est.previewBox}>
            {renderPreview()}
          </View>
        </Animated.View>

        <Text style={est.previewHint}>
          {avatarSel?.tipo === 'foto' ? '📷 Foto personal'
           : avatarSel?.tipo === 'ia'    ? '🤖 Generado con IA'
           : '👤 Avatar clásico'}
        </Text>
      </LinearGradient>

      {/* ── TABS ─────────────────────────────────────────── */}
      <View style={est.tabs}>
        {[
          { id: 'emoji',   label: '👤 Clásico' },
          { id: 'foto',    label: '📷 Foto' },
          { id: 'ia',      label: '🤖 IA' },
        ].map(t => (
          <TouchableOpacity
            key={t.id}
            onPress={() => { setTab(t.id); Haptics.selectionAsync(); }}
            style={[est.tab, tab === t.id && est.tabActiva]}
          >
            <Text style={[est.tabTxt, tab === t.id && est.tabTxtActiva]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ══════════════════════════════════════════════════ */}
        {/* TAB: EMOJI                                          */}
        {/* ══════════════════════════════════════════════════ */}
        {tab === 'emoji' && (
          <View style={est.seccion}>
            <Text style={est.seccionTxt}>Elige un avatar clásico dominicano</Text>
            <View style={est.emojiGrid}>
              {EMOJIS_AVATAR.map((emoji, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setAvatarSel({ tipo: 'emoji', valor: emoji });
                  }}
                  style={[
                    est.emojiItem,
                    avatarSel?.tipo === 'emoji' &&
                    avatarSel?.valor === emoji && est.emojiItemActivo
                  ]}
                >
                  <Text style={{ fontSize: 32 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/* TAB: FOTO                                          */}
        {/* ══════════════════════════════════════════════════ */}
        {tab === 'foto' && (
          <View style={est.seccion}>
            <Text style={est.seccionTxt}>Sube tu foto real</Text>

            <TouchableOpacity style={est.btnGrande} onPress={abrirCamara}>
              <LinearGradient colors={[C.verde, C.verdeClaro]} style={est.btnGrandeGrad}>
                <Text style={{ fontSize: 40 }}>📷</Text>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={est.btnGrandeTitulo}>Tomar foto con cámara</Text>
                  <Text style={est.btnGrandeSub}>Usa la cámara de tu teléfono</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={est.btnGrande} onPress={abrirGaleria}>
              <LinearGradient colors={[C.azul, C.azulClaro]} style={est.btnGrandeGrad}>
                <Text style={{ fontSize: 40 }}>🖼️</Text>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={est.btnGrandeTitulo}>Elegir de galería</Text>
                  <Text style={est.btnGrandeSub}>Escoge una foto existente</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <View style={est.info}>
              <Text style={est.infoTxt}>
                📌 Tu foto se guarda localmente en tu teléfono.{'\n'}
                📌 Se recorta automáticamente a cuadro.{'\n'}
                📌 Queda visible solo para ti al iniciar sesión.
              </Text>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/* TAB: IA — Pollinations.ai + rewarded ad            */}
        {/* ══════════════════════════════════════════════════ */}
        {tab === 'ia' && (
          <View style={est.seccion}>
            <Text style={est.seccionTxt}>
              Genera tu avatar único con Inteligencia Artificial
            </Text>

            {/* Prompts sugeridos */}
            <Text style={est.subLabel}>✨ Prompts sugeridos:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {PROMPTS_SUGERIDOS.map((p, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => { setPromptIA(p.texto); Haptics.selectionAsync(); }}
                  style={est.chipPrompt}
                >
                  <Text style={{ fontSize: 22 }}>{p.emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Input prompt */}
            <Text style={est.subLabel}>📝 Tu prompt:</Text>
            <TextInput
              style={est.inputIA}
              value={promptIA}
              onChangeText={setPromptIA}
              placeholder="Describe tu avatar..."
              placeholderTextColor={`${C.blanco}40`}
              multiline
              numberOfLines={3}
            />

            {/* Botón generar */}
            <TouchableOpacity
              onPress={iniciarGeneracionIA}
              disabled={generando}
              style={{ marginTop: 14 }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[C.morado, '#4A148C', C.azul]}
                style={est.btnGenerar}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                {generando ? (
                  <>
                    <ActivityIndicator color={C.blanco} />
                    <Text style={[est.btnGenerarTxt, { marginLeft: 12 }]}>
                      Generando con IA... (~10 seg)
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={{ fontSize: 28 }}>🤖</Text>
                    <Text style={[est.btnGenerarTxt, { marginLeft: 10 }]}>
                      📺 Ver anuncio y Generar
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Resultado */}
            {imagenIA && !generando && (
              <View style={est.resultadoIA}>
                <Image source={{ uri: imagenIA }} style={est.resultadoImg} />
                <TouchableOpacity onPress={regenerarIA} style={est.btnRegen}>
                  <Text style={est.btnRegenTxt}>🔄 Regenerar (nuevo anuncio)</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Info técnica */}
            <View style={est.info}>
              <Text style={est.infoTxt}>
                🧠 Generado por Pollinations.ai (gratis){'\n'}
                📺 Cada generación requiere ver un anuncio corto{'\n'}
                👑 Usuarios VIP pueden saltar el anuncio{'\n'}
                ♾️ Genera las veces que quieras
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── BOTÓN GUARDAR (fijo abajo) ─────────────────────── */}
      <View style={est.guardarWrap}>
        <TouchableOpacity
          onPress={guardar}
          disabled={guardando || !avatarSel}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[C.oro, '#FFA000']}
            style={est.guardarBtn}
          >
            {guardando
              ? <ActivityIndicator color={C.negro} />
              : <Text style={est.guardarTxt}>✅ GUARDAR AVATAR</Text>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── MODAL CONFIRMACIÓN REWARDED ─────────────────── */}
      <Modal visible={modalAd} transparent animationType="fade">
        <View style={est.modalBg}>
          <View style={est.modalBox}>
            <Text style={{ fontSize: 48, marginBottom: 10 }}>📺</Text>
            <Text style={est.modalTitulo}>Ver anuncio para generar</Text>
            <Text style={est.modalTxt}>
              Pollinations AI es gratis, pero cada generación{'\n'}
              te pedimos ver un anuncio corto 🙏
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => setModalAd(false)}
                style={[est.modalBtn, { backgroundColor: C.medio }]}
              >
                <Text style={est.modalBtnTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={verAdYGenerar}
                style={[est.modalBtn, { backgroundColor: C.oro }]}
              >
                <Text style={[est.modalBtnTxt, { color: C.negro }]}>
                  📺 Ver anuncio
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const est = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.negro },

  // Header
  header: {
    paddingTop:    Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
    paddingBottom: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', width: '100%', marginBottom: 16,
  },
  btnVolver: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitulo: { color: C.blanco, fontSize: 18, fontWeight: 'bold' },

  previewWrap: { marginVertical: 10 },
  previewBox: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: `${C.oro}20`,
    borderWidth: 3, borderColor: C.oro,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImg: { width: 140, height: 140 },
  previewHint: { color: `${C.blanco}80`, fontSize: 12, marginTop: 10, letterSpacing: 1 },

  // Tabs
  tabs: { flexDirection: 'row', backgroundColor: C.oscuro },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActiva: { borderBottomWidth: 2, borderBottomColor: C.oro },
  tabTxt: { color: `${C.blanco}60`, fontSize: 13, fontWeight: '600' },
  tabTxtActiva: { color: C.oro },

  // Secciones
  seccion: { padding: 16 },
  seccionTxt: { color: C.blanco, fontSize: 14, marginBottom: 14, textAlign: 'center' },
  subLabel: { color: `${C.blanco}70`, fontSize: 12, marginTop: 10, marginBottom: 6, letterSpacing: 1 },

  // Emoji grid
  emojiGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: 10,
  },
  emojiItem: {
    width: (width - 80) / 4, height: 64,
    backgroundColor: C.oscuro, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  emojiItemActivo: { borderColor: C.oro, backgroundColor: `${C.oro}20` },

  // Botones grandes (cámara/galería)
  btnGrande: { marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  btnGrandeGrad: { flexDirection: 'row', alignItems: 'center', padding: 18 },
  btnGrandeTitulo: { color: C.blanco, fontSize: 16, fontWeight: 'bold' },
  btnGrandeSub: { color: `${C.blanco}80`, fontSize: 12, marginTop: 2 },

  // IA
  chipPrompt: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: C.oscuro,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10, borderWidth: 1, borderColor: `${C.blanco}20`,
  },
  inputIA: {
    backgroundColor: C.oscuro, borderRadius: 12,
    padding: 14, color: C.blanco, fontSize: 13,
    borderWidth: 1, borderColor: `${C.blanco}20`,
    minHeight: 70, textAlignVertical: 'top',
  },
  btnGenerar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 18, borderRadius: 16,
  },
  btnGenerarTxt: { color: C.blanco, fontSize: 15, fontWeight: 'bold' },
  resultadoIA: { alignItems: 'center', marginTop: 16 },
  resultadoImg: {
    width: 200, height: 200, borderRadius: 16,
    borderWidth: 2, borderColor: C.oro,
  },
  btnRegen: {
    marginTop: 12, paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: C.oscuro, borderRadius: 12,
    borderWidth: 1, borderColor: C.oro,
  },
  btnRegenTxt: { color: C.oro, fontWeight: '600', fontSize: 12 },

  info: {
    marginTop: 18, padding: 14,
    backgroundColor: `${C.azul}30`, borderRadius: 12,
    borderWidth: 1, borderColor: `${C.azul}60`,
  },
  infoTxt: { color: `${C.blanco}90`, fontSize: 12, lineHeight: 18 },

  // Botón guardar
  guardarWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: C.negro,
    borderTopWidth: 1, borderTopColor: `${C.blanco}15`,
  },
  guardarBtn: {
    padding: 16, borderRadius: 16, alignItems: 'center',
  },
  guardarTxt: { color: C.negro, fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },

  // Modal
  modalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modalBox: {
    backgroundColor: C.oscuro, borderRadius: 18, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: C.oro,
    maxWidth: 360,
  },
  modalTitulo: { color: C.blanco, fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  modalTxt: { color: `${C.blanco}90`, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  modalBtn: {
    flex: 1, padding: 14, borderRadius: 12, alignItems: 'center',
  },
  modalBtnTxt: { color: C.blanco, fontWeight: 'bold', fontSize: 14 },
});
