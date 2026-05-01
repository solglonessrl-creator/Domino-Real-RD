/**
 * Domino Real RD — Pantalla de Tienda
 * Mesas, fichas, avatares, VIP, paquetes de monedas
 */

import React, { useState, useEffect } from 'react';
import { TiendaAPI } from '../services/socket';

const COLORES = {
  azulRD: '#002D62', rojoRD: '#CF142B', blanco: '#FFFFFF',
  oro: '#FFD700', negro: '#0A0A0A', grisOscuro: '#1A1A2E', grisMedio: '#2C2C54'
};

const CATEGORIAS = [
  { id: 'mesas',          nombre: 'Mesas',    icono: '🟩' },
  { id: 'fichas',         nombre: 'Fichas',   icono: '🀱' },
  { id: 'avatares',       nombre: 'Avatares', icono: '👤' },
  { id: 'emojis_paquetes',nombre: 'Emojis',  icono: '😎' },
  { id: 'vip',            nombre: 'VIP',      icono: '💎' },
  { id: 'paquetes_monedas',nombre: 'Monedas', icono: '🪙' }
];

const CATALOGO_FALLBACK = {
  mesas: [
    { id: 'mesa_clasica', nombre: 'Mesa Clásica', descripcion: 'Mesa verde tradicional dominicana', precio: 0, moneda: 'gratis', bgPreview: 'linear-gradient(to bottom, #1B5E20, #003300)', iconPreview: '🟩' },
    { id: 'mesa_rd', nombre: 'Mesa Bandera RD', descripcion: 'Azul, rojo y blanco. Orgullo dominicano', precio: 1500, moneda: 'coins', bgPreview: 'linear-gradient(135deg, #002D62 33%, #FFFFFF 33%, #FFFFFF 66%, #CF142B 66%)', iconPreview: '🇩🇴' },
    { id: 'mesa_diamante', nombre: 'Mesa Diamante', descripcion: 'Para los maestros', precio: 5000, moneda: 'coins', exclusivaTorneo: true, bgPreview: 'linear-gradient(135deg, #1A237E, #3949AB)', iconPreview: '💎' }
  ],
  fichas: [
    { id: 'fichas_clasicas', nombre: 'Fichas Clásicas', descripcion: 'Marfil tradicional', precio: 0, moneda: 'gratis', bgPreview: 'linear-gradient(135deg, #EEEEEE, #FFFFFF)', iconPreview: '🁣', colorPreview: '#111' },
    { id: 'fichas_negras', nombre: 'Fichas Negras', descripcion: 'Elegantes fichas negras', precio: 1000, moneda: 'coins', bgPreview: 'linear-gradient(135deg, #424242, #0A0A0A)', iconPreview: '🁣', colorPreview: '#FFF' },
    { id: 'fichas_diamante', nombre: 'Fichas Diamante', descripcion: 'Fichas brillantes de torneo', precio: 3500, moneda: 'coins', bgPreview: 'linear-gradient(135deg, #E0F7FA, #80DEEA)', iconPreview: '🁣', colorPreview: '#006064' }
  ],
  avatares: [
    { id: 'avatar_default', nombre: 'Avatar Básico', precio: 0, moneda: 'gratis', iconPreview: '👤', bgPreview: 'linear-gradient(to bottom, #333, #111)' },
    { id: 'avatar_rd', nombre: 'Orgullo Dominicano', descripcion: 'Sangre de campeón', precio: 1500, moneda: 'coins', iconPreview: '🤴🏽', bgPreview: 'linear-gradient(135deg, #002D62 50%, #CF142B 50%)' },
    { id: 'avatar_rey', nombre: 'El Patrón', descripcion: 'El rey de la mesa', precio: 5000, moneda: 'coins', iconPreview: '👑', bgPreview: 'radial-gradient(circle, #FFD700, #F57F17)' }
  ],
  vip: {
    id: 'vip_mensual', nombre: 'VIP Dominó Real RD', precio: 4.99, moneda: 'usd', duracion: '1 mes',
    beneficios: ['Sin anuncios', 'Mesa VIP Exclusiva', '+20% monedas por partida'],
    iconPreview: '🌟', bgPreview: 'linear-gradient(45deg, #FFD700, #FFA000)'
  },
  paquetes_monedas: [
    { id: 'pack_100', monedas: 100, precio: 0.99, bonus: 0, iconPreview: '🪙', bgPreview: 'linear-gradient(135deg, #2C2C54, #1A1A2E)' },
    { id: 'pack_5000', monedas: 5000, precio: 24.99, bonus: 1000, etiqueta: '🔥 Más Popular', iconPreview: '💰', bgPreview: 'linear-gradient(135deg, #4CAF50, #1B5E20)' }
  ]
};

const ItemTienda = ({ item, onComprar, tengo }) => {
  const esGratis = item.precio === 0 || item.moneda === 'gratis';
  const esExclusivo = item.moneda === 'exclusivo_torneo';
  const esDineroReal = item.moneda === 'usd';

  let etiquetaPrecio;
  if (esExclusivo) etiquetaPrecio = '🏆 Exclusivo torneo';
  else if (esGratis) etiquetaPrecio = 'GRATIS';
  else if (esDineroReal) etiquetaPrecio = `$${item.precio}`;
  else etiquetaPrecio = `🪙 ${item.precio?.toLocaleString()}`;

  return (
    <div style={{
      backgroundColor: COLORES.grisMedio,
      borderRadius: 16,
      overflow: 'hidden',
      border: item.exclusivaTorneo ? `2px solid ${COLORES.oro}` : '1px solid rgba(255,255,255,0.1)',
      position: 'relative'
    }}>
      {/* Badge */}
      {item.etiqueta && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          backgroundColor: COLORES.rojoRD,
          color: COLORES.blanco, fontSize: 10, fontWeight: 'bold',
          padding: '2px 8px', borderRadius: 10
        }}>
          {item.etiqueta}
        </div>
      )}

      {/* Preview */}
      <div style={{
        height: 120,
        background: item.bgPreview || `linear-gradient(135deg, ${COLORES.grisOscuro}, ${COLORES.grisMedio})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 64, color: item.colorPreview || COLORES.blanco,
        textShadow: item.bgPreview ? '0px 4px 12px rgba(0,0,0,0.4)' : 'none',
        boxShadow: 'inset 0 -10px 20px rgba(0,0,0,0.3)'
      }}>
        {item.iconPreview || item.icono || '🁣'}
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ color: COLORES.blanco, fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>
          {item.nombre}
        </div>
        {item.descripcion && (
          <div style={{ color: COLORES.blanco + '60', fontSize: 11, marginBottom: 10 }}>
            {item.descripcion}
          </div>
        )}

        {/* Beneficios VIP */}
        {item.beneficios && (
          <div style={{ marginBottom: 10 }}>
            {item.beneficios.slice(0, 3).map((b, i) => (
              <div key={i} style={{ color: COLORES.blanco + '80', fontSize: 11, marginBottom: 2 }}>
                {b}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            color: esGratis ? '#4CAF50' : esDineroReal ? COLORES.blanco : COLORES.oro,
            fontSize: 15, fontWeight: 'bold'
          }}>
            {etiquetaPrecio}
            {item.bonus > 0 && (
              <span style={{ color: '#4CAF50', fontSize: 11, marginLeft: 4 }}>
                +{item.bonus} extra
              </span>
            )}
          </div>

          <button
            onClick={() => !tengo && !esExclusivo && onComprar(item)}
            disabled={tengo || esExclusivo}
            style={{
              padding: '7px 16px',
              backgroundColor: tengo ? '#2E7D32' : esExclusivo ? COLORES.grisOscuro : esDineroReal ? COLORES.rojoRD : COLORES.azulRD,
              color: COLORES.blanco,
              border: 'none', borderRadius: 20,
              fontSize: 12, fontWeight: 'bold',
              cursor: tengo || esExclusivo ? 'default' : 'pointer',
              opacity: esExclusivo ? 0.6 : 1
            }}
          >
            {tengo ? '✅ Tengo' : esExclusivo ? '🔒 Torneo' : esGratis ? 'Activar' : 'Comprar'}
          </button>
        </div>
      </div>
    </div>
  );
};

const TiendaScreen = ({ jugador, onVolver }) => {
  const [categoriaActiva, setCategoriaActiva] = useState('mesas');
  const [catalogo, setCatalogo] = useState(null);
  const [monedas, setMonedas] = useState(jugador?.monedas || 0);
  const [cargando, setCargando] = useState(true);
  const [modalConfirma, setModalConfirma] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  useEffect(() => {
    cargarCatalogo();
  }, []);

  const cargarCatalogo = async () => {
    try {
      const resp = await TiendaAPI.catalogo();
      setCatalogo(resp.catalogo || CATALOGO_FALLBACK);
    } catch (err) {
      console.error('Error cargando tienda:', err);
      setCatalogo(CATALOGO_FALLBACK);
    } finally {
      setCargando(false);
    }
  };

  const handleComprar = (item) => {
    setModalConfirma(item);
  };

  const confirmarCompra = async () => {
    if (!modalConfirma) return;
    try {
      const resp = await TiendaAPI.comprar(modalConfirma.id, categoriaActiva);
      setMensajeExito(resp.mensaje);
      setModalConfirma(null);
      setTimeout(() => setMensajeExito(null), 3000);
    } catch (err) {
      alert('Error al comprar: ' + err.message);
    }
  };

  const itemsActivos = catalogo ? (
    categoriaActiva === 'vip' ? [catalogo.vip] : (catalogo[categoriaActiva] || [])
  ) : [];

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      backgroundColor: COLORES.negro, fontFamily: "'Segoe UI', sans-serif"
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, #E65100, #FF6D00)`,
        padding: '16px 20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button onClick={onVolver} style={{ background: 'none', border: 'none', color: COLORES.blanco, fontSize: 20, cursor: 'pointer' }}>
            ←
          </button>
          <div style={{ color: COLORES.blanco, fontSize: 20, fontWeight: 'bold' }}>
            🛒 Tienda
          </div>
          <div style={{ marginLeft: 'auto', backgroundColor: 'rgba(0,0,0,0.3)', padding: '6px 14px', borderRadius: 20 }}>
            <span style={{ color: COLORES.oro, fontWeight: 'bold' }}>🪙 {monedas.toLocaleString()}</span>
          </div>
        </div>

        {/* Bono diario */}
        <button
          onClick={async () => {
            try {
              const resp = await TiendaAPI.reclamarBono(jugador?.id);
              setMensajeExito(resp.mensaje);
              setMonedas(prev => prev + resp.monedasGanadas);
            } catch (err) { alert(err.message); }
          }}
          style={{
            width: '100%', padding: '10px', backgroundColor: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12,
            color: COLORES.blanco, fontSize: 13, cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}
        >
          <span>🎁 ¡Bono diario disponible!</span>
          <span style={{ color: COLORES.oro, fontWeight: 'bold' }}>Reclamar →</span>
        </button>
      </div>

      {/* Tabs de categorías */}
      <div style={{
        display: 'flex', overflowX: 'auto',
        backgroundColor: COLORES.grisOscuro,
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        {CATEGORIAS.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoriaActiva(cat.id)}
            style={{
              padding: '12px 16px',
              border: 'none', background: 'none',
              borderBottom: categoriaActiva === cat.id ? `3px solid ${COLORES.oro}` : '3px solid transparent',
              color: categoriaActiva === cat.id ? COLORES.oro : COLORES.blanco + '70',
              cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 'bold'
            }}
          >
            {cat.icono} {cat.nombre}
          </button>
        ))}
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {cargando ? (
          <div style={{ textAlign: 'center', padding: 40, color: COLORES.blanco + '60' }}>
            ⏳ Cargando tienda...
          </div>
        ) : (
          <>
            {/* Sección especial: paquetes de monedas */}
            {categoriaActiva === 'paquetes_monedas' && (
              <div>
                <div style={{ color: COLORES.blanco + '60', fontSize: 12, marginBottom: 12, letterSpacing: 1 }}>
                  VER ANUNCIO Y GANAR MONEDAS GRATIS
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                  {[
                    { tipo: 'video_corto', label: '📺 Video Corto', monedas: 25 },
                    { tipo: 'video_largo', label: '🎬 Video Largo', monedas: 50 }
                  ].map(ad => (
                    <button
                      key={ad.tipo}
                      onClick={async () => {
                        const resp = await TiendaAPI.verAd(ad.tipo);
                        setMensajeExito(resp.mensaje);
                        setMonedas(resp.totalMonedas);
                      }}
                      style={{
                        flex: 1, padding: '12px', backgroundColor: '#1B5E20',
                        border: '1px solid #4CAF50', borderRadius: 12,
                        color: COLORES.blanco, cursor: 'pointer', fontSize: 13
                      }}
                    >
                      {ad.label}<br />
                      <span style={{ color: COLORES.oro, fontWeight: 'bold' }}>+{ad.monedas} 🪙</span>
                    </button>
                  ))}
                </div>
                <div style={{ color: COLORES.blanco + '60', fontSize: 12, marginBottom: 12, letterSpacing: 1 }}>
                  COMPRAR MONEDAS
                </div>
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: categoriaActiva === 'paquetes_monedas' ? '1fr' : '1fr 1fr',
              gap: 12
            }}>
              {itemsActivos.map((item, idx) => (
                <ItemTienda
                  key={item.id || idx}
                  item={item}
                  tengo={false}
                  onComprar={handleComprar}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal de confirmación */}
      {modalConfirma && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24
        }}>
          <div style={{
            backgroundColor: COLORES.grisMedio, borderRadius: 20,
            padding: 24, maxWidth: 320, width: '100%', textAlign: 'center'
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
            <div style={{ color: COLORES.blanco, fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
              ¿Confirmar compra?
            </div>
            <div style={{ color: COLORES.blanco + '80', fontSize: 14, marginBottom: 20 }}>
              {modalConfirma.nombre}
              <br />
              <span style={{ color: COLORES.oro, fontWeight: 'bold', fontSize: 18 }}>
                {modalConfirma.moneda === 'usd' ? `$${modalConfirma.precio}` : `🪙 ${modalConfirma.precio?.toLocaleString()}`}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setModalConfirma(null)}
                style={{
                  flex: 1, padding: 12, backgroundColor: COLORES.grisOscuro,
                  color: COLORES.blanco, border: 'none', borderRadius: 12, cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarCompra}
                style={{
                  flex: 1, padding: 12, backgroundColor: COLORES.azulRD,
                  color: COLORES.blanco, border: 'none', borderRadius: 12,
                  fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                ¡Comprar!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de éxito */}
      {mensajeExito && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          backgroundColor: '#2E7D32', color: COLORES.blanco,
          padding: '12px 24px', borderRadius: 20, fontSize: 14, fontWeight: 'bold',
          zIndex: 2000, boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          ✅ {mensajeExito}
        </div>
      )}
    </div>
  );
};

export default TiendaScreen;
