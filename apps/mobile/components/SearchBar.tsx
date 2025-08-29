import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

interface SearchBarProps {
  placeholder?: string;
  onSearchChange: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  showFilter?: boolean;
  onFilterPress?: () => void;
  autoFocus?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = '검색...',
  onSearchChange,
  onFocus,
  onBlur,
  showFilter = true,
  onFilterPress,
  autoFocus = false,
}) => {
  const { theme } = useTheme();
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0.7));

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    onSearchChange(text);
  };

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(fadeAnim, {
      toValue: 0.7,
      duration: 200,
      useNativeDriver: true,
    }).start();
    onBlur?.();
  };

  const clearSearch = () => {
    setSearchText('');
    onSearchChange('');
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: theme.colors.card,
            borderColor: isFocused ? theme.colors.primary : theme.colors.border,
          },
        ]}
      >
        <Ionicons
          name="search"
          size={20}
          color={theme.colors.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.textInput, { color: theme.colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          value={searchText}
          onChangeText={handleSearchChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoFocus={autoFocus}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {showFilter && (
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          ]}
          onPress={onFilterPress}
        >
          <Ionicons name="options" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  clearButton: {
    padding: 5,
  },
  filterButton: {
    marginLeft: 10,
    padding: 12,
    borderRadius: 25,
    borderWidth: 1,
  },
});

export default SearchBar;
