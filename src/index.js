
// Helper function for CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handler for CORS preflight OPTIONS requests
function handleOptions(request) {
  if (
    request.headers.get('Origin') !== null &&
    request.headers.get('Access-Control-Request-Method') !== null &&
    request.headers.get('Access-Control-Request-Headers') !== null
  ) {
    // Handle CORS pre-flight request.
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      }
    });
  } else {
    // Handle standard OPTIONS request.
    return new Response(null, { headers: { 'Allow': 'POST, OPTIONS' } });
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }
    
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed. This proxy only accepts POST requests.', { status: 405, headers: corsHeaders });
    }

    if (request.headers.get('content-type') !== 'application/json') {
        return new Response(JSON.stringify({ error: 'Request must be application/json' }), { status: 400, headers: corsHeaders });
    }

    try {
      const { query, params = [] } = await request.json();

      if (!query || typeof query !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid request: "query" property must be a non-empty string.' }), { status: 400, headers: corsHeaders });
      }

      // --- CRITICAL: Sanitize and validate the query ---
      const sanitizedQuery = query.trim().toLowerCase();
      
      // 1. Disallow multiple statements
      if (query.trim().includes(';')) {
          return new Response(JSON.stringify({ error: 'Forbidden: Multiple SQL statements are not allowed.' }), { status: 403, headers: corsHeaders });
      }

      // 2. Only allow approved starting verbs
      const allowedVerbs = ['select', 'insert', 'update', 'explain'];
      const isAllowedVerb = allowedVerbs.some(verb => sanitizedQuery.startsWith(verb));

      if (!isAllowedVerb) {
        return new Response(JSON.stringify({ error: 'Forbidden: Operation not allowed. Only SELECT, INSERT, UPDATE, and EXPLAIN are permitted.' }), { status: 403, headers: corsHeaders });
      }

      // --- Execute the query ---
      const stmt = env.DB.prepare(query).bind(...params);
      const result = await stmt.all();
      
      return new Response(JSON.stringify(result, null, 2), { headers: corsHeaders });

    } catch (e) {
      // Catch D1 errors and other exceptions
      const errorMsg = e.cause ? e.cause.message : e.message;
      return new Response(JSON.stringify({ error: 'Database Error', details: errorMsg }), { status: 500, headers: corsHeaders });
    }
  },
};
