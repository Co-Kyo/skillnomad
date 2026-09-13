// 代码风格（仓库标准，2026-09-13）
// 只约束缩进：TS/JS 统一 4 空格；不动引号、换行、括号等（避免大面积改写）。
// 用法：npm run lint ／ npm run format（= lint --fix）。
// 注：模板字符串（TemplateLiteral）整体跳过——其内容属于文案，缩进改动会影响产物。
// 依赖（devDependencies）：eslint、@stylistic/eslint-plugin、typescript-eslint。
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

export default [
    {
        ignores: ['**/dist/**', '**/node_modules/**', '**/*.tsbuildinfo', '**/release/**', '**/out/**'],
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tseslint.parser,
            sourceType: 'module',
        },
    },
    {
        files: ['**/*.ts', '**/*.mjs', '**/*.js'],
        plugins: { '@stylistic': stylistic },
        rules: {
            '@stylistic/indent': [
                'error',
                4,
                {
                    SwitchCase: 1,
                    ignoredNodes: ['TemplateLiteral'],
                },
            ],
        },
    },
];
