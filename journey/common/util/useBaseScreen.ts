import { useEffect, useState, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { log } from '../../../network/logger';
import React from 'react';

export interface UseBaseScreenOptions {
  screenName?: string;
  enableLogging?: boolean;
}

export function useBaseScreen(options: UseBaseScreenOptions = {}) {
  const { screenName = 'UnknownScreen', enableLogging = true } = options;
  const [isVisible, setIsVisible] = useState(false);
  const mountedRef = useRef(false);

  // Component lifecycle logging
  useEffect(() => {
    if (enableLogging) {
      log(`[${screenName}] Component mounted`);
    }
    mountedRef.current = true;

    return () => {
      if (enableLogging) {
        log(`[${screenName}] Component will unmount`);
      }
      mountedRef.current = false;
    };
  }, [screenName, enableLogging]);

  // Screen focus/blur logging
  useFocusEffect(
    React.useCallback(() => {
      if (enableLogging) {
        log(`[${screenName}] Screen appeared`);
      }
      setIsVisible(true);

      return () => {
        if (enableLogging) {
          log(`[${screenName}] Screen disappeared`);
        }
        setIsVisible(false);
      };
    }, [screenName, enableLogging])
  );

  // Helper methods
  const logAction = (action: string, data?: any) => {
    if (enableLogging) {
      log(`[${screenName}] ${action}`, data);
    }
  };

  const logError = (error: any, context?: string) => {
    if (enableLogging) {
      log(`[${screenName}] Error${context ? ` in ${context}` : ''}:`, error);
    }
  };

  const logInfo = (message: string, data?: any) => {
    if (enableLogging) {
      log(`[${screenName}] ${message}`, data);
    }
  };

  return {
    isVisible,
    logAction,
    logError,
    logInfo,
    isMounted: () => mountedRef.current,
  };
}

export default useBaseScreen;
