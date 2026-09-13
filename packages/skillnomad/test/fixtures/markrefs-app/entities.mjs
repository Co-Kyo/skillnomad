// markrefs E2E 夹具：消费侧（纯 ESM，便于 node 直接跑 CLI，不需要 tsx）
// 模式切换（env）：ok / missing-target / missing-key / dup-path / drift
import { createRefs } from 'skillnomad';

export const MODE = process.env.MARKREFS_MODE ?? 'ok';

export const entities = {
    alpha: { artifact: 'docs/a.md', description: '样本文档' },
    ghost: { artifact: 'docs/ghost.md', description: '不存在目标（missing-target 模式用）' },
    other: { artifact: 'docs/other.md', description: '漂移模式用' },
};

export const refs = createRefs();

const entries = Object.entries(entities)
    .filter(([name]) => !(MODE === 'missing-key' && name === 'alpha'))
    .map(([name, entity]) => ({
        name,
        path: MODE === 'drift' && name === 'alpha' ? 'docs/other.md' : entity.artifact,
        scope: 'entity',
        site: 'entities.mjs',
    }));
if (MODE === 'dup-path') {
    entries.push({ name: 'alphaAlias', path: 'docs/a.md', scope: 'entity', site: 'entities.mjs' });
}

export const markrefs = {
    keys: { entries },
    refs: refs,
    strict: process.env.MARKREFS_STRICT === '1',
};

export function refOf(name) {
    const entity = entities[name];
    if (!entity) throw new Error(`未知产物实体: ${String(name)}`);
    refs.ref(name, entity.artifact);
    return { path: entity.artifact, description: entity.description, required: true };
}

export function refPath(path) {
    refs.refPath(path);
    return { path, description: '直接路径引用', required: true };
}
