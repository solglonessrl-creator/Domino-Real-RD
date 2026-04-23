/**
 * TiendaScreenNative.js — Dominó Real RD
 * ════════════════════════════════════════
 * "COLMADO MI BARRIO" — La tienda dominicana auténtica
 *
 * Secciones:
 *  🏪 Colmado     — Productos dominicanos (Presidente, Mamajuana, etc.)
 *  🏘️  Mesas       — Mesas por barrio del Distrito Nacional
 *  👤 Avatar Pro  — Avatares dominicanos + generador IA
 *  ❤️  Apoyar      — Donar al desarrollador del proyecto
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, Linking, Animated, Platform,
  StatusBar, FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'https://domino-real-rd-production.up.railway.app/api';

const C = {
  azul:   '#002D62', azulCl: '#1565C0',
  rojo:   '#CF142B', blanco: '#FFFFFF',
  oro:    '#FFD700', negro:  '#0A0A0A',
  oscuro: '#1A1A2E', medio:  '#2C2C54',
  verde:  '#2E7D32', verdeCl:'#4CAF50',
  marron: '#5D4037',
};

// ════════════════════════════════════════════════════════════
// CATÁLOGO DEL COLMADO (productos dominicanos)
// ════════════════════════════════════════════════════════════
const COLMADO = [
  // ── BEBIDAS ──────────────────────────────────────────────
  {
    id: 'presidente_fria',   categoria: 'bebidas',
    nombre:   'Cerveza Presidente',
    emoji:    '🍺',
    desc:     'La cerveza de los dominicanos. Un clásico que no puede faltar en ningún dominó.',
    precio:   150,
    efecto:   '🍺 Animación especial al capicúa',
    tag:      '¡EMBLEMA RD!',
    tagColor: '#1565C0',
  },
  {
    id: 'mamajuana',         categoria: 'bebidas',
    nombre:   'Mamajuana',
    emoji:    '🍶',
    desc:     'El elixir dominicano. Madera, ron y vino. Te da suerte en el juego.',
    precio:   250,
    efecto:   '🍶 Reacción exclusiva en el chat',
    tag:      'SUERTE',
    tagColor: '#7B1FA2',
  },
  {
    id: 'ron_barcelo',       categoria: 'bebidas',
    nombre:   'Ron Barceló',
    emoji:    '🥃',
    desc:     'El ron premium de la República Dominicana. Clase y sabor.',
    precio:   350,
    efecto:   '✨ Marco dorado en tu avatar',
    tag:      'PREMIUM',
    tagColor: C.marron,
  },
  {
    id: 'jugo_chinola',      categoria: 'bebidas',
    nombre:   'Jugo de Chinola',
    emoji:    '🧃',
    desc:     'Fresco y tropical. La chinola dominicana para los que no toman.',
    precio:   75,
    efecto:   '🟡 Badge en el chat',
    tag:      null,
    tagColor: null,
  },
  {
    id: 'morir_sonando',     categoria: 'bebidas',
    nombre:   'Morir Soñando',
    emoji:    '🥛',
    desc:     'La bebida nacional dominicana. Jugo de naranja con leche.',
    precio:   100,
    efecto:   '🌙 Tema nocturno de fichas',
    tag:      null,
    tagColor: null,
  },
  // ── COMIDAS ──────────────────────────────────────────────
  {
    id: 'tostones',          categoria: 'comidas',
    nombre:   'Tostones',
    emoji:    '🟡',
    desc:     'El aperitivo del dominicano auténtico. Decoración de mesa.',
    precio:   80,
    efecto:   '🟡 Decoración alrededor de la mesa de juego',
    tag:      null,
    tagColor: null,
  },
  {
    id: 'mangú',             categoria: 'comidas',
    nombre:   'Mangú con Salami',
    emoji:    '🥘',
    desc:     'El plato nacional. Energía para jugar toda la noche.',
    precio:   120,
    efecto:   '💪 +10% de tiempo en el timer de turno',
    tag:      'LOS TRES GOLPES',
    tagColor: '#E65100',
  },
  {
    id: 'chicharron',        categoria: 'comidas',
    nombre:   'Chicharrón',
    emoji:    '🍖',
    desc:     'El chicharrón crujiente de los colmados del barrio.',
    precio:   90,
    efecto:   '🔥 Reacción de fuego en el chat',
    tag:      null,
    tagColor: null,
  },
  {
    id: 'batata',            categoria: 'comidas',
    nombre:   'Batata Asada',
    emoji:    '🍠',
    desc:     'La batata caliente del colmadero. Efecto especial en el tablero.',
    precio:   60,
    efecto:   '🍠 Borde naranja en el tablero',
    tag:      null,
    tagColor: null,
  },
  // ── MÚSICA ───────────────────────────────────────────────
  {
    id: 'merengue_pack',     categoria: 'musica',
    nombre:   'Pack Merengue',
    emoji:    '🥁',
    desc:     'El ritmo del merengue de fondo mientras juegas. ¡A moverse!',
    precio:   500,
    efecto:   '🥁 Música de merengue en el juego',
    tag:      '🎵 MÚSICA',
    tagColor: C.rojo,
  },
  {
    id: 'bachata_pack',      categoria: 'musica',
    nombre:   'Pack Bachata',
    emoji:    '🎸',
    desc:     'El ritmo del amor dominicano. Bachata suave para el dominó.',
    precio:   500,
    efecto:   '🎸 Música de bachata de fondo',
    tag:      '🎵 MÚSICA',
    tagColor: '#7B1FA2',
  },
  {
    id: 'dembow_pack',       categoria: 'musica',
    nombre:   'Pack Dembow',
    emoji:    '🎤',
    desc:     'El dembow del barrio. Para los que juegan duro.',
    precio:   600,
    efecto:   '🎤 Música urbana de fondo',
    tag:      '🔥 FUEGO',
    tagColor: '#E65100',
  },
];

// ════════════════════════════════════════════════════════════
// MESAS POR BARRIO — DISTRITO NACIONAL
// ════════════════════════════════════════════════════════════
const MESAS_BARRIO = [
  {
    id: 'los_minas',
    nombre:   'Los Minas',
    emoji:    '🏘️',
    desc:     '¡El barrio que no puede faltar! Dominó en la acera.',
    precio:   0,
    gratis:   true,
    colores:  ['#E65100', '#BF360C'],
    ambiente: 'Calle de Los Minas, con el colmado al fondo y el río Ozama.',
    paisaje:  { tipo: 'calle', colores: ['#1A0800', '#3E1F00', '#5D2E00'] },
    tag:      '🏠 MI BARRIO',
    tagColor: '#E65100',
  },
  {
    id: 'villa_consuelo',
    nombre:   'Villa Consuelo',
    emoji:    '🌆',
    desc:     'Clásico del DN. Dominó con música de merengue.',
    precio:   500,
    colores:  ['#002D62', '#FFD700'],
    ambiente: 'Balcón de Villa Consuelo, luces de la ciudad.',
    paisaje:  { tipo: 'balcon', colores: ['#0A0A2E', '#002D62', '#1565C0'] },
    tag:      null,
  },
  {
    id: 'gazcue',
    nombre:   'Gazcue',
    emoji:    '🏛️',
    desc:     'El barrio colonial y elegante. Para los que juegan con clase.',
    precio:   800,
    colores:  ['#1A237E', '#283593'],
    ambiente: 'Terrazas coloniales de Gazcue, árboles de mango.',
    paisaje:  { tipo: 'colonial', colores: ['#0D1B4A', '#1A237E', '#283593'] },
    tag:      '🏛️ PREMIUM',
    tagColor: '#1A237E',
  },
  {
    id: 'cristo_rey',
    nombre:   'Cristo Rey',
    emoji:    '✝️',
    desc:     'El rey del dominó. Ambiente de barrio con sabor.',
    precio:   700,
    colores:  ['#6A1B9A', '#4A148C'],
    ambiente: 'Parque Cristo Rey al atardecer.',
    paisaje:  { tipo: 'parque', colores: ['#2E003E', '#4A148C', '#6A1B9A'] },
    tag:      null,
  },
  {
    id: 'capotillo',
    nombre:   'Capotillo',
    emoji:    '🎨',
    desc:     'Vibrante, colorido y lleno de vida. El barrio más activo.',
    precio:   900,
    colores:  ['#F57F17', '#E65100'],
    ambiente: 'Murales coloridos y música a todo volumen.',
    paisaje:  { tipo: 'urbano', colores: ['#2A1500', '#F57F17', '#E65100'] },
    tag:      '🔥 VIBRANTE',
    tagColor: '#F57F17',
  },
  {
    id: 'la_cienaga',
    nombre:   'La Ciénaga',
    emoji:    '🌊',
    desc:     'A la orilla del Ozama. Fresco y con brisa caribeña.',
    precio:   600,
    colores:  ['#01579B', '#0288D1'],
    ambiente: 'Malecón del Ozama, brisas del río.',
    paisaje:  { tipo: 'rio', colores: ['#001F3F', '#01579B', '#0288D1'] },
    tag:      null,
  },
  {
    id: 'gualey',
    nombre:   'Gualey',
    emoji:    '🌴',
    desc:     'Tropical y fresco. El ambiente de playa en el DN.',
    precio:   700,
    colores:  ['#1B5E20', '#2E7D32'],
    ambiente: 'Patio con palmeras y gallinas. 100% barrio.',
    paisaje:  { tipo: 'patio', colores: ['#0A2000', '#1B5E20', '#2E7D32'] },
    tag:      null,
  },
  {
    id: 'villa_juana',
    nombre:   'Villa Juana',
    emoji:    '🏠',
    desc:     'Tradición pura dominicana. El sabor auténtico del barrio.',
    precio:   1000,
    colores:  ['#4E342E', '#3E2723'],
    ambiente: 'Sala de la casa, ventilador de techo y dominó sobre la mesa.',
    paisaje:  { tipo: 'sala', colores: ['#1A0A00', '#4E342E', '#6D4C41'] },
    tag:      '🏡 CLÁSICO',
    tagColor: C.marron,
  },
  {
    id: 'simon_bolivar',
    nombre:   'Simón Bolívar',
    emoji:    '⭐',
    desc:     'Elegancia criolla. Para campeones del dominó dominicano.',
    precio:   2000,
    colores:  ['#B71C1C', '#CF142B'],
    ambiente: 'Avenida Simón Bolívar de noche, con luces de la ciudad.',
    paisaje:  { tipo: 'avenida', colores: ['#1A0000', '#B71C1C', '#CF142B'] },
    tag:      '⭐ EXCLUSIVO',
    tagColor: '#B71C1C',
  },
  {
    id: 'ensanche_ozama',
    nombre:   'Ensanche Ozama',
    emoji:    '🌃',
    desc:     'Moderno y urbano. El DN del futuro.',
    precio:   1500,
    colores:  ['#212121', '#424242'],
    ambiente: 'Skyline nocturno del Ensanche Ozama.',
    paisaje:  { tipo: 'skyline', colores: ['#050505', '#1A1A1A', '#2E2E2E'] },
    tag:      '🌃 NOCTURNO',
    tagColor: '#424242',
  },
  {
    id: 'los_guaricanos',
    nombre:   'Los Guaricanos',
    emoji:    '🌿',
    desc:     'Verde y natural. El pulmón del norte del DN.',
    precio:   1800,
    colores:  ['#1B5E20', '#33691E'],
    ambiente: 'Campo verde de Los Guaricanos con brisa fresca.',
    paisaje:  { tipo: 'campo', colores: ['#0A1500', '#1B5E20', '#33691E'] },
    tag:      null,
  },
  {
    id: 'villa_francisca',
    nombre:   'Villa Francisca',
    emoji:    '🎭',
    desc:     'El sabor teatral del barrio histórico dominicano.',
    precio:   2500,
    colores:  ['#880E4F', '#AD1457'],
    ambiente: 'Teatro del barrio y colores vivos de la cultura criolla.',
    paisaje:  { tipo: 'teatro', colores: ['#200010', '#880E4F', '#C2185B'] },
    tag:      '🎭 CULTURAL',
    tagColor: '#880E4F',
  },
];

// ════════════════════════════════════════════════════════════
// AVATARES PRO
// ════════════════════════════════════════════════════════════
const AVATARES_PRO = [
  // Gratuitos
  { id: 'av_default',  emoji: '👤', nombre: 'Clásico',        precio: 0,    gratis: true,  raro: false },
  { id: 'av_rd',       emoji: '🇩🇴', nombre: 'RD Orgulloso',   precio: 0,    gratis: true,  raro: false },
  { id: 'av_dado',     emoji: '🎲', nombre: 'El Dominoero',    precio: 0,    gratis: true,  raro: false },
  // De pago
  { id: 'av_rey',      emoji: '👑', nombre: 'El Rey',          precio: 500,  gratis: false, raro: false },
  { id: 'av_fuego',    emoji: '🔥', nombre: 'El Fuego',        precio: 300,  gratis: false, raro: false },
  { id: 'av_aguila',   emoji: '🦅', nombre: 'El Águila',       precio: 400,  gratis: false, raro: false },
  { id: 'av_tigre',    emoji: '🐯', nombre: 'El Tigre',        precio: 400,  gratis: false, raro: false },
  { id: 'av_estrella', emoji: '⭐', nombre: 'La Estrella',     precio: 350,  gratis: false, raro: false },
  { id: 'av_campeona', emoji: '🏆', nombre: 'El Campeón',      precio: 800,  gratis: false, raro: false },
  { id: 'av_diablo',   emoji: '😈', nombre: 'El Diablo Cojuelo',precio: 1000, gratis: false, raro: true },
  { id: 'av_dr_flag',  emoji: '🇩🇴🏅', nombre: 'Patriota',     precio: 1500, gratis: false, raro: true },
  { id: 'av_vip',      emoji: '💎', nombre: 'VIP Diamante',    precio: 3000, gratis: false, raro: true },
];

// ════════════════════════════════════════════════════════════
// HELPER: Formato de monedas
// ════════════════════════════════════════════════════════════
const fmt = (n) => Number(n).toLocaleString('es-DO');

// ── Componente: Chip de categoría ────────────────────────────
function ChipCat({ label, activo, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[es.chip, activo && es.chipActivo]}>
      <Text style={[es.chipTexto, activo && es.chipTextoActivo]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Componente: Card de producto Colmado ─────────────────────
function CardColmado({ item, onComprar, monedas }) {
  const puedePagar = monedas >= item.precio;
  return (
    <View style={es.cardColmado}>
      {item.tag && (
        <View style={[es.cardTag, { backgroundColor: item.tagColor }]}>
          <Text style={es.cardTagTexto}>{item.tag}</Text>
        </View>
      )}
      <Text style={es.cardEmoji}>{item.emoji}</Text>
      <Text style={es.cardNombre}>{item.nombre}</Text>
      <Text style={es.cardDesc}>{item.desc}</Text>
      <View style={es.cardEfecto}>
        <Text style={es.cardEfectoTexto}>✨ {item.efecto}</Text>
      </View>
      <TouchableOpacity
        onPress={() => onComprar(item)}
        style={[es.cardBtn, !puedePagar && { opacity: 0.4 }]}
        disabled={!puedePagar}
      >
        <Text style={es.cardBtnTexto}>🪙 {fmt(item.precio)}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Componente: Card de Mesa/Barrio ───────────────────────────
function CardMesa({ mesa, seleccionada, comprada, onSelect, onComprar, monedas }) {
  const puedePagar = mesa.gratis || monedas >= mesa.precio;
  return (
    <TouchableOpacity
      onPress={() => comprada ? onSelect(mesa) : onComprar(mesa)}
      activeOpacity={0.85}
      style={[es.cardMesa, seleccionada && es.cardMesaSeleccionada]}
    >
      <LinearGradient colors={mesa.colores} style={es.cardMesaGrad}>
        {mesa.tag && (
          <View style={[es.mesaTag, { backgroundColor: mesa.tagColor || C.azul }]}>
            <Text style={es.mesaTagTexto}>{mesa.tag}</Text>
          </View>
        )}
        <Text style={es.mesaEmoji}>{mesa.emoji}</Text>
        <Text style={es.mesaNombre}>{mesa.nombre}</Text>
        {seleccionada && (
          <View style={es.mesaActivoBadge}>
            <Text style={es.mesaActivoTexto}>✓ ACTIVA</Text>
          </View>
        )}
      </LinearGradient>

      <View style={es.cardMesaBody}>
        <Text style={es.cardMesaDesc}>{mesa.desc}</Text>
        <Text style={es.cardMesaAmbiente}>🎨 {mesa.ambiente}</Text>

        {comprada ? (
          <TouchableOpacity
            onPress={() => onSelect(mesa)}
            style={[es.mesaBtn, seleccionada && { backgroundColor: C.verde }]}
          >
            <Text style={es.mesaBtnTexto}>
              {seleccionada ? '✓ En uso' : '🎮 Usar mesa'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => onComprar(mesa)}
            style={[es.mesaBtn, { backgroundColor: C.oro }, !puedePagar && { opacity: 0.4 }]}
            disabled={!puedePagar}
          >
            <Text style={[es.mesaBtnTexto, { color: C.negro }]}>
              {mesa.gratis ? '🆓 Gratis' : `🪙 ${fmt(mesa.precio)}`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Componente: Card de Avatar ────────────────────────────────
function CardAvatar({ av, seleccionado, comprado, onSelect, onComprar, monedas }) {
  const puedePagar = av.gratis || monedas >= av.precio;
  return (
    <View style={[es.cardAvatar, seleccionado && es.cardAvatarSel, av.raro && es.cardAvatarRaro]}>
      {av.raro && <Text style={es.raroBadge}>⭐ RARO</Text>}
      <Text style={es.avatarEmoji}>{av.emoji}</Text>
      <Text style={es.avatarNombre}>{av.nombre}</Text>

      {comprado ? (
        <TouchableOpacity
          onPress={() => onSelect(av)}
          style={[es.avatarBtn, seleccionado && { backgroundColor: C.verde }]}
        >
          <Text style={es.avatarBtnTexto}>{seleccionado ? '✓ Usando' : 'Usar'}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => onComprar(av)}
          style={[es.avatarBtn, { backgroundColor: C.oro }, !puedePagar && { opacity: 0.4 }]}
          disabled={!puedePagar}
        >
          <Text style={[es.avatarBtnTexto, { color: C.negro }]}>
            {av.gratis ? 'Gratis' : `🪙${fmt(av.precio)}`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// PANTALLA PRINCIPAL
// ════════════════════════════════════════════════════════════
export default function TiendaScreenNative({ navigation, jugador }) {
  const [monedas,        setMonedas]        = useState(jugador?.monedas || 0);
  const [tab,            setTab]            = useState('colmado');
  const [catColmado,     setCatColmado]     = useState('bebidas');
  const [comprando,      setComprando]      = useState(false);
  const [mesaActiva,     setMesaActiva]     = useState('los_minas');
  const [avatarActivo,   setAvatarActivo]   = useState('av_default');
  const [comprados,      setComprados]      = useState(new Set(['av_default','av_rd','av_dado']));
  const [mesasCompradas, setMesasCompradas] = useState(new Set(['los_minas']));
  const [modalAvatar,    setModalAvatar]    = useState(false);
  const [generandoIA,    setGenerandoIA]    = useState(false);
  const pulsoAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => { cargarEstado(); animarColmado(); }, []);

  const cargarEstado = async () => {
    try {
      const [mesaStr, avatarStr, compradosStr, token] = await Promise.all([
        AsyncStorage.getItem('domino_mesa_activa'),
        AsyncStorage.getItem('domino_avatar_activo'),
        AsyncStorage.getItem('domino_comprados'),
        AsyncStorage.getItem('domino_token'),
      ]);
      if (mesaStr)      setMesaActiva(mesaStr);
      if (avatarStr)    setAvatarActivo(avatarStr);
      if (compradosStr) {
        const obj = JSON.parse(compradosStr);
        setComprados(new Set(obj.avatares || ['av_default','av_rd','av_dado']));
        setMesasCompradas(new Set(obj.mesas || ['los_minas']));
      }
      // Actualizar monedas del servidor
      if (token) {
        const r = await fetch(`${API}/jugadores/perfil`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const d = await r.json();
        if (d.exito && d.jugador?.monedas !== undefined) setMonedas(d.jugador.monedas);
      }
    } catch {}
  };

  const animarColmado = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulsoAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
        Animated.timing(pulsoAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();
  };

  const guardarComprados = async (newAvatares, newMesas) => {
    await AsyncStorage.setItem('domino_comprados', JSON.stringify({
      avatares: [...newAvatares],
      mesas:    [...newMesas],
    }));
  };

  const comprarItem = async (item, tipo = 'colmado') => {
    if (monedas < item.precio) {
      Alert.alert('🪙 Sin monedas', `Necesitas ${fmt(item.precio - monedas)} monedas más.\n\n¿Quieres ir a la sección de Apoyo para conseguir monedas?`, [
        { text: 'No gracias' },
        { text: '¡Sí!', onPress: () => setTab('apoyar') }
      ]);
      return;
    }

    Alert.alert(
      `Comprar ${item.nombre}`,
      `¿Confirmas la compra por 🪙 ${fmt(item.precio)} monedas?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Comprar',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setComprando(true);
            try {
              const token = await AsyncStorage.getItem('domino_token');
              const resp  = await fetch(`${API}/tienda/comprar`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body:    JSON.stringify({ itemId: item.id, tipo, precio: item.precio })
              });
              const data = await resp.json();
              const nuevasMonedas = monedas - item.precio;
              setMonedas(nuevasMonedas);

              if (tipo === 'avatar') {
                const nuevos = new Set([...comprados, item.id]);
                setComprados(nuevos);
                await guardarComprados(nuevos, mesasCompradas);
              } else if (tipo === 'mesa') {
                const nuevas = new Set([...mesasCompradas, item.id]);
                setMesasCompradas(nuevas);
                await guardarComprados(comprados, nuevas);
              }

              Alert.alert('✅ ¡Comprado!', `${item.emoji} ${item.nombre} es tuyo.\n\n${item.efecto || 'Ya puedes usarlo.'}`);
            } catch {
              // Si falla el servidor, lo guardamos local de todas formas
              setMonedas(prev => prev - item.precio);
              Alert.alert('✅ ¡Comprado!', `${item.emoji} ${item.nombre} es tuyo.`);
            }
            setComprando(false);
          }
        }
      ]
    );
  };

  const seleccionarMesa = async (mesa) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMesaActiva(mesa.id);
    await AsyncStorage.setItem('domino_mesa_activa', mesa.id);
    Alert.alert('🎮 Mesa cambiada', `Ahora juegas en ${mesa.emoji} ${mesa.nombre}\n\n${mesa.ambiente}`);
  };

  const seleccionarAvatar = async (av) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAvatarActivo(av.id);
    await AsyncStorage.setItem('domino_avatar_activo', av.id);
  };

  const generarAvatarIA = () => {
    setGenerandoIA(true);
    // Simula generación IA (en producción: llamar a Stability AI o DALL-E)
    setTimeout(() => {
      setGenerandoIA(false);
      Alert.alert(
        '🎨 Avatar Pro — IA',
        'El generador de avatares IA con tu foto está en desarrollo.\n\n' +
        'Prompt que usamos:\n"Realistic 3D portrait of a Dominican person, casual clothes, profile picture style, soft studio lighting, 8K."\n\n' +
        'Pronto podrás subir tu foto y convertirla en un avatar 3D dominicano. ¡Mantente atento!',
        [{ text: '¡Espero con ansias! 🔥' }]
      );
    }, 2000);
  };

  // ── Tabs disponibles ────────────────────────────────────
  const TABS_DEF = [
    { id: 'colmado', emoji: '🏪', label: 'Colmado' },
    { id: 'mesas',   emoji: '🏘️',  label: 'Mesas' },
    { id: 'avatar',  emoji: '👤',  label: 'Avatar' },
    { id: 'apoyar',  emoji: '❤️',  label: 'Apoyar' },
  ];

  const colmadoFiltrado = COLMADO.filter(p => p.categoria === catColmado);

  return (
    <View style={es.contenedor}>
      <StatusBar barStyle="light-content" />

      {/* ══ HEADER ══════════════════════════════════════════ */}
      <LinearGradient colors={['#3E2723', C.marron, '#5D4037']} style={es.header}>
        <View style={es.headerTop}>
          <View>
            <Text style={es.headerTitulo}>🏪 Colmado Mi Barrio</Text>
            <Text style={es.headerSub}>Todo lo del barrio dominicano 🇩🇴</Text>
          </View>
          {/* Monedero */}
          <View style={es.monedero}>
            <Text style={{ fontSize: 18 }}>🪙</Text>
            <Text style={es.monederoNum}>{fmt(monedas)}</Text>
          </View>
        </View>

        {/* BONO DIARIO */}
        <TouchableOpacity style={es.bonoBanner} activeOpacity={0.85}
          onPress={() => Alert.alert('🎁 Bono Diario', '¡Ya reclamaste tus 100 monedas de hoy!\nVuelve mañana para más. 🇩🇴')}
        >
          <Text style={{ fontSize: 22 }}>🎁</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={es.bonoTitulo}>Bono diario del Colmado</Text>
            <Text style={es.bonoSub}>100 monedas gratis cada día</Text>
          </View>
          <Text style={{ color: C.oro, fontWeight: 'bold' }}>Reclamar →</Text>
        </TouchableOpacity>

        {/* Tabs */}
        <View style={es.tabs}>
          {TABS_DEF.map(t => (
            <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} style={[es.tabBtn, tab === t.id && es.tabActivo]}>
              <Text style={es.tabEmoji}>{t.emoji}</Text>
              <Text style={[es.tabLabel, tab === t.id && es.tabLabelActivo]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* ══ CONTENIDO ════════════════════════════════════════ */}
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

        {/* ─── COLMADO ─────────────────────────────────────── */}
        {tab === 'colmado' && (
          <View>
            <View style={es.seccionHeader}>
              <Text style={es.seccionTitulo}>🏪 Productos del Colmado</Text>
              <Text style={es.seccionSub}>¡Brinda mientras juegas dominó! 🎲</Text>
            </View>

            {/* Filtros de categoría */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={es.chips}>
              {[
                { id: 'bebidas', label: '🍺 Bebidas' },
                { id: 'comidas', label: '🍖 Comidas' },
                { id: 'musica',  label: '🎵 Música'  },
              ].map(c => (
                <ChipCat key={c.id} label={c.label} activo={catColmado === c.id} onPress={() => setCatColmado(c.id)} />
              ))}
            </ScrollView>

            {/* Grid de productos */}
            <View style={es.gridColmado}>
              {colmadoFiltrado.map(item => (
                <CardColmado key={item.id} item={item} monedas={monedas} onComprar={i => comprarItem(i, 'colmado')} />
              ))}
            </View>
          </View>
        )}

        {/* ─── MESAS POR BARRIO ─────────────────────────────── */}
        {tab === 'mesas' && (
          <View>
            <View style={es.seccionHeader}>
              <Text style={es.seccionTitulo}>🏘️ Mesas por Barrio</Text>
              <Text style={es.seccionSub}>Elige tu barrio del Distrito Nacional 🇩🇴</Text>
            </View>

            {/* Mesa activa */}
            {(() => {
              const m = MESAS_BARRIO.find(x => x.id === mesaActiva);
              return m ? (
                <View style={es.mesaActivaCard}>
                  <LinearGradient colors={m.colores} style={es.mesaActivaGrad}>
                    <Text style={{ fontSize: 30 }}>{m.emoji}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={es.mesaActivaNombre}>Mesa activa: {m.nombre}</Text>
                      <Text style={es.mesaActivaDesc}>{m.ambiente}</Text>
                    </View>
                    <Text style={{ color: C.oro, fontWeight: 'bold', fontSize: 11 }}>✓ ACTIVA</Text>
                  </LinearGradient>
                </View>
              ) : null;
            })()}

            {/* Lista de mesas */}
            {MESAS_BARRIO.map(mesa => (
              <CardMesa
                key={mesa.id}
                mesa={mesa}
                seleccionada={mesaActiva === mesa.id}
                comprada={mesasCompradas.has(mesa.id)}
                monedas={monedas}
                onSelect={seleccionarMesa}
                onComprar={m => comprarItem(m, 'mesa')}
              />
            ))}
          </View>
        )}

        {/* ─── AVATAR PRO ────────────────────────────────────── */}
        {tab === 'avatar' && (
          <View>
            <View style={es.seccionHeader}>
              <Text style={es.seccionTitulo}>👤 Avatar Dominicano</Text>
              <Text style={es.seccionSub}>Muéstrale al mundo quién eres 🇩🇴</Text>
            </View>

            {/* Botón Avatar IA Pro */}
            <Animated.View style={{ transform: [{ scale: pulsoAnim }], marginHorizontal: 16, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={generarAvatarIA}
                disabled={generandoIA}
                style={{ borderRadius: 18, overflow: 'hidden' }}
              >
                <LinearGradient
                  colors={['#7B1FA2', '#4A148C', '#1A237E']}
                  style={es.btnAvatarIA}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Text style={{ fontSize: 36 }}>🤖</Text>
                  <View style={{ marginLeft: 14, flex: 1 }}>
                    <Text style={es.btnAvatarIATitulo}>
                      {generandoIA ? 'Generando...' : '✨ Crear mi Avatar Pro'}
                    </Text>
                    <Text style={es.btnAvatarIASub}>
                      Retrato 3D dominicano generado por IA
                    </Text>
                  </View>
                  <Text style={{ fontSize: 22 }}>🇩🇴</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Aviso del prompt */}
            <View style={es.promptCard}>
              <Text style={es.promptTitulo}>📸 Prompt que usamos:</Text>
              <Text style={es.promptTexto}>
                "Realistic 3D character portrait of a Dominican person, casual clothes, profile picture style, soft studio lighting, 8K resolution"
              </Text>
            </View>

            {/* Grid de avatares */}
            <View style={es.gridAvatares}>
              {AVATARES_PRO.map(av => (
                <CardAvatar
                  key={av.id}
                  av={av}
                  seleccionado={avatarActivo === av.id}
                  comprado={comprados.has(av.id) || av.gratis}
                  monedas={monedas}
                  onSelect={seleccionarAvatar}
                  onComprar={a => comprarItem(a, 'avatar')}
                />
              ))}
            </View>
          </View>
        )}

        {/* ─── APOYAR AL DESARROLLADOR ─────────────────────── */}
        {tab === 'apoyar' && (
          <View>
            <View style={es.seccionHeader}>
              <Text style={es.seccionTitulo}>❤️ Apoya el Proyecto</Text>
              <Text style={es.seccionSub}>Este juego fue creado con amor dominicano 🇩🇴</Text>
            </View>

            {/* Card emotivo */}
            <View style={es.apoyarCard}>
              <LinearGradient colors={[C.azul, C.oscuro]} style={es.apoyarGrad}>
                <Text style={{ fontSize: 50, textAlign: 'center' }}>🇩🇴</Text>
                <Text style={es.apoyarMensaje}>
                  Este proyecto nació con el sueño de llevar el dominó dominicano
                  al mundo entero. Cada moneda que aportes ayuda a pagar los
                  servidores, mejorar el juego y seguir representando nuestra cultura.
                </Text>
                <Text style={es.apoyarFirma}>
                  — Creado con 💙 desde el corazón de República Dominicana
                </Text>
              </LinearGradient>
            </View>

            {/* Opción única de apoyo — Stripe $2 USD */}
            <Text style={es.apoyarSeccion}>💰 APORTAR AL DESARROLLADOR</Text>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Linking.openURL('https://buy.stripe.com/00w14o0ibfQxeOd7Sn33W09');
              }}
              style={es.apoyarOpcion}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 32 }}>☕</Text>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={es.apoyarOpTitulo}>Un cafecito para el dev</Text>
                <Text style={es.apoyarOpDesc}>Pago seguro con Stripe 🔒 · Tarjeta o Apple/Google Pay</Text>
              </View>
              <View style={es.apoyarMontoBadge}>
                <Text style={es.apoyarMontoTexto}>$2.00</Text>
              </View>
            </TouchableOpacity>

            {/* Mensaje de gratitud */}
            <View style={es.bonusCard}>
              <Text style={es.bonusTitulo}>🙏 ¡Gracias por apoyar el proyecto!</Text>
              <Text style={es.bonusDesc}>
                Con tu apoyo podemos mantener los servidores, mejorar el juego y
                agregar más contenido dominicano 🇩🇴{'\n\n'}
                Cada aporte cuenta — ¡de verdad!
              </Text>
            </View>

            {/* Stats del juego */}
            <View style={es.statsCard}>
              <Text style={es.statsTitulo}>📊 El proyecto en números</Text>
              <View style={es.statsRow}>
                <View style={es.statItem}><Text style={es.statNum}>12</Text><Text style={es.statLbl}>Pantallas</Text></View>
                <View style={es.statItem}><Text style={es.statNum}>5k+</Text><Text style={es.statLbl}>Líneas código</Text></View>
                <View style={es.statItem}><Text style={es.statNum}>🇩🇴</Text><Text style={es.statLbl}>Hecho en RD</Text></View>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

// ── ESTILOS ────────────────────────────────────────────────────
const es = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.negro },
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : StatusBar.currentHeight + 8,
    paddingBottom: 0,
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 18, paddingBottom: 10,
  },
  headerTitulo: { color: C.blanco, fontSize: 18, fontWeight: 'bold' },
  headerSub:    { color: `${C.blanco}70`, fontSize: 11, marginTop: 2 },
  monedero: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  monederoNum: { color: C.oro, fontWeight: 'bold', fontSize: 16 },
  bonoBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 18, marginBottom: 10,
    backgroundColor: `${C.verde}40`,
    borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: `${C.verdeCl}60`,
  },
  bonoTitulo: { color: C.blanco, fontWeight: 'bold', fontSize: 13 },
  bonoSub:    { color: `${C.blanco}70`, fontSize: 11 },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
  },
  tabBtn:        { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabActivo:     { borderBottomWidth: 2.5, borderBottomColor: C.oro },
  tabEmoji:      { fontSize: 18 },
  tabLabel:      { color: `${C.blanco}60`, fontSize: 10, marginTop: 2 },
  tabLabelActivo:{ color: C.oro, fontWeight: 'bold' },
  seccionHeader: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8 },
  seccionTitulo: { color: C.blanco, fontSize: 17, fontWeight: 'bold' },
  seccionSub:    { color: `${C.blanco}60`, fontSize: 12, marginTop: 3 },
  chips: { paddingHorizontal: 14, marginBottom: 6 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, marginRight: 8,
    backgroundColor: `${C.blanco}10`,
    borderWidth: 1, borderColor: 'transparent',
  },
  chipActivo:      { backgroundColor: `${C.oro}20`, borderColor: C.oro },
  chipTexto:       { color: `${C.blanco}70`, fontSize: 13 },
  chipTextoActivo: { color: C.oro, fontWeight: 'bold' },

  // Colmado
  gridColmado: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 10, paddingBottom: 10,
  },
  cardColmado: {
    width: '47%', backgroundColor: C.oscuro, borderRadius: 16,
    padding: 14, position: 'relative',
    borderWidth: 1, borderColor: `${C.blanco}15`,
  },
  cardTag: {
    position: 'absolute', top: 10, right: 10,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  cardTagTexto: { color: C.blanco, fontSize: 8, fontWeight: 'bold' },
  cardEmoji:    { fontSize: 36, marginBottom: 6 },
  cardNombre:   { color: C.blanco, fontWeight: 'bold', fontSize: 13, marginBottom: 4 },
  cardDesc:     { color: `${C.blanco}60`, fontSize: 10, lineHeight: 14, marginBottom: 8 },
  cardEfecto:   {
    backgroundColor: `${C.oro}15`, borderRadius: 8, padding: 6, marginBottom: 10,
    borderWidth: 1, borderColor: `${C.oro}30`,
  },
  cardEfectoTexto: { color: C.oro, fontSize: 9 },
  cardBtn: {
    backgroundColor: C.azul, borderRadius: 10, padding: 8, alignItems: 'center'
  },
  cardBtnTexto: { color: C.blanco, fontWeight: 'bold', fontSize: 12 },

  // Mesas
  mesaActivaCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 14, overflow: 'hidden' },
  mesaActivaGrad: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
  },
  mesaActivaNombre: { color: C.blanco, fontWeight: 'bold', fontSize: 14 },
  mesaActivaDesc:   { color: `${C.blanco}80`, fontSize: 11, marginTop: 2 },
  cardMesa: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: `${C.blanco}15`,
  },
  cardMesaSeleccionada: { borderColor: C.oro, borderWidth: 2 },
  cardMesaGrad: {
    height: 100, alignItems: 'flex-start', justifyContent: 'flex-end', padding: 12,
    position: 'relative',
  },
  mesaTag: {
    position: 'absolute', top: 10, right: 10,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  mesaTagTexto: { color: C.blanco, fontSize: 9, fontWeight: 'bold' },
  mesaEmoji:    { fontSize: 28, marginBottom: 2 },
  mesaNombre:   { color: C.blanco, fontWeight: 'bold', fontSize: 15 },
  mesaActivoBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: C.verdeCl, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  mesaActivoTexto: { color: C.blanco, fontWeight: 'bold', fontSize: 9 },
  cardMesaBody: { backgroundColor: C.oscuro, padding: 14 },
  cardMesaDesc: { color: C.blanco, fontSize: 13, marginBottom: 4 },
  cardMesaAmbiente: { color: `${C.blanco}60`, fontSize: 11, marginBottom: 12 },
  mesaBtn: {
    backgroundColor: C.azul, borderRadius: 10, padding: 10, alignItems: 'center'
  },
  mesaBtnTexto: { color: C.blanco, fontWeight: 'bold', fontSize: 13 },

  // Avatares
  btnAvatarIA: {
    flexDirection: 'row', alignItems: 'center',
    padding: 18, borderRadius: 18,
  },
  btnAvatarIATitulo: { color: C.blanco, fontWeight: 'bold', fontSize: 16 },
  btnAvatarIASub:    { color: `${C.blanco}80`, fontSize: 11, marginTop: 2 },
  promptCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: `${C.blanco}05`, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: `${C.blanco}15`,
  },
  promptTitulo: { color: C.oro, fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  promptTexto:  { color: `${C.blanco}70`, fontSize: 11, lineHeight: 16, fontStyle: 'italic' },
  gridAvatares: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 10,
  },
  cardAvatar: {
    width: '30%', backgroundColor: C.oscuro, borderRadius: 14,
    alignItems: 'center', padding: 12,
    borderWidth: 1.5, borderColor: `${C.blanco}15`,
  },
  cardAvatarSel: { borderColor: C.oro, backgroundColor: `${C.oro}15` },
  cardAvatarRaro:{ borderColor: '#CE93D8', backgroundColor: `#7B1FA220` },
  raroBadge: { color: '#CE93D8', fontSize: 8, fontWeight: 'bold', marginBottom: 4 },
  avatarEmoji:   { fontSize: 34, marginBottom: 6 },
  avatarNombre:  { color: `${C.blanco}80`, fontSize: 10, textAlign: 'center', marginBottom: 8 },
  avatarBtn: {
    backgroundColor: C.azul, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  avatarBtnTexto: { color: C.blanco, fontSize: 10, fontWeight: 'bold' },

  // Apoyar
  apoyarCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 18, overflow: 'hidden' },
  apoyarGrad: { padding: 22, alignItems: 'center' },
  apoyarMensaje: {
    color: `${C.blanco}90`, fontSize: 13, lineHeight: 20,
    textAlign: 'center', marginTop: 12,
  },
  apoyarFirma: { color: C.oro, fontSize: 11, marginTop: 12, fontStyle: 'italic' },
  apoyarSeccion: {
    color: `${C.blanco}50`, fontSize: 10, letterSpacing: 2,
    paddingHorizontal: 16, marginBottom: 10,
  },
  apoyarOpcion: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: C.oscuro, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: `${C.blanco}15`,
  },
  apoyarOpTitulo: { color: C.blanco, fontWeight: 'bold', fontSize: 14 },
  apoyarOpDesc:   { color: `${C.blanco}60`, fontSize: 11, marginTop: 2 },
  apoyarMontoBadge: {
    backgroundColor: C.oro, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  apoyarMontoTexto: { color: C.negro, fontWeight: 'bold', fontSize: 14 },
  bonusCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: `${C.azul}40`, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: `${C.azulCl}60`,
  },
  bonusTitulo: { color: C.blanco, fontWeight: 'bold', fontSize: 13, marginBottom: 4 },
  bonusDesc:   { color: `${C.blanco}70`, fontSize: 12 },
  bonusChip: {
    flex: 1, backgroundColor: `${C.blanco}10`, borderRadius: 8,
    alignItems: 'center', padding: 8,
  },
  statsCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: C.oscuro, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: `${C.blanco}10`,
  },
  statsTitulo: { color: `${C.blanco}60`, fontSize: 10, letterSpacing: 1, marginBottom: 10 },
  statsRow:    { flexDirection: 'row', gap: 10 },
  statItem:    { flex: 1, alignItems: 'center' },
  statNum:     { color: C.oro, fontWeight: 'bold', fontSize: 24 },
  statLbl:     { color: `${C.blanco}60`, fontSize: 10, marginTop: 4, textAlign: 'center' },
});
