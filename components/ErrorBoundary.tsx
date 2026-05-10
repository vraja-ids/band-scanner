import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    console.error('[ErrorBoundary getDerivedStateFromError]', error.message);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to console in development
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error message:', error.message);
    console.error('[ErrorBoundary] Error name:', error.name);
    console.error('[ErrorBoundary] Error stack:', error.stack);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Also log globally for device logs
    if (!__DEV__) {
      console.log(`[CRASH ERROR] ${error.name}: ${error.message}`);
      console.log(`[CRASH STACK] ${error.stack}`);
    }
  }

  handleReset = () => {
    console.log('[ErrorBoundary] Reset requested');
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      console.log('[ErrorBoundary] Rendering error UI');
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <Text style={styles.details}>
            Please restart the app. If the problem persists, contact support.
          </Text>
          {/* In production, also show error name for debugging */}
          {!__DEV__ && this.state.error && (
            <Text style={styles.errorName}>
              Error: {this.state.error.name}
            </Text>
          )}
          {__DEV__ && (
            <Text style={styles.errorStack}>
              {this.state.error?.stack}
            </Text>
          )}
          <TouchableOpacity
            style={styles.button}
            onPress={this.handleReset}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  details: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorName: {
    fontSize: 12,
    color: '#cc6600',
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  errorStack: {
    fontSize: 10,
    color: '#ff0000',
    marginBottom: 24,
    textAlign: 'left',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#5dbea3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
