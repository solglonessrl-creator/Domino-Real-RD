/**
 * Domino Real RD — Login Screen (React Native)
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://domino-real-rd-production.up.railway.app/api'; // Cambiar a tu URL

const COLORES = {
  azulRD: '#002D62', rojoRD: '#CF142B', blanco: '#FFFFFF',
  oro: '#FFD700', negro: '#0A0A0A', grisOscuro: '#1A1A2E'
};

export default function LoginScreenNative({ navigation, onLoginExitoso }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [modoRegistro, setModoRegistro] = useState(false);
  const [cargando, setCargando] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      return Alert.alert('⚠️ Error', 'Completa todos los campos');
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCargando(true);
    try {
      const resp = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await resp.json();
      if (!data.exito) throw new Error(data.error);

      await AsyncStorage.setItem('domino_token', data.token);
      await AsyncStorage.setItem('domino_jugador', JSON.stringify(data.jugador));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onLoginExitoso(data.jugador, data.token);
    } catch (err) {
      Alert.alert('❌ Error', err.message || 'No se pudo iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  const handleRegistro = async () => {
    if (!nombre.trim() || !email.trim() || !password.trim()) {
      return Alert.alert('⚠️ Error', 'Completa todos los campos');
    }
    if (password.length < 6) {
      return Alert.alert('⚠️ Error', 'La contraseña debe tener mínimo 6 caracteres');
    }
    setCargando(true);
    try {
      const resp = await fetch(`${API_URL}/auth/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), email: email.trim(), password })
      });
      const data = await resp.json();
      if (!data.exito) throw new Error(data.error);

      await AsyncStorage.setItem('domino_token', data.token);
      await AsyncStorage.setItem('domino_jugador', JSON.stringify(data.jugador));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onLoginExitoso(data.jugador, data.token);
    } catch (err) {
      Alert.alert('❌ Error', err.message);
    } finally {
      setCargando(false);
    }
  };

  const handleInvitado = async () => {
    setCargando(true);
    try {
      const resp = await fetch(`${API_URL}/auth/invitado`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: `Invitado_${Math.floor(Math.random() * 9999)}` })
      });
      const data = await resp.json();
      await AsyncStorage.setItem('domino_token', data.token);
      onLoginExitoso(data.jugador, data.token);
    } catch { Alert.alert('Error', 'No se pudo conectar'); }
    finally { setCargando(false); }
  };

  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14, padding: 14, color: COLORES.blanco,
    fontSize: 15, marginBottom: 12, width: '100%'
  };

  return (
    <LinearGradient
      colors={[COLORES.azulRD, COLORES.negro, COLORES.rojoRD]}
      style={styles.contenedor}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <Text style={styles.emoji}>🎲</Text>
          <Text style={styles.titulo}>Dominó Real RD</Text>
          <Text style={styles.subtitulo}>🇩🇴 EL DOMINÓ DOMINICANO DEL MUNDO</Text>

          <View style={styles.card}>
            {/* Facebook */}
            <TouchableOpacity style={[styles.botonSocial, { backgroundColor: '#1877F2' }]}>
              <Text style={styles.botonSocialTexto}>📘  Continuar con Facebook</Text>
            </TouchableOpacity>

            {/* Google */}
            <TouchableOpacity style={[styles.botonSocial, { backgroundColor: '#FFFFFF' }]}>
              <Text style={[styles.botonSocialTexto, { color: '#333' }]}>🔵  Continuar con Google</Text>
            </TouchableOpacity>

            <View style={styles.divisor}>
              <View style={styles.lineaDivisor} />
              <Text style={styles.divisorTexto}>o con email</Text>
              <View style={styles.lineaDivisor} />
            </View>

            {/* Campos */}
            {modoRegistro && (
              <TextInput
                style={inputStyle}
                placeholder="Nombre de usuario"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={nombre}
                onChangeText={setNombre}
                autoCapitalize="words"
                maxLength={20}
              />
            )}

            <TextInput
              style={inputStyle}
              placeholder="Correo electrónico"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={inputStyle}
              placeholder="Contraseña"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {/* Botón principal */}
            <TouchableOpacity
              onPress={modoRegistro ? handleRegistro : handleLogin}
              disabled={cargando}
              style={[styles.botonPrincipal, { opacity: cargando ? 0.7 : 1 }]}
            >
              {cargando
                ? <ActivityIndicator color={COLORES.blanco} />
                : <Text style={styles.botonPrincipalTexto}>
                    {modoRegistro ? '📝 Crear Cuenta' : '🎲 Entrar a Jugar'}
                  </Text>
              }
            </TouchableOpacity>

            {/* Cambiar modo */}
            <TouchableOpacity onPress={() => setModoRegistro(!modoRegistro)} style={{ marginVertical: 10 }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: 13 }}>
                {modoRegistro ? '¿Ya tienes cuenta? Iniciar sesión' : '¿No tienes cuenta? Regístrate'}
              </Text>
            </TouchableOpacity>

            {/* Invitado */}
            <TouchableOpacity onPress={handleInvitado} style={styles.botonInvitado}>
              <Text style={styles.botonInvitadoTexto}>👤  Jugar como Invitado</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.terminos}>Al continuar aceptas nuestros Términos de Servicio</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  scroll: { alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: 60, paddingBottom: 40 },
  emoji: { fontSize: 72, marginBottom: 12 },
  titulo: { color: '#FFF', fontSize: 26, fontWeight: 'bold', letterSpacing: 1, textAlign: 'center' },
  subtitulo: { color: '#FFD700', fontSize: 11, letterSpacing: 2, marginTop: 6, marginBottom: 32, textAlign: 'center' },
  card: { width: '100%', maxWidth: 380, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  botonSocial: { width: '100%', padding: 14, borderRadius: 14, alignItems: 'center', marginBottom: 10 },
  botonSocialTexto: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  divisor: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  lineaDivisor: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  divisorTexto: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginHorizontal: 12 },
  botonPrincipal: { backgroundColor: '#002D62', borderWidth: 2, borderColor: '#1565C0', borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 4 },
  botonPrincipalTexto: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  botonInvitado: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 14, padding: 13, alignItems: 'center' },
  botonInvitadoTexto: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  terminos: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 20, textAlign: 'center' }
});
