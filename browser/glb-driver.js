// glb-driver.js — vrm-inspect のグルー例。
// GLB ヘッダ解析(オフセット算出)= Almide(wasm)、JSON 本体の切り出し+parse = host。
export async function loadGlbContainer(wasmUrl) {
  const bytes = await (await fetch(wasmUrl)).arrayBuffer();
  const mod = await WebAssembly.compile(bytes);
  const imports = {}; for (const i of WebAssembly.Module.imports(mod)) (imports[i.module] ??= {})[i.name] = () => 0;
  const { exports: ex } = await WebAssembly.instantiate(mod, imports); try { ex._start(); } catch {}
  const load = (u8) => { const p = ex.in_alloc(u8.length); new Uint8Array(ex.memory.buffer, Number(p), u8.length).set(u8); };
  return {
    // GLB の Uint8Array を渡してヘッダを解析。{ valid, version, jsonText, ... } を返す。
    parse(u8) {
      load(u8);
      if (ex.is_glb() !== 1) return { valid: false };
      const jsonOff = ex.json_offset(), jsonLen = ex.json_chunk_length();
      const jsonText = new TextDecoder().decode(u8.subarray(jsonOff, jsonOff + jsonLen));
      const out = {
        valid: ex.is_valid() === 1,
        version: ex.version(),
        totalLength: ex.total_length(),
        jsonOffset: jsonOff,
        jsonLength: jsonLen,
        jsonText, // host が JSON.parse して materials / meshes を見る
        hasBin: ex.has_bin_chunk() === 1,
      };
      if (out.hasBin) {
        out.binChunkOffset = ex.bin_chunk_offset();
        out.binLength = ex.bin_chunk_length();
        out.binDataOffset = ex.bin_data_offset();
      }
      return out;
    },
  };
}
