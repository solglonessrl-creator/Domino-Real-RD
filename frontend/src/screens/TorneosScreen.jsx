/**
 * Domino Real RD — Pantalla de Torneos con Bracket Visual
 */

import React, { useState, useEffect } from 'react';
import { TorneosAPI } from '../services/socket';

const COLORES = {
  azulRD: '#002D62', rojoRD: '#CF142B', blanco: '#FFFFFF',
  oro: '#FFD700', negro: '#0A0A0A', grisOscuro: '#1A1A2E',
  grisMedio: '#2C2C54', morado: '#7B1FA2'
};

// ── BRACKET VISUAL ────────────────────────────────────────────
const PartidaBracket = ({ partida, esActiva }) => (
  <div style={{
    width: 140, backgroundColor: COLORES.grisOscuro,
    borderRadius: 10, overflow: 'hidden', margin: '4px 0',
    border: `1px solid ${esActiva ? COLORES.oro : 'rgba(255,255,255,0.1)'}`,
    boxShadow: esActiva ? `0 0 12px ${COLORES.oro}40` : 'none'
  }}>
    {[partida.equipo1, partida.equipo2].map((equipo, i) => {
      const esGanador = partida.ganador === equipo;
      return (
        <div key={i} style={{
          padding: '8px 10px',
          backgroundColor: esGanador ? `${COLORES.oro}20` : 'transparent',
          borderBottom: i === 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          <span style={{ fontSize: 14 }}>{equipo ? '👤' : '❓'}</span>
          <span style={{
            color: esGanador ? COLORES.oro : equipo ? COLORES.blanco : COLORES.blanco + '30',
            fontSize: 12, fontWeight: esGanador ? 'bold' : 'normal',
            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {equipo || 'Por definir'}
          </span>
          {esGanador && <span style={{ fontSize: 12 }}>🏆</span>}
        </div>
      );
    })}
  </div>
);

const BracketVisual = ({ bracket }) => {
  if (!bracket?.rondas?.length) return (
    <div style={{ color: COLORES.blanco + '40', textAlign: 'center', padding: 32 }}>
      El bracket se publicará cuando cierre la inscripción
    </div>
  );

  return (
    <div style={{ overflowX: 'auto', padding: 16 }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', minWidth: 'max-content' }}>
        {bracket.rondas.map((ronda, ri) => (
          <div key={ri} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Nombre de la ronda */}
            <div style={{
              color: ri === bracket.rondas.length - 1 ? COLORES.oro : COLORES.blanco + '70',
              fontSize: ri === bracket.rondas.length - 1 ? 14 : 12,
              fontWeight: 'bold', marginBottom: 12, textAlign: 'center'
            }}>
              {ronda.nombre}
            </div>

            {/* Partidas con conectores */}
            <div style={{
              display: 'flex', flexDirection: 'column',
              gap: ronda.partidas.length > 1 ? `${Math.pow(2, ri) * 20}px` : 0,
              justifyContent: 'center'
            }}>
              {ronda.partidas.map((partida, pi) => (
                <div key={pi} style={{ position: 'relative' }}>
                  <PartidaBracket
                    partida={partida}
                    esActiva={partida.estado === 'en_curso'}
                  />
                  {/* Resultado */}
                  {partida.resultado && (
                    <div style={{
                      textAlign: 'center', color: COLORES.blanco + '50',
                      fontSize: 10, marginTop: 2
                    }}>
                      {partida.resultado}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Campeón */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: COLORES.oro, fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>
            🏆 CAMPEÓN
          </div>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            backgroundColor: `${COLORES.oro}20`,
            border: `2px solid ${COLORES.oro}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28
          }}>
            👑
          </div>
        </div>
      </div>
    </div>
  );
};

// ── TARJETA DE TORNEO ──────────────────────────────────────────
const TarjetaTorneo = ({ torneo, onVerDetalle, onInscribirse }) => {
  const ahora = new Date();
  const inicio = new Date(torneo.fechaInicio);
  const msRestantes = inicio - ahora;
  const horasRestantes = Math.floor(msRestantes / 3600000);
  const diasRestantes = Math.floor(msRestantes / 86400000);

  const tiempoTexto = msRestantes <= 0 ? '¡En curso!'
    : diasRestantes >= 1 ? `En ${diasRestantes}d`
    : horasRestantes >= 1 ? `En ${horasRestantes}h`
    : 'Pronto';

  const lleno = torneo.participantesActuales >= torneo.maxParticipantes;
  const pct = Math.min((torneo.participantesActuales / torneo.maxParticipantes) * 100, 100);

  return (
    <div style={{
      backgroundColor: COLORES.grisMedio, borderRadius: 16, marginBottom: 14,
      border: `1px solid rgba(255,255,255,0.08)`, overflow: 'hidden'
    }}>
      {/* Header coloreado */}
      <div style={{
        background: torneo.esGratuito
          ? `linear-gradient(135deg, ${COLORES.azulRD}, #1565C0)`
          : `linear-gradient(135deg, ${COLORES.morado}, #9C27B0)`,
        padding: '14px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: COLORES.blanco, fontSize: 15, fontWeight: 'bold', marginBottom: 4 }}>
            {torneo.nombre}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              backgroundColor: 'rgba(0,0,0,0.3)', padding: '2px 8px',
              borderRadius: 10, fontSize: 11, color: COLORES.blanco
            }}>
              {torneo.tipo === 'eliminacion_directa' ? '⚔️ Eliminación' : '🔄 Round Robin'}
            </span>
            {torneo.esGratuito ? (
              <span style={{ backgroundColor: '#2E7D32', padding: '2px 8px', borderRadius: 10, fontSize: 11, color: COLORES.blanco }}>
                GRATIS
              </span>
            ) : (
              <span style={{ backgroundColor: COLORES.oro + '30', padding: '2px 8px', borderRadius: 10, fontSize: 11, color: COLORES.oro }}>
                🪙 {torneo.inscripcion} entrada
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', marginLeft: 12 }}>
          <div style={{ color: COLORES.oro, fontSize: 18, fontWeight: 'bold' }}>{tiempoTexto}</div>
          <div style={{ color: COLORES.blanco + '70', fontSize: 11 }}>
            {torneo.estado === 'inscripcion' ? 'Inscripción abierta' : torneo.estado === 'en_curso' ? 'En juego' : 'Finalizado'}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 16px' }}>
        {/* Premios */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {torneo.premios?.primero && (
            <div style={{ flex: 1, textAlign: 'center', backgroundColor: COLORES.grisOscuro, borderRadius: 10, padding: '8px 4px' }}>
              <div style={{ fontSize: 16 }}>🥇</div>
              <div style={{ color: COLORES.oro, fontSize: 12, fontWeight: 'bold' }}>
                🪙 {torneo.premios.primero.monedas?.toLocaleString()}
              </div>
              {torneo.premios.primero.skin && (
                <div style={{ color: COLORES.blanco + '50', fontSize: 9 }}>{torneo.premios.primero.skin}</div>
              )}
            </div>
          )}
          {torneo.premios?.segundo && (
            <div style={{ flex: 1, textAlign: 'center', backgroundColor: COLORES.grisOscuro, borderRadius: 10, padding: '8px 4px' }}>
              <div style={{ fontSize: 16 }}>🥈</div>
              <div style={{ color: '#C0C0C0', fontSize: 12, fontWeight: 'bold' }}>
                🪙 {torneo.premios.segundo.monedas?.toLocaleString()}
              </div>
            </div>
          )}
          {torneo.premios?.tercero && (
            <div style={{ flex: 1, textAlign: 'center', backgroundColor: COLORES.grisOscuro, borderRadius: 10, padding: '8px 4px' }}>
              <div style={{ fontSize: 16 }}>🥉</div>
              <div style={{ color: '#CD7F32', fontSize: 12, fontWeight: 'bold' }}>
                🪙 {torneo.premios.tercero.monedas?.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Progreso de inscripción */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: COLORES.blanco + '60', fontSize: 11 }}>Participantes</span>
            <span style={{ color: lleno ? COLORES.rojoRD : COLORES.blanco, fontSize: 11, fontWeight: 'bold' }}>
              {torneo.participantesActuales} / {torneo.maxParticipantes}
              {lleno && ' — LLENO'}
            </span>
          </div>
          <div style={{ backgroundColor: COLORES.grisOscuro, borderRadius: 4, height: 6 }}>
            <div style={{
              width: `${pct}%`, height: '100%', borderRadius: 4,
              backgroundColor: lleno ? COLORES.rojoRD : COLORES.azulRD,
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>

        {/* Requisitos */}
        {torneo.requisitos?.minELO > 0 && (
          <div style={{ color: COLORES.blanco + '50', fontSize: 11, marginBottom: 10 }}>
            📊 ELO mínimo: {torneo.requisitos.minELO}
            {torneo.requisitos.liga && ` · Liga ${torneo.requisitos.liga}`}
          </div>
        )}

        {/* Botones */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => onVerDetalle(torneo)} style={{
            flex: 1, padding: '10px', backgroundColor: 'transparent',
            border: `1px solid rgba(255,255,255,0.2)`, borderRadius: 12,
            color: COLORES.blanco, fontSize: 13, cursor: 'pointer'
          }}>
            Ver Bracket
          </button>
          <button
            onClick={() => !lleno && torneo.estado === 'inscripcion' && onInscribirse(torneo)}
            disabled={lleno || torneo.estado !== 'inscripcion'}
            style={{
              flex: 2, padding: '10px', borderRadius: 12, border: 'none',
              backgroundColor: lleno ? COLORES.grisOscuro
                : torneo.estado !== 'inscripcion' ? COLORES.grisOscuro
                : COLORES.azulRD,
              color: lleno || torneo.estado !== 'inscripcion' ? COLORES.blanco + '40' : COLORES.blanco,
              fontSize: 13, fontWeight: 'bold',
              cursor: lleno || torneo.estado !== 'inscripcion' ? 'default' : 'pointer'
            }}
          >
            {torneo.estado === 'en_curso' ? '🔴 En curso' : lleno ? '🔒 Lleno' : '✅ Inscribirme'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── MODAL BRACKET ─────────────────────────────────────────────
const ModalBracket = ({ torneo, onCerrar }) => {
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    TorneosAPI.detalle(torneo.id).then(r => setDetalle(r.torneo)).catch(() => {});
  }, [torneo.id]);

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)',
      zIndex: 1000, display: 'flex', flexDirection: 'column'
    }}>
      <div style={{
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
        backgroundColor: COLORES.grisOscuro, borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <button onClick={onCerrar} style={{ background: 'none', border: 'none', color: COLORES.blanco, fontSize: 20, cursor: 'pointer' }}>✕</button>
        <div style={{ color: COLORES.blanco, fontSize: 16, fontWeight: 'bold' }}>{torneo.nombre}</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        <BracketVisual bracket={detalle?.bracket || torneo.bracket} />
      </div>
    </div>
  );
};

// ── MODAL CREAR TORNEO ────────────────────────────────────────
const ModalCrearTorneo = ({ jugador, onCerrar, onCreado }) => {
  const [form, setForm] = useState({
    nombre: '', tipo: 'eliminacion_directa', esGratuito: true,
    inscripcion: 0, maxParticipantes: 8
  });
  const [cargando, setCargando] = useState(false);

  const crear = async () => {
    if (!form.nombre.trim() || form.nombre.length < 3) return alert('El nombre necesita mínimo 3 caracteres');
    setCargando(true);
    try {
      const resp = await TorneosAPI.crear({ ...form, creadorId: jugador?.id });
      onCreado(resp);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px', marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12,
    color: COLORES.blanco, fontSize: 14, outline: 'none', boxSizing: 'border-box'
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
      zIndex: 1000, display: 'flex', alignItems: 'flex-end'
    }}>
      <div style={{
        width: '100%', backgroundColor: COLORES.grisOscuro,
        borderRadius: '20px 20px 0 0', padding: 24, maxHeight: '85vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ color: COLORES.blanco, fontSize: 18, fontWeight: 'bold' }}>
            🏆 Crear Torneo Privado
          </div>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', color: COLORES.blanco, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <label style={{ color: COLORES.blanco + '70', fontSize: 12, display: 'block', marginBottom: 6 }}>
          Nombre del torneo
        </label>
        <input
          style={inputStyle} placeholder="Ej: Copa Los Crack RD"
          value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
        />

        <label style={{ color: COLORES.blanco + '70', fontSize: 12, display: 'block', marginBottom: 6 }}>
          Máximo participantes
        </label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[4, 8, 16, 32].map(n => (
            <button key={n} onClick={() => setForm({ ...form, maxParticipantes: n })} style={{
              flex: 1, padding: '10px 4px', borderRadius: 10, border: 'none',
              backgroundColor: form.maxParticipantes === n ? COLORES.azulRD : 'rgba(255,255,255,0.08)',
              color: COLORES.blanco, fontWeight: 'bold', cursor: 'pointer', fontSize: 14
            }}>{n}</button>
          ))}
        </div>

        <label style={{ color: COLORES.blanco + '70', fontSize: 12, display: 'block', marginBottom: 6 }}>
          Inscripción
        </label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => setForm({ ...form, esGratuito: true, inscripcion: 0 })} style={{
            flex: 1, padding: 10, borderRadius: 10, border: 'none',
            backgroundColor: form.esGratuito ? '#2E7D32' : 'rgba(255,255,255,0.08)',
            color: COLORES.blanco, cursor: 'pointer', fontWeight: 'bold'
          }}>🆓 Gratis</button>
          <button onClick={() => setForm({ ...form, esGratuito: false, inscripcion: 500 })} style={{
            flex: 1, padding: 10, borderRadius: 10, border: 'none',
            backgroundColor: !form.esGratuito ? COLORES.morado : 'rgba(255,255,255,0.08)',
            color: COLORES.blanco, cursor: 'pointer', fontWeight: 'bold'
          }}>🪙 Con entrada</button>
        </div>

        {!form.esGratuito && (
          <input type="number" style={inputStyle} placeholder="Monedas de inscripción"
            value={form.inscripcion}
            onChange={e => setForm({ ...form, inscripcion: Number(e.target.value) })}
          />
        )}

        <button onClick={crear} disabled={cargando} style={{
          width: '100%', padding: 14, backgroundColor: COLORES.azulRD,
          color: COLORES.blanco, border: 'none', borderRadius: 14,
          fontSize: 16, fontWeight: 'bold', cursor: 'pointer'
        }}>
          {cargando ? '⏳ Creando...' : '🏆 Crear Torneo'}
        </button>
      </div>
    </div>
  );
};

// ── PANTALLA PRINCIPAL ────────────────────────────────────────
const TorneosScreen = ({ jugador, onVolver }) => {
  const [torneos, setTorneos] = useState([]);
  const [tabActiva, setTabActiva] = useState('activos');
  const [cargando, setCargando] = useState(true);
  const [torneoSeleccionado, setTorneoSeleccionado] = useState(null);
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);

  useEffect(() => { cargarTorneos(); }, []);

  const cargarTorneos = async () => {
    setCargando(true);
    try {
      const resp = await TorneosAPI.listar();
      setTorneos(resp.torneos || []);
    } catch { setTorneos([]); }
    finally { setCargando(false); }
  };

  const handleInscribirse = async (torneo) => {
    try {
      await TorneosAPI.inscribir(torneo.id, jugador?.id);
      setMensajeExito(`¡Inscrito en "${torneo.nombre}"! Prepárate para competir. 🏆`);
      setTimeout(() => setMensajeExito(null), 4000);
      cargarTorneos();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleTorneoCreado = (resp) => {
    setMostrarCrear(false);
    setMensajeExito(`¡Torneo creado! Código: ${resp.codigoInvitacion} — ¡Compártelo con tus amigos!`);
    setTimeout(() => setMensajeExito(null), 6000);
    cargarTorneos();
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: COLORES.negro, fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${COLORES.morado}, ${COLORES.grisOscuro})`, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button onClick={onVolver} style={{ background: 'none', border: 'none', color: COLORES.blanco, fontSize: 20, cursor: 'pointer' }}>←</button>
          <div style={{ color: COLORES.blanco, fontSize: 20, fontWeight: 'bold' }}>🏆 Torneos</div>
          <button onClick={() => setMostrarCrear(true)} style={{
            marginLeft: 'auto', padding: '7px 14px',
            backgroundColor: COLORES.oro, color: COLORES.negro,
            border: 'none', borderRadius: 16, fontWeight: 'bold', fontSize: 12, cursor: 'pointer'
          }}>
            + Crear
          </button>
        </div>

        <div style={{ display: 'flex', gap: 0, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 4 }}>
          {[
            { id: 'activos', label: '⚡ Activos' },
            { id: 'mis_torneos', label: '🎯 Mis Torneos' },
            { id: 'historial', label: '📜 Pasados' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setTabActiva(tab.id)} style={{
              flex: 1, padding: '8px 4px', border: 'none',
              backgroundColor: tabActiva === tab.id ? COLORES.blanco + '15' : 'transparent',
              color: tabActiva === tab.id ? COLORES.blanco : COLORES.blanco + '50',
              borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 'bold'
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {cargando ? (
          <div style={{ textAlign: 'center', padding: 48, color: COLORES.blanco + '50' }}>⏳ Cargando torneos...</div>
        ) : torneos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏟️</div>
            <div style={{ color: COLORES.blanco, fontSize: 16, marginBottom: 8 }}>No hay torneos activos</div>
            <div style={{ color: COLORES.blanco + '50', fontSize: 13, marginBottom: 20 }}>¡Crea el tuyo o vuelve pronto!</div>
            <button onClick={() => setMostrarCrear(true)} style={{
              padding: '12px 24px', backgroundColor: COLORES.morado,
              color: COLORES.blanco, border: 'none', borderRadius: 16,
              fontWeight: 'bold', cursor: 'pointer'
            }}>
              + Crear Torneo Privado
            </button>
          </div>
        ) : torneos.map(torneo => (
          <TarjetaTorneo
            key={torneo.id}
            torneo={torneo}
            onVerDetalle={setTorneoSeleccionado}
            onInscribirse={handleInscribirse}
          />
        ))}
      </div>

      {/* Modal bracket */}
      {torneoSeleccionado && (
        <ModalBracket torneo={torneoSeleccionado} onCerrar={() => setTorneoSeleccionado(null)} />
      )}

      {/* Modal crear torneo */}
      {mostrarCrear && (
        <ModalCrearTorneo jugador={jugador} onCerrar={() => setMostrarCrear(false)} onCreado={handleTorneoCreado} />
      )}

      {/* Toast */}
      {mensajeExito && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          backgroundColor: '#2E7D32', color: COLORES.blanco,
          padding: '12px 20px', borderRadius: 20, fontSize: 13, fontWeight: 'bold',
          zIndex: 2000, maxWidth: '90%', textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          ✅ {mensajeExito}
        </div>
      )}
    </div>
  );
};

export default TorneosScreen;
