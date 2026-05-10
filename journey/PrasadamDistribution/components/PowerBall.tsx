/**
 * PowerBall Component
 * Visual representation of tray quantities with attractive gradient spheres
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DashboardItem, getItemColor } from '../types/dashboard.types';

interface PowerBallProps {
  item: DashboardItem;
  quantity: number;
  size?: number;
  showZero?: boolean;
  compact?: boolean;
  loading?: boolean;
  showStored?: number; // Show small badge for quantity moved to Stored
  overrideColor?: string; // Override item color (for percentages, etc.)
  overrideTextColor?: string; // Override text color
  suffix?: string; // Text to show after quantity (e.g., "%")
}

// Helper to lighten a color for gradient
function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}

// Helper to darken a color for gradient
function darkenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  return '#' + (
    0x1000000 +
    (R > 0 ? (R > 255 ? 255 : R) : 0) * 0x10000 +
    (G > 0 ? (G > 255 ? 255 : G) : 0) * 0x100 +
    (B > 0 ? (B > 255 ? 255 : B) : 0)
  ).toString(16).slice(1);
}

// Shine overlay component with radial gradient effect
const ShineOverlay: React.FC<{ size: number }> = ({ size }) => (
  <LinearGradient
    colors={[
      'rgba(255, 255, 255, 0.6)',
      'rgba(255, 255, 255, 0.25)',
      'rgba(255, 255, 255, 0.05)',
      'transparent',
    ]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[
      styles.shineOverlay,
      {
        width: size * 0.65,
        height: size * 0.4,
        borderRadius: (size * 0.65) / 2,
      }
    ]}
    pointerEvents="none"
  />
);

export const PowerBall: React.FC<PowerBallProps> = memo(
  ({ item, quantity, size = 60, showZero = false, compact = false, loading = false, showStored, overrideColor, overrideTextColor, suffix }) => {
    const color = overrideColor || getItemColor(item);
    // LOW INVENTORY WARNING (disabled for now)
    // Uncomment to enable red warning when quantity is at or below threshold
    // const isLow = quantity > 0 && quantity <= item.low_qty_threshold;

    if (!showZero && quantity === 0 && !loading) {
      return <View style={{ width: size, height: size }} />;
    }

    const compactSize = size;
    const ballSize = Math.floor(compactSize * 0.9);
    const fontSize = Math.max(12, Math.floor(ballSize * 0.38));

    if (loading) {
      return (
        <View style={[styles.compactContainer, { width: compactSize, height: compactSize }]}>
          <ActivityIndicator size="small" color="#5dbea3" />
        </View>
      );
    }

    if (compact) {
      // Use normal color (warning disabled)
      // To re-enable: const baseColor = isLow ? '#ef5350' : color;
      const baseColor = color;
      const lightColor = lightenColor(baseColor, 40);
      const midColor = lightenColor(baseColor, 10);
      const darkColor = darkenColor(baseColor, 15);

      return (
        <View style={[styles.compactContainer, { width: compactSize, height: compactSize }]}>
          <View style={[styles.compactBall, { width: ballSize, height: ballSize, borderRadius: ballSize / 2 }]}>
            {/* Main gradient */}
            <LinearGradient
              colors={[lightColor, midColor, baseColor, darkColor]}
              start={{ x: 0.2, y: 0.1 }}
              end={{ x: 0.8, y: 0.9 }}
              style={styles.gradientFill}
            />

            {/* Top-left ambient light glow */}
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.3)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.5, y: 0.5 }}
              style={styles.ambientGlow}
            />

            {/* Specular shine */}
            <ShineOverlay size={ballSize} />

            {/* Number */}
            <View style={styles.numberContainer}>
              <Text
                style={[styles.compactText, { fontSize, color: overrideTextColor || '#FFF' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {quantity}{suffix}
              </Text>
            </View>
          </View>

          {showStored !== undefined && showStored > 0 && (
            <View style={styles.storedBadge}>
              <Text style={styles.storedBadgeText}>{showStored}</Text>
            </View>
          )}
        </View>
      );
    }

    // Non-compact version
    // Use normal color (warning disabled)
    // To re-enable: const baseColor = isLow ? '#ef5350' : color;
    const baseColor = color;
    const lightColor = lightenColor(baseColor, 40);
    const midColor = lightenColor(baseColor, 10);
    const darkColor = darkenColor(baseColor, 15);

    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <View style={[styles.ball, { borderRadius: size / 2 }]}>
          <LinearGradient
            colors={[lightColor, midColor, baseColor, darkColor]}
            start={{ x: 0.2, y: 0.1 }}
            end={{ x: 0.8, y: 0.9 }}
            style={styles.gradientFill}
          />

          <LinearGradient
            colors={['rgba(255, 255, 255, 0.3)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 0.5 }}
            style={styles.ambientGlow}
          />

          <ShineOverlay size={size} />

          <View style={styles.numberContainer}>
            <Text style={[styles.quantity, { fontSize: size * 0.32 }]}>{quantity}{suffix}</Text>
          </View>
        </View>
        {/* LOW INDICATOR (disabled for now) - uncomment to re-enable */}
        {/* {isLow && <View style={styles.lowIndicator} />} */}
      </View>
    );
  }
);

PowerBall.displayName = 'PowerBall';

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ball: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  gradientFill: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  ambientGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  shineOverlay: {
    position: 'absolute',
    top: '5%',
    left: '8%',
  },
  quantity: {
    fontWeight: '800',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // LOW INDICATOR STYLE (disabled for now)
  lowIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#C62828',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  numberContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  compactContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactBall: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  compactText: {
    fontWeight: '800',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  storedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#5D4037',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  storedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
  },
});
