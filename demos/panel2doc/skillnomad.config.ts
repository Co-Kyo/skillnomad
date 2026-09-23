import { defineConfig } from 'skillnomad';

// skill 指向定义文件；产物落本目录 out/（不入库）。
export default defineConfig({
    skill: './src/skill.ts',
    outputDir: './out',
});
