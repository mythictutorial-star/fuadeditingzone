import { Client } from 'pg';

export interface Hyperdrive {
  connectionString: string;
}

export interface Env {
  HYPERDRIVE: Hyperdrive;
  DATABASE_URL: string; // Fallback direct URL
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Hyperdrive binding ID: 968130708eca4d779ad874ec00add44e
    // Fallback logic to ensure database connectivity is never interrupted
    const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL;
    
    const client = new Client({
      connectionString,
      connectionTimeoutMillis: 5000,
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

      // Handle message persistence fallback via worker if Firebase sync fails
      if (request.method === 'POST' && url.pathname === '/api/messages') {
        const payload = await request.json() as any;
        const queryText = 'INSERT INTO messages(sender_id, thread_id, content, timestamp) VALUES($1, $2, $3, $4)';
        await client.query(queryText, [payload.senderId, payload.threadId, payload.text, Date.now()]);
        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
      }

      return new Response('Not Found', { status: 404 });
    } catch (e: any) {
      console.error("Database Connection Failure:", e.message);
      return new Response(JSON.stringify({ error: 'Zone Database Offline', detail: e.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    } finally {
      await client.end();
    }
  },
};