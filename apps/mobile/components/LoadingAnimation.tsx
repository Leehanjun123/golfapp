import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';

interface LoadingAnimationProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
}

export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ size = 'medium', text }) => {
  const { theme } = useTheme();
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  const getSize = () => {
    switch (size) {
      case 'small':
        return 30;
      case 'large':
        return 60;
      default:
        return 40;
    }
  };

  const dotSize = getSize();

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    scale.value = withRepeat(
      withSequence(withTiming(1.2, { duration: 500 }), withTiming(1, { duration: 500 })),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.loader,
          {
            width: dotSize,
            height: dotSize,
            borderColor: theme.colors.primary,
          },
          animatedStyle,
        ]}
      />
      {text && <Text style={[styles.text, { color: theme.colors.textSecondary }]}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loader: {
    borderWidth: 4,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderRadius: 50,
  },
  text: {
    marginTop: 12,
    fontSize: 14,
  },
});
