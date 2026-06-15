import { readFileSync } from "node:fs";
const mod = await WebAssembly.compile(readFileSync(new URL("../build/glb.wasm", import.meta.url)));
const imports = {}; for (const i of WebAssembly.Module.imports(mod)) (imports[i.module] ??= {})[i.name] = () => 0;
const { exports: ex } = await WebAssembly.instantiate(mod, imports); try { ex._start(); } catch {}

// 最小の有効な GLB(JSON 8B + BIN 4B、total=40)。
const glbBytes = new Uint8Array([
  103, 108, 84, 70, 2, 0, 0, 0, 40, 0, 0, 0,
  8, 0, 0, 0, 74, 83, 79, 78,
  123, 125, 32, 32, 32, 32, 32, 32,
  4, 0, 0, 0, 66, 73, 78, 0, 0, 0, 0, 0,
]);
const load = (arr) => { const p = ex.in_alloc(arr.length); new Uint8Array(ex.memory.buffer, Number(p), arr.length).set(arr); };
let ok = true; const ck = (c, m) => { if (!c) { console.error("FAIL " + m); ok = false; } };

load(glbBytes);
ck(ex.is_glb() === 1, "is_glb");
ck(ex.version() === 2, "version");
ck(ex.total_length() === 40, "total_length");
ck(ex.json_offset() === 20, "json_offset");
ck(ex.json_chunk_length() === 8, "json_chunk_length");
ck(ex.json_type_ok() === 1, "json_type_ok");
ck(ex.bin_chunk_offset() === 28, "bin_chunk_offset");
ck(ex.bin_chunk_length() === 4, "bin_chunk_length");
ck(ex.bin_data_offset() === 36, "bin_data_offset");
ck(ex.has_bin_chunk() === 1, "has_bin_chunk");
ck(ex.is_valid() === 1, "is_valid");

// JSON のみ(total=28、BIN 無し)。同じバッファを再 alloc して読み直し。
load(new Uint8Array([
  103, 108, 84, 70, 2, 0, 0, 0, 28, 0, 0, 0,
  8, 0, 0, 0, 74, 83, 79, 78,
  123, 125, 32, 32, 32, 32, 32, 32,
]));
ck(ex.has_bin_chunk() === 0, "json-only: no bin");
ck(ex.is_valid() === 1, "json-only: valid");

// glTF でない。
load(new Uint8Array([80, 75, 3, 4, 0, 0, 0, 0]));
ck(ex.is_glb() === 0, "not glb");
ck(ex.is_valid() === 0, "not glb invalid");

console.log(ok ? "wasm OK — GLB header offsets match native" : "FAIL"); if (!ok) process.exit(1);
