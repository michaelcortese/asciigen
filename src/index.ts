// Import wasm
import initWasm, { to_ascii } from "../wasm/pkg/ascii.js";
import asciiWasmUrl from "../wasm/pkg/ascii_bg.wasm";
import { ConversationDO } from "./ConversationDO";
import { HTML } from "./static";

// Export Durable Object class
export { ConversationDO };

// Initialize WASM module once (lazy initialization)
let wasmInitialized = false;
async function ensureWasmInitialized() {
  if (wasmInitialized) return;
  try {
    await initWasm({ moduleUrl: asciiWasmUrl });
  } catch (err: any) {
    if (err && String(err.message).includes("Invalid URL")) {
      await initWasm(asciiWasmUrl);
    } else {
      throw err;
    }
  }
  wasmInitialized = true;
}

interface Env {
  AI: any;
  CONVERSATIONS: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Serve static HTML from embedded template
    if (path === "/" || path === "/index.html") {
      return new Response(HTML, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // API Routes
    if (path === "/api/chat") {
      return handleChat(request, env);
    }

    if (path === "/api/conversation") {
      return handleConversation(request, env);
    }

    // Legacy API endpoint for direct ASCII generation
    if (path === "/api/ascii" || path.startsWith("/api/")) {
      return handleLegacyAscii(request, env);
    }

    // 404 for unknown routes
    return new Response("Not Found", { status: 404 });
  },
};


async function handleChat(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json() as { message: string; sessionId: string };
    const { message, sessionId } = body;

    if (!message || !sessionId) {
      return new Response(
        JSON.stringify({ error: "message and sessionId are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get conversation history from Durable Object
    const conversationId = env.CONVERSATIONS.idFromName(sessionId);
    const conversationObj = env.CONVERSATIONS.get(conversationId);
    
    // Save user message first to extract name if present
    await conversationObj.fetch(
      new Request(`https://conversation.local/?sessionId=${sessionId}`, {
        method: "POST",
        body: JSON.stringify({ role: "user", content: message }),
      })
    );
    
    // Get updated conversation history (now with name if extracted)
    const historyResponse = await conversationObj.fetch(
      new Request(`https://conversation.local/?sessionId=${sessionId}`)
    );
    const conversation = await historyResponse.json() as {
      messages: Array<{ role: string; content: string }>;
      userName?: string;
      lastAsciiPrompt?: string;
    };

    // Build conversation context for LLM
    const messages = conversation.messages || [];

    // Check if user wants ASCII art generation (basic check first)
    const hasAsciiKeywords = /generate|create|make|draw|ascii|art|image|picture/i.test(message);
    
    // Check if user wants to edit previous ASCII art
    // Look for edit commands that reference "it", "this", "that", or "the image" AND we have a previous prompt
    // Also check for commands that modify things (add, remove, make taller, etc.) when there's a previous prompt
    const editPatterns = [
      /make it\s+/i,
      /change it\s+/i,
      /modify it\s+/i,
      /edit it\s+/i,
      /update it\s+/i,
      /make (?:the |this |that )(?:image |art |picture )?/i,
      /change (?:the |this |that )(?:image |art |picture )?/i,
      /modify (?:the |this |that )(?:image |art |picture )?/i,
      /edit (?:the |this |that )(?:image |art |picture )?/i,
      /update (?:the |this |that )(?:image |art |picture )?/i,
      /adjust (?:the |this |that |it )/i,
      /alter (?:the |this |that |it )/i,
      /^add /i,  // "add more branches" when there's previous art
      /^remove /i,  // "remove the trunk" when there's previous art
    ];
    const hasEditKeyword = editPatterns.some(pattern => pattern.test(message));
    // Check for modification adjectives/adverbs that suggest editing
    const hasModification = /(?:taller|shorter|wider|narrower|bigger|smaller|more|less|different|better|darker|lighter|colorful|brighter|thicker|thinner|larger|smaller)/i.test(message);
    // Don't treat as edit if it's clearly a new generation request (like "make a tree" vs "make it taller")
    const isNewGeneration = /(?:generate|create|draw|make) (?:an? |the )?(?:new |another )?[^i]/i.test(message) ||
                            /(?:generate|create|draw) (?:an? |the )?(?:ascii|art|image|picture)/i.test(message);
    // If there's a previous prompt and the message suggests editing (not a new generation), treat as edit
    const wantsEdit = conversation.lastAsciiPrompt && 
                      (hasEditKeyword || (hasModification && !hasAsciiKeywords && !isNewGeneration));
    
    // Final check: user wants ASCII art generation (either new or edit)
    const wantsAscii = hasAsciiKeywords || wantsEdit;
    
    // Try to extract the prompt from various patterns
    const asciiPromptMatch = message.match(/generate (?:an? )?ascii (?:art )?(?:of |for )?(.+)/i) ||
                            message.match(/create (?:an? )?ascii (?:art )?(?:of |for )?(.+)/i) ||
                            message.match(/make (?:an? )?ascii (?:art )?(?:of |for )?(.+)/i) ||
                            message.match(/ascii (?:art )?(?:of |for )?(.+)/i) ||
                            message.match(/draw (?:an? )?(.+)/i);

    let asciiResult: string | null = null;
    let llmResponse = "";

    if (wantsAscii) {
      let imagePrompt: string;
      
      if (wantsEdit && conversation.lastAsciiPrompt) {
        // User wants to edit the previous image - use LLM to modify the prompt
        try {
          const userName = conversation.userName;
          const nameContext = userName ? ` The user's name is ${userName}.` : "";
          const editSystemPrompt = `You are a helpful assistant that modifies image generation prompts based on user requests.
The user previously generated an image with this prompt: "${conversation.lastAsciiPrompt}"
The user now wants to modify it with this request: "${message}"

Your task is to create a NEW, COMPLETE image generation prompt that incorporates the modification requested.
The prompt should be descriptive and suitable for an image generation model.
DO NOT reference the previous prompt or use phrases like "same as before but" - create a fresh, complete prompt.
Return ONLY the modified prompt, nothing else.${nameContext}`;

          const editMessages = [
            { role: "system", content: editSystemPrompt },
            { role: "user", content: `Previous prompt: "${conversation.lastAsciiPrompt}"\nUser's edit request: "${message}"\n\nCreate a new complete prompt:` },
          ];

          const editResult = await env.AI.run(
            "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
            {
              messages: editMessages,
            }
          );

          const modifiedPrompt = (editResult.response || editResult.text || "").trim();
          // Clean up the prompt - remove quotes if present, take first line if multiple
          imagePrompt = modifiedPrompt.replace(/^["']|["']$/g, '').split('\n')[0].trim();
          
          // Fallback if LLM didn't produce good output
          if (!imagePrompt || imagePrompt.length < 3) {
            // Simple heuristic: append modification to original prompt
            const editKeywords = message.replace(/(make it|change it|modify|edit|update|alter|adjust|make (?:the |this |that )?)/gi, '').trim();
            imagePrompt = `${conversation.lastAsciiPrompt}, ${editKeywords}`;
          }
        } catch (error: any) {
          // Fallback to simple appending
          const editKeywords = message.replace(/(make it|change it|modify|edit|update|alter|adjust|make (?:the |this |that )?)/gi, '').trim();
          imagePrompt = `${conversation.lastAsciiPrompt}, ${editKeywords}`;
        }
      } else if (asciiPromptMatch && asciiPromptMatch[1]) {
        // Extract prompt from regex match
        imagePrompt = asciiPromptMatch[1].trim();
      } else {
        // Try to extract subject from the message more flexibly
        // Remove common request words and use the rest as prompt
        imagePrompt = message
          .replace(/^(can you |please |could you |will you )?/i, '')
          .replace(/(generate|create|make|draw|show me|give me).*?(ascii|art|image|picture).*?(of |for |a |an )?/gi, '')
          .replace(/^(an? |the )/i, '')
          .trim();
        
        // If we still don't have a good prompt, use a default or the whole message
        if (!imagePrompt || imagePrompt.length < 3) {
          imagePrompt = message.replace(/^(can you |please |could you |will you )?(generate|create|make|draw|show|give).*?(ascii|art|image|picture).*?/gi, '').trim() || "abstract art";
        }
      }
      
      // Generate ASCII art
      try {
        asciiResult = await generateAsciiArt(imagePrompt, 100, env);
        if (wantsEdit) {
          llmResponse = `I've updated the ASCII art based on your request. Check the output panel!`;
        } else {
          llmResponse = `I've generated ASCII art for "${imagePrompt}". Check the output panel!`;
        }
        
        // Update last ASCII prompt in conversation
        await conversationObj.fetch(
          new Request(`https://conversation.local/?sessionId=${sessionId}`, {
            method: "PUT",
            body: JSON.stringify({ lastAsciiPrompt: imagePrompt }),
          })
        );
      } catch (error: any) {
        llmResponse = `I encountered an error generating ASCII art: ${error.message}`;
      }
    } else {
      // Use LLM for general chat
      const userName = conversation.userName;
      const nameContext = userName ? ` The user's name is ${userName}.` : "";
      const systemPrompt = `You are a helpful AI assistant that helps users generate ASCII art. 
When users ask you to generate ASCII art, they should use phrases like "generate ASCII art of [description]" or "draw [description]" and the system will create it for them.
Be friendly, helpful, and concise.${nameContext}`;

      const llmMessages = [
        { role: "system", content: systemPrompt },
        ...messages.slice(-10), // Keep last 10 messages for context
      ];

      const llmResult = await env.AI.run(
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        {
          messages: llmMessages,
        }
      );

      llmResponse = llmResult.response || llmResult.text || "I'm here to help!";
    }

    // Save assistant response to conversation history
    await conversationObj.fetch(
      new Request(`https://conversation.local/?sessionId=${sessionId}`, {
        method: "POST",
        body: JSON.stringify({ role: "assistant", content: llmResponse }),
      })
    );

    return new Response(
      JSON.stringify({
        response: llmResponse,
        ascii: asciiResult,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function handleConversation(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId") || "default";

  const conversationId = env.CONVERSATIONS.idFromName(sessionId);
  const conversationObj = env.CONVERSATIONS.get(conversationId);

  // Forward request to Durable Object
  const doUrl = new URL(request.url);
  doUrl.searchParams.set("sessionId", sessionId);
  return conversationObj.fetch(new Request(doUrl.toString(), {
    method: request.method,
    body: request.method === "POST" ? await request.text() : undefined,
    headers: request.headers,
  }));
}

async function handleLegacyAscii(request: Request, env: Env): Promise<Response> {
  await ensureWasmInitialized();

  const url = new URL(request.url);
  const prompt = url.searchParams.get("q") || url.searchParams.get("prompt") || "cyberpunk cat";
  const cols = Number(url.searchParams.get("cols") || "100");

  try {
    const ascii = await generateAsciiArt(prompt, cols, env);
    return new Response(ascii, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function generateAsciiArt(
  prompt: string,
  cols: number,
  env: Env
): Promise<string> {
  await ensureWasmInitialized();

  // Generate image with Workers AI
  const img = await env.AI.run(
    "@cf/stabilityai/stable-diffusion-xl-base-1.0",
    { prompt }
  );

  // Convert to ArrayBuffer
  const buffer = await toArrayBuffer(img);
  const bytes = new Uint8Array(buffer);
  
  // Convert to ASCII via wasm
  const ascii = to_ascii(bytes, cols);
  return ascii;
}

// Helper function to convert AI output to ArrayBuffer
async function toArrayBuffer(src: any): Promise<ArrayBufferLike> {
  if (!src) throw new TypeError("AI returned an empty result");

  // Handle ReadableStream (Cloudflare Workers AI returns this for image models)
  if (src instanceof ReadableStream) {
    const reader = src.getReader();
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    // Combine all chunks into a single Uint8Array
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    return combined.buffer;
  }

  // Direct typed buffers / responses
  if (src instanceof ArrayBuffer) return src;
  if (src instanceof Uint8Array) return src.buffer;
  if (typeof src.arrayBuffer === "function") return await src.arrayBuffer();
  if (typeof src.bytes === "function") {
    const b = await src.bytes();
    return b instanceof Uint8Array ? b.buffer : new Uint8Array(b).buffer;
  }
  if (typeof src.blob === "function") {
    const blob = await src.blob();
    return await blob.arrayBuffer();
  }

  // If object contains a direct URL/URI, fetch it
  if (typeof src.url === "string" || typeof src.uri === "string") {
    const u = (src.url ?? src.uri) as string;
    const res = await fetch(u);
    return await res.arrayBuffer();
  }

  // If object contains base64 encoded data in common fields
  const base64Field = src && (src.b64_json ?? src.base64 ?? src.data);
  if (typeof base64Field === "string") {
    // strip data URI prefix if present
    const b64 = (base64Field as string).replace(/^data:.*;base64,/, "");
    const binary = Uint8Array.from(globalThis.atob(b64), (c) =>
      c.charCodeAt(0),
    );
    return binary.buffer;
  }

  // Collect candidate artifacts/outputs and try to extract binary from each.
  const candidates: any[] = [];
  if (Array.isArray(src)) candidates.push(...src);
  if (src && Array.isArray(src.outputs)) candidates.push(...src.outputs);
  if (src && Array.isArray(src.artifacts))
    candidates.push(...src.artifacts);
  if (src && Array.isArray(src.result)) candidates.push(...src.result);
  // Some SDKs put a single artifact object
  if (
    src &&
    src.artifacts &&
    !Array.isArray(src.artifacts) &&
    typeof src.artifacts === "object"
  )
    candidates.push(src.artifacts);

  for (const c of candidates) {
    if (!c) continue;
    try {
      // Handle ReadableStream in nested structures
      if (c instanceof ReadableStream) {
        const reader = c.getReader();
        const chunks: Uint8Array[] = [];
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        return combined.buffer;
      }
      if (c instanceof ArrayBuffer) return c;
      if (c instanceof Uint8Array) return c.buffer;
      if (typeof c.arrayBuffer === "function") return await c.arrayBuffer();
      if (typeof c.bytes === "function") {
        const b = await c.bytes();
        if (b instanceof Uint8Array) return b.buffer;
        return new Uint8Array(b).buffer;
      }
      if (typeof c.blob === "function") {
        const blob = await c.blob();
        return await blob.arrayBuffer();
      }
      if (typeof c.url === "string" || typeof c.uri === "string") {
        const u = (c.url ?? c.uri) as string;
        const res = await fetch(u);
        return await res.arrayBuffer();
      }
      const b64 = c.b64_json ?? c.base64 ?? c.data;
      if (typeof b64 === "string") {
        const s = b64.replace(/^data:.*;base64,/, "");
        const bin = Uint8Array.from(globalThis.atob(s), (ch) =>
          ch.charCodeAt(0),
        );
        return bin.buffer;
      }
      // If `c.data` is a raw array of numbers or Uint8Array-like
      if (c && c.data && !(typeof c.data === "string")) {
        const d = c.data;
        if (d instanceof Uint8Array) return d.buffer;
        try {
          return new Uint8Array(d).buffer;
        } catch (_) {
          // ignore and try next candidate
        }
      }
    } catch (_) {
      // Ignore errors for this candidate and try next one
    }
  }

  // If nothing matched, throw a helpful error describing top-level keys to help debugging.
  const keys = Object.keys(src || {}).slice(0, 20);
  throw new TypeError(
    "Unable to convert AI output to ArrayBufferLike. Top-level keys: " +
      JSON.stringify(keys),
  );
}
