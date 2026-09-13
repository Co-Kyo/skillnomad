import { defineConfig } from 'skillnomad';
import { markrefs } from './entities.mjs';

export default defineConfig({
    skill: './skill.mjs',
    outputDir: 'out',
    markrefs: process.env.MARKREFS_MODE === 'off' ? undefined : markrefs,
});
