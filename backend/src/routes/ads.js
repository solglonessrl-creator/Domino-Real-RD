/**
 * ads.js — Dominó Real RD
 * ────────────────────────
 * Config REMOTA de redes publicitarias.
 * La app lee este endpoint al iniciar y cachea los IDs.
 * Ventaja: cambias los IDs aquí (ENV vars en Railway) y TODAS
 * las apps instaladas los reciben automáticamente sin recompilar.
 *
 * Redes soportadas:
 *   1. AdMob               (Google)
 *   2. Facebook Audience Network
 *   3. Unity Ads
 */

const express = require('express');
const router  = express.Router();

// ── CONFIG DE REDES PUBLICITARIAS ──────────────────────────────
// Todos estos valores se leen de ENV vars en Railway.
// Mientras no existan, se devuelven IDs de prueba oficiales.
function getConfig() {
  const isProd = process.env.ADS_PRODUCTION === 'true';

  return {
    // Qué redes están habilitadas y su peso de rotación
    // Si una red falla, la app salta a la siguiente automáticamente
    rotacion: (process.env.ADS_ROTACION || 'admob,facebook,unity').split(','),

    // Si es false, la app usa IDs de prueba (ideal durante desarrollo)
    produccion: isProd,

    // Versión de la config — si la app cacheó una versión vieja, refetch
    version: process.env.ADS_VERSION || '1',

    redes: {
      admob: {
        habilitada: process.env.ADMOB_ENABLED !== 'false',
        android: {
          appId:        process.env.ADMOB_ANDROID_APP_ID        || 'ca-app-pub-3940256099942544~3347511713',
          banner:       process.env.ADMOB_ANDROID_BANNER        || 'ca-app-pub-3940256099942544/6300978111',
          interstitial: process.env.ADMOB_ANDROID_INTERSTITIAL  || 'ca-app-pub-3940256099942544/1033173712',
          rewarded:     process.env.ADMOB_ANDROID_REWARDED      || 'ca-app-pub-3940256099942544/5224354917',
        },
        ios: {
          appId:        process.env.ADMOB_IOS_APP_ID            || 'ca-app-pub-3940256099942544~1458002511',
          banner:       process.env.ADMOB_IOS_BANNER            || 'ca-app-pub-3940256099942544/2934735716',
          interstitial: process.env.ADMOB_IOS_INTERSTITIAL      || 'ca-app-pub-3940256099942544/4411468910',
          rewarded:     process.env.ADMOB_IOS_REWARDED          || 'ca-app-pub-3940256099942544/1712485313',
        },
      },

      facebook: {
        habilitada: process.env.FB_ADS_ENABLED !== 'false',
        // Facebook Audience Network usa formato: ACCOUNT_ID_PLACEMENT_ID
        // Si no tienes IDs reales, puedes usar estos de prueba anteponiendo IMG_16_9_APP_INSTALL#
        android: {
          banner:       process.env.FB_ANDROID_BANNER       || 'IMG_16_9_APP_INSTALL#YOUR_PLACEMENT_ID',
          interstitial: process.env.FB_ANDROID_INTERSTITIAL || 'IMG_16_9_APP_INSTALL#YOUR_PLACEMENT_ID',
          rewarded:     process.env.FB_ANDROID_REWARDED     || 'VID_HD_16_9_46S_APP_INSTALL#YOUR_PLACEMENT_ID',
        },
        ios: {
          banner:       process.env.FB_IOS_BANNER           || 'IMG_16_9_APP_INSTALL#YOUR_PLACEMENT_ID',
          interstitial: process.env.FB_IOS_INTERSTITIAL     || 'IMG_16_9_APP_INSTALL#YOUR_PLACEMENT_ID',
          rewarded:     process.env.FB_IOS_REWARDED         || 'VID_HD_16_9_46S_APP_INSTALL#YOUR_PLACEMENT_ID',
        },
      },

      unity: {
        habilitada: process.env.UNITY_ADS_ENABLED !== 'false',
        // Unity usa un "Game ID" por plataforma y "Placement IDs" (strings)
        android: {
          gameId:       process.env.UNITY_ANDROID_GAME_ID       || '5678910',  // test
          banner:       process.env.UNITY_ANDROID_BANNER        || 'Banner_Android',
          interstitial: process.env.UNITY_ANDROID_INTERSTITIAL  || 'Interstitial_Android',
          rewarded:     process.env.UNITY_ANDROID_REWARDED      || 'Rewarded_Android',
          testMode:     process.env.UNITY_ANDROID_TEST !== 'false',
        },
        ios: {
          gameId:       process.env.UNITY_IOS_GAME_ID           || '5678911',  // test
          banner:       process.env.UNITY_IOS_BANNER            || 'Banner_iOS',
          interstitial: process.env.UNITY_IOS_INTERSTITIAL      || 'Interstitial_iOS',
          rewarded:     process.env.UNITY_IOS_REWARDED          || 'Rewarded_iOS',
          testMode:     process.env.UNITY_IOS_TEST !== 'false',
        },
      },
    },

    // Parámetros globales de monetización
    monedas: {
      porAd:       parseInt(process.env.MONEDAS_POR_AD || '75', 10),
      maxAdsDia:   parseInt(process.env.MAX_ADS_DIA    || '10', 10),
      costoVipMes: parseInt(process.env.COSTO_VIP_MES  || '10000', 10),
    },
  };
}

// ── GET /api/ads/config ────────────────────────────────────────
// Respuesta pública; no requiere token (los IDs de ads no son secretos)
router.get('/config', (_req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');  // cache 5 min
    res.json({ ok: true, config: getConfig() });
  } catch (e) {
    console.error('[ads] config error:', e);
    res.status(500).json({ ok: false, error: 'config_error' });
  }
});

module.exports = router;
