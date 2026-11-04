/**
 * LoginScreen — Halaman masuk Lokayana AI.
 *
 * Default aplikasi langsung login sebagai admin, halaman ini muncul saat
 * pengguna memilih Login dari dropdown profil setelah Logout.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';

interface Props {
  onLoginSuccess: (username: string) => void;
  onBack: () => void;
}

export default function LoginScreen({ onLoginSuccess, onBack }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = () => {
    setError('');
    const user = username.trim().toLowerCase();

    if (!user || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }

    setSubmitting(true);
    // Validasi lokal (tanpa backend).
    if (user === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      onLoginSuccess(ADMIN_USERNAME);
    } else {
      setError('Username atau password salah.');
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Dekorasi latar bertema homepage */}
      <View style={styles.decorCircleTop} />
      <View style={styles.decorCircleBottom} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={18} color={colors.mist} />
            <Text style={styles.backText}>Kembali ke Home</Text>
          </TouchableOpacity>

          <View style={styles.brandWrap}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandIcon}>🧭</Text>
            </View>
            <Text style={styles.brandName}>Lokayana AI</Text>
            <Text style={styles.brandSub}>Navigasi cerdas & rekomendasi wisata Bali</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Masuk</Text>
            <Text style={styles.subtitle}>
              Silakan masuk untuk mencari rute dan rekomendasi wisata.
            </Text>

            <View style={styles.field}>
              <Ionicons name="person-outline" size={18} color={colors.muted} />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={colors.muted}
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  setError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError('');
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.muted}
                />
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.loginBtn, submitting && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color={colors.ink} size="small" />
              ) : (
                <>
                  <Text style={styles.loginBtnText}>Masuk</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.ink} />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.hintBox}>
              <Ionicons name="information-circle-outline" size={16} color={colors.sea} />
              <Text style={styles.hintText}>
                Akun demo: <Text style={styles.hintBold}>admin / admin</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  flex: { flex: 1 },
  decorCircleTop: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(27, 107, 102, 0.55)',
  },
  decorCircleBottom: {
    position: 'absolute',
    bottom: -110,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(244, 180, 26, 0.12)',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 44 : 58,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 6,
    marginBottom: 20,
  },
  backText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.mist,
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brandIcon: { fontSize: 32 },
  brandName: {
    fontFamily: fonts.extraBold,
    fontSize: 26,
    color: colors.white,
    letterSpacing: 0.4,
  },
  brandSub: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.mist,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 12,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 24,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
    marginTop: -4,
    marginBottom: 4,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 12,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#DC2626',
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.turmeric,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    color: colors.ink,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(27, 107, 102, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  hintText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.sea,
  },
  hintBold: {
    fontFamily: fonts.bold,
  },
});
