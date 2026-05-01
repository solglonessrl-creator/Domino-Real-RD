/**
 * Domino Real RD — Pantalla de Amigos
 * Lista, buscar, invitar a partida, compartir código
 */

import React, { useState, useEffect } from 'react';
import { SocialAPI } from '../services/socket';

const COLORES = {
  azulRD: '#002D62', rojoRD: '#CF142B', blanco: '#FFFFFF',
  oro: '#FFD700', negro: '#0A0A0A', grisOscuro: '#1A1A2E', grisMedio: '#2C2C54'
};

const ESTADO_COLOR = { conectado: '#4CAF50', en_juego: '#FF6D00', desconectado: '#666' };
const ESTADO_LABEL = { conectado: '● En línea', en_juego: '🁣 En partida', desconectado: '○ Desconectado' };

const TarjetaAmigo = ({ amigo, onInvitar, onVerPerfil }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    backgroundColor: 'transparent'
  }}>
    {/* Avatar con indicador de estado */}
    <div style={{ position: 'relative' }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        backgroundColor: COLORES.grisMedio,
        border: '2px solid rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
      }}>👤</div>
      <div style={{
        position: 'absolute', bottom: 1, right: 1,
        width: 12, height: 12, borderRadius: '50%',
        backgroundColor: ESTADO_COLOR[amigo.estado_conexion] || '#666',
        border: '2px solid #0A0A0A'
      }} />
    </div>

    {/* Info */}
    <div style={{ flex: 1 }}>
      <div style={{ color: COLORES.blanco, fontSize: 14, fontWeight: 'bold' }}>
        {amigo.nombre}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <span style={{ color: ESTADO_COLOR[amigo.estado_conexion], fontSize: 11 }}>
          {ESTADO_LABEL[amigo.estado_conexion]}
        </span>
        <span style={{ color: COLORES.blanco + '40', fontSize: 11 }}>·</span>
        <span style={{ color: COLORES.oro, fontSize: 11 }}>
          {amigo.liga === 'Diamante' ? '💎' : amigo.liga === 'Oro' ? '🥇' : amigo.liga === 'Plata' ? '🥈' : '🥉'} {amigo.elo} ELO
        </span>
      </div>
    </div>

    {/* Acciones */}
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={() => onVerPerfil(amigo)} style={{
        padding: '7px 12px', backgroundColor: 'rgba(255,255,255,0.08)',
        border: 'none', borderRadius: 10, color: COLORES.blanco, fontSize: 12, cursor: 'pointer'
      }}>👤</button>
      {amigo.estado_conexion !== 'en_juego' && (
        <button onClick={() => onInvitar(amigo)} style={{
          padding: '7px 12px', backgroundColor: COLORES.azulRD,
          border: 'none', borderRadius: 10, color: COLORES.blanco,
          fontSize: 12, fontWeight: 'bold', cursor: 'pointer'
        }}>
          🁣 Invitar
        </button>
      )}
    </div>
  </div>
);

const AmigosScreen = ({ jugador, socket, onVolver }) => {
  const [amigos, setAmigos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [tabActiva, setTabActiva] = useState('amigos');
  const [cargando, setCargando] = useState(true);
  const [codigoReferido, setCodigoReferido] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  useEffect(() => {
    cargarAmigos();
    cargarCodigoReferido();
  }, []);

  // Buscar mientras escribe
  useEffect(() => {
    if (busqueda.length < 2) { setResultadosBusqueda([]); return; }
    const timer = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/jugadores/buscar?q=${encodeURIComponent(busqueda)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('domino_token')}` }
        });
        const data = await resp.json();
        setResultadosBusqueda(data.jugadores || []);
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [busqueda]);

  const cargarAmigos = async () => {
    try {
      const resp = await SocialAPI.amigos(jugador?.id);
      setAmigos(resp.amigos || []);
    } catch {}
    finally { setCargando(false); }
  };

  const cargarCodigoReferido = async () => {
    try {
      const resp = await SocialAPI.codigoReferido(jugador?.id);
      setCodigoReferido(resp);
    } catch {}
  };

  const handleInvitar = async (amigo) => {
    const roomId = `priv_${jugador?.id}_${Date.now()}`;
    try {
      await SocialAPI.amigos(jugador?.id); // mock: en producción emite socket de invitación
      socket?.emit('join_room', { roomId, jugador: { ...jugador, posicion: 0 }, modo: 'privado' });
      mostrarExito(`¡Invitación enviada a ${amigo.nombre}!`);
    } catch {}
  };

  const handleAgregarAmigo = async (jugadorBuscado) => {
    try {
      await fetch('/api/social/agregar-amigo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('domino_token')}`
        },
        body: JSON.stringify({ solicitanteId: jugador?.id, destinatarioId: jugadorBuscado.id })
      });
      mostrarExito(`¡Solicitud enviada a ${jugadorBuscado.nombre}!`);
    } catch {}
  };

  const compartirInvitacion = () => {
    if (!codigoReferido) return;
    if (navigator.share) {
      navigator.share({ text: codigoReferido.textoWhatsApp });
    } else {
      navigator.clipboard?.writeText(codigoReferido.textoWhatsApp);
      mostrarExito('¡Enlace copiado! Pégalo en WhatsApp o Facebook.');
    }
  };

  const mostrarExito = (msg) => {
    setMensajeExito(msg);
    setTimeout(() => setMensajeExito(null), 3500);
  };

  const amigosEnLinea = amigos.filter(a => a.estado_conexion !== 'desconectado');
  const amigosOffline = amigos.filter(a => a.estado_conexion === 'desconectado');

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: COLORES.negro, fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${COLORES.azulRD}, ${COLORES.grisOscuro})`, padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button onClick={onVolver} style={{ background: 'none', border: 'none', color: COLORES.blanco, fontSize: 20, cursor: 'pointer' }}>←</button>
          <div style={{ color: COLORES.blanco, fontSize: 20, fontWeight: 'bold' }}>👥 Amigos</div>
          <div style={{ marginLeft: 'auto', backgroundColor: '#1B5E20', padding: '4px 10px', borderRadius: 12 }}>
            <span style={{ color: '#4CAF50', fontSize: 12, fontWeight: 'bold' }}>
              {amigosEnLinea.length} en línea
            </span>
          </div>
        </div>

        {/* Buscador */}
        <input
          placeholder="🔍 Buscar jugadores por nombre..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', marginBottom: 14,
            backgroundColor: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12,
            color: COLORES.blanco, fontSize: 14, outline: 'none', boxSizing: 'border-box'
          }}
        />

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {[
            { id: 'amigos', label: `👥 Amigos (${amigos.length})` },
            { id: 'invitar', label: '📤 Invitar' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setTabActiva(tab.id)} style={{
              flex: 1, padding: '10px 4px', border: 'none', background: 'none',
              borderBottom: tabActiva === tab.id ? `2px solid ${COLORES.oro}` : '2px solid transparent',
              color: tabActiva === tab.id ? COLORES.oro : COLORES.blanco + '60',
              cursor: 'pointer', fontSize: 13, fontWeight: 'bold'
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Resultados de búsqueda */}
        {busqueda.length >= 2 && (
          <div style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
            <div style={{ padding: '10px 16px', color: COLORES.blanco + '60', fontSize: 12 }}>
              RESULTADOS PARA "{busqueda}"
            </div>
            {resultadosBusqueda.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: COLORES.blanco + '40', fontSize: 13 }}>
                No se encontraron jugadores
              </div>
            ) : resultadosBusqueda.map(j => (
              <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: COLORES.grisMedio, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👤</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: COLORES.blanco, fontSize: 14, fontWeight: 'bold' }}>{j.nombre}</div>
                  <div style={{ color: COLORES.blanco + '60', fontSize: 12 }}>🏆 {j.elo} ELO · {j.liga}</div>
                </div>
                <button onClick={() => handleAgregarAmigo(j)} style={{
                  padding: '7px 14px', backgroundColor: COLORES.azulRD,
                  border: 'none', borderRadius: 10, color: COLORES.blanco,
                  fontSize: 12, fontWeight: 'bold', cursor: 'pointer'
                }}>+ Agregar</button>
              </div>
            ))}
          </div>
        )}

        {tabActiva === 'amigos' && (
          <>
            {cargando ? (
              <div style={{ textAlign: 'center', padding: 40, color: COLORES.blanco + '50' }}>⏳ Cargando...</div>
            ) : amigos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
                <div style={{ color: COLORES.blanco, fontSize: 16, marginBottom: 8 }}>Aún no tienes amigos</div>
                <div style={{ color: COLORES.blanco + '50', fontSize: 13 }}>¡Busca jugadores arriba o comparte tu código de invitación!</div>
              </div>
            ) : (
              <>
                {amigosEnLinea.length > 0 && (
                  <>
                    <div style={{ padding: '10px 16px', color: '#4CAF50', fontSize: 12, fontWeight: 'bold' }}>EN LÍNEA ({amigosEnLinea.length})</div>
                    {amigosEnLinea.map(a => <TarjetaAmigo key={a.id} amigo={a} onInvitar={handleInvitar} onVerPerfil={() => {}} />)}
                  </>
                )}
                {amigosOffline.length > 0 && (
                  <>
                    <div style={{ padding: '10px 16px', color: COLORES.blanco + '40', fontSize: 12, fontWeight: 'bold' }}>DESCONECTADOS ({amigosOffline.length})</div>
                    {amigosOffline.map(a => <TarjetaAmigo key={a.id} amigo={a} onInvitar={handleInvitar} onVerPerfil={() => {}} />)}
                  </>
                )}
              </>
            )}
          </>
        )}

        {tabActiva === 'invitar' && codigoReferido && (
          <div style={{ padding: 16 }}>
            <div style={{ backgroundColor: COLORES.grisMedio, borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'center' }}>
              <div style={{ color: COLORES.blanco + '70', fontSize: 12, marginBottom: 8 }}>Tu código personal</div>
              <div style={{ color: COLORES.oro, fontSize: 36, fontWeight: 'bold', letterSpacing: 6, marginBottom: 16 }}>
                {codigoReferido.codigo}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={compartirInvitacion} style={{
                  flex: 1, padding: 13, backgroundColor: '#25D366',
                  color: COLORES.blanco, border: 'none', borderRadius: 14,
                  fontWeight: 'bold', cursor: 'pointer', fontSize: 14
                }}>📤 WhatsApp</button>
                <button onClick={() => { navigator.clipboard?.writeText(codigoReferido.enlace); mostrarExito('¡Enlace copiado!'); }} style={{
                  flex: 1, padding: 13, backgroundColor: '#1877F2',
                  color: COLORES.blanco, border: 'none', borderRadius: 14,
                  fontWeight: 'bold', cursor: 'pointer', fontSize: 14
                }}>📘 Facebook</button>
              </div>
            </div>

            {/* Info de recompensas */}
            <div style={{ backgroundColor: COLORES.grisOscuro, borderRadius: 14, padding: 16 }}>
              <div style={{ color: COLORES.oro, fontSize: 14, fontWeight: 'bold', marginBottom: 12 }}>
                💰 Gana monedas por cada amigo
              </div>
              {[
                { paso: '1', texto: 'Tu amigo descarga Dominó Real RD', icono: '📱' },
                { paso: '2', texto: 'Se registra con tu código', icono: '✍️' },
                { paso: '3', texto: 'Tú ganas +200 monedas', icono: '🪙', color: COLORES.oro },
                { paso: '4', texto: 'Tu amigo recibe +500 monedas de bienvenida', icono: '🎁', color: '#4CAF50' }
              ].map(item => (
                <div key={item.paso} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: COLORES.azulRD, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORES.blanco, fontSize: 12, fontWeight: 'bold', flexShrink: 0 }}>
                    {item.paso}
                  </div>
                  <div style={{ color: item.color || COLORES.blanco + '80', fontSize: 13 }}>
                    {item.icono} {item.texto}
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 12, padding: '10px 14px', backgroundColor: COLORES.grisMedio, borderRadius: 10, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: COLORES.blanco + '60', fontSize: 12 }}>Amigos invitados</span>
                <span style={{ color: COLORES.oro, fontWeight: 'bold' }}>{codigoReferido.referidosActivos || 0} · 🪙 {codigoReferido.gananciasReferidos || 0} ganadas</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {mensajeExito && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          backgroundColor: '#2E7D32', color: COLORES.blanco,
          padding: '12px 24px', borderRadius: 20, fontSize: 13, fontWeight: 'bold',
          zIndex: 2000, maxWidth: '90%', textAlign: 'center'
        }}>✅ {mensajeExito}</div>
      )}
    </div>
  );
};

export default AmigosScreen;
