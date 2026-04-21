/**
 * Domino Real RD — App.js Principal (React Native / Expo)
 * Navegación completa con todas las pantallas
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';

// Pantallas
import LoginScreenNative from './src/screens/LoginScreenNative';
import HomeScreenNative from './src/screens/HomeScreenNative';
import RankingScreenNative from './src/screens/RankingScreenNative';
import PerfilScreenNative from './src/screens/PerfilScreenNative';
import TorneosScreenNative from './src/screens/TorneosScreenNative';
import TiendaScreenNative from './src/screens/TiendaScreenNative';

// ─── URL DEL SERVIDOR ────────────────────────────────────────
// IMPORTANTE: Cambiar esto a tu URL de Railway cuando hagas deploy
const SERVIDOR_URL = 'https://domino-real-rd-production.up.railway.app';
// Para pruebas locales con tu IP:
// const SERVIDOR_URL = 'http://192.168.1.XXX:3001';

// Mantener splash hasta que app esté lista
SplashScreen.preventAutoHideAsync();

// Configurar cómo se muestran las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true
  })
});

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const COLORES = {
  azulRD: '#002D62', rojoRD: '#CF142B', blanco: '#FFFFFF',
  oro: '#FFD700', negro: '#0A0A0A', grisOscuro: '#1A1A2E'
};

// ── PLACEHOLDERS para pantallas en desarrollo ─────────────────
function PantallaProxima({ route }) {
  return (
    <View style={{ flex: 1, backgroundColor: COLORES.negro, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 56, marginBottom: 16 }}>🎲</Text>
      <Text style={{ color: COLORES.blanco, fontSize: 20, fontWeight: 'bold' }}>{route.name}</Text>
      <Text style={{ color: `${COLORES.blanco}50`, fontSize: 14, marginTop: 8 }}>Próximamente</Text>
    </View>
  );
}

// ── BARRA DE TABS (pantallas principales) ─────────────────────
function TabsPrincipales({ jugador }) {
  const tabIconos = {
    Inicio: '🏠', Ranking: '📊', Jugar: '🎲', Torneos: '🏆', Perfil: '👤'
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORES.grisOscuro,
          borderTopColor: `${COLORES.azulRD}60`,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 85 : 62,
          paddingBottom: Platform.OS === 'ios' ? 22 : 8,
          paddingTop: 6
        },
        tabBarActiveTintColor: COLORES.oro,
        tabBarInactiveTintColor: `${COLORES.blanco}40`,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarIcon: ({ color, focused }) => (
          route.name === 'Jugar'
            ? (
              <View style={{
                width: 52, height: 52, borderRadius: 26,
                backgroundColor: focused ? COLORES.azulRD : `${COLORES.azulRD}80`,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 10,
                borderWidth: 2, borderColor: focused ? COLORES.oro : 'transparent',
                shadowColor: COLORES.oro, shadowOpacity: focused ? 0.4 : 0,
                shadowRadius: 8, elevation: focused ? 6 : 0
              }}>
                <Text style={{ fontSize: 24 }}>🎲</Text>
              </View>
            )
            : <Text style={{ fontSize: 22 }}>{tabIconos[route.name]}</Text>
        )
      })}
    >
      <Tab.Screen name="Inicio" options={{ tabBarLabel: 'Inicio' }}>
        {(props) => <HomeScreenNative {...props} jugador={jugador} />}
      </Tab.Screen>
      <Tab.Screen name="Ranking" options={{ tabBarLabel: 'Ranking' }}>
        {(props) => <RankingScreenNative {...props} jugador={jugador} />}
      </Tab.Screen>
      <Tab.Screen name="Jugar" component={PantallaProxima} options={{ tabBarLabel: '' }} />
      <Tab.Screen name="Torneos" options={{ tabBarLabel: 'Torneos' }}>
        {(props) => <TorneosScreenNative {...props} jugador={jugador} />}
      </Tab.Screen>
      <Tab.Screen name="Perfil" options={{ tabBarLabel: 'Perfil' }}>
        {(props) => <PerfilScreenNative {...props} jugador={jugador} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// ── SPLASH ANIMADO ────────────────────────────────────────────
function SplashAnimado() {
  return (
    <View style={estilos.splash}>
      <StatusBar barStyle="light-content" backgroundColor={COLORES.azulRD} />
      <Text style={estilos.splashEmoji}>🎲</Text>
      <Text style={estilos.splashTitulo}>Dominó Real RD</Text>
      <Text style={estilos.splashSub}>🇩🇴 EL DOMINÓ DOMINICANO DEL MUNDO</Text>
      <ActivityIndicator color={COLORES.oro} size="large" style={{ marginTop: 40 }} />
      <View style={estilos.splashBarra}>
        <View style={estilos.splashBarraInner} />
      </View>
    </View>
  );
}

// ── APP PRINCIPAL ─────────────────────────────────────────────
export default function App() {
  const [appLista, setAppLista] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [jugador, setJugador] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    inicializar();
  }, []);

  const inicializar = async () => {
    try {
      // Simular tiempo de splash
      await new Promise(r => setTimeout(r, 2000));

      // Restaurar sesión guardada
      const token = await AsyncStorage.getItem('domino_token');
      const jugadorStr = await AsyncStorage.getItem('domino_jugador');

      if (token && jugadorStr) {
        const jug = JSON.parse(jugadorStr);
        setJugador(jug);
        conectarSocket(token);
      }

      // Solicitar permisos de notificación
      await solicitarPermisosNotificacion();

    } catch (err) {
      console.error('Error inicializando:', err);
    } finally {
      setAppLista(true);
      setCargando(false);
      await SplashScreen.hideAsync();
    }
  };

  const conectarSocket = (token) => {
    const sock = io(SERVIDOR_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5
    });
    sock.on('connect', () => console.log('[Socket] Conectado'));
    sock.on('disconnect', () => console.log('[Socket] Desconectado'));
    setSocket(sock);
    return sock;
  };

  const solicitarPermisosNotificacion = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      const token = await Notifications.getExpoPushTokenAsync();
      console.log('[Push] Token:', token.data);
      // TODO: enviar token al servidor: /api/jugadores/fcm-token
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('domino_global', {
        name: 'Dominó Real RD',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: COLORES.azulRD
      });
    }
  };

  const onLoginExitoso = (jugadorData, token) => {
    setJugador(jugadorData);
    conectarSocket(token);
  };

  const onLayoutRoot = useCallback(async () => {
    if (appLista) await SplashScreen.hideAsync();
  }, [appLista]);

  if (!appLista) return <SplashAnimado />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRoot}>
      <StatusBar barStyle="light-content" backgroundColor={COLORES.azulRD} />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          {!jugador ? (
            // No hay sesión → mostrar login
            <Stack.Screen name="Login">
              {(props) => <LoginScreenNative {...props} onLoginExitoso={onLoginExitoso} />}
            </Stack.Screen>
          ) : (
            // Sesión activa → app completa
            <>
              <Stack.Screen name="Main">
                {(props) => <TabsPrincipales {...props} jugador={jugador} />}
              </Stack.Screen>

              {/* Pantallas de stack (encima de los tabs) */}
              <Stack.Screen
                name="Buscando"
                component={PantallaProxima}
                options={{ animation: 'fade', gestureEnabled: false }}
              />
              <Stack.Screen
                name="Juego"
                component={PantallaProxima}
                options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
              />
              <Stack.Screen name="Tienda">
                {(props) => <TiendaScreenNative {...props} jugador={jugador} />}
              </Stack.Screen>
              <Stack.Screen name="TorneoDetalle" component={PantallaProxima} />
              <Stack.Screen name="PerfilJugador" component={PantallaProxima} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const estilos = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORES.azulRD,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40
  },
  splashEmoji: { fontSize: 80, marginBottom: 20 },
  splashTitulo: { color: COLORES.blanco, fontSize: 28, fontWeight: 'bold', letterSpacing: 2, textAlign: 'center' },
  splashSub: { color: COLORES.oro, fontSize: 12, letterSpacing: 2, marginTop: 8, textAlign: 'center' },
  splashBarra: { width: 200, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, marginTop: 30, overflow: 'hidden' },
  splashBarraInner: { width: '70%', height: '100%', backgroundColor: COLORES.oro, borderRadius: 2 }
});
