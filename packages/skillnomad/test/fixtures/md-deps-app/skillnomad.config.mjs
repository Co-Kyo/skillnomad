import { defineConfig } from 'skillnomad';
import { mdDeps } from './entities.mjs';

export default defineConfig({
  skill: './skill.mjs',
  outputDir: 'out',
  mdDeps: process.env.MD_DEPS_MODE === 'off' ? undefined : mdDeps,
});
