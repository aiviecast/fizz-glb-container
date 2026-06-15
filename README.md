# fizz-glb-container

glTF バイナリ(**GLB / VRM**)コンテナのヘッダ解析コア。Almide 1 コアを native + wasm へ。
openaituber `scripts/inspect_vrm.mjs` の GLB コンテナ読み取り(`readUInt32LE` 群)を
切り出した単一責任部品(§11 アセット変換ツール)。

**どこに何バイトあるか**(magic / version / 全長 / JSON・BIN チャンクのオフセットと長さ)
だけを純粋な Int で返す。JSON 本体のパースやマテリアル/メッシュ解釈は host(`JSON.parse`)の
責務 — オフセットを返して host が切り出す方式なので、巨大な VRM を Almide 側へコピーせずに済む。

## GLB レイアウト

```
[ header 12B ] magic(4)=glTF / version(4) / length(4)
[ chunk 0    ] length(4) / type(4)=JSON / data...   ← JSON(offset 20 から)
[ chunk 1    ] length(4) / type(4)=BIN\0 / data...   ← BIN(20 + jsonLen から)
```

## API(コア)

| 関数 | 返り値 |
|---|---|
| `is_glb(b)` / `is_valid(b)` | magic / (magic+ver2+JSON型) の健全性 |
| `version(b)` / `total_length(b)` | u32 |
| `json_offset()` = 20 / `json_chunk_length(b)` | JSON 本体の位置と長さ(host が切り出す) |
| `json_type_ok(b)` | type == `0x4E4F534A` ("JSON") |
| `bin_chunk_offset(b)` = `20 + jsonLen` | BIN チャンクヘッダ位置 |
| `bin_chunk_length(b)` / `bin_data_offset(b)` | BIN 本体の長さと位置 |
| `has_bin_chunk(b)` | BIN チャンクの有無 |
| `u32le(b, off)` | LE u32 読み取り(下位ユーティリティ) |

## wasm 境界

host が GLB バイト列を `in_alloc` バッファに書き、各 export はそこから読んで
**Int(オフセット/長さ/フラグ)を Float 化して返す**。string を跨がせないので
`to_string_lossy` エイリアス系の問題(almide#690)は発生しない。JSON 本体の
切り出しと `JSON.parse` は host 側で行う(例: [`browser/glb-driver.js`](browser/glb-driver.js))。

## ビルド / テスト

```sh
almide test spec/glb_container_test.almd
almide build src/main.almd -o build/fizz-glb-container     # native CLI
almide build src/bridge.almd --target wasm -o build/glb.wasm
node test/wasm-smoke.mjs
```

Almide v0.27.7 で native / wasm とも green。
