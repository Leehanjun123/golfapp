import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface SortOption {
  id: string;
  label: string;
  field: string;
  order: 'asc' | 'desc';
}

interface SortModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectSort: (sortOption: SortOption) => void;
  sortOptions: SortOption[];
  currentSort?: SortOption;
}

const SortModal: React.FC<SortModalProps> = ({
  visible,
  onClose,
  onSelectSort,
  sortOptions,
  currentSort,
}) => {
  const { theme } = useTheme();
  const [selectedSort, setSelectedSort] = useState<SortOption | undefined>(currentSort);

  const handleSelectSort = (option: SortOption) => {
    setSelectedSort(option);
    onSelectSort(option);
    onClose();
  };

  const renderSortOption = (option: SortOption) => {
    const isSelected = selectedSort?.id === option.id;

    return (
      <TouchableOpacity
        key={option.id}
        style={[
          styles.sortOption,
          {
            backgroundColor: isSelected ? theme.colors.primary + '10' : 'transparent',
            borderColor: theme.colors.border,
          },
        ]}
        onPress={() => handleSelectSort(option)}
      >
        <View style={styles.optionContent}>
          <Text
            style={[
              styles.optionLabel,
              {
                color: isSelected ? theme.colors.primary : theme.colors.text,
                fontWeight: isSelected ? 'bold' : 'normal',
              },
            ]}
          >
            {option.label}
          </Text>

          <View style={styles.orderIndicator}>
            <Ionicons
              name={option.order === 'asc' ? 'arrow-up' : 'arrow-down'}
              size={16}
              color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
            />
          </View>
        </View>

        {isSelected && (
          <View style={[styles.selectedIndicator, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="checkmark" size={16} color="white" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>정렬 기준</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Sort Options */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {sortOptions.map(renderSortOption)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginVertical: 5,
    borderWidth: 1,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    flex: 1,
  },
  orderIndicator: {
    marginLeft: 10,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
});

export default SortModal;
