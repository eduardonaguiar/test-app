import { builtinModules } from 'node:module';

export const externalModules = [
  'electron',
  ...builtinModules,
  ...builtinModules.map((moduleName) => `node:${moduleName}`),
];
