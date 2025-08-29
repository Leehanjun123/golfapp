import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SwingComparisonContainer } from './SwingComparisonContainer';
import { useSwingAnalysis } from '../hooks/useSwingAnalysis';
import { SwingAnalysisProvider } from '../context/SwingAnalysisContext';

/**
 * Main view component for swing comparison feature
 * Following clean architecture principles
 */
export const SwingComparisonView: React.FC = () => {
  return (
    <SwingAnalysisProvider>
      <View style={styles.container}>
        <SwingComparisonContainer />
      </View>
    </SwingAnalysisProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default SwingComparisonView;