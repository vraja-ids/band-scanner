/**
 * PowerBall Component
 * Visual representation of tray quantities with colored circles
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DashboardItem, getItemColor } from '../types/dashboard.types';

interface PowerBallProps {
  item: DashboardItem;
  quantity: number;
  size?: number;
  showZero?: boolean;
  compact?: boolean;
}

export const PowerBall: React.FC<PowerBallProps> = memo(
  ({ item, quantity, size = 60, showZero = false, compact = false }) => {
    const color = getItemColor(item);
    const isLow = quantity > 0 && quantity <= item.low_qty_threshold;

    if (!showZero && quantity === 0) {
      return <View style={{ width: size, height: size }} />;
    }

    if (compact) {
      return (
        <View style={[styles.compactContainer, { borderColor: color }]}>
          <View style={[styles.compactBall, { backgroundColor: color }]}>
            <Text style={[styles.compactText, { color: '#000' }]}>{quantity}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.container, { width: size, height: size, borderColor: isLow ? '#C62828' : color }]}>
        <View style={[styles.ball, { backgroundColor: color }]}>
          <Text style={styles.quantity}>{quantity}</Text>
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
    width: 40,
    height: 40,
    borderWidth: 2,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactBall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
