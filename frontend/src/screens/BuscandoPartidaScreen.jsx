/**
 * Domino Real RD — Pantalla de Matchmaking
 * Animación de búsqueda de oponentes + cancelar
 */

import React, { useState, useEffect, useRef } from 'react';
import { MatchmakingAPI } from '../services/socket';

const COLORES = {
  azulRD: '#002D62', rojoRD: '#CF142B', blanco: '#FFFFFF',
  oro: '#FFD700', negro: '#0A0A0A', grisOscuro: '#1A1A2E'
};

const BuscandoPartidaScreen = ({ jugador, modo = 'rapido', onPartidaEncontrada, onCancelar }) => {
  const [segundos, setSegundos] = useState(0);
  const [jugadoresEncontrados, setJugadoresEncontrados] = useState(1); // el jugador actual
  const [puntosAnimados, setPuntosAnimados] = useState('');
  const [expandElo, setExpandElo] = useState(false);
  const intervalRef = useRef(null);
  const busquedaRef = useRef(null);

  const titulos = {
    rapido: 'Buscando Partida Rápida',
    ranked: 'Buscando Partida Clasificatoria',
    practica: 'Preparando Práctica vs IA'
  };

  useEffect(() => {
    // Timer de tiempo de espera
    intervalRef.current = setInterval(() => {
      setSegundos(s => s + 1);
      setPuntosAnimados(p => p.length >= 3 ? '' : p + '.');
    }, 1000);

    // Simulación de progreso de matchmaking
    busquedaRef.current = setInterval(() => {
      setJugadoresEncontrados(prev => {
        if (prev >= 4) return prev;
        return prev + (Math.random() > 0.5 ? 1 : 0);
      });
    }, 3000);

    // Sondear servidor
    const sondeo = setInterval(async () => {
      try {
        const resp = await MatchmakingAPI.buscar(jugador?.id, jugador?.elo, modo);
        if (resp.emparejado) {
          clearAll();
          onPartidaEncontrada(resp);
        }
      } catch (err) {}
    }, 4000);

    return () => { clearAll(); clearInterval(sondeo); };
  }, []);

  // Expandir rango ELO después de 20 segundos sin encontrar
  useEffect(() => {
    if (segundos === 20) setExpandElo(true);
  }, [segundos]);

  const clearAll = () => {
    clearInterval(intervalRef.current);
    clearInterval(busquedaRef.current);
  };

  const handleCancelar = async () => {
    clearAll();
    try {
      await MatchmakingAPI.cancelar(jugador?.id);
    } catch {}
    onCancelar();
  };

  const formatTiempo = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(ellipse at center, ${COLORES.grisOscuro} 0%, ${COLORES.negro} 100%)`,
      fontFamily: "'Segoe UI', sans-serif", padding: 24, textAlign: 'center'
    }}>

      {/* Animación de fichas girando */}
      <div style={{ position: 'relative', width: 160, height: 160, marginBottom: 32 }}>
        {/* Anillo exterior */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: `3px solid ${COLORES.azulRD}`,
          borderTopColor: COLORES.oro,
          animation: 'girar 1.5s linear infinite'
        }} />
        {/* Anillo medio */}
        <div style={{
          position: 'absolute', inset: 16, borderRadius: '50%',
          border: `2px solid ${COLORES.rojoRD}40`,
          borderBottomColor: COLORES.rojoRD,
          animation: 'girar 2s linear infinite reverse'
        }} />
        <div style={{
          position: 'absolute', inset: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 64, color: COLORES.blanco, transform: 'rotate(45deg)'
        }}>
          🁣
        </div>
      </div>

      {/* Título */}
      <div style={{ color: COLORES.blanco, fontSize: 22, fontWeight: 'bold', marginBottom: 8 }}>
        {titulos[modo] || 'Buscando Partida'}
      </div>

      {/* Puntos animados */}
      <div style={{ color: COLORES.blanco + '60', fontSize: 16, marginBottom: 24, minHeight: 24 }}>
        Buscando oponentes{puntosAnimados}
      </div>

      {/* Indicador de jugadores 1/4 */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 24
      }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            width: 48, height: 48, borderRadius: 12,
            backgroundColor: i < jugadoresEncontrados ? COLORES.azulRD : COLORES.grisOscuro,
            border: `2px solid ${i < jugadoresEncontrados ? COLORES.oro : 'rgba(255,255,255,0.1)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, transition: 'all 0.4s ease'
          }}>
            {i < jugadoresEncontrados ? '👤' : '❓'}
          </div>
        ))}
      </div>

      <div style={{ color: COLORES.blanco + '60', fontSize: 14, marginBottom: 32 }}>
        {jugadoresEncontrados}/4 jugadores listos
      </div>

      {/* Stats del jugador en espera */}
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16, padding: '16px 24px', marginBottom: 24,
        border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: 280
      }}>
        <div style={{ color: COLORES.blanco, fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
          Tu perfil
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <div>
            <div style={{ color: COLORES.oro, fontSize: 20, fontWeight: 'bold' }}>{jugador?.elo || 1200}</div>
            <div style={{ color: COLORES.blanco + '60', fontSize: 11 }}>ELO</div>
          </div>
          <div>
            <div style={{ color: COLORES.blanco, fontSize: 20, fontWeight: 'bold' }}>🥈</div>
            <div style={{ color: COLORES.blanco + '60', fontSize: 11 }}>{jugador?.liga || 'Plata'}</div>
          </div>
          <div>
            <div style={{ color: COLORES.blanco, fontSize: 14, fontWeight: 'bold' }}>{formatTiempo(segundos)}</div>
            <div style={{ color: COLORES.blanco + '60', fontSize: 11 }}>Esperando</div>
          </div>
        </div>
      </div>

      {/* Notificación de expansión de rango ELO */}
      {expandElo && (
        <div style={{
          backgroundColor: '#E65100' + '30', border: '1px solid #FF6D00',
          borderRadius: 12, padding: '10px 16px', marginBottom: 16,
          color: COLORES.blanco, fontSize: 12, maxWidth: 280
        }}>
          ⚡ Expandiendo rango de búsqueda para encontrarte oponentes más rápido...
        </div>
      )}

      {/* Tip mientras espera */}
      <div style={{
        color: COLORES.blanco + '40', fontSize: 12, marginBottom: 32, maxWidth: 240
      }}>
        💡 Tip: La capicúa da +30 puntos extra si cierras con el mismo número en ambos extremos
      </div>

      {/* Botón cancelar */}
      <button
        onClick={handleCancelar}
        style={{
          padding: '12px 32px',
          backgroundColor: 'transparent',
          color: COLORES.rojoRD,
          border: `2px solid ${COLORES.rojoRD}`,
          borderRadius: 24, fontSize: 14, fontWeight: 'bold', cursor: 'pointer'
        }}
      >
        ✕ Cancelar búsqueda
      </button>

      <style>{`
        @keyframes girar {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default BuscandoPartidaScreen;
