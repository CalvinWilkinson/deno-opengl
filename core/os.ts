export function isWindows(): boolean {
    return Deno.build.os === "windows";
}

export function isMacOS(): boolean {
    return Deno.build.os === "darwin";
}

export function isLinux(): boolean {
    return Deno.build.os === "linux";
}
