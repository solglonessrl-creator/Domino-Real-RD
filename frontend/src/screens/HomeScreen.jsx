/**
 * Domino Real RD - Pantalla Principal (Home)
 * Diseño inspirado en colores de la bandera dominicana
 * Azul (#002D62), Rojo (#CF142B), Blanco (#FFFFFF)
 */

import React, { useState, useEffect } from 'react';

const COLORES = {
  azulRD: '#002D62',
  azulClaro: '#1565C0',
  rojoRD: '#CF142B',
  blanco: '#FFFFFF',
  oro: '#FFD700',
  negro: '#0A0A0A',
  grisOscuro: '#1A1A2E',
  grisMedio: '#2C2C54'
};

const HomeScreen = ({ jugador, onNavegar }) => {
  const [stats, setStats] = useState(null);
  const [torneoActivo, setTorneoActivo] = useState(null);

  useEffect(() => {
    // TODO: cargar stats reales del jugador
    setStats({
      elo: jugador?.elo || 1200,
      liga: 'Plata',
      ganadas: jugador?.ganadas || 0,
      monedas: jugador?.monedas || 500
    });

    setTorneoActivo({
      nombre: '🏆 Copa Semanal RD',
      inicio: '2h 30min',
      inscriptos: 38
    });
  }, [jugador]);

  const botonesMenu = [
    {
      id: 'rapida',
      icono: '⚡',
      titulo: 'Partida Rápida',
      subtitulo: 'Matchmaking automático',
      color: COLORES.azulRD,
      colorBorde: '#1565C0'
    },
    {
      id: 'amigos',
      icono: '👥',
      titulo: 'Jugar con Amigos',
      subtitulo: 'Crear sala privada',
      color: COLORES.grisMedio,
      colorBorde: '#4A4A8A'
    },
    {
      id: 'vs_ia',
      icono: '🤖',
      titulo: 'Vs Inteligencia Artificial',
      subtitulo: 'Fácil · Medio · Difícil',
      color: '#1B5E20',
      colorBorde: '#2E7D32'
    },
    {
      id: 'torneos',
      icono: '🏆',
      titulo: 'Torneos',
      subtitulo: 'Competir y ganar premios',
      color: '#7B1FA2',
      colorBorde: '#9C27B0'
    },
    {
      id: 'ranking',
      icono: '📊',
      titulo: 'Ranking Global',
      subtitulo: 'Ver clasificación mundial',
      color: COLORES.rojoRD,
      colorBorde: '#E53935'
    },
    {
      id: 'tienda',
      icono: '🛒',
      titulo: 'Tienda',
      subtitulo: 'Fichas, mesas y más',
      color: '#E65100',
      colorBorde: '#FF6D00'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: COLORES.negro,
      fontFamily: "'Segoe UI', 'Roboto', sans-serif",
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORES.azulRD} 0%, ${COLORES.grisOscuro} 50%, ${COLORES.rojoRD} 100%)`,
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Patrón decorativo */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'url("/assets/patron-rd.png")',
          opacity: 0.05
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 28 }}>🎲</span>
              <div>
                <div style={{ color: COLORES.blanco, fontSize: 22, fontWeight: 'bold', letterSpacing: 1 }}>
                  Dominó Real RD
                </div>
                <div style={{ color: COLORES.oro, fontSize: 11, letterSpacing: 2 }}>
                  🇩🇴 EL DOMINÓ DOMINICANO DEL MUNDO
                </div>
              </div>
            </div>
          </div>

          {/* Perfil del jugador */}
          <div
            onClick={() => onNavegar('perfil')}
            style={{ cursor: 'pointer', textAlign: 'right' }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              backgroundColor: COLORES.oro,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, marginLeft: 'auto', marginBottom: 4,
              border: `2px solid ${COLORES.blanco}40`
            }}>
              {jugador?.avatar === 'avatar_rey' ? '👑' : '👤'}
            </div>
            <div style={{ color: COLORES.blanco, fontSize: 13, fontWeight: 'bold' }}>
              {jugador?.nombre || 'Jugador'}
            </div>
            <div style={{ color: COLORES.oro, fontSize: 11 }}>
              🥈 {stats?.liga || 'Bronce'} · {stats?.elo || 1200} ELO
            </div>
          </div>
        </div>

        {/* Stats rápidas */}
        <div style={{
          display: 'flex', gap: 16, marginTop: 16,
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: 12, padding: '10px 16px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: COLORES.oro, fontSize: 20, fontWeight: 'bold' }}>
              {stats?.ganadas || 0}
            </div>
            <div style={{ color: COLORES.blanco + '80', fontSize: 11 }}>Ganadas</div>
          </div>
          <div style={{ width: 1, backgroundColor: COLORES.blanco + '20' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: COLORES.oro, fontSize: 20, fontWeight: 'bold' }}>
              {stats?.elo || 1200}
            </div>
            <div style={{ color: COLORES.blanco + '80', fontSize: 11 }}>ELO</div>
          </div>
          <div style={{ width: 1, backgroundColor: COLORES.blanco + '20' }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: COLORES.oro, fontSize: 20, fontWeight: 'bold' }}>
              🪙 {stats?.monedas?.toLocaleString() || 500}
            </div>
            <div style={{ color: COLORES.blanco + '80', fontSize: 11 }}>Monedas</div>
          </div>
          <button
            onClick={() => onNavegar('tienda')}
            style={{
              backgroundColor: COLORES.oro, color: COLORES.negro,
              border: 'none', borderRadius: 8, padding: '4px 10px',
              fontSize: 11, fontWeight: 'bold', cursor: 'pointer',
              alignSelf: 'center'
            }}
          >
            + Obtener
          </button>
        </div>
      </div>

      {/* Banner torneo activo */}
      {torneoActivo && (
        <div
          onClick={() => onNavegar('torneos')}
          style={{
            margin: '12px 16px 0',
            background: `linear-gradient(90deg, #7B1FA2, #9C27B0)`,
            borderRadius: 12, padding: '12px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer', border: '1px solid #CE93D8'
          }}
        >
          <div>
            <div style={{ color: COLORES.blanco, fontSize: 14, fontWeight: 'bold' }}>
              {torneoActivo.nombre}
            </div>
            <div style={{ color: '#CE93D8', fontSize: 12 }}>
              Empieza en {torneoActivo.inicio} · {torneoActivo.inscriptos} inscritos
            </div>
          </div>
          <button style={{
            backgroundColor: COLORES.oro, color: COLORES.negro,
            border: 'none', borderRadius: 16, padding: '6px 14px',
            fontSize: 12, fontWeight: 'bold', cursor: 'pointer'
          }}>
            ¡Inscribirse!
          </button>
        </div>
      )}

      {/* Bono diario */}
      <div
        onClick={() => onNavegar('bono')}
        style={{
          margin: '12px 16px 0',
          backgroundColor: '#1B5E20',
          borderRadius: 12, padding: '12px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer', border: '1px solid #4CAF50'
        }}
      >
        <div>
          <div style={{ color: COLORES.blanco, fontSize: 14, fontWeight: 'bold' }}>
            🎁 Bono Diario Disponible
          </div>
          <div style={{ color: '#81C784', fontSize: 12 }}>¡Reclama tus 100 monedas gratis!</div>
        </div>
        <span style={{ fontSize: 28 }}>🪙</span>
      </div>

      {/* Menú principal */}
      <div style={{ padding: '16px', flex: 1 }}>
        <div style={{ color: COLORES.blanco + '60', fontSize: 12, marginBottom: 12, letterSpacing: 1 }}>
          MODOS DE JUEGO
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12
        }}>
          {botonesMenu.map(boton => (
            <button
              key={boton.id}
              onClick={() => onNavegar(boton.id)}
              style={{
                backgroundColor: boton.color,
                border: `1px solid ${boton.colorBorde}`,
                borderRadius: 16,
                padding: '20px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'transform 0.15s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>{boton.icono}</div>
              <div style={{ color: COLORES.blanco, fontSize: 15, fontWeight: 'bold', marginBottom: 4 }}>
                {boton.titulo}
              </div>
              <div style={{ color: COLORES.blanco + '80', fontSize: 12 }}>
                {boton.subtitulo}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
      <div style={{
        display: 'flex',
        backgroundColor: COLORES.grisOscuro,
        borderTop: `1px solid ${COLORES.azulRD}40`,
        padding: '8px 0'
      }}>
        {[
          { icono: '🏠', label: 'Inicio', id: 'home' },
          { icono: '📊', label: 'Ranking', id: 'ranking' },
          { icono: '🏆', label: 'Torneos', id: 'torneos' },
          { icono: '👥', label: 'Amigos', id: 'amigos' },
          { icono: '👤', label: 'Perfil', id: 'perfil' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => onNavegar(item.id)}
            style={{
              flex: 1, border: 'none', backgroundColor: 'transparent',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 2, padding: '4px', cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icono}</span>
            <span style={{ color: COLORES.blanco + '60', fontSize: 10 }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HomeScreen;
