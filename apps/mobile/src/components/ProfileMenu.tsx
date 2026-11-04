import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';

interface Props {
  visible: boolean;
  isLoggedIn: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  onLogin: () => void;
  onLogout: () => void;
}

/**
 * Dropdown menu profil yang muncul dari ikon avatar di header.
 */
export default function ProfileMenu({
  visible,
  isLoggedIn,
  onClose,
  onViewProfile,
  onLogin,
  onLogout,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.item}
            onPress={onViewProfile}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={18} color={colors.sea} />
            <Text style={styles.itemText}>Lihat Profil</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {isLoggedIn ? (
            <TouchableOpacity style={styles.item} onPress={onLogout} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
              <Text style={[styles.itemText, styles.logoutText]}>Logout</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.item} onPress={onLogin} activeOpacity={0.7}>
              <Ionicons name="log-in-outline" size={18} color={colors.sea} />
              <Text style={styles.itemText}>Login</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  menu: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 74 : 104,
    right: 16,
    width: 184,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.line,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  itemText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.ink,
  },
  logoutText: {
    color: '#DC2626',
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginHorizontal: 10,
  },
});
