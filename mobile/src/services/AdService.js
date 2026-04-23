/**
 * AdService.js — Dominó Real RD
 * ─────────────────────────────
 * Gestión centralizada de AdMob:
 *   • Banner       → BannerAdComponent
 *   • Interstitial → entre partidas
 *   • Rewarded     → ver anuncio = +75 monedas
 * VIP: 10 000 monedas = 30 días sin anuncios (sin pasarela de pago)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

// ── Cambiar a true cuando la app esté aprobada en AdMob ──────────
const IS_PROD = false;

// ── Monedas y límites ─────────────────────────────────────────────
export const MONEDAS_POR_AD = 75;
export const MAX_ADS_DIA    = 10;
export const COSTO_VIP_MES  = 10_000;   // monedas para 30 días VIP

// ── IDs de AdMob ──────────────────────────────────────────────────
// Reemplazar con los reales antes de lanzar a producción:
// https://apps.admob.com → tu app → Unidades de anuncio
const IDS = {
  banner:       IS_PROD ? 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX' : TestIds.BANNER,
  interstitial: IS_PROD ? 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX' : TestIds.INTERSTITIAL,
  rewarded:     IS_PROD ? 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX' : TestIds.REWARDED,
};
export const AD_IDS = IDS;

// ── Keys de AsyncStorage ──────────────────────────────────────────
const KEYS = {
  adsHoy:   'domino_ads_hoy',    // { fecha: 'YYYY-MM-DD', count: N }
  vipHasta: 'domino_vip_hasta',  // ISO date string
};

// ── Helper fecha ──────────────────────────────────────────────────
function hoyStr() {
  return new Date().toISOString().split('T')[0];
}

// ─────────────────────────────────────────────────────────────────
const AdService = {

  /** Inicializar AdMob al arrancar la app */
  async init() {
    try {
      const mobileAds = (await import('react-native-google-mobile-ads')).default;
      await mobileAds().initialize();
      console.log('[AdService] AdMob inicializado ✅');
    } catch (e) {
      console.warn('[AdService] init error:', e?.message);
    }
  },

  /** ID del banner para BannerAdComponent */
  getBannerId() {
    return IDS.banner;
  },

  // ── Interstitial ─────────────────────────────────────────────
  async mostrarInterstitial() {
    try {
      const ad = InterstitialAd.createForAdRequest(IDS.interstitial, {
        requestNonPersonalizedAdsOnly: true,
      });

      await new Promise((resolve, reject) => {
        const unsubLoad  = ad.addAdEventListener(AdEventType.LOADED, resolve);
        const unsubError = ad.addAdEventListener(AdEventType.ERROR,  reject);
        ad.load();
        // Timeout 8 s — si no carga, continuar sin bloquear
        setTimeout(() => { unsubLoad(); unsubError(); resolve(); }, 8_000);
      });

      await ad.show();
    } catch (e) {
      console.warn('[AdService] interstitial:', e?.message);
    }
  },

  // ── Rewarded (+monedas) ──────────────────────────────────────
  /**
   * @param {(monedasGanadas: number) => void} onGano
   */
  async mostrarRewarded(onGano) {
    try {
      const adsHoy = await AdService.getAdsHoy();
      if (adsHoy >= MAX_ADS_DIA) {
        console.log('[AdService] Límite diario alcanzado');
        return;
      }

      const ad = RewardedAd.createForAdRequest(IDS.rewarded, {
        requestNonPersonalizedAdsOnly: true,
      });

      await new Promise((resolve, reject) => {
        const unsubLoad  = ad.addAdEventListener(RewardedAdEventType.LOADED, resolve);
        const unsubError = ad.addAdEventListener(AdEventType.ERROR, reject);
        ad.load();
        setTimeout(() => { unsubLoad(); unsubError(); resolve(); }, 10_000);
      });

      let earned = false;

      await new Promise((resolve) => {
        const unsubReward = ad.addAdEventListener(
          RewardedAdEventType.EARNED_REWARD,
          () => { earned = true; }
        );
        ad.addAdEventListener(AdEventType.CLOSED, () => {
          unsubReward();
          resolve();
        });
        ad.show().catch(resolve);
      });

      if (earned) {
        await AdService._incrementarContador();
        if (typeof onGano === 'function') onGano(MONEDAS_POR_AD);
      }
    } catch (e) {
      console.warn('[AdService] rewarded:', e?.message);
    }
  },

  // ── Contador diario ───────────────────────────────────────────
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

  // ── VIP ───────────────────────────────────────────────────────
  async esVIP() {
    try {
      const hasta = await AsyncStorage.getItem(KEYS.vipHasta);
      if (!hasta) return false;
      return new Date(hasta) > new Date();
    } catch { return false; }
  },

  /**
   * Activa/extiende VIP por N días
   * @param {number} dias
   */
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
