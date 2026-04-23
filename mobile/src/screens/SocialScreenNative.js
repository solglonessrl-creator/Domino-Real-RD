/**
 * Domino Real RD — Pantalla Social
 * Lista de amigos · Solicitudes · Buscador · Chat DM · Invitar a partida
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, RefreshControl, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BannerAdComponent from '../components/BannerAdComponent';

const API_URL = 'https://domino-real-rd-production.up.railway.app/api';

const COLORES = {
  azulRD:    '#002D62',
  rojoRD:    '#CF142B',
  blanco:    '#FFFFFF',
  oro:       '#FFD700',
  negro:     '#0A0A0A',
  grisOscuro:'#1A1A2E',
  grisMedio: '#2C2C54',
  grisClaro: '#3A3A5C',
  verde:     '#4CAF50'
};

const PESTANAS = [
  { id: 'amigos',      label: '👥 Amigos' },
  { id: 'solicitudes', label: '📨 Solicitudes' },
  { id: 'buscar',      label: '🔍 Buscar' },
  { id: 'facebook',    label: '🔵 Facebook' }
];

export default function SocialScreenNative({ navigation, jugador, socket }) {
  const [pestana,         setPestana]         = useState('amigos');
  const [amigos,          setAmigos]          = useState([]);
  const [solicitudes,     setSolicitudes]     = useState([]);
  const [busqueda,        setBusqueda]        = useState('');
  const [resultados,      setResultados]      = useState([]);
  const [cargando,        setCargando]        = useState(true);
  const [refresco,        setRefresco]        = useState(false);
  const [buscando,        setBuscando]        = useState(false);
  // Facebook friends
  const [amigosFB,        setAmigosFB]        = useState([]);
  const [cargandoFB,      setCargandoFB]      = useState(false);
  const [fbBuscado,       setFbBuscado]       = useState(false);
  const [fbMensaje,       setFbMensaje]       = useState('');

  useEffect(() => { cargarDatos(); }, []);

  // ── CARGAR AMIGOS Y SOLICITUDES ───────────────────────────────
  const cargarDatos = async () => {
    try {
      const token = await AsyncStorage.getItem('domino_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [rAmigos, rSolicitudes] = await Promise.all([
        fetch(`${API_URL}/social/amigos`,     { headers }).then(r => r.json()),
        fetch(`${API_URL}/social/solicitudes`, { headers }).then(r => r.json())
      ]);

      if (rAmigos.exito)      setAmigos(rAmigos.amigos           || []);
      if (rSolicitudes.exito) setSolicitudes(rSolicitudes.solicitudes || []);
    } catch (e) {
      console.error('[Social]', e.message);
    }
    setCargando(false);
    setRefresco(false);
  };

  const onRefresco = () => { setRefresco(true); cargarDatos(); };

  // ── BUSCAR JUGADORES ──────────────────────────────────────────
  const buscarJugadores = useCallback(async (texto) => {
    setBusqueda(texto);
    if (texto.length < 2) { setResultados([]); return; }

    setBuscando(true);
    try {
      const token = await AsyncStorage.getItem('domino_token');
      const resp  = await fetch(
        `${API_URL}/jugadores/buscar?q=${encodeURIComponent(texto)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await resp.json();
      if (data.exito) setResultados(data.jugadores || []);
    } catch (e) {}
    setBuscando(false);
  }, []);

  // ── AGREGAR AMIGO ─────────────────────────────────────────────
  const agregarAmigo = async (destinatarioId, nombre) => {
    try {
      const token = await AsyncStorage.getItem('domino_token');
      const resp  = await fetch(`${API_URL}/social/agregar-amigo`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ destinatarioId })
      });
      const data = await resp.json();

      if (data.exito) {
        Alert.alert('✅ Solicitud enviada', `Le enviaste una solicitud a ${nombre} 🤝`);
        // Quitar del buscador
        setResultados(prev => prev.filter(j => j.id !== destinatarioId));
      } else {
        Alert.alert('Info', data.error || 'No se pudo enviar la solicitud');
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo conectar al servidor');
    }
  };

  // ── RESPONDER SOLICITUD ───────────────────────────────────────
  const responderSolicitud = async (solicitudId, aceptar, nombre) => {
    try {
      const token = await AsyncStorage.getItem('domino_token');
      const resp  = await fetch(`${API_URL}/social/responder-solicitud`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ solicitudId, aceptar })
      });
      const data = await resp.json();

      if (data.exito) {
        Alert.alert(
          aceptar ? '🤝 ¡Ahora son amigos!' : '✅ Rechazada',
          data.mensaje
        );
        cargarDatos();
      }
    } catch (e) {}
  };

  // ── ABRIR CHAT CON AMIGO ──────────────────────────────────────
  const abrirChat = (amigo) => {
    navigation.navigate('Chat', {
      amigoId:     amigo.id,
      amigoNombre: amigo.nombre,
      amigoAvatar: amigo.avatar,
      socket
    });
  };

  // ── INVITAR A PARTIDA ─────────────────────────────────────────
  // ── BUSCAR AMIGOS DE FACEBOOK ─────────────────────────────────
  const buscarAmigosFacebook = async () => {
    setCargandoFB(true);
    setFbBuscado(false);
    try {
      const [token, fbToken] = await Promise.all([
        AsyncStorage.getItem('domino_token'),
        AsyncStorage.getItem('domino_fb_token')
      ]);

      if (!fbToken) {
        setFbMensaje('Inicia sesión con Facebook para buscar amigos 🔵');
        setCargandoFB(false);
        setFbBuscado(true);
        return;
      }

      const resp = await fetch(`${API_URL}/social/amigos-facebook`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ accessToken: fbToken })
      });
      const data = await resp.json();

      if (data.exito) {
        setAmigosFB(data.amigos || []);
        setFbMensaje(data.mensaje || '');
      } else {
        setFbMensaje(data.error || 'Error al buscar amigos de Facebook');
      }
    } catch (e) {
      setFbMensaje('No se pudo conectar. Verifica tu conexión.');
    }
    setCargandoFB(false);
    setFbBuscado(true);
  };

  const invitarPartida = async (amigoId, nombre) => {
    const roomId = `privada_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    try {
      const token = await AsyncStorage.getItem('domino_token');
      const resp  = await fetch(`${API_URL}/social/invitar-partida`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ destinatarioId: amigoId, roomId })
      });
      const data = await resp.json();

      if (data.exito) {
        Alert.alert('🎲 ¡Invitación enviada!', `${nombre} recibió tu invitación a jugar`);
      }
    } catch (e) {}
  };

  // ── RENDER: TARJETA DE AMIGO ──────────────────────────────────
  const renderAmigo = ({ item }) => {
    const conectado = item.estado_conexion === 'conectado';
    const reciente  = item.estado_conexion === 'reciente';

    return (
      <View style={estilos.card}>
        {/* Avatar + status */}
        <View style={estilos.avatarWrap}>
          <View style={estilos.avatarCircle}>
            <Text style={estilos.avatarEmoji}>👤</Text>
          </View>
          <View style={[
            estilos.statusDot,
            conectado ? estilos.dotVerde : reciente ? estilos.dotAmbar : estilos.dotGris
          ]} />
        </View>

        {/* Info */}
        <View style={estilos.cardInfo}>
          <Text style={estilos.cardNombre} numberOfLines={1}>{item.nombre}</Text>
          <Text style={estilos.cardSub}>
            ⚡ {item.elo}  ·  {item.liga}  ·  🇩🇴 {item.pais}
          </Text>
          <Text style={[
            estilos.cardEstado,
            conectado && { color: COLORES.verde },
            reciente  && { color: COLORES.oro }
          ]}>
            {conectado ? '🟢 En línea' : reciente ? '🟡 Hace poco' : '⚫ Desconectado'}
          </Text>
        </View>

        {/* Acciones */}
        <View style={estilos.cardBotones}>
          <TouchableOpacity
            onPress={() => abrirChat(item)}
            style={[estilos.btnAccion, { backgroundColor: COLORES.azulRD }]}
          >
            <Text style={estilos.btnAccionTexto}>💬</Text>
          </TouchableOpacity>

          {conectado && (
            <TouchableOpacity
              onPress={() => invitarPartida(item.id, item.nombre)}
              style={[estilos.btnAccion, { backgroundColor: '#1B5E20' }]}
            >
              <Text style={estilos.btnAccionTexto}>🎲</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ── RENDER: SOLICITUD PENDIENTE ───────────────────────────────
  const renderSolicitud = ({ item }) => (
    <View style={estilos.card}>
      <View style={estilos.avatarCircle}>
        <Text style={estilos.avatarEmoji}>👤</Text>
      </View>

      <View style={estilos.cardInfo}>
        <Text style={estilos.cardNombre}>{item.nombre}</Text>
        <Text style={estilos.cardSub}>⚡ {item.elo}  ·  {item.liga}  ·  🇩🇴 {item.pais}</Text>
        <Text style={estilos.cardEstado}>Quiere ser tu amigo 🤝</Text>
      </View>

      <View style={estilos.cardBotones}>
        <TouchableOpacity
          onPress={() => responderSolicitud(item.id, true, item.nombre)}
          style={[estilos.btnAccion, { backgroundColor: '#1B5E20' }]}
        >
          <Text style={estilos.btnAccionTexto}>✅</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => responderSolicitud(item.id, false, item.nombre)}
          style={[estilos.btnAccion, { backgroundColor: '#7F0000' }]}
        >
          <Text style={estilos.btnAccionTexto}>❌</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── RENDER: RESULTADO DE BÚSQUEDA ─────────────────────────────
  const renderResultado = ({ item }) => {
    const yaSonAmigos = amigos.some(a => a.id === item.id);
    const esMismo     = item.id === jugador?.id;

    return (
      <View style={estilos.card}>
        <View style={estilos.avatarCircle}>
          <Text style={estilos.avatarEmoji}>👤</Text>
        </View>

        <View style={estilos.cardInfo}>
          <Text style={estilos.cardNombre}>{item.nombre}</Text>
          <Text style={estilos.cardSub}>⚡ {item.elo}  ·  {item.liga}  ·  🇩🇴 {item.pais}</Text>
        </View>

        {!esMismo && (
          <TouchableOpacity
            onPress={() => agregarAmigo(item.id, item.nombre)}
            style={[estilos.btnAgregar, yaSonAmigos && estilos.btnAgregarDisabled]}
            disabled={yaSonAmigos}
          >
            <Text style={estilos.btnAgregarTexto}>
              {yaSonAmigos ? '✓ Amigos' : '+ Agregar'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── RENDER: AMIGO DE FACEBOOK ────────────────────────────────
  const renderAmigoFB = ({ item }) => (
    <View style={estilos.card}>
      <View style={estilos.avatarCircle}>
        <Text style={estilos.avatarEmoji}>{item.foto_facebook ? '📷' : '👤'}</Text>
      </View>
      <View style={estilos.cardInfo}>
        <Text style={estilos.cardNombre}>{item.nombre_facebook || item.nombre}</Text>
        <Text style={estilos.cardSub}>⚡ {item.elo}  ·  {item.liga}  ·  🇩🇴 {item.pais}</Text>
        <Text style={{ color: '#1877F2', fontSize: 11, marginTop: 2 }}>🔵 Amigo de Facebook</Text>
      </View>
      {item.ya_es_amigo ? (
        <View style={[estilos.btnAgregar, { backgroundColor: '#1B5E20' }]}>
          <Text style={estilos.btnAgregarTexto}>✓ Amigos</Text>
        </View>
      ) : item.pendiente ? (
        <View style={[estilos.btnAgregar, { backgroundColor: '#333' }]}>
          <Text style={estilos.btnAgregarTexto}>⏳ Enviada</Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => agregarAmigo(item.id, item.nombre)}
          style={estilos.btnAgregar}
        >
          <Text style={estilos.btnAgregarTexto}>+ Agregar</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (cargando) {
    return (
      <View style={[estilos.contenedor, estilos.centrado]}>
        <ActivityIndicator color={COLORES.oro} size="large" />
        <Text style={estilos.cargandoTexto}>Cargando amigos...</Text>
      </View>
    );
  }

  return (
    <View style={estilos.contenedor}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <LinearGradient
        colors={[COLORES.azulRD, COLORES.grisOscuro]}
        style={estilos.header}
      >
        <Text style={estilos.headerTitulo}>👥 Social</Text>
        <Text style={estilos.headerSub}>
          {amigos.length} amigo{amigos.length !== 1 ? 's' : ''}
          {solicitudes.length > 0 ? `  ·  ${solicitudes.length} solicitud${solicitudes.length !== 1 ? 'es' : ''}` : ''}
        </Text>
      </LinearGradient>

      {/* ── TABS ─────────────────────────────────────────────── */}
      <View style={estilos.tabs}>
        {PESTANAS.map(({ id, label }) => {
          const activa = pestana === id;
          const badge  = id === 'solicitudes' && solicitudes.length > 0;
          return (
            <TouchableOpacity
              key={id}
              onPress={() => setPestana(id)}
              style={[estilos.tab, activa && estilos.tabActiva]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[estilos.tabTexto, activa && estilos.tabTextoActivo]}>
                  {label}
                </Text>
                {badge && (
                  <View style={estilos.badge}>
                    <Text style={estilos.badgeTexto}>{solicitudes.length}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── BUSCADOR ─────────────────────────────────────────── */}
      {pestana === 'buscar' && (
        <View style={estilos.busquedaWrap}>
          <TextInput
            style={estilos.busquedaInput}
            value={busqueda}
            onChangeText={buscarJugadores}
            placeholder="🔍  Buscar jugador por nombre..."
            placeholderTextColor="#666"
            autoFocus
          />
          {buscando && (
            <ActivityIndicator
              color={COLORES.oro}
              size="small"
              style={estilos.busquedaLoader}
            />
          )}
        </View>
      )}

      {/* ── CONTENIDO ────────────────────────────────────────── */}
      {pestana === 'amigos' && (
        <FlatList
          data={amigos}
          keyExtractor={item => item.id}
          renderItem={renderAmigo}
          refreshControl={
            <RefreshControl
              refreshing={refresco}
              onRefresh={onRefresco}
              colors={[COLORES.oro]}
              tintColor={COLORES.oro}
            />
          }
          contentContainerStyle={estilos.lista}
          ListEmptyComponent={
            <View style={estilos.vacio}>
              <Text style={estilos.vacioEmoji}>👥</Text>
              <Text style={estilos.vacioTexto}>Aún no tienes amigos</Text>
              <Text style={estilos.vacioSub}>
                Búscalos en la pestaña 🔍{'\n'}y empieza a jugar juntos 🎲
              </Text>
              <TouchableOpacity
                onPress={() => setPestana('buscar')}
                style={estilos.btnIrBuscar}
              >
                <Text style={estilos.btnIrBuscarTexto}>🔍 Buscar jugadores</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {pestana === 'solicitudes' && (
        <FlatList
          data={solicitudes}
          keyExtractor={item => item.id}
          renderItem={renderSolicitud}
          refreshControl={
            <RefreshControl
              refreshing={refresco}
              onRefresh={onRefresco}
              colors={[COLORES.oro]}
              tintColor={COLORES.oro}
            />
          }
          contentContainerStyle={estilos.lista}
          ListEmptyComponent={
            <View style={estilos.vacio}>
              <Text style={estilos.vacioEmoji}>📨</Text>
              <Text style={estilos.vacioTexto}>Sin solicitudes pendientes</Text>
              <Text style={estilos.vacioSub}>Cuando alguien te agregue{'\n'}aparecerá aquí</Text>
            </View>
          }
        />
      )}

      {pestana === 'buscar' && (
        <FlatList
          data={resultados}
          keyExtractor={item => item.id}
          renderItem={renderResultado}
          contentContainerStyle={estilos.lista}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={estilos.vacio}>
              <Text style={estilos.vacioEmoji}>
                {busqueda.length > 1 ? '🔍' : '💬'}
              </Text>
              <Text style={estilos.vacioTexto}>
                {busqueda.length > 1
                  ? `Sin resultados para "${busqueda}"`
                  : 'Escribe 2+ letras para buscar'}
              </Text>
              {busqueda.length > 1 && (
                <Text style={estilos.vacioSub}>
                  Verifica el nombre e intenta de nuevo
                </Text>
              )}
            </View>
          }
        />
      )}

      {/* ── PESTAÑA FACEBOOK ─────────────────────────────────── */}
      {pestana === 'facebook' && (
        <View style={{ flex: 1 }}>
          {/* Botón buscar */}
          {!fbBuscado && (
            <View style={estilos.fbBtnWrap}>
              <Text style={estilos.fbExplica}>
                Encuentra amigos que ya juegan Dominó Real RD 🎲{'\n'}
                Solo aparecen amigos que también autorizaron la app en Facebook.
              </Text>
              <TouchableOpacity
                onPress={buscarAmigosFacebook}
                style={estilos.fbBtn}
                disabled={cargandoFB}
              >
                {cargandoFB
                  ? <ActivityIndicator color={COLORES.blanco} />
                  : <Text style={estilos.fbBtnTexto}>🔵 Buscar amigos de Facebook</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* Buscando... */}
          {cargandoFB && (
            <View style={estilos.vacio}>
              <ActivityIndicator color='#1877F2' size="large" />
              <Text style={[estilos.vacioTexto, { marginTop: 12 }]}>Buscando en Facebook...</Text>
            </View>
          )}

          {/* Resultados */}
          {fbBuscado && !cargandoFB && (
            <>
              <View style={estilos.fbMensajeWrap}>
                <Text style={estilos.fbMensajeTexto}>{fbMensaje}</Text>
                <TouchableOpacity onPress={() => { setFbBuscado(false); setAmigosFB([]); }}>
                  <Text style={{ color: '#1877F2', fontSize: 13 }}>🔄 Volver a buscar</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={amigosFB}
                keyExtractor={item => item.id}
                renderItem={renderAmigoFB}
                contentContainerStyle={estilos.lista}
                ListEmptyComponent={
                  <View style={estilos.vacio}>
                    <Text style={estilos.vacioEmoji}>🔵</Text>
                    <Text style={estilos.vacioTexto}>Ningún amigo encontrado aún</Text>
                    <Text style={estilos.vacioSub}>
                      Invita a tus amigos de Facebook{'\n'}a descargar Dominó Real RD 🎲
                    </Text>
                    <TouchableOpacity
                      style={estilos.btnIrBuscar}
                      onPress={async () => {
                        const { Share } = require('react-native');
                        Share.share({ message: '¡Juega dominó dominicano conmigo! 🎲🇩🇴 Descarga Dominó Real RD https://domino-real-rd.vercel.app' });
                      }}
                    >
                      <Text style={estilos.btnIrBuscarTexto}>📤 Invitar amigos</Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            </>
          )}
        </View>
      )}

      {/* Banner publicitario inferior */}
      <BannerAdComponent />

    </View>
  );
}

// ── ESTILOS ───────────────────────────────────────────────────
const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.negro },
  centrado:   { alignItems: 'center', justifyContent: 'center' },
  cargandoTexto: { color: '#666', marginTop: 12, fontSize: 14 },

  // Header
  header: {
    paddingTop:    Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 18,
    paddingHorizontal: 20
  },
  headerTitulo: { color: COLORES.blanco, fontSize: 26, fontWeight: 'bold' },
  headerSub:    { color: COLORES.oro, fontSize: 14, marginTop: 4 },

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORES.grisOscuro,
    borderBottomWidth: 1, borderBottomColor: '#2A2A3A'
  },
  tab: {
    flex: 1, paddingVertical: 13, alignItems: 'center'
  },
  tabActiva: {
    borderBottomWidth: 2.5, borderBottomColor: COLORES.oro
  },
  tabTexto:       { color: '#555', fontSize: 13, fontWeight: '500' },
  tabTextoActivo: { color: COLORES.oro, fontWeight: 'bold' },

  badge: {
    backgroundColor: COLORES.rojoRD,
    borderRadius: 9, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4
  },
  badgeTexto: { color: COLORES.blanco, fontSize: 11, fontWeight: 'bold' },

  // Buscador
  busquedaWrap: {
    paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8
  },
  busquedaInput: {
    flex: 1, backgroundColor: COLORES.grisMedio,
    color: COLORES.blanco, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 11,
    fontSize: 15
  },
  busquedaLoader: { position: 'absolute', right: 22, top: 22 },

  // Lista
  lista: { padding: 12, paddingBottom: 24, gap: 8 },

  // Cards
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.grisOscuro,
    borderRadius: 14, padding: 12, gap: 10
  },

  avatarWrap: { position: 'relative' },
  avatarCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: COLORES.grisMedio,
    alignItems: 'center', justifyContent: 'center'
  },
  avatarEmoji: { fontSize: 22 },
  statusDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: COLORES.grisOscuro
  },
  dotVerde: { backgroundColor: COLORES.verde },
  dotAmbar: { backgroundColor: '#FFC107' },
  dotGris:  { backgroundColor: '#555' },

  cardInfo: { flex: 1 },
  cardNombre: {
    color: COLORES.blanco, fontSize: 15, fontWeight: 'bold'
  },
  cardSub: { color: '#888', fontSize: 12, marginTop: 2 },
  cardEstado: { color: '#666', fontSize: 12, marginTop: 2 },

  cardBotones: { flexDirection: 'row', gap: 8 },
  btnAccion: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center'
  },
  btnAccionTexto: { fontSize: 18 },

  btnAgregar: {
    backgroundColor: COLORES.azulRD,
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8
  },
  btnAgregarDisabled: { backgroundColor: '#2A2A2A' },
  btnAgregarTexto: { color: COLORES.blanco, fontSize: 13, fontWeight: '600' },

  // Vacío
  vacio: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 30, gap: 10 },
  vacioEmoji: { fontSize: 52 },
  vacioTexto: { color: COLORES.blanco, fontSize: 17, fontWeight: 'bold', textAlign: 'center' },
  vacioSub:   { color: '#666', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  btnIrBuscar: {
    marginTop: 8, backgroundColor: COLORES.azulRD,
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 12
  },
  btnIrBuscarTexto: { color: COLORES.blanco, fontSize: 15, fontWeight: 'bold' },

  // Facebook tab
  fbBtnWrap: { padding: 20, gap: 16, alignItems: 'center' },
  fbExplica: { color: '#888', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  fbBtn: {
    backgroundColor: '#1877F2',
    borderRadius: 16, paddingHorizontal: 28, paddingVertical: 16,
    width: '100%', alignItems: 'center'
  },
  fbBtnTexto: { color: COLORES.blanco, fontSize: 16, fontWeight: 'bold' },
  fbMensajeWrap: {
    padding: 14, backgroundColor: 'rgba(24,119,242,0.1)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(24,119,242,0.2)',
    gap: 6, alignItems: 'center'
  },
  fbMensajeTexto: { color: COLORES.blanco, fontSize: 14, textAlign: 'center', fontWeight: '600' }
});
