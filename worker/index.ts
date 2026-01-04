
import { Client } from 'pg';

// Added Hyperdrive interface definition to resolve TypeScript reference error
export interface Hyperdrive {
  connectionString: string;
}

export interface Env {
  HYPERDRIVE: Hyperdrive;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Hyperdrive optimized connection string
    const client = new Client({
      connectionString: env.HYPERDRIVE.connectionString,
    });

    try {
      await client.connect();

      // Route handling for Community and Activity data
      if (url.pathname === '/api/optimized/posts') {
        const result = await client.query('SELECT * FROM posts WHERE status = $1 ORDER BY timestamp DESC LIMIT 50', ['public']);
        return new Response(JSON.stringify(result.rows), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      if (url.pathname === '/api/optimized/requests') {
        const userId = url.searchParams.get('userId');
        const result = await client.query('SELECT * FROM message_requests WHERE receiver_id = $1', [userId]);
        return new Response(JSON.stringify(result.rows), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      return new Response('Not Found', { status: 404 });
    } catch (e) {
      return new Response('Database Error', { status: 500 });
    } finally {
      await client.end();
    }
  },
};
