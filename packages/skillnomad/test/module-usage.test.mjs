import assert from 'node:assert/strict';
import test from 'node:test';
import { validateModuleUsage } from '../dist/index.js';

// 8.15 Step 2：模块引用一致性校验（角色×归属 + 私有可见性）
const step = (id, reads = []) => ({ id, dependsOn: 'x', reads, writes: [] });

const REGISTRY = [
  { id: 'ref-sources', kind: 'policy', path: 'assets/common/ref-sources.md', description: '', scope: 'skill' },
  { id: 'agent-init', kind: 'policy', path: 'assets/01-brainstorm/agent-init.md', description: '', scope: 'step', step: 'brainstorm' },
  { id: 'schemas-scan', kind: 'schema', path: 'assets/03-scan/schemas.md', description: '', scope: 'step', step: 'scan' },
];

test('V1 正例：as:\'contract\' 指向 skill 级模块 → 无错误', () => {
  const steps = [step('scan', [{ path: 'assets/common/ref-sources.md', as: 'contract' }])];
  assert.deepEqual(validateModuleUsage(steps, REGISTRY), []);
});

test('V1 反例：as:\'contract\' 指向 step 级模块 → 报错并提示改标签/提升', () => {
  const steps = [step('scan', [{ path: 'assets/01-brainstorm/agent-init.md', as: 'contract' }])];
  const errs = validateModuleUsage(steps, REGISTRY);
  assert.equal(errs.length, 1);
  assert.match(errs[0].message, /step 级模块 agent-init/);
});

test('V1 反例：as:\'contract\' 引用未登记路径 → 报错', () => {
  const steps = [step('scan', [{ path: 'assets/common/unknown.md', as: 'contract' }])];
  const errs = validateModuleUsage(steps, REGISTRY);
  assert.equal(errs.length, 1);
  assert.match(errs[0].message, /未在模块注册表中登记/);
});

test('V2 正例：step 级模块仅被归属步骤引用 → 无错误', () => {
  const steps = [step('brainstorm', [{ path: 'assets/01-brainstorm/agent-init.md', as: 'rule' }])];
  assert.deepEqual(validateModuleUsage(steps, REGISTRY), []);
});

test('V2 反例：step 级模块被跨步引用 → 报错', () => {
  const steps = [
    step('brainstorm', [{ path: 'assets/03-scan/schemas.md', as: 'schema' }]),
    step('scan', [{ path: 'assets/03-scan/schemas.md', as: 'schema' }]),
  ];
  const errs = validateModuleUsage(steps, REGISTRY);
  assert.equal(errs.length, 1);
  assert.match(errs[0].message, /严格私有/);
});

test('空注册表 + 无 contract 引用 → 无错误', () => {
  const steps = [step('scan', [{ path: 'assets/common/ref-sources.md' }])];
  assert.deepEqual(validateModuleUsage(steps, []), []);
});
