/**
 * Domino Real RD — Tienda Screen Native
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://domino-real-rd-production.up.railway.app/api';
const COLORES = { azulRD: '#002D62', rojoRD: '#CF142B', blanco: '#FFFFFF', oro: '#FFD700', negro: '#0A0A0A', grisOscuro: '#1A1A2E' };

const TABS = [
  { id: 'mesas', label: '🎮 Mesas' },
  { id: 'fichas', label: '🎲 Fichas' },
  { id: 'avatares', label: '👤 Avatares' },
  { id: 'emojis_paquetes', label: '😎 Emojis' },
];

export default function TiendaScreenNative({ navigation, jugador }) {
  const [catalogo, setCatalogo] = useState(null);
  const [monedas, setMonedas] = useState(jugador?.monedas || 0);
  const [tabActivo, setTabActivo] = useState('mesas');
  const [cargando, setCargando] = useState(true);
  const [bonoDiario, setBonoDiario] = useState(null);
  const [comprando, setComprando] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);

  useEffect(() => { cargarTienda(); cargarBono(); }, []);

  const cargarTienda = async () => {
    setCargando(true);
    try {
      const token = await AsyncStorage.getItem('domino_token');
      const resp = await fetch(`${API_URL}/tienda`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json();
      if (data.exito) {
        setCatalogo(data.catalogo);
        setMonedas(data.monedas || monedas);
      }
    } catch (e) { console.error(e); }
    setCargando(false);
  };

  const cargarBono = async () => {
    try {
      const token = await AsyncStorage.getItem('domino_token');
      const resp = await fetch(`${API_URL}/tienda/bono-diario`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json();
      if (data.exito) setBonoDiario(data);
    } catch (e) {}
  };

  const reclamarBono = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const token = await AsyncStorage.getItem('domino_token');
      const resp = await fetch(`${API_URL}/tienda/reclamar-bono`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({})
      });
      const data = await resp.json();
      if (data.exito) {
        setMonedas(data.totalMonedas);
        Alert.alert('🎁 ¡Bono reclamado!', data.mensaje);
        cargarBono();
      } else {
        Alert.alert('', data.error);
      }
    } catch (e) { Alert.alert('Error', 'No se pudo reclamar'); }
  };

  const comprarItem = async (item, categoria) => {
    if (item.poseido) return Alert.alert('', 'Ya tienes este item');
    if (item.moneda === 'exclusivo_torneo') return Alert.alert('', 'Solo disponible ganando torneos');
    if (item.precio === 0) return Alert.alert('', 'Este item es gratuito');

    setItemSeleccionado({ ...item, categoria });
  };

  const confirmarCompra = async () => {
    const item = itemSeleccionado;
    if (!item) return;
    setComprando(true);
    try {
      const token = await AsyncStorage.getItem('domino_token');
      const resp = await fetch(`${API_URL}/tienda/comprar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemId: item.id, categoria: item.categoria })
      });
      const data = await resp.json();
      if (data.exito) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setMonedas(data.monedasRestantes);
        Alert.alert('✅ ¡Comprado!', data.mensaje);
        setItemSeleccionado(null);
        cargarTienda();
      } else {
        Alert.alert('❌ Error', data.error);
      }
    } catch (e) { Alert.alert('Error', 'No se pudo completar la compra'); }
    setComprando(false);
  };

  const renderItems = () => {
    if (!catalogo) return null;
    const items = catalogo[tabActivo] || [];
    if (!Array.isArray(items)) return null;

    return (
      <View style={styles.itemsGrid}>
        {items.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.itemCard, item.poseido && styles.itemPoseido]}
            onPress={() => comprarItem(item, tabActivo)}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 32, marginBottom: 8 }}>
              {tabActivo === 'mesas' ? '🎮' : tabActivo === 'fichas' ? '🎲' : tabActivo === 'avatares' ? '👤' : '😎'}
            </Text>
            <Text style={styles.itemNombre}>{item.nombre}</Text>
            {item.descripcion ? <Text style={styles.itemDesc} numberOfLines={2}>{item.descripcion}</Text> : null}
            {item.poseido ? (
              <Text style={styles.poseidoTexto}>✅ Poseído</Text>
            ) : item.precio === 0 ? (
              <Text style={[styles.poseidoTexto, { color: '#4CAF50' }]}>Gratis</Text>
            ) : item.moneda === 'exclusivo_torneo' ? (
              <Text style={[styles.poseidoTexto, { color: COLORES.morado }]}>🏆 Torneo</Text>
            ) : (
              <Text style={styles.precioTexto}>🪙 {item.precio}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (cargando) return (
    <View style={{ flex: 1, backgroundColor: COLORES.negro, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={COLORES.oro} size="large" />
    </View>
  );

  return (
    <View style={styles.contenedor}>
      {/* Header */}
      <LinearGradient colors={['#E65100', '#FF6D00']} style={styles.header}>
        <Text style={styles.titulo}>🛒 TIENDA</Text>
        <View style={styles.saldoRow}>
          <Text style={styles.saldo}>🪙 {monedas?.toLocaleString() || 0} monedas</Text>
        </View>
      </LinearGradient>

      {/* Bono diario */}
      {bonoDiario?.disponible && (
        <TouchableOpacity style={styles.bonoBanner} onPress={reclamarBono}>
          <Text style={{ fontSize: 28 }}>🎁</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.bonoTitulo}>¡Bono diario disponible!</Text>
            <Text style={styles.bonoSub}>+{bonoDiario.monedasHoy} monedas • Día {bonoDiario.diaRacha}</Text>
          </View>
          <Text style={{ color: COLORES.oro, fontWeight: 'bold', fontSize: 16 }}>→</Text>
        </TouchableOpacity>
      )}

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tabActivo === t.id && styles.tabActivo]}
            onPress={() => setTabActivo(t.id)}
          >
            <Text style={[styles.tabTexto, tabActivo === t.id && { color: COLORES.negro }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Items */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {renderItems()}
      </ScrollView>

      {/* Modal confirmación compra */}
      <Modal visible={!!itemSeleccionado} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContenido}>
            {itemSeleccionado && (
              <>
                <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>🎁</Text>
                <Text style={styles.modalTitulo}>{itemSeleccionado.nombre}</Text>
                <Text style={styles.modalDesc}>{itemSeleccionado.descripcion}</Text>
                <View style={styles.modalPrecioRow}>
                  <Text style={styles.modalPrecio}>🪙 {itemSeleccionado.precio} monedas</Text>
                  <Text style={styles.modalSaldo}>Tienes: {monedas}</Text>
                </View>
                {monedas >= itemSeleccionado.precio ? (
                  <TouchableOpacity
                    style={[styles.botonComprar, comprando && { opacity: 0.6 }]}
                    onPress={confirmarCompra}
                    disabled={comprando}
                  >
                    <Text style={styles.botonComprarTexto}>
                      {comprando ? 'Comprando...' : '✅ Confirmar Compra'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={{ color: COLORES.rojoRD, textAlign: 'center', marginTop: 12 }}>
                    Monedas insuficientes ({monedas}/{itemSeleccionado.precio})
                  </Text>
                )}
                <TouchableOpacity onPress={() => setItemSeleccionado(null)} style={{ marginTop: 12, alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const morado = '#7B1FA2';
const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.negro },
  header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 20 },
  titulo: { color: COLORES.blanco, fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  saldoRow: { alignItems: 'center', marginTop: 8 },
  saldo: { color: COLORES.blanco, fontSize: 18, fontWeight: 'bold' },
  bonoBanner: { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 8, backgroundColor: '#1B5E20', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#4CAF50' },
  bonoTitulo: { color: COLORES.blanco, fontSize: 14, fontWeight: 'bold' },
  bonoSub: { color: '#81C784', fontSize: 12, marginTop: 2 },
  tabsScroll: { maxHeight: 50, paddingHorizontal: 16 },
  tab: { paddingHorizontal: 16, paddingVertical: 10, marginRight: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  tabActivo: { backgroundColor: COLORES.oro },
  tabTexto: { color: COLORES.blanco, fontSize: 13, fontWeight: '600' },
  itemsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  itemCard: { width: '46%', backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  itemPoseido: { borderColor: COLORES.oro + '60', backgroundColor: 'rgba(255,215,0,0.05)' },
  itemNombre: { color: COLORES.blanco, fontSize: 13, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  itemDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', marginBottom: 8 },
  poseidoTexto: { color: COLORES.oro, fontSize: 12, fontWeight: '600' },
  precioTexto: { color: COLORES.oro, fontSize: 14, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContenido: { backgroundColor: COLORES.grisOscuro, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28 },
  modalTitulo: { color: COLORES.blanco, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  modalDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 16 },
  modalPrecioRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, marginBottom: 16 },
  modalPrecio: { color: COLORES.oro, fontSize: 16, fontWeight: 'bold' },
  modalSaldo: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  botonComprar: { backgroundColor: COLORES.oro, padding: 16, borderRadius: 14, alignItems: 'center' },
  botonComprarTexto: { color: COLORES.negro, fontSize: 16, fontWeight: 'bold' },
});
