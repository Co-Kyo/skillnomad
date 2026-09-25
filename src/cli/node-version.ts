// Node 版本下限：作者面的 .ts 源文件由 Node 自身的类型剥离执行，低于此版本跑不动。
// 这个下限与 package.json 的 engines.node 锁成同一处（见 test/node-version.test.mjs）——
// 声明与门禁不同源就会漂移，而漂移的形态是「装得上、跑不了」。

export const MIN_NODE = { major: 22, minor: 18 };

export function minNodeText(): string {
    return MIN_NODE.major + '.' + MIN_NODE.minor;
}

/** 返回 null＝可运行；返回字符串＝该打给用户的拒绝理由。 */
export function checkNodeVersion(version: string = process.versions.node): string | null {
    const parts = version.split('-')[0].split('.');
    const major = Number(parts[0]);
    const minor = Number(parts[1]);
    if (!Number.isFinite(major) || !Number.isFinite(minor)) {
        return 'Unrecognized Node version: ' + version + ' - skillnomad needs Node >= ' + minNodeText() + '.';
    }
    if (major < MIN_NODE.major || (major === MIN_NODE.major && minor < MIN_NODE.minor)) {
        return 'skillnomad needs Node >= ' + minNodeText() + ' (running ' + version + ') - the .ts sources are executed by Node itself, which strips their types; earlier Node cannot.';
    }
    return null;
}
