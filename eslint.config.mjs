// 代码风格（仓库标准，2026-09-13）
// 缩进统一 4 空格：TS/JS（@stylistic/indent）＋ JSON 配置（jsonc/indent）。
// 只约束缩进：不动引号、换行、括号等（避免大面积改写）。
// 用法：npm run lint ／ npm run format（= lint --fix）。
// 注：模板字符串（TemplateLiteral）整体跳过——其内容属于文案，缩进改动会影响产物；
//     package-lock.json 由 npm 生成，不纳入格式检查。
// 依赖（devDependencies）：eslint、@stylistic/eslint-plugin、typescript-eslint、eslint-plugin-jsonc。
import stylistic from '@stylistic/eslint-plugin';
import jsonc from 'eslint-plugin-jsonc';
import tseslint from 'typescript-eslint';

export default [
    {
        ignores: [
            '**/dist/**',
            '**/node_modules/**',
            '**/*.tsbuildinfo',
            '**/release/**',
            '**/out/**',
            '**/package-lock.json',
        ],
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
    ...jsonc.configs['flat/base'],
    {
        files: ['**/*.json'],
        rules: {
            'jsonc/indent': ['error', 4],
        },
    },
];
