const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname; // apps/mobile
// Root workspace: lokayana_ai/ (2 level up dari apps/mobile)
const workspaceRoot = path.resolve(projectRoot, '..', '..');
const rootNodeModules = path.resolve(workspaceRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

// ── BLOKIR root node_modules ────────────────────────────────────────────────
// Root workspace punya node_modules dengan React 19.3.1
// sedangkan apps/mobile punya React 19.3.0.
// Dua instance React menyebabkan:
//   "TypeError: property is not writable" (iOS Hermes)
//   "main has not been registered"
//
// Blokir paket-paket kritis dari root agar Metro tidak memuatnya dua kali.
// blockList menerima satu RegExp yang match path yang ingin diblokir.
const escapedRoot = rootNodeModules.replace(/\\/g, '\\\\').replace(/\./g, '\\.');
config.resolver.blockList = new RegExp(
  `^${escapedRoot}\\\\(react|react-native|react-dom|scheduler|expo)($|\\\\.*)`
);

// Paksa resolver hanya cari di apps/mobile/node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

// Pastikan import React/ReactNative selalu pakai versi dari apps/mobile
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules', 'react'),
  'react-native': path.resolve(projectRoot, 'node_modules', 'react-native'),
  scheduler: path.resolve(projectRoot, 'node_modules', 'scheduler'),
};

// Hanya watch folder apps/mobile, bukan root workspace
// (mencegah Metro otomatis mendeteksi root node_modules)
config.watchFolders = [projectRoot];

module.exports = config;
