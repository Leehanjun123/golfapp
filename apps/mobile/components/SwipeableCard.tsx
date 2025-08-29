import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  enableSwipe?: boolean;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  enableSwipe = true,
}) => {
  const { theme } = useTheme();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      // Optional: Add haptic feedback
    },
    onActive: (event) => {
      if (!enableSwipe) return;
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.2; // Reduced Y movement
    },
    onEnd: () => {
      if (!enableSwipe) return;

      if (translateX.value > SWIPE_THRESHOLD && onSwipeRight) {
        translateX.value = withSpring(SCREEN_WIDTH * 1.5);
        runOnJS(onSwipeRight)();
      } else if (translateX.value < -SWIPE_THRESHOLD && onSwipeLeft) {
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5);
        runOnJS(onSwipeLeft)();
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-15, 0, 15],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, SCREEN_WIDTH * 0.5, SCREEN_WIDTH],
      [1, 0.8, 0],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
      opacity,
    };
  });

  const likeOpacity = useAnimatedStyle(() => {
    return {
      opacity: interpolate(translateX.value, [0, SCREEN_WIDTH / 4], [0, 1], Extrapolation.CLAMP),
    };
  });

  const nopeOpacity = useAnimatedStyle(() => {
    return {
      opacity: interpolate(translateX.value, [-SCREEN_WIDTH / 4, 0], [1, 0], Extrapolation.CLAMP),
    };
  });

  return (
    <View style={styles.container}>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.card, { backgroundColor: theme.colors.card }, cardStyle]}>
          {enableSwipe && (
            <>
              <Animated.View style={[styles.likeLabel, likeOpacity]}>
                <Text style={[styles.labelText, { color: theme.colors.success }]}>LIKE</Text>
              </Animated.View>
              <Animated.View style={[styles.nopeLabel, nopeOpacity]}>
                <Text style={[styles.labelText, { color: theme.colors.error }]}>NOPE</Text>
              </Animated.View>
            </>
          )}
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: SCREEN_WIDTH * 0.9,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    padding: 20,
  },
  likeLabel: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
    borderWidth: 3,
    borderColor: '#4CAF50',
    borderRadius: 10,
    transform: [{ rotate: '-30deg' }],
    zIndex: 100,
  },
  nopeLabel: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 10,
    borderWidth: 3,
    borderColor: '#F44336',
    borderRadius: 10,
    transform: [{ rotate: '30deg' }],
    zIndex: 100,
  },
  labelText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
