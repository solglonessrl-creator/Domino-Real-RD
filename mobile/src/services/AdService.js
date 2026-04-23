/**
 * AdService.js — Dominó Real RD
 * ─────────────────────────────────────────────────────────────────
 * Sistema multi-red publicitario con rotación y CONFIG REMOTA.
 *
 * REDES SOPORTADAS:
 *   1. AdMob                     (Google)
 *   2. Facebook Audience Network (Meta)
 *   3. Unity Ads                 (Unity)
 *
 * CLAVE: los IDs se cargan desde el backend (/api/ads/config).
 * Cuando cambies los IDs en Railway (ENV vars) TODAS las apps
 * instaladas los reciben automáticamente — sin recompilar.
 *
 * ROTACIÓN: round-robin entre redes habilitadas. Si una falla,
 * intenta la siguiente. Cada ad se sirve de una red distinta.
 *
 * VIP: 10 000 monedas = 30 días sin anuncios (sin pasarela de pago).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ── Constantes públicas ───────────────────────────────────────────
export const MONEDAS_POR_AD = 75;
export const MAX_ADS_DIA    = 10;
export const COSTO_VIP_MES  = 10_000;

// URL del backend — SAME origin que el resto de la app
const SERVIDOR_URL = 'https://domino-real-rd-production.up.railway.app';

// ── Keys de AsyncStorage ──────────────────────────────────────────
const KEYS = {
  adsHoy:      'domino_ads_hoy',
  vipHasta:    'domino_vip_hasta',
  configCache: 'domino_ads_config',
  redIndex:    'domino_ads_red_idx',   // índice actual de rotación
};

// ── Estado interno ────────────────────────────────────────────────
let cachedConfig = null;

// ── Helper fecha ──────────────────────────────────────────────────
function hoyStr() {
  return new Date().toISOString().split('T')[0];
}

// ─────────────────────────────────────────────────────────────────
const AdService = {

  // ══════════════════════════════════════════════════════════════
  // 1. INIT — carga config remota + inicializa SDKs
  // ══════════════════════════════════════════════════════════════
  async init() {
    try {
      // 1) Intentar config remota (backend)
      cachedConfig = await AdService._cargarConfigRemota();

      // 2) Fallback a cache local si backend no responde
      if (!cachedConfig) {
        const raw = await AsyncStorage.getItem(KEYS.configCache);
        if (raw) cachedConfig = JSON.parse(raw);
      }

      // 3) Fallback a config embebida (solo IDs de prueba)
      if (!cachedConfig) cachedConfig = AdService._configFallback();

      // 4) Inicializar cada SDK habilitado
      await AdService._initAdMob();
      await AdService._initFacebook();
      await AdService._initUnity();

      console.log('[AdService] ✅ Inicializado con redes:', cachedConfig.rotacion);
    } catch (e) {
      console.warn('[AdService] init error:', e?.message);
      cachedConfig = AdService._configFallback();
    }
  },

  async _cargarConfigRemota() {
    try {
      const resp = await fetch(`${SERVIDOR_URL}/api/ads/config`, { timeout: 5000 });
      const data = await resp.json();
      if (data?.ok && data.config) {
        await AsyncStorage.setItem(KEYS.configCache, JSON.stringify(data.config));
        return data.config;
      }
    } catch (e) {
      console.warn('[AdService] No se pudo cargar config remota:', e?.message);
    }
    return null;
  },

  _configFallback() {
    // Solo IDs de prueba — nunca de producción
    return {
      rotacion: ['admob', 'facebook', 'unity'],
      produccion: false,
      version: 'fallback',
      redes: { admob: { habilitada: true }, facebook: { habilitada: true }, unity: { habilitada: true } },
      monedas: { porAd: 75, maxAdsDia: 10, costoVipMes: 10000 },
    };
  },

  // ══════════════════════════════════════════════════════════════
  // 2. INICIALIZACIÓN DE CADA SDK
  // ══════════════════════════════════════════════════════════════
  async _initAdMob() {
    if (!cachedConfig?.redes?.admob?.habilitada) return;
    try {
      const mobileAds = (await import('react-native-google-mobile-ads')).default;
      await mobileAds().initialize();
    } catch (e) { console.warn('[AdMob] no disponible:', e?.message); }
  },

  async _initFacebook() {
    if (!cachedConfig?.redes?.facebook?.habilitada) return;
    try {
      // react-native-fbads se inicializa automáticamente
      // pero podemos setear test devices aquí si es necesario
      const FBAds = await import('react-native-fbads').catch(() => null);
      if (FBAds?.AdSettings?.addTestDevice) {
        // AdSettings.addTestDevice('...');
      }
    } catch (e) { console.warn('[Facebook Ads] no disponible:', e?.message); }
  },

  async _initUnity() {
    if (!cachedConfig?.redes?.unity?.habilitada) return;
    try {
      const UnityAds = (await import('react-native-unity-ads-next')).default;
      const p = Platform.OS === 'ios' ? 'ios' : 'android';
      const gameId   = cachedConfig.redes.unity[p]?.gameId;
      const testMode = cachedConfig.redes.unity[p]?.testMode ?? true;
      if (gameId && UnityAds?.initialize) {
        await UnityAds.initialize(gameId, testMode);
      }
    } catch (e) { console.warn('[Unity Ads] no disponible:', e?.message); }
  },

  // ══════════════════════════════════════════════════════════════
  // 3. ROTACIÓN — elige la próxima red
  // ══════════════════════════════════════════════════════════════
  async _siguienteRed() {
    const redes = (cachedConfig?.rotacion || ['admob'])
      .filter(r => cachedConfig?.redes?.[r]?.habilitada !== false);

    if (redes.length === 0) return 'admob';

    const raw = await AsyncStorage.getItem(KEYS.redIndex);
    const idx = raw ? (parseInt(raw, 10) + 1) % redes.length : 0;
    await AsyncStorage.setItem(KEYS.redIndex, String(idx));

    return redes[idx];
  },

  /** Devuelve los IDs de una red para la plataforma actual, o null si no está configurada */
  _getIds(red) {
    const p = Platform.OS === 'ios' ? 'ios' : 'android';
    const ids = cachedConfig?.redes?.[red]?.[p];
    // Si el backend sanitizó la plataforma a null, devuelve null (no intentar la red)
    return ids || null;
  },

  /** ID del banner para BannerAdComponent (usa AdMob por defecto) */
  getBannerId() {
    // El banner es PASIVO y siempre visible → usamos una sola red
    // (AdMob tiene el mejor banner adaptativo)
    const ids = AdService._getIds('admob');
    return ids.banner || 'ca-app-pub-3940256099942544/6300978111'; // test ID
  },

  // ══════════════════════════════════════════════════════════════
  // 4. INTERSTITIAL — rotación entre 3 redes
  // ══════════════════════════════════════════════════════════════
  async mostrarInterstitial() {
    const esVip = await AdService.esVIP();
    if (esVip) return;

    const redes = (cachedConfig?.rotacion || ['admob']);
    let red = await AdService._siguienteRed();

    // Intentar hasta 3 redes distintas antes de rendirse
    for (let i = 0; i < redes.length; i++) {
      try {
        const ok = await AdService._mostrarInterstitialEn(red);
        if (ok) return;
      } catch (e) { /* probar siguiente */ }
      red = await AdService._siguienteRed();
    }
    console.warn('[AdService] ninguna red pudo mostrar interstitial');
  },

  async _mostrarInterstitialEn(red) {
    const ids = AdService._getIds(red);
    if (!ids) return false;   // red no configurada para esta plataforma

    if (red === 'admob') {
      const { InterstitialAd, AdEventType } = await import('react-native-google-mobile-ads');
      const ad = InterstitialAd.createForAdRequest(ids.interstitial, { requestNonPersonalizedAdsOnly: true });
      await AdService._esperarLoad(ad, AdEventType);
      await ad.show();
      return true;
    }

    if (red === 'facebook') {
      const { InterstitialAdManager } = await import('react-native-fbads');
      await InterstitialAdManager.showAd(ids.interstitial);
      return true;
    }

    if (red === 'unity') {
      const UnityAds = (await import('react-native-unity-ads-next')).default;
      await UnityAds.load(ids.interstitial);
      await UnityAds.show(ids.interstitial);
      return true;
    }

    return false;
  },

  _esperarLoad(ad, AdEventType) {
    return new Promise((resolve, reject) => {
      const u1 = ad.addAdEventListener(AdEventType.LOADED, () => { u1?.(); u2?.(); resolve(); });
      const u2 = ad.addAdEventListener(AdEventType.ERROR,  (err) => { u1?.(); u2?.(); reject(err); });
      ad.load();
      setTimeout(() => { u1?.(); u2?.(); resolve(); }, 8_000);
    });
  },

  // ══════════════════════════════════════════════════════════════
  // 5. REWARDED (+ monedas) — rotación entre 3 redes
  // ══════════════════════════════════════════════════════════════
  /**
   * @param {(monedasGanadas: number) => void} onGano
   */
  async mostrarRewarded(onGano) {
    const adsHoy = await AdService.getAdsHoy();
    if (adsHoy >= MAX_ADS_DIA) {
      console.log('[AdService] Límite diario alcanzado');
      return;
    }

    const redes = (cachedConfig?.rotacion || ['admob']);
    let red = await AdService._siguienteRed();
    let earned = false;

    for (let i = 0; i < redes.length; i++) {
      try {
        earned = await AdService._mostrarRewardedEn(red);
        if (earned) break;
      } catch (e) { /* probar siguiente */ }
      red = await AdService._siguienteRed();
    }

    if (earned) {
      await AdService._incrementarContador();
      if (typeof onGano === 'function') onGano(MONEDAS_POR_AD);
    }
  },

  async _mostrarRewardedEn(red) {
    const ids = AdService._getIds(red);
    if (!ids) return false;   // red no configurada para esta plataforma

    if (red === 'admob') {
      const { RewardedAd, RewardedAdEventType, AdEventType } =
        await import('react-native-google-mobile-ads');
      const ad = RewardedAd.createForAdRequest(ids.rewarded, { requestNonPersonalizedAdsOnly: true });
      await AdService._esperarLoad(ad, AdEventType);

      return new Promise((resolve) => {
        let earned = false;
        ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => { earned = true; });
        ad.addAdEventListener(AdEventType.CLOSED, () => resolve(earned));
        ad.show().catch(() => resolve(false));
      });
    }

    if (red === 'facebook') {
      const { RewardedVideoAdManager } = await import('react-native-fbads');
      // FB Audience Network: showAd devuelve true si el usuario completó el video
      const result = await RewardedVideoAdManager.showAd(ids.rewarded);
      return !!result;
    }

    if (red === 'unity') {
      const UnityAds = (await import('react-native-unity-ads-next')).default;
      await UnityAds.load(ids.rewarded);
      const result = await UnityAds.show(ids.rewarded);
      // Unity devuelve 'COMPLETED' si el usuario vio todo el video
      return result === 'COMPLETED' || result?.state === 'COMPLETED';
    }

    return false;
  },

  // ══════════════════════════════════════════════════════════════
  // 6. CONTADOR DIARIO + VIP
  // ══════════════════════════════════════════════════════════════
  async _incrementarContador() {
    try {
      const raw  = await AsyncStorage.getItem(KEYS.adsHoy);
      const data = raw ? JSON.parse(raw) : null;
      const hoy  = hoyStr();
      const prev = (data && data.fecha === hoy) ? data.count : 0;
      await AsyncStorage.setItem(KEYS.adsHoy, JSON.stringify({ fecha: hoy, count: prev + 1 }));
    } catch {}
  },

  async getAdsHoy() {
    try {
      const raw  = await AsyncStorage.getItem(KEYS.adsHoy);
      const data = raw ? JSON.parse(raw) : null;
      if (!data || data.fecha !== hoyStr()) return 0;
      return data.count;
    } catch { return 0; }
  },

  async esVIP() {
    try {
      const hasta = await AsyncStorage.getItem(KEYS.vipHasta);
      if (!hasta) return false;
      return new Date(hasta) > new Date();
    } catch { return false; }
  },

  async activarVIP(dias = 30) {
    try {
      const diasRestantes = await AdService.diasVIPRestantes();
      const base = diasRestantes > 0
        ? new Date(Date.now() + diasRestantes * 86_400_000)
        : new Date();
      base.setDate(base.getDate() + dias);
      await AsyncStorage.setItem(KEYS.vipHasta, base.toISOString());
      return true;
    } catch { return false; }
  },

  async diasVIPRestantes() {
    try {
      const hasta = await AsyncStorage.getItem(KEYS.vipHasta);
      if (!hasta) return 0;
      const diff = new Date(hasta) - new Date();
      return diff > 0 ? Math.ceil(diff / 86_400_000) : 0;
    } catch { return 0; }
  },
};

export default AdService;
