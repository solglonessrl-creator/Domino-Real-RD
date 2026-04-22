/**
 * Domino Real RD — Chat Screen Completo
 * Texto + Emojis + Fotos + Timer 30 minutos
 * Funciona tanto para chat de sala de juego como para DM entre amigos
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Image, Keyboard, Dimensions,
  ScrollView, Alert, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const COLORES = {
  azulRD:    '#002D62',
  rojoRD:    '#CF142B',
  blanco:    '#FFFFFF',
  oro:       '#FFD700',
  negro:     '#0A0A0A',
  grisOscuro:'#1A1A2E',
  grisMedio: '#2C2C54',
  grisClaro: '#3A3A5C',
  verde:     '#2E7D32'
};

const DURATION_MS = 30 * 60 * 1000; // 30 minutos

// ── EMOJIS ORGANIZADOS POR CATEGORÍA ─────────────────────────
const EMOJIS = {
  '😀': ['😀','😂','🥹','😊','😎','🤩','😍','🥰','😘','🤣','😭','😤','🤬','😱','🙄','😏','🥳','🤔','😅','😬','🥺','😳','🤗','😐','😑','😇','🤑','😴','🥱','🤤'],
  '👍': ['👍','👎','👏','🤝','🙌','🤜','🤛','✊','💪','🫶','🙏','👋','🤙','✌️','🤞','🫵','☝️','👌','🤌','🤏'],
  '❤️': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💕','💞','💓','💗','💖','💝','💘','❣️','💔','🫀','😻','💑'],
  '🎲': ['🎲','🃏','♟️','🎮','🕹️','🎯','🏅','🥇','🥈','🥉','🎖️','🏆','🎉','🎊','🎁','🎈','🎪','🎭','🎬','🔥'],
  '🇩🇴': ['🇩🇴','🌴','🌊','☀️','🍹','🏝️','🎺','💃','🕺','🌺','🦜','🐠','🌅','🍌','🥥','🌮','🍗','🎵','🎶','🤙'],
  '🔥': ['🔥','⚡','💥','✨','🌟','⭐','💫','🌈','🎆','🎇','🏄','🤸','🦁','🐯','🦊','🐺','🦅','🦋','🌙','☄️']
};

export default function ChatScreenNative({ navigation, route, jugador }) {
  const {
    amigoId, amigoNombre, amigoAvatar,
    roomId, esJuegoChat,
    socket
  } = route.params || {};

  const [mensajes,       setMensajes]       = useState([]);
  const [texto,          setTexto]          = useState('');
  const [mostrarEmojis,  setMostrarEmojis]  = useState(false);
  const [categoriaEmoji, setCategoriaEmoji] = useState('😀');
  const [amigoEscribiendo, setAmigoEscribiendo] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState(DURATION_MS);
  const [enviandoImg,    setEnviandoImg]    = useState(false);
  const [sesionInicio]                      = useState(Date.now());

  const flatRef    = useRef(null);
  const inputRef   = useRef(null);
  const timerRef   = useRef(null);
  const typingRef  = useRef(null);

  // ── TIMER 30 MINUTOS ─────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const restante = Math.max(0, DURATION_MS - (Date.now() - sesionInicio));
      setTiempoRestante(restante);
      if (restante === 0) clearInterval(timerRef.current);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [sesionInicio]);

  const formatearTiempo = (ms) => {
    const min = Math.floor(ms / 60000);
    const seg = Math.floor((ms % 60000) / 1000);
    return `${min}:${seg.toString().padStart(2, '0')}`;
  };

  // ── SOCKET EVENTS ─────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    if (esJuegoChat && roomId) {
      // Recibir historial del juego
      socket.on('chat_historial', (hist) => {
        setMensajes(hist.map(m => ({ ...m, id: `h_${m.timestamp}_${Math.random()}` })));
        setTimeout(scrollAbajo, 150);
      });

      socket.on('chat', (msg) => {
        setMensajes(prev => {
          // Evitar duplicados (mensaje optimista + socket)
          const existe = prev.find(m => m._local && m.tipo === msg.tipo && Math.abs(m.timestamp - msg.timestamp) < 500);
          if (existe) return prev.map(m => m === existe ? { ...msg, id: `s_${msg.timestamp}` } : m);
          return [...prev, { ...msg, id: `s_${msg.timestamp}_${Math.random()}` }];
        });
        scrollAbajo();
      });

    } else if (amigoId) {
      socket.emit('dm_join', { amigoId });

      socket.on('dm_historial', (hist) => {
        setMensajes(hist.map(m => ({ ...m, id: `h_${m.timestamp}_${Math.random()}` })));
        setTimeout(scrollAbajo, 150);
      });

      socket.on('dm_message', (msg) => {
        setMensajes(prev => {
          const existe = prev.find(m => m._local && m.tipo === msg.tipo && Math.abs(m.timestamp - msg.timestamp) < 500);
          if (existe) return prev.map(m => m === existe ? { ...msg, id: `dm_${msg.timestamp}` } : m);
          return [...prev, { ...msg, id: `dm_${msg.timestamp}_${Math.random()}` }];
        });
        scrollAbajo();
      });

      socket.on('dm_typing', ({ jugadorId, escribiendo }) => {
        if (jugadorId !== jugador?.id) setAmigoEscribiendo(escribiendo);
      });
    }

    socket.on('chat_error', ({ error }) => {
      Alert.alert('Chat', error);
    });

    return () => {
      socket.off('chat_historial');
      socket.off('chat');
      socket.off('dm_historial');
      socket.off('dm_message');
      socket.off('dm_typing');
      socket.off('chat_error');
    };
  }, [socket, amigoId, roomId]);

  const scrollAbajo = () => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // ── ENVIAR TEXTO ──────────────────────────────────────────────
  const enviarTexto = () => {
    const msg = texto.trim();
    if (!msg || tiempoRestante === 0) return;

    if (esJuegoChat && roomId) {
      socket?.emit('chat_message', { roomId, mensaje: msg, tipo: 'texto' });
    } else if (amigoId) {
      socket?.emit('dm_message', { amigoId, mensaje: msg, tipo: 'texto' });
    }

    // Optimistic update
    setMensajes(prev => [...prev, {
      id:        `local_${Date.now()}`,
      de:        jugador?.id,
      nombre:    jugador?.nombre || 'Tú',
      tipo:      'texto',
      mensaje:   msg,
      timestamp: Date.now(),
      _local:    true
    }]);

    setTexto('');
    setMostrarEmojis(false);
    scrollAbajo();

    if (amigoId) socket?.emit('dm_typing', { amigoId, escribiendo: false });
    clearTimeout(typingRef.current);
  };

  // ── TYPING INDICATOR ──────────────────────────────────────────
  const alEscribir = (val) => {
    setTexto(val);
    if (amigoId && socket) {
      socket.emit('dm_typing', { amigoId, escribiendo: true });
      clearTimeout(typingRef.current);
      typingRef.current = setTimeout(() => {
        socket?.emit('dm_typing', { amigoId, escribiendo: false });
      }, 2500);
    }
  };

  // ── ENVIAR IMAGEN ─────────────────────────────────────────────
  const enviarImagen = async (origen = 'galeria') => {
    if (tiempoRestante === 0) return;

    let result;

    if (origen === 'camara') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso necesario', 'Permite acceso a la cámara para tomar fotos.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        quality:       0.35,
        base64:        true,
        allowsEditing: true,
        aspect:        [4, 3]
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso necesario', 'Permite acceso a tu galería para enviar fotos.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:    ImagePicker.MediaTypeOptions.Images,
        quality:       0.35,
        base64:        true,
        allowsEditing: true,
        aspect:        [4, 3]
      });
    }

    if (result.canceled || !result.assets?.[0]?.base64) return;

    const asset = result.assets[0];
    const mimeType  = asset.mimeType || 'image/jpeg';
    const imagenData = `data:${mimeType};base64,${asset.base64}`;

    if (imagenData.length > 560000) {
      Alert.alert('Imagen muy grande', 'La imagen supera el límite de 400KB. Intenta con una más pequeña.');
      return;
    }

    setEnviandoImg(true);

    if (esJuegoChat && roomId) {
      socket?.emit('chat_message', { roomId, tipo: 'imagen', imagen: imagenData });
    } else if (amigoId) {
      socket?.emit('dm_message', { amigoId, tipo: 'imagen', imagen: imagenData });
    }

    setMensajes(prev => [...prev, {
      id:        `local_img_${Date.now()}`,
      de:        jugador?.id,
      nombre:    jugador?.nombre || 'Tú',
      tipo:      'imagen',
      imagen:    imagenData,
      timestamp: Date.now(),
      _local:    true
    }]);

    setEnviandoImg(false);
    scrollAbajo();
  };

  const mostrarOpcionesFoto = () => {
    if (tiempoRestante === 0) return;
    Alert.alert('📷 Enviar foto', 'Elige una opción', [
      { text: '📷 Cámara',  onPress: () => enviarImagen('camara') },
      { text: '🖼️ Galería', onPress: () => enviarImagen('galeria') },
      { text: 'Cancelar',   style: 'cancel' }
    ]);
  };

  // ── INSERTAR EMOJI ────────────────────────────────────────────
  const insertarEmoji = (emoji) => {
    setTexto(prev => prev + emoji);
    inputRef.current?.focus();
  };

  // ── RENDERIZAR MENSAJE ────────────────────────────────────────
  const renderMensaje = ({ item }) => {
    const esPropio = item._local || item.de === jugador?.id ||
                     (esJuegoChat && item.jugadorId === 0); // posición 0 = humano en vs_ia
    const hora = new Date(item.timestamp).toLocaleTimeString('es-DO', {
      hour: '2-digit', minute: '2-digit'
    });

    return (
      <View style={[estilos.mensajeFila, esPropio && estilos.mensajeFilaPropia]}>
        {!esPropio && (
          <View style={estilos.avatarPequeno}>
            <Text style={{ fontSize: 18 }}>👤</Text>
          </View>
        )}

        <View style={[estilos.burbuja, esPropio ? estilos.burbujaPropia : estilos.burbujaAjena]}>
          {!esPropio && (
            <Text style={estilos.nombreMensaje}>
              {item.nombre || 'Jugador'}
            </Text>
          )}

          {item.tipo === 'imagen' ? (
            <Image
              source={{ uri: item.imagen }}
              style={estilos.imagenMensaje}
              resizeMode="cover"
            />
          ) : (
            <Text style={estilos.textoMensaje}>{item.mensaje}</Text>
          )}

          <Text style={[estilos.horaMensaje, esPropio && estilos.horaMensajePropia]}>
            {hora}
          </Text>
        </View>
      </View>
    );
  };

  const tiempoColor = tiempoRestante < 5 * 60 * 1000 ? COLORES.rojoRD : COLORES.oro;
  const chatCerrado = tiempoRestante === 0;

  return (
    <KeyboardAvoidingView
      style={estilos.contenedor}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* ── HEADER ─────────────────────────────────────────── */}
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.backBtn}>
          <Text style={estilos.backTexto}>←</Text>
        </TouchableOpacity>

        <View style={estilos.headerInfo}>
          <Text style={estilos.headerNombre} numberOfLines={1}>
            {amigoNombre || (esJuegoChat ? '💬 Chat de Sala' : 'Chat')}
          </Text>
          {amigoEscribiendo && (
            <Text style={estilos.escribiendo}>✏️ escribiendo...</Text>
          )}
        </View>

        <View style={[estilos.timerPill, { borderColor: tiempoColor }]}>
          <Text style={[estilos.timerTexto, { color: tiempoColor }]}>
            ⏱ {formatearTiempo(tiempoRestante)}
          </Text>
        </View>
      </View>

      {/* ── AVISO TIEMPO CASI TERMINADO ─────────────────────── */}
      {tiempoRestante > 0 && tiempoRestante < 5 * 60 * 1000 && (
        <View style={estilos.avisoTiempo}>
          <Text style={estilos.avisoTexto}>
            ⚠️ El chat cierra en {formatearTiempo(tiempoRestante)}
          </Text>
        </View>
      )}

      {/* ── LISTA DE MENSAJES ────────────────────────────────── */}
      <FlatList
        ref={flatRef}
        data={mensajes}
        keyExtractor={item => item.id}
        renderItem={renderMensaje}
        contentContainerStyle={estilos.lista}
        onContentSizeChange={scrollAbajo}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={estilos.vacio}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>💬</Text>
            <Text style={estilos.vacioTexto}>Inicia la conversación</Text>
            <Text style={estilos.vacioSub}>
              El chat dura {formatearTiempo(DURATION_MS)} 🎲{'\n'}
              Puedes enviar texto, emojis y fotos
            </Text>
          </View>
        }
      />

      {/* ── CHAT EXPIRADO ────────────────────────────────────── */}
      {chatCerrado && (
        <View style={estilos.expirado}>
          <Text style={estilos.expiradoTexto}>
            ⏰ Chat cerrado — 30 minutos completados
          </Text>
          <Text style={estilos.expiradoSub}>
            Los mensajes se borran automáticamente
          </Text>
        </View>
      )}

      {/* ── PANEL DE EMOJIS ─────────────────────────────────── */}
      {mostrarEmojis && !chatCerrado && (
        <View style={estilos.panelEmojis}>
          {/* Categorías */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={estilos.categorias}
            contentContainerStyle={{ paddingHorizontal: 8 }}
          >
            {Object.keys(EMOJIS).map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategoriaEmoji(cat)}
                style={[
                  estilos.categoriaBtn,
                  categoriaEmoji === cat && estilos.categoriaBtnActiva
                ]}
              >
                <Text style={estilos.categoriaTexto}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Grid de emojis */}
          <View style={estilos.emojiGrid}>
            {(EMOJIS[categoriaEmoji] || []).map((emoji, idx) => (
              <TouchableOpacity
                key={`${emoji}_${idx}`}
                onPress={() => insertarEmoji(emoji)}
                style={estilos.emojiBtn}
                activeOpacity={0.6}
              >
                <Text style={estilos.emojiTexto}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── BARRA DE ENTRADA ────────────────────────────────── */}
      {!chatCerrado && (
        <View style={estilos.barra}>
          {/* Botón emoji */}
          <TouchableOpacity
            onPress={() => {
              setMostrarEmojis(v => !v);
              if (!mostrarEmojis) Keyboard.dismiss();
            }}
            style={estilos.barraIcono}
          >
            <Text style={estilos.barraIconoTexto}>
              {mostrarEmojis ? '⌨️' : '😊'}
            </Text>
          </TouchableOpacity>

          {/* Input de texto */}
          <TextInput
            ref={inputRef}
            style={estilos.input}
            value={texto}
            onChangeText={alEscribir}
            placeholder="Escribe algo..."
            placeholderTextColor="#666"
            multiline
            maxLength={300}
            onFocus={() => setMostrarEmojis(false)}
            returnKeyType="default"
          />

          {/* Botón foto */}
          <TouchableOpacity
            onPress={mostrarOpcionesFoto}
            style={estilos.barraIcono}
            disabled={enviandoImg}
          >
            {enviandoImg
              ? <ActivityIndicator color={COLORES.oro} size="small" />
              : <Text style={estilos.barraIconoTexto}>📷</Text>
            }
          </TouchableOpacity>

          {/* Botón enviar */}
          <TouchableOpacity
            onPress={enviarTexto}
            style={[
              estilos.enviarBtn,
              !texto.trim() && estilos.enviarBtnDisabled
            ]}
            disabled={!texto.trim()}
          >
            <Text style={estilos.enviarTexto}>➤</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ── ESTILOS ───────────────────────────────────────────────────
const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: COLORES.negro
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.azulRD,
    paddingTop:  Platform.OS === 'ios' ? 54 : 38,
    paddingBottom: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,215,0,0.2)'
  },
  backBtn: { padding: 8 },
  backTexto: { color: COLORES.blanco, fontSize: 24, fontWeight: 'bold' },
  headerInfo: { flex: 1 },
  headerNombre: {
    color: COLORES.blanco, fontSize: 17, fontWeight: 'bold'
  },
  escribiendo: { color: COLORES.oro, fontSize: 12, marginTop: 1 },
  timerPill: {
    borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 4
  },
  timerTexto: { fontSize: 13, fontWeight: 'bold' },

  // Aviso tiempo
  avisoTiempo: {
    backgroundColor: 'rgba(207,20,43,0.15)',
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: COLORES.rojoRD
  },
  avisoTexto: { color: COLORES.rojoRD, fontSize: 13, fontWeight: '600', textAlign: 'center' },

  // Mensajes
  lista: { padding: 12, paddingBottom: 8, gap: 4 },

  mensajeFila: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 6,
    gap: 6
  },
  mensajeFilaPropia: { flexDirection: 'row-reverse' },

  avatarPequeno: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORES.grisMedio,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2
  },

  burbuja: {
    maxWidth: width * 0.72,
    borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10,
    overflow: 'hidden'
  },
  burbujaAjena: {
    backgroundColor: COLORES.grisMedio,
    borderBottomLeftRadius: 4
  },
  burbujaPropia: {
    backgroundColor: '#1565C0',
    borderBottomRightRadius: 4
  },
  nombreMensaje: {
    color: COLORES.oro, fontSize: 11,
    fontWeight: 'bold', marginBottom: 4
  },
  textoMensaje: {
    color: COLORES.blanco, fontSize: 15, lineHeight: 21
  },
  imagenMensaje: {
    width: Math.min(width * 0.65, 260),
    height: Math.min(width * 0.65, 260) * 0.75,
    borderRadius: 12, marginVertical: 4
  },
  horaMensaje: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10, marginTop: 5
  },
  horaMensajePropia: { textAlign: 'right' },

  // Chat expirado
  expirado: {
    backgroundColor: 'rgba(207,20,43,0.12)',
    margin: 12, borderRadius: 14, padding: 16,
    alignItems: 'center',
    borderWidth: 1, borderColor: COLORES.rojoRD
  },
  expiradoTexto: { color: COLORES.rojoRD, fontSize: 15, fontWeight: 'bold' },
  expiradoSub:   { color: '#888', fontSize: 12, marginTop: 4 },

  // Vacío
  vacio: {
    alignItems: 'center', paddingTop: 70, paddingHorizontal: 30
  },
  vacioTexto: { color: COLORES.blanco, fontSize: 17, fontWeight: 'bold' },
  vacioSub:   { color: '#666', fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 20 },

  // Panel de emojis
  panelEmojis: {
    backgroundColor: COLORES.grisOscuro,
    borderTopWidth: 1, borderTopColor: COLORES.grisMedio,
    maxHeight: 230
  },
  categorias: {
    paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: COLORES.grisMedio,
    maxHeight: 52
  },
  categoriaBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 16, marginRight: 4
  },
  categoriaBtnActiva: { backgroundColor: COLORES.azulRD },
  categoriaTexto: { fontSize: 22 },

  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 6
  },
  emojiBtn: {
    width: (width - 12) / 8,
    alignItems: 'center',
    paddingVertical: 7
  },
  emojiTexto: { fontSize: 26 },

  // Barra de entrada
  barra: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORES.grisOscuro,
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: COLORES.grisMedio
  },
  barraIcono: { padding: 8 },
  barraIconoTexto: { fontSize: 26 },

  input: {
    flex: 1,
    backgroundColor: COLORES.grisMedio,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: COLORES.blanco,
    fontSize: 15,
    maxHeight: 110,
    lineHeight: 20
  },

  enviarBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: COLORES.azulRD,
    alignItems: 'center', justifyContent: 'center',
    elevation: 3
  },
  enviarBtnDisabled: { backgroundColor: '#2A2A2A' },
  enviarTexto: {
    color: COLORES.blanco, fontSize: 20, fontWeight: 'bold',
    marginLeft: 2
  }
});
