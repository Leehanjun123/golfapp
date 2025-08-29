import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface FilterOption {
  id: string;
  label: string;
  value: any;
  type: 'checkbox' | 'radio' | 'range';
}

interface FilterGroup {
  id: string;
  title: string;
  options: FilterOption[];
  multiSelect?: boolean;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: any) => void;
  filterGroups: FilterGroup[];
  currentFilters: any;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApplyFilters,
  filterGroups,
  currentFilters,
}) => {
  const { theme } = useTheme();
  const [selectedFilters, setSelectedFilters] = useState(currentFilters);

  const handleFilterChange = (groupId: string, optionId: string, value: any) => {
    setSelectedFilters((prev: any) => {
      const newFilters = { ...prev };

      if (!newFilters[groupId]) {
        newFilters[groupId] = [];
      }

      const group = filterGroups.find((g) => g.id === groupId);
      if (group?.multiSelect) {
        if (value) {
          newFilters[groupId] = [...(newFilters[groupId] || []), optionId];
        } else {
          newFilters[groupId] = newFilters[groupId].filter((id: string) => id !== optionId);
        }
      } else {
        newFilters[groupId] = value ? [optionId] : [];
      }

      return newFilters;
    });
  };

  const handleApply = () => {
    onApplyFilters(selectedFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = filterGroups.reduce((acc, group) => {
      acc[group.id] = [];
      return acc;
    }, {} as any);
    setSelectedFilters(resetFilters);
  };

  const renderFilterGroup = (group: FilterGroup) => (
    <View key={group.id} style={styles.filterGroup}>
      <Text style={[styles.groupTitle, { color: theme.colors.text }]}>{group.title}</Text>

      {group.options.map((option) => {
        const isSelected = selectedFilters[group.id]?.includes(option.id) || false;

        return (
          <TouchableOpacity
            key={option.id}
            style={[styles.filterOption, { borderColor: theme.colors.border }]}
            onPress={() => handleFilterChange(group.id, option.id, !isSelected)}
          >
            <Text style={[styles.optionLabel, { color: theme.colors.text }]}>{option.label}</Text>

            {group.multiSelect || group.options.length > 1 ? (
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                    borderColor: theme.colors.primary,
                  },
                ]}
              >
                {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
            ) : (
              <Switch
                value={isSelected}
                onValueChange={(value) => handleFilterChange(group.id, option.id, value)}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary + '50' }}
                thumbColor={isSelected ? theme.colors.primary : theme.colors.textSecondary}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>필터</Text>

          <TouchableOpacity onPress={handleReset}>
            <Text style={[styles.resetText, { color: theme.colors.primary }]}>초기화</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {filterGroups.map(renderFilterGroup)}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleApply}
          >
            <Text style={styles.applyButtonText}>적용하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  resetText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterGroup: {
    marginVertical: 20,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  optionLabel: {
    fontSize: 16,
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
  },
  applyButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FilterModal;
