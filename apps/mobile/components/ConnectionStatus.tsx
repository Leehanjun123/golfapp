// Golf AI - Smart Connection Status Component

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useApiConnection } from '../hooks/useApiConnection';

interface ConnectionStatusProps {
  showDetails?: boolean;
  onPress?: () => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  showDetails = false, 
  onPress 
}) => {
  const { 
    isConnected, 
    isChecking, 
    connectionQuality, 
    baseUrl, 
    error, 
    reconnect, 
    isRetrying,
    retryCount,
    lastChecked 
  } = useApiConnection();

  const getStatusColor = () => {
    if (isChecking) return '#FFA500'; // Orange
    if (!isConnected) return '#FF4444'; // Red
    
    switch (connectionQuality) {
      case 'excellent': return '#00C851'; // Green
      case 'good': return '#33B5E5'; // Blue
      case 'poor': return '#FF8800'; // Orange
      default: return '#FF4444'; // Red
    }
  };

  const getStatusText = () => {
    if (isChecking) return 'Connecting...';
    if (!isConnected) return `Offline${isRetrying ? ` (Retry ${retryCount})` : ''}`;
    
    switch (connectionQuality) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'poor': return 'Poor';
      default: return 'Connected';
    }
  };

  const getStatusIcon = () => {
    if (isChecking) return '⏳';
    if (!isConnected) return '❌';
    
    switch (connectionQuality) {
      case 'excellent': return '✅';
      case 'good': return '🟢';
      case 'poor': return '🟡';
      default: return '🔵';
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { borderLeftColor: getStatusColor() }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{getStatusIcon()}</Text>
        <Text style={[styles.status, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
        {!isConnected && !isChecking && (
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={reconnect}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {showDetails && (
        <View style={styles.details}>
          <Text style={styles.detailText}>
            Server: {baseUrl.replace('/api', '').replace('http://', '')}
          </Text>
          {lastChecked && (
            <Text style={styles.detailText}>
              Last checked: {lastChecked.toLocaleTimeString()}
            </Text>
          )}
          {error && (
            <Text style={[styles.detailText, styles.errorText]}>
              Error: {error}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    margin: 8,
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  retryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  details: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  errorText: {
    color: '#FF4444',
  },
});