/**
 * Domino Real RD - App Principal
 * Router completo con todas las pantallas
 */

import React, { useState, useEffect } from 'react';
import HomeScreen from './screens/HomeScreen';
import TableroJuego from './components/game/TableroJuego';
import RankingScreen from './screens/RankingScreen';
import TiendaScreen from './screens/TiendaScreen';
import PerfilScreen from './screens/PerfilScreen';
import BuscandoPartidaScreen from './screens/BuscandoPartidaScreen';
import TorneosScreen from './screens/TorneosScreen';
import AmigosScreen from './screens/AmigosScreen';
import { conectarSocket, AuthAPI, MatchmakingAPI } from './services/socket';

// Error Boundary para evitar pantallazo azul
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorInfo: error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'white', backgroundColor: '#CF142B', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
          <h2>Algo salió mal al renderizar la interfaz.</h2>
          <p style={{ color: '#FFD700' }}>Por favor envíale este error a tu asistente IA:</p>
          <pre style={{ backgroundColor: '#000', padding: 10, borderRadius: 8, whiteSpace: 'pre-wrap', maxWidth: '90%' }}>
            {this.state.errorInfo && this.state.errorInfo.toString()}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: 10, cursor: 'pointer', borderRadius: 8, border: 'none', backgroundColor: '#002D62', color: 'white', fontWeight: 'bold' }}>Recargar Aplicación</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  const [pantalla, setPantalla] = useState('login');
  const [jugador, setJugador] = useState(null);
  const [socket, setSocket] = useState(null);
  const [partida, setPartida] = useState(null);
  const [modoJuego, setModoJuego] = useState('rapido');

  useEffect(() => {
    const token = localStorage.getItem('domino_token');
    const jugadorGuardado = localStorage.getItem('domino_jugador');
    if (token && jugadorGuardado) {
      const jug = JSON.parse(jugadorGuardado);
      setJugador(jug);
      setSocket(conectarSocket(token));
      setPantalla('home');
    }
  }, []);

  const finalizarSesion = (resp) => {
    localStorage.setItem('domino_token', resp.token);
    localStorage.setItem('domino_jugador', JSON.stringify(resp.jugador));
    setJugador(resp.jugador);
    setSocket(conectarSocket(resp.token));
    setPantalla('home');
  };

  const handleLogin = async (email, password) => {
    const resp = await AuthAPI.login(email, password);
    finalizarSesion(resp);
  };

  const handleRegistro = async (nombre, email, password) => {
    const resp = await AuthAPI.registro(nombre, email, password);
    finalizarSesion(resp);
  };

  const handleInvitado = async () => {
    const resp = await AuthAPI.loginInvitado();
    finalizarSesion(resp);
  };

  const handleFacebook = async () => {
    if (!window.FB) throw new Error('Facebook no está listo. Recarga la página.');
    return new Promise((resolve, reject) => {
      window.FB.login((loginResp) => {
        if (!loginResp.authResponse) {
          return reject(new Error('Login de Facebook cancelado'));
        }
        const accessToken = loginResp.authResponse.accessToken;
        const socialId    = loginResp.authResponse.userID;
        window.FB.api('/me', { fields: 'name,email,picture.type(large)' }, async (perfil) => {
          try {
            const resp = await AuthAPI.loginFacebook(
              accessToken, socialId,
              perfil?.name, perfil?.email,
              perfil?.picture?.data?.url
            );
            finalizarSesion(resp);
            resolve(resp);
          } catch (err) { reject(err); }
        });
      }, { scope: 'public_profile,email' });
    });
  };

  const handleGoogle = async () => {
    const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!CLIENT_ID) throw new Error('Google Client ID no configurado');
    if (!window.google?.accounts?.oauth2) throw new Error('Google no está listo. Recarga la página.');

    return new Promise((resolve, reject) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'profile email',
        callback: async (tokenResp) => {
          if (!tokenResp?.access_token) return reject(new Error('Google no devolvió token'));
          try {
            // Obtener perfil con el accessToken
            const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResp.access_token}` }
            }).then(r => r.json());

            const resp = await AuthAPI.loginGoogle(
              tokenResp.access_token,
              userInfo.sub,
              userInfo.name,
              userInfo.email,
              userInfo.picture
            );
            finalizarSesion(resp);
            resolve(resp);
          } catch (err) { reject(err); }
        },
        error_callback: (err) => reject(new Error(err?.message || 'Login de Google cancelado'))
      });
      tokenClient.requestAccessToken();
    });
  };

  const handleNavegar = (destino) => {
    if (destino === 'rapida' || destino === 'ranked') {
      setModoJuego(destino === 'ranked' ? 'ranked' : 'rapido');
      setPantalla('buscando');
    } else if (destino === 'vs_ia' || destino === 'practica') {
      const roomId = `vsIA_${jugador?.id}_${Date.now()}`;
      setPartida({ roomId, modo: 'vs_ia' });
      socket?.emit('join_room', { roomId, jugador: { ...jugador, posicion: 0 }, modo: 'vs_ia' });
      setPantalla('juego');
    } else {
      setPantalla(destino);
    }
  };

  const handlePartidaEncontrada = (resp) => {
    setPartida(resp);
    resp.jugadores?.forEach((j, i) => {
      if (i === 0) socket?.emit('join_room', { roomId: resp.roomId, jugador: { ...jugador, posicion: 0 }, modo: 'online' });
    });
    setPantalla('juego');
  };

  const volver = () => setPantalla('home');

  // ── ROUTER ──────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      {(() => {
        switch (pantalla) {
          case 'login':
            return (
        <LoginScreen
          onLogin={handleLogin}
          onRegistro={handleRegistro}
          onInvitado={handleInvitado}
          onFacebook={handleFacebook}
          onGoogle={handleGoogle}
        />
      );

    case 'home':
      return <HomeScreen jugador={jugador} onNavegar={handleNavegar} />;

    case 'juego':
      return (
        <TableroJuego
          socket={socket}
          roomId={partida?.roomId}
          jugadorId={0}
          jugadores={partida?.jugadores}
        />
      );

    case 'buscando':
      return (
        <BuscandoPartidaScreen
          jugador={jugador}
          modo={modoJuego}
          onPartidaEncontrada={handlePartidaEncontrada}
          onCancelar={volver}
        />
      );

    case 'ranking':
      return <RankingScreen jugadorActual={jugador} onVolver={volver} />;

    case 'tienda':
      return <TiendaScreen jugador={jugador} onVolver={volver} />;

    case 'perfil':
      return <PerfilScreen jugadorActual={jugador} onVolver={volver} onNavegar={handleNavegar} />;

    case 'torneos':
      return <TorneosScreen jugador={jugador} onVolver={volver} />;

    case 'amigos':
      return <AmigosScreen jugador={jugador} socket={socket} onVolver={volver} />;

    default:
      return (
        <div style={{
          height: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', backgroundColor: '#0A0A0A',
          color: '#FFF', flexDirection: 'column', gap: 16
        }}>
          <div style={{ fontSize: 48 }}>🚧</div>
          <div>Pantalla "{pantalla}" próximamente</div>
          <button
            onClick={volver}
            style={{
              padding: '10px 24px', backgroundColor: '#002D62',
              color: '#FFF', border: 'none', borderRadius: 20, cursor: 'pointer'
            }}
          >
            ← Volver
          </button>
        </div>
      );
      }
    })()}
    </ErrorBoundary>
  );
};

const LoginScreen = ({ onLogin, onRegistro, onInvitado, onFacebook, onGoogle }) => {
  const [modo, setModo] = useState('login'); // 'login' | 'registro'
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const esRegistro = modo === 'registro';

  const submit = async () => {
    if (esRegistro) {
      if (!nombre || nombre.length < 2) return setError('Nombre debe tener al menos 2 caracteres');
      if (!email || !password) return setError('Completa todos los campos');
      if (password.length < 6) return setError('Contraseña mínimo 6 caracteres');
    } else {
      if (!email || !password) return setError('Completa todos los campos');
    }
    setCargando(true);
    setError('');
    try {
      if (esRegistro) await onRegistro(nombre, email, password);
      else await onLogin(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const socialLogin = async (fn) => {
    setCargando(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #002D62 0%, #0A0A0A 50%, #CF142B 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: "'Segoe UI', sans-serif"
    }}>
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 32,
        width: '100%', maxWidth: 380, border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 60, marginBottom: 10, color: '#FFF' }}>🁣</div>
          <div style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold', letterSpacing: 1 }}>
            Dominó Real RD
          </div>
          <div style={{ color: '#FFD700', fontSize: 12, letterSpacing: 2, marginTop: 4 }}>
            🇩🇴 EL DOMINÓ DOMINICANO DEL MUNDO
          </div>
        </div>

        {/* Login con Facebook */}
        <button
          onClick={() => socialLogin(onFacebook)}
          disabled={cargando}
          style={{
            width: '100%', padding: 13, marginBottom: 10,
            backgroundColor: '#1877F2', color: '#FFF',
            border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 'bold',
            cursor: cargando ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: cargando ? 0.7 : 1
          }}>
          📘 Continuar con Facebook
        </button>

        <button
          onClick={() => socialLogin(onGoogle)}
          disabled={cargando}
          style={{
            width: '100%', padding: 13, marginBottom: 20,
            backgroundColor: '#FFF', color: '#333',
            border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 'bold',
            cursor: cargando ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: cargando ? 0.7 : 1
          }}>
          🔵 Continuar con Google
        </button>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20
        }}>
          <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
            {esRegistro ? 'crear cuenta con email' : 'o con email'}
          </span>
          <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
        </div>

        {esRegistro && (
          <input type="text" placeholder="Tu nombre (2-20 letras)" value={nombre}
            onChange={e => setNombre(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', marginBottom: 12,
              backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 12, color: '#FFF', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
          />
        )}

        <input type="email" placeholder="Correo electrónico" value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', padding: '12px 16px', marginBottom: 12,
            backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 12, color: '#FFF', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
        />
        <input type="password" placeholder="Contraseña" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && submit()}
          style={{ width: '100%', padding: '12px 16px', marginBottom: 8,
            backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 12, color: '#FFF', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
        />

        {error && (
          <div style={{ color: '#FF6B6B', fontSize: 12, marginBottom: 12 }}>⚠️ {error}</div>
        )}

        <button onClick={submit} disabled={cargando} style={{
          width: '100%', padding: 14, backgroundColor: '#002D62',
          color: '#FFF', border: '2px solid #1565C0', borderRadius: 12,
          fontSize: 16, fontWeight: 'bold', cursor: 'pointer', marginBottom: 12
        }}>
          {cargando
            ? (esRegistro ? '⏳ Creando cuenta...' : '⏳ Entrando...')
            : (esRegistro ? '✨ Crear cuenta' : '🁣 Entrar a Jugar')}
        </button>

        {/* Toggle Login <-> Registro */}
        <button
          onClick={() => { setModo(esRegistro ? 'login' : 'registro'); setError(''); }}
          style={{
            width: '100%', padding: 10, backgroundColor: 'transparent',
            color: '#FFD700', border: 'none',
            fontSize: 13, cursor: 'pointer', marginBottom: 8, fontWeight: '600'
          }}>
          {esRegistro
            ? '¿Ya tienes cuenta? Iniciar sesión'
            : '¿Primera vez? Crear cuenta gratis 🎁'}
        </button>

        <button onClick={() => socialLogin(onInvitado)} disabled={cargando} style={{
          width: '100%', padding: 12, backgroundColor: 'transparent',
          color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 12, fontSize: 14, cursor: 'pointer'
        }}>
          👤 Jugar como Invitado
        </button>
      </div>
    </div>
  );
};

export default App;
