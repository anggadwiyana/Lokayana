import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { colors, fonts } from '../theme';
import type { Category } from '../types';

interface CategoryPickerProps {
  categories: Category[];
  selectedId: number | null;
  onSelect: (cat: Category) => void;
  showDescription?: boolean;
}

export default function CategoryPicker({
  categories,
  selectedId,
  onSelect,
  showDescription = false,
}: CategoryPickerProps) {
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
            activeOpacity={0.75}
          >
            <Text style={styles.chipIcon}>{cat.icon}</Text>
            <View style={styles.chipTextWrap}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {cat.name}
              </Text>
              {showDescription && cat.description ? (
                <Text style={[styles.chipDesc, selected && styles.chipDescSelected]} numberOfLines={1}>
                  {cat.description}
                </Text>
              ) : null}
            </View>
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
  chipTextWrap: { flexDirection: 'column', gap: 1 },
  chipText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.muted,
  },
  chipTextSelected: { color: colors.white },
  chipDesc: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
    maxWidth: 120,
  },
  chipDescSelected: { color: 'rgba(255,255,255,0.8)' },
});
