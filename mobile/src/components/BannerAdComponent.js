/**
 * BannerAdComponent.js — Dominó Real RD
 * Banner de AdMob que se oculta automáticamente para usuarios VIP
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import AdService from '../services/AdService';

export default function BannerAdComponent({ style }) {
  const [esVIP,   setEsVIP]   = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    AdService.esVIP().then(vip => {
      setEsVIP(vip);
      if (!vip) setVisible(true);
    });
  }, []);

  // Los VIP no ven anuncios
  if (esVIP || !visible) return null;

  return (
    <View style={[estilos.contenedor, style]}>
      <BannerAd
        unitId={AdService.getBannerId()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdLoaded={()   => setVisible(true)}
        onAdFailedToLoad={() => setVisible(false)}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    width: '100%',
  },
});
