// Import wasm
import initWasm, { to_ascii } from "../ascii/pkg/ascii.js";
import asciiWasmUrl from "../ascii/pkg/ascii_bg.wasm";

export default {
  async fetch(request: Request, env: any) {
    // Initialize the wasm module
    await initWasm(asciiWasmUrl);

    const url = new URL(request.url);
    const prompt = url.searchParams.get("q") ?? "cyberpunk cat";

    // Generate image with Workers AI
    const img = await env.AI.run(
      "@cf/stabilityai/stable-diffusion-xl-base-1.0",
      { prompt },
    );

    // Convert to ASCII via wasm
    const bytes = new Uint8Array(await img.arrayBuffer());
    const cols = Number(url.searchParams.get("cols") ?? 100);
    const ascii = to_ascii(bytes, cols);

    return new Response(ascii, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
