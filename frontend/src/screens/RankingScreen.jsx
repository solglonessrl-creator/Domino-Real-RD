/**
 * Domino Real RD — Pantalla de Ranking Global
 * Tabla de clasificación con ligas, ELO y filtro por país
 */

import React, { useState, useEffect } from 'react';
import { RankingAPI } from '../services/socket';

const COLORES = {
  azulRD: '#002D62', rojoRD: '#CF142B', blanco: '#FFFFFF',
  oro: '#FFD700', negro: '#0A0A0A', grisOscuro: '#1A1A2E',
  grisMedio: '#2C2C54', plata: '#C0C0C0', bronce: '#CD7F32',
  diamante: '#B9F2FF'
};

const LIGA_CONFIG = {
  Bronce:   { color: '#CD7F32', icono: '🥉', bg: '#3D2B1F' },
  Plata:    { color: '#C0C0C0', icono: '🥈', bg: '#2A2A2A' },
  Oro:      { color: '#FFD700', icono: '🥇', bg: '#3D3000' },
  Diamante: { color: '#B9F2FF', icono: '💎', bg: '#001A2E' }
};

const PAISES = [
  { codigo: null, nombre: '🌍 Global' },
  { codigo: 'RD', nombre: '🇩🇴 Rep. Dominicana' },
  { codigo: 'US', nombre: '🇺🇸 USA' },
  { codigo: 'ES', nombre: '🇪🇸 España' },
  { codigo: 'PR', nombre: '🇵🇷 Puerto Rico' },
  { codigo: 'IT', nombre: '🇮🇹 Italia' }
];

const FilaJugador = ({ jugador, posicion, esYo }) => {
  const liga = LIGA_CONFIG[jugador.liga] || LIGA_CONFIG.Bronce;
  const medalla = posicion === 1 ? '🥇' : posicion === 2 ? '🥈' : posicion === 3 ? '🥉' : null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      backgroundColor: esYo ? `${COLORES.azulRD}40` : posicion <= 3 ? `${liga.bg}` : 'transparent',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      borderLeft: esYo ? `3px solid ${COLORES.oro}` : posicion <= 3 ? `3px solid ${liga.color}` : '3px solid transparent',
      transition: 'background 0.2s'
    }}>
      {/* Posición */}
      <div style={{
        width: 36, textAlign: 'center',
        color: posicion <= 3 ? liga.color : COLORES.blanco + '60',
        fontSize: posicion <= 3 ? 20 : 14, fontWeight: 'bold'
      }}>
        {medalla || `#${posicion}`}
      </div>

      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        backgroundColor: liga.bg,
        border: `2px solid ${liga.color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20
      }}>
        👤
      </div>

      {/* Info del jugador */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            color: esYo ? COLORES.oro : COLORES.blanco,
            fontWeight: esYo ? 'bold' : 'normal', fontSize: 14
          }}>
            {jugador.nombre}
          </span>
          {esYo && <span style={{ color: COLORES.oro, fontSize: 10 }}>TÚ</span>}
          <span style={{ fontSize: 12 }}>{jugador.pais === 'RD' ? '🇩🇴' : jugador.pais === 'US' ? '🇺🇸' : jugador.pais === 'ES' ? '🇪🇸' : '🌍'}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          <span style={{ color: liga.color, fontSize: 11 }}>{liga.icono} {jugador.liga}</span>
          {jugador.racha_actual > 3 && (
            <span style={{ color: '#FF6D00', fontSize: 11 }}>🔥 Racha ×{jugador.racha_actual}</span>
          )}
        </div>
      </div>

      {/* ELO y stats */}
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: liga.color, fontSize: 18, fontWeight: 'bold' }}>
          {jugador.elo}
        </div>
        <div style={{ color: COLORES.blanco + '50', fontSize: 10 }}>
          {jugador.partidas_ganadas || 0}W / {(jugador.partidas_jugadas - jugador.partidas_ganadas) || 0}L
        </div>
      </div>
    </div>
  );
};

const RankingScreen = ({ jugadorActual, onVolver }) => {
  const [ranking, setRanking] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [paisFiltro, setPaisFiltro] = useState(null);
  const [ligaFiltro, setLigaFiltro] = useState(null);
  const [miPosicion, setMiPosicion] = useState(null);

  useEffect(() => {
    cargarRanking();
  }, [paisFiltro]);

  const cargarRanking = async () => {
    setCargando(true);
    try {
      const resp = await RankingAPI.global();
      setRanking(resp.ranking || []);

      // Buscar posición del jugador actual
      const pos = resp.ranking?.findIndex(j => j.id === jugadorActual?.id);
      if (pos !== -1) setMiPosicion(pos + 1);
    } catch (err) {
      console.error('Error cargando ranking:', err);
    } finally {
      setCargando(false);
    }
  };

  const rankingFiltrado = ligaFiltro
    ? ranking.filter(j => j.liga === ligaFiltro)
    : ranking;

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      backgroundColor: COLORES.negro, fontFamily: "'Segoe UI', sans-serif"
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORES.azulRD}, ${COLORES.grisOscuro})`,
        padding: '16px 20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button
            onClick={onVolver}
            style={{ background: 'none', border: 'none', color: COLORES.blanco, fontSize: 20, cursor: 'pointer' }}
          >
            ←
          </button>
          <div>
            <div style={{ color: COLORES.blanco, fontSize: 20, fontWeight: 'bold' }}>
              📊 Ranking Global
            </div>
            <div style={{ color: COLORES.blanco + '70', fontSize: 12 }}>
              {ranking.length} jugadores clasificados
            </div>
          </div>
        </div>

        {/* Filtro por país */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {PAISES.map(pais => (
            <button
              key={pais.codigo || 'global'}
              onClick={() => setPaisFiltro(pais.codigo)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: 'none',
                backgroundColor: paisFiltro === pais.codigo ? COLORES.oro : 'rgba(255,255,255,0.1)',
                color: paisFiltro === pais.codigo ? COLORES.negro : COLORES.blanco,
                fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 'bold'
              }}
            >
              {pais.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro por liga */}
      <div style={{
        display: 'flex', gap: 8, padding: '10px 16px',
        backgroundColor: COLORES.grisOscuro, overflowX: 'auto'
      }}>
        {[null, 'Diamante', 'Oro', 'Plata', 'Bronce'].map(liga => {
          const cfg = liga ? LIGA_CONFIG[liga] : null;
          return (
            <button
              key={liga || 'todas'}
              onClick={() => setLigaFiltro(liga)}
              style={{
                padding: '5px 14px', borderRadius: 16, border: 'none',
                backgroundColor: ligaFiltro === liga ? (cfg?.color || COLORES.blanco) : 'rgba(255,255,255,0.08)',
                color: ligaFiltro === liga ? COLORES.negro : COLORES.blanco,
                fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 'bold'
              }}
            >
              {liga ? `${cfg.icono} ${liga}` : '🌍 Todas'}
            </button>
          );
        })}
      </div>

      {/* Mi posición rápida */}
      {miPosicion && jugadorActual && (
        <div style={{
          margin: '8px 16px',
          backgroundColor: `${COLORES.azulRD}40`,
          borderRadius: 12, padding: '10px 16px',
          border: `1px solid ${COLORES.azulRD}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ color: COLORES.blanco, fontSize: 13 }}>
            📍 Tu posición global
          </span>
          <span style={{ color: COLORES.oro, fontSize: 20, fontWeight: 'bold' }}>
            #{miPosicion}
          </span>
        </div>
      )}

      {/* Lista de ranking */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {cargando ? (
          <div style={{ textAlign: 'center', padding: 40, color: COLORES.blanco + '60' }}>
            ⏳ Cargando ranking...
          </div>
        ) : (
          rankingFiltrado.map((jugador, idx) => (
            <FilaJugador
              key={jugador.id || idx}
              jugador={jugador}
              posicion={jugador.posicion || idx + 1}
              esYo={jugador.id === jugadorActual?.id}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default RankingScreen;
