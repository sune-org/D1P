
import { D1Database } from '@cloudflare/workers-types';

export interface Env {
  sune: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Only allow POST requests for security
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { sql, params = [] } = await request.json();

      // Validate SQL statement type
      const normalizedSql = sql.trim().toLowerCase();
      
      // Block destructive operations
      if (
        normalizedSql.startsWith('delete') ||
        normalizedSql.startsWith('drop') ||
        normalizedSql.startsWith('truncate') ||
        normalizedSql.startsWith('alter') ||
        normalizedSql.includes('drop') ||
        normalizedSql.includes('delete') ||
        normalizedSql.includes('truncate')
      ) {
        return new Response('Destructive operations are not allowed', { status: 403 });
      }

      // Only allow SELECT, INSERT, UPDATE
      if (
        !normalizedSql.startsWith('select') &&
        !normalizedSql.startsWith('insert') &&
        !normalizedSql.startsWith('update')
      ) {
        return new Response('Only SELECT, INSERT, and UPDATE operations are allowed', { status: 403 });
      }

      // Execute the query
      const result = await env.sune.prepare(sql).bind(...params).all();
      
      return new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  },
};
