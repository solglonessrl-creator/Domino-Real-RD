/**
 * Domino Real RD — Pantalla de Perfil del Jugador
 * Stats, logros, historial, personalización
 */

import React, { useState, useEffect } from 'react';
import { RankingAPI, SocialAPI } from '../services/socket';

const COLORES = {
  azulRD: '#002D62', rojoRD: '#CF142B', blanco: '#FFFFFF',
  oro: '#FFD700', negro: '#0A0A0A', grisOscuro: '#1A1A2E', grisMedio: '#2C2C54'
};

const LIGAS = {
  Bronce:   { color: '#CD7F32', icono: '🥉' },
  Plata:    { color: '#C0C0C0', icono: '🥈' },
  Oro:      { color: '#FFD700', icono: '🥇' },
  Diamante: { color: '#B9F2FF', icono: '💎' }
};

const LOGROS_DISPONIBLES = [
  { id: 'primera_victoria',   icono: '🏆', nombre: 'Primera Victoria',    descripcion: 'Gana tu primera partida' },
  { id: 'diez_victorias',     icono: '🥇', nombre: '10 Victorias',         descripcion: 'Acumula 10 victorias' },
  { id: 'cien_victorias',     icono: '👑', nombre: '100 Victorias',        descripcion: 'Leyenda del dominó' },
  { id: 'primera_capicua',    icono: '🎉', nombre: 'Primera Capicúa',      descripcion: 'Haz tu primera capicúa' },
  { id: 'capicua_maestro',    icono: '🎲', nombre: 'Maestro de Capicúas',  descripcion: '10 capicúas en total' },
  { id: 'racha_cinco',        icono: '🔥', nombre: 'Racha de 5',           descripcion: '5 victorias seguidas' },
  { id: 'plata',              icono: '🥈', nombre: 'Liga Plata',           descripcion: 'Alcanza la Liga Plata' },
  { id: 'oro',                icono: '🥇', nombre: 'Liga Oro',             descripcion: 'Alcanza la Liga Oro' },
  { id: 'diamante',           icono: '💎', nombre: 'Liga Diamante',        descripcion: 'La cima del dominó' },
  { id: 'campeón_torneo',     icono: '🏟️', nombre: 'Campeón de Torneo',   descripcion: 'Gana un torneo' },
  { id: 'social_invitador',   icono: '👥', nombre: 'El Que Invita',        descripcion: 'Trae 5 amigos al juego' }
];

const StatCard = ({ valor, label, color }) => (
  <div style={{
    backgroundColor: COLORES.grisMedio, borderRadius: 12,
    padding: '14px 10px', textAlign: 'center'
  }}>
    <div style={{ color: color || COLORES.oro, fontSize: 22, fontWeight: 'bold' }}>{valor}</div>
    <div style={{ color: COLORES.blanco + '60', fontSize: 11, marginTop: 2 }}>{label}</div>
  </div>
);

const PerfilScreen = ({ jugadorActual, onVolver, onNavegar }) => {
  const [perfil, setPerfil] = useState(null);
  const [codigoReferido, setCodigoReferido] = useState(null);
  const [tabActiva, setTabActiva] = useState('stats');
  const [cargando, setCargando] = useState(true);

  const liga = LIGAS[perfil?.liga || jugadorActual?.liga || 'Bronce'];

  useEffect(() => {
    cargarPerfil();
    cargarCodigoReferido();
  }, []);

  const cargarPerfil = async () => {
    try {
      const resp = await RankingAPI.jugador(jugadorActual?.id || 'me');
      setPerfil(resp.perfil);
    } catch (err) {
      setPerfil({ ...jugadorActual, stats: {} });
    } finally {
      setCargando(false);
    }
  };

  const cargarCodigoReferido = async () => {
    try {
      const resp = await SocialAPI.codigoReferido(jugadorActual?.id);
      setCodigoReferido(resp);
    } catch {}
  };

  const compartirPerfil = () => {
    const texto = `🎲 ¡Juego dominó dominicano en Dominó Real RD! Soy ${perfil?.nombre} con ${perfil?.elo} ELO ${liga?.icono}. ¡Únete con mi código ${codigoReferido?.codigo} y gana 500 monedas! 🇩🇴`;
    if (navigator.share) {
      navigator.share({ text: texto });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(texto);
      alert('¡Copiado! Pégalo en WhatsApp o Facebook');
    }
  };

  const logrosObtenidos = new Set(perfil?.logros?.filter(l => l.obtenido).map(l => l.id) || []);

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      backgroundColor: COLORES.negro, fontFamily: "'Segoe UI', sans-serif", overflowY: 'auto'
    }}>
      {/* Header con gradiente de liga */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORES.azulRD}, ${liga?.color}40, ${COLORES.grisOscuro})`,
        padding: '20px', paddingBottom: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={onVolver} style={{ background: 'none', border: 'none', color: COLORES.blanco, fontSize: 20, cursor: 'pointer' }}>←</button>
          <div style={{ color: COLORES.blanco, fontSize: 18, fontWeight: 'bold' }}>Mi Perfil</div>
          <button
            onClick={compartirPerfil}
            style={{
              marginLeft: 'auto', padding: '6px 14px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 16, color: COLORES.blanco,
              fontSize: 12, cursor: 'pointer'
            }}
          >
            📤 Compartir
          </button>
        </div>

        {/* Avatar y datos principales */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            backgroundColor: liga?.color + '30',
            border: `3px solid ${liga?.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36
          }}>
            {jugadorActual?.avatar === 'avatar_rey' ? '👑' : '👤'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: COLORES.blanco, fontSize: 20, fontWeight: 'bold' }}>
              {perfil?.nombre || jugadorActual?.nombre}
            </div>
            <div style={{ color: liga?.color, fontSize: 14, marginTop: 2 }}>
              {liga?.icono} Liga {perfil?.liga || jugadorActual?.liga || 'Bronce'}
            </div>
            <div style={{ color: COLORES.blanco + '70', fontSize: 12, marginTop: 2 }}>
              🇩🇴 República Dominicana
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: liga?.color, fontSize: 28, fontWeight: 'bold' }}>
              {perfil?.elo || jugadorActual?.elo || 1200}
            </div>
            <div style={{ color: COLORES.blanco + '60', fontSize: 11 }}>ELO</div>
          </div>
        </div>

        {/* Barra de progreso ELO hacia siguiente liga */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: COLORES.blanco + '60', fontSize: 11 }}>Progreso hacia Oro</span>
            <span style={{ color: liga?.color, fontSize: 11 }}>1650 / 2000 ELO</span>
          </div>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, height: 6 }}>
            <div style={{
              width: '67%', height: '100%',
              backgroundColor: liga?.color,
              borderRadius: 4, transition: 'width 0.5s ease'
            }} />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {[
            { id: 'stats', label: '📊 Stats' },
            { id: 'logros', label: '🏆 Logros' },
            { id: 'historial', label: '📜 Historial' },
            { id: 'referidos', label: '👥 Referidos' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id)}
              style={{
                flex: 1, padding: '10px 4px', border: 'none', background: 'none',
                borderBottom: tabActiva === tab.id ? `2px solid ${COLORES.oro}` : '2px solid transparent',
                color: tabActiva === tab.id ? COLORES.oro : COLORES.blanco + '60',
                cursor: 'pointer', fontSize: 12, fontWeight: 'bold'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido de tabs */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* STATS */}
        {tabActiva === 'stats' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              <StatCard valor={perfil?.stats?.partidasJugadas || 0} label="Partidas" />
              <StatCard valor={perfil?.stats?.ganadas || 0} label="Ganadas" color="#4CAF50" />
              <StatCard valor={`${perfil?.stats?.winRate || 0}%`} label="Win Rate" color="#4CAF50" />
              <StatCard valor={perfil?.stats?.capicuas || 0} label="Capicúas" color={COLORES.oro} />
              <StatCard valor={perfil?.stats?.mejorRacha || 0} label="Mejor Racha" color="#FF6D00" />
              <StatCard valor={perfil?.stats?.rachaActual || 0} label="Racha Actual" color="#FF6D00" />
            </div>

            {/* Ficha favorita */}
            {perfil?.stats?.fichasMasJugada && (
              <div style={{
                backgroundColor: COLORES.grisMedio, borderRadius: 12,
                padding: '14px 16px', marginBottom: 16
              }}>
                <div style={{ color: COLORES.blanco + '70', fontSize: 12, marginBottom: 6 }}>
                  Ficha más jugada
                </div>
                <div style={{ color: COLORES.blanco, fontSize: 16, fontWeight: 'bold' }}>
                  🀱 {perfil.stats.fichasMasJugada}
                </div>
              </div>
            )}

            {/* Botones rápidos */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => onNavegar('rapida')}
                style={{
                  flex: 1, padding: '14px', backgroundColor: COLORES.azulRD,
                  color: COLORES.blanco, border: 'none', borderRadius: 16,
                  fontWeight: 'bold', cursor: 'pointer', fontSize: 14
                }}
              >
                ⚡ Jugar Ahora
              </button>
              <button
                onClick={() => onNavegar('tienda')}
                style={{
                  flex: 1, padding: '14px', backgroundColor: COLORES.grisMedio,
                  color: COLORES.blanco, border: 'none', borderRadius: 16,
                  cursor: 'pointer', fontSize: 14
                }}
              >
                🛒 Personalizar
              </button>
            </div>
          </div>
        )}

        {/* LOGROS */}
        {tabActiva === 'logros' && (
          <div>
            <div style={{ color: COLORES.blanco + '60', fontSize: 12, marginBottom: 12 }}>
              {logrosObtenidos.size} / {LOGROS_DISPONIBLES.length} logros desbloqueados
            </div>

            {/* Barra de progreso logros */}
            <div style={{ backgroundColor: COLORES.grisMedio, borderRadius: 4, height: 6, marginBottom: 16 }}>
              <div style={{
                width: `${(logrosObtenidos.size / LOGROS_DISPONIBLES.length) * 100}%`,
                height: '100%', backgroundColor: COLORES.oro, borderRadius: 4
              }} />
            </div>

            {LOGROS_DISPONIBLES.map(logro => {
              const obtenido = logrosObtenidos.has(logro.id);
              return (
                <div key={logro.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', marginBottom: 8,
                  backgroundColor: obtenido ? `${COLORES.oro}15` : COLORES.grisMedio,
                  borderRadius: 12,
                  border: obtenido ? `1px solid ${COLORES.oro}40` : '1px solid transparent',
                  opacity: obtenido ? 1 : 0.5
                }}>
                  <div style={{ fontSize: 28, filter: obtenido ? 'none' : 'grayscale(1)' }}>
                    {logro.icono}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: obtenido ? COLORES.blanco : COLORES.blanco + '70', fontSize: 14, fontWeight: 'bold' }}>
                      {logro.nombre}
                    </div>
                    <div style={{ color: COLORES.blanco + '50', fontSize: 12 }}>
                      {logro.descripcion}
                    </div>
                  </div>
                  {obtenido && <span style={{ color: COLORES.oro, fontSize: 18 }}>✅</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* HISTORIAL */}
        {tabActiva === 'historial' && (
          <div>
            <div style={{ color: COLORES.blanco + '60', fontSize: 12, marginBottom: 12 }}>
              Últimas 10 partidas
            </div>
            {[...Array(5)].map((_, i) => {
              const gano = i % 3 !== 0;
              const capicua = i === 1;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', marginBottom: 8,
                  backgroundColor: COLORES.grisMedio, borderRadius: 12,
                  borderLeft: `4px solid ${gano ? '#4CAF50' : COLORES.rojoRD}`
                }}>
                  <div style={{ fontSize: 24 }}>{gano ? '🏆' : '😤'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: COLORES.blanco, fontSize: 13 }}>
                      {gano ? 'Victoria' : 'Derrota'}
                      {capicua && <span style={{ color: COLORES.oro, marginLeft: 6, fontSize: 11 }}>🎉 CAPICÚA</span>}
                    </div>
                    <div style={{ color: COLORES.blanco + '50', fontSize: 11 }}>
                      hace {i + 1} hora{i !== 0 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: gano ? '#4CAF50' : COLORES.rojoRD, fontSize: 13, fontWeight: 'bold' }}>
                      {gano ? '200' : '145'}
                    </div>
                    <div style={{ color: COLORES.oro, fontSize: 11 }}>
                      {gano ? '+' : ''}{gano ? Math.floor(Math.random() * 20) + 5 : -(Math.floor(Math.random() * 15) + 5)} ELO
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* REFERIDOS */}
        {tabActiva === 'referidos' && codigoReferido && (
          <div>
            <div style={{
              backgroundColor: COLORES.grisMedio, borderRadius: 16,
              padding: 20, marginBottom: 16, textAlign: 'center'
            }}>
              <div style={{ color: COLORES.blanco + '70', fontSize: 12, marginBottom: 8 }}>
                Tu código de invitación
              </div>
              <div style={{ color: COLORES.oro, fontSize: 32, fontWeight: 'bold', letterSpacing: 4, marginBottom: 12 }}>
                {codigoReferido.codigo}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(codigoReferido.textoWhatsApp);
                  alert('¡Texto copiado! Pégalo en WhatsApp');
                }}
                style={{
                  padding: '12px 24px', backgroundColor: '#25D366',
                  color: COLORES.blanco, border: 'none', borderRadius: 20,
                  fontWeight: 'bold', cursor: 'pointer', width: '100%'
                }}
              >
                📤 Compartir en WhatsApp
              </button>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16
            }}>
              <StatCard valor={codigoReferido.referidosActivos || 0} label="Amigos invitados" />
              <StatCard valor={`🪙 ${codigoReferido.gananciasReferidos || 0}`} label="Monedas ganadas" />
            </div>

            <div style={{
              backgroundColor: COLORES.grisMedio, borderRadius: 12, padding: 16
            }}>
              <div style={{ color: COLORES.blanco, fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
                ¿Cómo funciona?
              </div>
              <div style={{ color: COLORES.blanco + '70', fontSize: 13, lineHeight: 1.6 }}>
                1. Comparte tu código con amigos<br />
                2. Ellos se registran con tu código<br />
                3. ¡Tú ganas <span style={{ color: COLORES.oro }}>+200 monedas</span> por cada uno!<br />
                4. Tu amigo recibe <span style={{ color: COLORES.oro }}>+500 monedas</span> extra
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerfilScreen;
