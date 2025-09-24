// Define shared headers for responses.
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };

export default {
  async fetch(request, env) {
    // Handle CORS preflight requests.
    if (request.method === 'OPTIONS') return new Response(null, { headers: { ...headers, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Max-Age': '86400' }});
    
    // Enforce POST and JSON content-type.
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers });
    if (!request.headers.get('content-type')?.includes('application/json')) return new Response(JSON.stringify({ error: 'Request must be application/json' }), { status: 400, headers });

    try {
      const { query, params = [], binding } = await request.json();

      // Validate binding, query, and permissions.
      if (!binding || !env[binding]) return new Response(JSON.stringify({ error: 'Invalid or missing binding provided.' }), { status: 400, headers });
      if (!query || typeof query !== 'string' || query.trim().includes(';')) return new Response(JSON.stringify({ error: 'Invalid or forbidden query provided.' }), { status: 400, headers });
      if (!/^(select|insert|explain)\b/i.test(query.trim())) return new Response(JSON.stringify({ error: 'Forbidden: Only SELECT, INSERT, and EXPLAIN are permitted.' }), { status: 403, headers });

      // Execute the prepared statement against the specified D1 binding.
      const result = await env[binding].prepare(query).bind(...params).all();
      
      // Return results with correct content-type.
      return new Response(JSON.stringify(result, null, 2), { headers: { ...headers, 'Content-Type': 'application/json' } });

    } catch (e) {
      // Catch and format any runtime errors.
      const errorMsg = e.cause?.message ?? e.message;
      return new Response(JSON.stringify({ error: 'Database Error', details: errorMsg }), { status: 500, headers });
    }
  },
};
