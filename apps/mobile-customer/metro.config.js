const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Monorepo: web/api ve diğer mobil uygulama Metro’yu yavaşlatmasın
config.resolver.blockList = [
  /\/apps\/web-admin\//,
  /\/apps\/web-customer\//,
  /\/apps\/api\/dist\//,
  /\/apps\/mobile-courier\//,
  /\/packages\/database\/prisma\/migrations\//,
];

module.exports = config;
