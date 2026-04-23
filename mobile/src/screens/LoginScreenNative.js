/**
 * Domino Real RD — Login Screen
 * Login con: Email/Password, Google OAuth, Facebook OAuth, Invitado
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as Google   from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── CONFIGURACIÓN ────────────────────────────────────────────
const API_URL = 'https://domino-real-rd-production.up.railway.app/api';

// Google — extraídos de google-services.json (domino-realrd)
const GOOGLE_WEB_CLIENT_ID     = '898063876162-5p8jnjhrii0khivuok5koprp2hpg7sv3.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = '898063876162-019re8ra3b4b1v2o3vjj2e5ck0pjk07o.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID     = null;

// Facebook — App ID de developers.facebook.com
const FACEBOOK_APP_ID = '915990674746311';

// Cierra el browser de OAuth correctamente al volver a la app
WebBrowser.maybeCompleteAuthSession();
// ─────────────────────────────────────────────────────────────

const COLORES = {
  azulRD: '#002D62', rojoRD: '#CF142B', blanco: '#FFFFFF',
  oro: '#FFD700', negro: '#0A0A0A', grisOscuro: '#1A1A2E'
};

export default function LoginScreenNative({ navigation, onLoginExitoso }) {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [nombre, setNombre]             = useState('');
  const [modoRegistro, setModoRegistro] = useState(false);
  const [cargando, setCargando]         = useState(false);
  const [cargandoGoogle, setCargandoGoogle]     = useState(false);
  const [cargandoFacebook, setCargandoFacebook] = useState(false);

  // ── GOOGLE AUTH ──────────────────────────────────────────────
  const [googleRequest, googleResponse, googlePrompt] = Google.useAuthRequest({
    webClientId:     GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    // Omitir iosClientId si es null — si se pasa null, expo-auth-session crashea
    ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}),
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      manejarRespuestaGoogle(googleResponse.authentication);
    } else if (googleResponse?.type === 'error') {
      setCargandoGoogle(false);
      Alert.alert('❌ Error', 'No se pudo completar el login con Google');
    } else if (googleResponse?.type === 'dismiss') {
      setCargandoGoogle(false);
    }
  }, [googleResponse]);

  const manejarRespuestaGoogle = async (authentication) => {
    try {
      const perfilResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${authentication.accessToken}` }
      });
      const perfil = await perfilResp.json();
      if (!perfil.sub) throw new Error('No se obtuvo perfil de Google');

      const resp = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          socialId:    perfil.sub,
          nombre:      perfil.name,
          email:       perfil.email,
          foto:        perfil.picture,
          accessToken: authentication.accessToken,
          pais: 'RD'
        })
      });
      const data = await resp.json();
      if (!data.exito) throw new Error(data.error || 'Error en servidor');

      await guardarSesion(data);
      onLoginExitoso(data.jugador, data.token);
    } catch (err) {
      Alert.alert('❌ Error con Google', err.message);
    } finally {
      setCargandoGoogle(false);
    }
  };

  const handleGoogle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCargandoGoogle(true);
    await googlePrompt();
  };

  // ── FACEBOOK AUTH ────────────────────────────────────────────
  const [fbRequest, fbResponse, fbPrompt] = Facebook.useAuthRequest({
    clientId: FACEBOOK_APP_ID,
    scopes: ['public_profile', 'email'],
  });

  useEffect(() => {
    if (fbResponse?.type === 'success') {
      manejarRespuestaFacebook(fbResponse.authentication);
    } else if (fbResponse?.type === 'error') {
      setCargandoFacebook(false);
      Alert.alert('❌ Error', 'No se pudo completar el login con Facebook');
    } else if (fbResponse?.type === 'dismiss') {
      setCargandoFacebook(false);
    }
  }, [fbResponse]);

  const manejarRespuestaFacebook = async (authentication) => {
    try {
      // Obtener perfil de Facebook con el access token
      const perfilResp = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${authentication.accessToken}`
      );
      const perfil = await perfilResp.json();
      if (!perfil.id) throw new Error('No se obtuvo perfil de Facebook');

      // Enviar al backend para crear/autenticar
      const resp = await fetch(`${API_URL}/auth/facebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          socialId:    perfil.id,
          nombre:      perfil.name,
          email:       perfil.email,
          foto:        perfil.picture?.data?.url,
          accessToken: authentication.accessToken,
          pais: 'RD'
        })
      });
      const data = await resp.json();
      if (!data.exito) throw new Error(data.error || 'Error en servidor');

      await guardarSesion(data);
      // Guardar el token de FB para buscar amigos después
      await AsyncStorage.setItem('domino_fb_token', authentication.accessToken);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onLoginExitoso(data.jugador, data.token);
    } catch (err) {
      Alert.alert('❌ Error con Facebook', err.message);
    } finally {
      setCargandoFacebook(false);
    }
  };

  const handleFacebook = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCargandoFacebook(true);
    await fbPrompt();
  };

  // ── HELPERS ──────────────────────────────────────────────────
  const guardarSesion = async (data) => {
    await AsyncStorage.setItem('domino_token',   data.token);
    await AsyncStorage.setItem('domino_jugador', JSON.stringify(data.jugador));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // ── EMAIL LOGIN / REGISTRO ───────────────────────────────────
  const handleLogin = async () => {
    if (!email.trim() || !password.trim())
      return Alert.alert('⚠️ Error', 'Completa todos los campos');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCargando(true);
    try {
      const resp = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });
      const data = await resp.json();
      if (!data.exito) throw new Error(data.error);
      await guardarSesion(data);
      onLoginExitoso(data.jugador, data.token);
    } catch (err) {
      Alert.alert('❌ Error', err.message || 'No se pudo iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  const handleRegistro = async () => {
    if (!nombre.trim() || !email.trim() || !password.trim())
      return Alert.alert('⚠️ Error', 'Completa todos los campos');
    if (password.length < 6)
      return Alert.alert('⚠️ Error', 'La contraseña debe tener mínimo 6 caracteres');
    setCargando(true);
    try {
      const resp = await fetch(`${API_URL}/auth/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), email: email.trim().toLowerCase(), password })
      });
      const data = await resp.json();
      if (!data.exito) throw new Error(data.error);
      await guardarSesion(data);
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: `Invitado_${Math.floor(Math.random() * 9999)}` })
      });
      const data = await resp.json();
      if (!data.exito) throw new Error(data.error);
      await AsyncStorage.setItem('domino_token', data.token);
      onLoginExitoso(data.jugador, data.token);
    } catch {
      Alert.alert('Error', 'No se pudo conectar al servidor');
    } finally {
      setCargando(false);
    }
  };

  const bloqueado = cargando || cargandoGoogle || cargandoFacebook;

  // ── RENDER ───────────────────────────────────────────────────
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <Text style={styles.emoji}>🎲</Text>
          <Text style={styles.titulo}>Dominó Real RD</Text>
          <Text style={styles.subtitulo}>🇩🇴 EL DOMINÓ DOMINICANO DEL MUNDO</Text>

          <View style={styles.card}>

            {/* ── Botón Google ── */}
            <TouchableOpacity
              style={[styles.botonSocial, styles.botonGoogle, bloqueado && { opacity: 0.6 }]}
              onPress={handleGoogle}
              disabled={bloqueado}
              activeOpacity={0.85}
            >
              {cargandoGoogle ? (
                <ActivityIndicator color="#333" size="small" />
              ) : (
                <View style={styles.botonSocialInner}>
                  <Text style={styles.iconoGoogle}>G</Text>
                  <Text style={[styles.botonSocialTexto, { color: '#333' }]}>
                    Continuar con Google
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* ── Botón Facebook ── */}
            <TouchableOpacity
              style={[styles.botonSocial, styles.botonFacebook, bloqueado && { opacity: 0.6 }]}
              onPress={handleFacebook}
              disabled={bloqueado}
              activeOpacity={0.85}
            >
              {cargandoFacebook ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={styles.botonSocialInner}>
                  <Text style={styles.iconoFB}>f</Text>
                  <Text style={styles.botonSocialTexto}>
                    Continuar con Facebook
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Divisor */}
            <View style={styles.divisor}>
              <View style={styles.lineaDivisor} />
              <Text style={styles.divisorTexto}>o con email</Text>
              <View style={styles.lineaDivisor} />
            </View>

            {/* ── Campos ── */}
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
              autoCorrect={false}
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
              disabled={bloqueado}
              style={[styles.botonPrincipal, bloqueado && { opacity: 0.7 }]}
              activeOpacity={0.85}
            >
              {cargando
                ? <ActivityIndicator color={COLORES.blanco} />
                : <Text style={styles.botonPrincipalTexto}>
                    {modoRegistro ? '📝 Crear Cuenta' : '🎲 Entrar a Jugar'}
                  </Text>
              }
            </TouchableOpacity>

            {/* Cambiar modo */}
            <TouchableOpacity
              onPress={() => { setModoRegistro(!modoRegistro); setEmail(''); setPassword(''); setNombre(''); }}
              style={{ marginVertical: 12 }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: 13 }}>
                {modoRegistro
                  ? '¿Ya tienes cuenta? Iniciar sesión'
                  : '¿No tienes cuenta? Regístrate gratis'}
              </Text>
            </TouchableOpacity>

            {/* Invitado */}
            <TouchableOpacity
              onPress={handleInvitado}
              disabled={bloqueado}
              style={[styles.botonInvitado, bloqueado && { opacity: 0.6 }]}
              activeOpacity={0.8}
            >
              <Text style={styles.botonInvitadoTexto}>👤  Jugar como Invitado</Text>
            </TouchableOpacity>

          </View>

          <Text style={styles.terminos}>
            Al continuar aceptas nuestros{' '}
            <Text style={{ color: COLORES.oro }}>Términos de Servicio</Text>
            {' '}y{' '}
            <Text style={{ color: COLORES.oro }}>Política de Privacidad</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  scroll: {
    alignItems: 'center', justifyContent: 'center',
    padding: 24, paddingTop: 60, paddingBottom: 40
  },
  emoji: { fontSize: 72, marginBottom: 12 },
  titulo: {
    color: '#FFF', fontSize: 26, fontWeight: 'bold',
    letterSpacing: 1, textAlign: 'center'
  },
  subtitulo: {
    color: '#FFD700', fontSize: 11, letterSpacing: 2,
    marginTop: 6, marginBottom: 32, textAlign: 'center'
  },
  card: {
    width: '100%', maxWidth: 380,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  botonSocial: {
    width: '100%', padding: 14, borderRadius: 14,
    alignItems: 'center', marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.2,
    shadowRadius: 6, elevation: 3
  },
  botonGoogle:   { backgroundColor: '#FFFFFF' },
  botonFacebook: { backgroundColor: '#1877F2' },
  botonSocialInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconoGoogle: {
    fontSize: 18, fontWeight: 'bold', color: '#4285F4', width: 22, textAlign: 'center'
  },
  iconoFB: {
    fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', width: 22, textAlign: 'center'
  },
  botonSocialTexto: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  divisor: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  lineaDivisor: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  divisorTexto: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginHorizontal: 12 },
  botonPrincipal: {
    backgroundColor: COLORES.azulRD,
    borderWidth: 2, borderColor: '#1565C0',
    borderRadius: 14, padding: 15,
    alignItems: 'center', marginTop: 4
  },
  botonPrincipalTexto: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  botonInvitado: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14, padding: 13, alignItems: 'center'
  },
  botonInvitadoTexto: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  terminos: {
    color: 'rgba(255,255,255,0.3)', fontSize: 11,
    marginTop: 20, textAlign: 'center', lineHeight: 16
  }
});
