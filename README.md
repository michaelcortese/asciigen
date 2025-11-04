ASCIIGen

AI-powered ASCII art generator with chat interface.

OVERVIEW

Generate ASCII art from text prompts using Cloudflare Workers AI and 
convert images to ASCII using Rust/WASM. Maintains conversation history w/ durable objects.

ARCHITECTURE

- Frontend: Minimal HTML/CSS/JS interface
- Backend: Cloudflare Workers (TypeScript)
- AI: Cloudflare Workers AI for image generation
- ASCII Conversion: Rust/WASM module
- Storage: Durable Objects for conversation persistence

SETUP

1. Install dependencies:
   npm install

2. Build WASM module:
   cd ascii
   wasm-pack build --target web --out-dir ../wasm/pkg
   cd ..

3. Run development server:
   npm run dev

4. Deploy:
   npm run deploy

REQUIREMENTS

- Node.js
- Rust (for WASM build)
- Cloudflare account with Workers AI enabled

USAGE

Send text prompts via the chat interface. The AI generates images 
which are converted to ASCII art. Conversation history is automatically 
saved and restored per session.

LICENSE

MIT
