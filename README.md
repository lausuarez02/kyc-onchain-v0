# KYC on-chain

IC contract deploy
canister id backend : https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=gektk-daaaa-aaaap-qkfta-cai
canister id frontend : https://gdlv6-oyaaa-aaaap-qkftq-cai.icp0.io/

This is an ICP smart contract that accepts an image from the user and runs the argentinian id validation model.
The smart contract consists of two canisters:

- the backend canister embeds the [the Tract ONNX inference engine](https://github.com/sonos/tract) with [quantized_dni_img_val_V0 model]
  It provides `classify()` endpoint for the frontend code to call.
- the frontend canister contains the Web assets such as HTML, JS, CSS that are served to the browser.

This example uses Wasm SIMD instructions that are available in `dfx` version `0.20.2-beta.0` or newer.

# Dependencies

Install `dfx`, Rust, etc: https://internetcomputer.org/docs/current/developer-docs/getting-started/hello-world

Install WASI SDK 21:

- Install `wasi-skd-21.0` from https://github.com/WebAssembly/wasi-sdk/releases/tag/wasi-sdk-21
- Export `CC_wasm32_wasi` in your shell such that it points to WASI clang and sysroot. Example:

```
export CC_wasm32_wasi="/path/to/wasi-sdk-21.0/bin/clang --sysroot=/path/to/wasi-sdk-21.0/share/wasi-sysroot"
``` 

Install `wasi2ic`:
- Follow the steps in https://github.com/wasm-forge/wasi2ic
- Make sure that `wasi2ic` binary is in your `$PATH`.

Download MobileNet v2-7 to `src/backend/assets/mobilenetv2-7.onnx`:

```
./downdload_model.sh
```

Install NodeJS dependencies for the frontend:

```
npm install
```

Install `wasm-opt`:

```
cargo install wasm-opt
```

# Build

```
dfx start --background
dfx deploy
```

If the deployment is successful, the it will show the `frontend` URL.
Open that URL in browser to interact with the smart contract.
