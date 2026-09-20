/**
 * Cloudflare Worker for Multilingual Embeddings (BGE-M3)
 * Model: @cf/baai/bge-m3 (1024 dimensions, multilingual: Hindi, Sanskrit, English)
 * 
 * Deployment:
 * 1. npx wrangler init samwad-embed
 * 2. Set binding `[ai] binding = "AI"` in wrangler.toml
 * 3. npx wrangler deploy
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    try {
      const body = await request.json();
      const texts = Array.isArray(body?.texts) ? body.texts : [];
      if (!texts.length) {
        return new Response(JSON.stringify({ embeddings: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Process batch with Workers AI BGE-M3 (max 50 at a time)
      const cleanTexts = texts.slice(0, 50).map((t) => (t || "").toString().slice(0, 1000));
      const response = await env.AI.run("@cf/baai/bge-m3", {
        text: cleanTexts
      });

      const embeddings = response?.data || response?.embeddings || [];

      return new Response(JSON.stringify({ embeddings }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || "Failed to generate embeddings" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
