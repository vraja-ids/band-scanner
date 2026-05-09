/**
 * PowerBall Component
 * Visual representation of tray quantities with colored circles
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
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

export const PowerBall: React.FC<PowerBallProps> = memo(
  ({ item, quantity, size = 60, showZero = false, compact = false, loading = false, showStored, overrideColor, overrideTextColor, suffix }) => {
    const color = overrideColor || getItemColor(item);
    const isLow = quantity > 0 && quantity <= item.low_qty_threshold;

    if (!showZero && quantity === 0 && !loading) {
      return <View style={{ width: size, height: size }} />;
    }

    // Calculate compact size - scale ball size proportionally to container
    // Use more of the available space for better visibility
    const compactSize = size;
    const ballSize = Math.floor(compactSize * 0.8); // 80% of container
    // Adjust font size smaller when suffix is present (e.g., "%")
    const fontSize = Math.max(10, Math.floor(ballSize * (suffix ? 0.35 : 0.45))); // Scale font with ball size

    if (loading) {
      // Show loading spinner
      return (
        <View style={[styles.compactContainer, { width: compactSize, height: compactSize, borderColor: '#ddd' }]}>
          <ActivityIndicator size="small" color="#5dbea3" />
        </View>
      );
    }

    if (compact) {
      return (
        <View style={[styles.compactContainer, { width: compactSize, height: compactSize, borderColor: color }]}>
          <View style={[styles.compactBall, { width: ballSize, height: ballSize, borderRadius: ballSize / 2, backgroundColor: color }]}>
            <Text
              style={[styles.compactText, { fontSize, color: overrideTextColor || '#000' }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {quantity}{suffix}
            </Text>
          </View>
          {/* Show small badge for Stored quantity */}
          {showStored !== undefined && showStored > 0 && (
            <View style={styles.storedBadge}>
              <Text style={styles.storedBadgeText}>{showStored}</Text>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={[styles.container, { width: size, height: size, borderColor: isLow ? '#C62828' : color }]}>
        <View style={[styles.ball, { backgroundColor: color }]}>
          <Text style={styles.quantity}>{quantity}{suffix}</Text>
        </View>
        {isLow && <View style={styles.lowIndicator} />}
      </View>
    );
  }
);

PowerBall.displayName = 'PowerBall';

const styles = StyleSheet.create({
  container: {
    borderWidth: 3,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ball: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  lowIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#C62828',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  compactContainer: {
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactBall: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactText: {
    fontWeight: '600',
  },
  storedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#5D4037',
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  storedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFF',
  },
});
