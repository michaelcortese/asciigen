// Durable Object for storing conversation memory and state
export class ConversationDO {
  private state: DurableObjectState;
  private conversations: Map<string, Conversation> = new Map();

  constructor(ctx: DurableObjectState, env: any) {
    this.state = ctx;
    // Load persisted state
    this.state.storage.get<Map<string, Conversation>>("conversations").then((data) => {
      if (data) {
        this.conversations = data;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId") || "default";

    if (request.method === "GET") {
      // Get conversation history
      const conversation = this.conversations.get(sessionId) || {
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return new Response(JSON.stringify(conversation), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      // Add message to conversation
      const body = await request.json() as { role: string; content: string };
      
      let conversation = this.conversations.get(sessionId);
      if (!conversation) {
        conversation = {
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      }

      conversation.messages.push({
        role: body.role,
        content: body.content,
        timestamp: Date.now(),
      });
      conversation.updatedAt = Date.now();

      // Keep only last 50 messages to prevent unbounded growth
      if (conversation.messages.length > 50) {
        conversation.messages = conversation.messages.slice(-50);
      }

      this.conversations.set(sessionId, conversation);
      
      // Persist to storage
      await this.state.storage.put("conversations", this.conversations);

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "DELETE") {
      // Clear conversation
      this.conversations.delete(sessionId);
      await this.state.storage.put("conversations", this.conversations);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405 });
  }
}

interface Conversation {
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface Message {
  role: string;
  content: string;
  timestamp: number;
}

