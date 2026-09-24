import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors, fonts } from '../theme';
import type { Category } from '../types';

interface CategoryPickerProps {
  categories: Category[];
  selectedId: number | null;
  onSelect: (cat: Category) => void;
}

export default function CategoryPicker({ categories, selectedId, onSelect }: CategoryPickerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {categories.map((cat) => {
        const selected = cat.id === selectedId;
        return (
          <TouchableOpacity
            key={cat.id}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onSelect(cat)}
            activeOpacity={0.7}
          >
            <Text style={styles.chipIcon}>{cat.icon}</Text>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 4, gap: 8, flexDirection: 'row' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  chipSelected: {
    backgroundColor: colors.sea,
    borderColor: colors.sea,
  },
  chipIcon: { fontSize: 16 },
  chipText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.muted,
  },
  chipTextSelected: { color: colors.white },
});
