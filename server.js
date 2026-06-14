const express    = require('express');
const http       = require('http');
const WebSocket  = require('ws');
const Database   = require('better-sqlite3');
const path       = require('path');
const fs         = require('fs');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });
const PORT   = process.env.PORT || 3000;

// ── Database setup ────────────────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'liquidaciones.db');
if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id        TEXT PRIMARY KEY,
    data      TEXT NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s','now'))
  );
  CREATE TABLE IF NOT EXISTS metadata (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`);

// ── Helpers ───────────────────────────────────────────────────────────────────
function getAllRecords() {
  return db.prepare('SELECT data FROM records ORDER BY rowid').all()
    .map(r => JSON.parse(r.data));
}

function upsertRecord(record) {
  db.prepare(`
    INSERT INTO records (id, data, updated_at)
    VALUES (@id, @data, strftime('%s','now'))
    ON CONFLICT(id) DO UPDATE SET data=@data, updated_at=strftime('%s','now')
  `).run({ id: record.id, data: JSON.stringify(record) });
}

function deleteRecord(id) {
  db.prepare('DELETE FROM records WHERE id=?').run(id);
}

// ── Broadcast to all connected clients except sender ─────────────────────────
function broadcast(senderWs, message) {
  const msg = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// ── WebSocket handlers ────────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  console.log(`Client connected. Total: ${wss.clients.size}`);

  // Send full dataset to new client
  ws.send(JSON.stringify({ type: 'INIT', records: getAllRecords() }));

  // Broadcast updated user count
  broadcast(null, { type: 'USERS', count: wss.clients.size });
  ws.send(JSON.stringify({ type: 'USERS', count: wss.clients.size }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      switch (msg.type) {

        case 'UPSERT':  // create or update a record
          upsertRecord(msg.record);
          broadcast(ws, { type: 'UPSERT', record: msg.record });
          break;

        case 'DELETE':  // delete one record
          deleteRecord(msg.id);
          broadcast(ws, { type: 'DELETE', id: msg.id });
          break;

        case 'DELETE_MANY':  // bulk delete
          msg.ids.forEach(id => deleteRecord(id));
          broadcast(ws, { type: 'DELETE_MANY', ids: msg.ids });
          break;

        case 'REPLACE_ALL':  // full sync (import / initial load)
          db.prepare('DELETE FROM records').run();
          const insertMany = db.transaction((records) => {
            records.forEach(r => upsertRecord(r));
          });
          insertMany(msg.records);
          broadcast(ws, { type: 'REPLACE_ALL', records: msg.records });
          break;
      }
    } catch (e) {
      console.error('WS message error:', e.message);
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected. Total: ${wss.clients.size}`);
    broadcast(null, { type: 'USERS', count: wss.clients.size });
  });

  ws.on('error', (e) => console.error('WS error:', e.message));
});

// ── REST: health check ────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true, users: wss.clients.size }));

// ── Static frontend ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
