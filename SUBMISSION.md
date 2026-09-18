# Product Engineering Challenge Submission

## Candidate

- **Name:** Aman Verma
- **Email:** AMANverma9118359330@gmail.com
- **GitHub:** https://github.com/AMANverma9118/product-engineer-ps
- **Selected problem:** Problem 3 — Reconnecting Real-Time Feed
- **Demo video:** https://drive.google.com/file/d/1oOLOQ6cN0DkCjEIqc5VinbrfhHlLz3rj/view?usp=sharing

**Hosted demo**

- Frontend: https://reconnecting-realtime-feed.vercel.app
- Backend health: https://product-engineer-ps.onrender.com/api/health

The Render free instance sleeps after idle time. The first request after sleep can take about 50 seconds; the client shows **Reconnecting** until Socket.IO comes back.

## Run the project

Prerequisites: Node.js 20+, npm, and a MongoDB instance (local or Atlas).

```text
# 1. Start MongoDB locally, or set MONGODB_URI to an Atlas connection string.

# 2. Backend
cd problems/03-reconnecting-realtime-feed/server
cp .env.example .env
# .env defaults:
#   MONGODB_URI=mongodb://127.0.0.1:27017/incident-feed
#   PORT=3001
#   CLIENT_ORIGIN=http://localhost:5173
npm install
npm start

# 3. Frontend (second terminal)
cd problems/03-reconnecting-realtime-feed/client
cp .env.example .env
# .env defaults:
#   VITE_API_URL=http://localhost:3001
#   VITE_SOCKET_URL=http://localhost:3001
npm install
npm run dev
```

Open http://localhost:5173 in two browser windows.

**Live update (AC1):** type a message in window A and click **Send Update**. Window B should show it without refresh.

**Disconnect and recovery (AC2–AC4):** in window B click **Simulate Disconnect**. Publish one or more updates from window A. Click **Reconnect** in window B. Missed updates should appear, each only once, and the status should move Connected → Disconnected → Reconnecting → Connected.

**Ordering (AC5):** recovered and live updates render in ascending server `sequence`.

Do not commit `.env` files. They contain secrets.

## Run the tests

Tests use an in-memory feed and do not need MongoDB or paid services.

```text
cd problems/03-reconnecting-realtime-feed/server
npm install
npm test

cd problems/03-reconnecting-realtime-feed/client
npm install
npm test
```

Covered paths:

- Publishing and receiving a live Socket.IO update (two clients)
- HTTP recovery after `afterSequence`
- Deduplicating an update that arrives on both the live and recovery paths
- Incident-room isolation and invalid publish payloads
- Recovery HTTP 503 when the database is unavailable

## Architecture and data flow

Two delivery paths are kept separate on purpose.

- **Durable history:** MongoDB documents plus an atomic per-incident counter. This is the source of truth for identity, order, and recovery.
- **Transient delivery:** Socket.IO rooms. This only notifies currently connected clients.

```text
Client A                         Server                         Client B
   |                                |                              |
   |  publish_update                |                              |
   |------------------------------->|                              |
   |                    persist to Mongo                           |
   |                    (UUID + sequence)                          |
   |  ack { update }                |  update_created              |
   |<-------------------------------|----------------------------->|
   |                                |                              |
   |                         (B disconnects)                       |
   |  publish_update                |                              |
   |------------------------------->|  persist; B is not in room   |
   |                                |                              |
   |                         (B reconnects)                        |
   |                                |  join_incident               |
   |                                |<-----------------------------|
   |                                |  GET .../updates?afterSequence=N
   |                                |<-----------------------------|
   |                                |  missed updates              |
   |                                |----------------------------->|
```

Main pieces:

| Piece | Responsibility |
| --- | --- |
| `server/src/socket/index.js` | Join rooms, validate publish, persist, broadcast `update_created` |
| `server/src/services/feedService.js` | Assign sequence, write history, query after a cursor |
| `server/src/controllers/updatesController.js` | HTTP recovery: `GET /api/incidents/:incidentId/updates?afterSequence=` |
| `client/src/hooks/useIncidentFeed.ts` | Connection state, publish, recover, ingest |
| `client/src/utils/mergeUpdates.ts` | Filter by incident, drop duplicate `updateId`s, sort by `sequence` |

An update is:

- `updateId` — server UUID, stable across live and recovery
- `incidentId` — room key (`incident-123` in the UI)
- `message` — trimmed text, max 500 characters
- `createdAt` — server timestamp
- `sequence` — per-incident integer used for order and resume

On connect and every reconnect the client joins the incident room, then requests `GET /api/incidents/:id/updates?afterSequence=N` where `N` is the highest sequence already on screen (0 on first load). Live events and recovery results go through the same `ingest` function so overlapping delivery cannot show the same `updateId` twice.

## Technology choices

**Socket.IO over raw WebSockets or SSE.** The feed needs rooms, acknowledgements, and reconnect with backoff. Socket.IO provides those without a custom protocol. SSE would be a reasonable live transport, but publish would then be a separate HTTP POST and reconnect/cursor handling would still be custom. Long polling would work but waste requests. Socket.IO still falls back to HTTP polling if WebSockets are blocked.

**MongoDB for history.** The brief asks for durable recovery, not an in-memory demo. An atomic `$inc` on one counter document per incident gives a monotonic sequence even with concurrent publishes. Redis Streams or Postgres `LISTEN/NOTIFY` would also work; Mongo matched the rest of the stack and Atlas was available for hosting.

**React + Vite for the client.** A small hook owns feed state. The UI is intentionally plain.

**Trade-off:** this process owns Socket.IO in memory. Multiple API instances would share Mongo history and sequences, but not live broadcasts, unless a Redis adapter is added. That is out of scope for the brief.

## Important decisions

**1. Server-assigned sequence is the resume cursor.** The client does not resume from timestamps or array length. It stores the max `sequence` it has ingested and asks for `sequence > N`. The server is the only component that assigns order, via `Counter.findOneAndUpdate({ $inc: { seq: 1 } })`. Gaps are possible if increment succeeds and the following insert fails; recovery still returns what was actually persisted, in sequence order.

**2. Deduplication lives on the client, keyed by `updateId`.** The publisher applies the Socket.IO ack locally and also receives `update_created`. Recovery can overlap with live events that arrive during the HTTP round trip. `mergeUpdates` keeps the first copy of each `updateId`, then sorts by `sequence`. The server does not try to suppress those races.

**3. Reconnect is delayed, not a tight loop.** Socket.IO is configured with `reconnectionDelay` 1000ms, `reconnectionDelayMax` 5000ms, and `randomizationFactor` 0.5. Attempts are unbounded so a laptop that slept can still recover; **Simulate Disconnect** turns auto-reconnect off so the demo can hold a disconnected client. Manual **Reconnect** turns it back on.

## Assumptions and limitations

- One default incident (`incident-123`) is enough for the demo. Rooms are still isolated by `incidentId`.
- No auth, presence, edit, or delete (out of scope).
- No optimistic client-generated rows. The publisher waits for the server ack (and/or the live event).
- History replay is currently unbounded: recovery returns every document after the cursor.
- Reconnect attempt count is not capped; delay is.
- A single Node process. Live fan-out is in-process Socket.IO.
- Demo controls are shown in production so a reviewer can disconnect without browser DevTools.
- Render free tier spin-down can delay the first connection.

## Production and scale

If this had to run as a real incident channel, I would change these first:

1. **Cap recovery.** Add `limit` (and optionally a `beforeSequence` / time bound) so a client that has been offline for days cannot pull the entire collection. Older history would move behind a snapshot or paged API.
2. **Share live fan-out.** Run more than one API instance with the Socket.IO Redis adapter so broadcasts and room membership survive horizontal scale. Keep Mongo as the ordering authority; the atomic counter already works across writers on one replica set.
3. **Monitor** connected sockets, publish ack failures, recovery query latency and result size, Mongo connectivity, and sequence-gap rate (increment succeeded, insert failed). Alert on sustained reconnect loops and 503s from recovery.

### Required design questions

**What happens if a client disconnects immediately after sending an update?**  
Persist runs on the server independently of the publisher staying connected. If the write committed, other members of the room get `update_created`, and the publisher may miss the ack. On reconnect it joins again and recovers with `afterSequence`, so it still sees the update. If the socket died before the server handled `publish_update`, the message is not stored — offline compose is out of scope.

**How would multiple backend instances share and order events?**  
Ordering already goes through a Mongo counter document per incident, which is safe across API processes. Live notify would not be: each process has its own Socket.IO rooms. A Redis adapter (or a dedicated pub/sub) would be the next step. I would not elect a leader just to assign sequences; the database already does that.

**How would you prevent an unbounded history replay?**  
Require a cursor, enforce a max page size, and stop returning documents older than a retention window. A client that needs more would page. Operators could compact very old incidents into a snapshot.

**What would you monitor in production?**  
`/api/health` (including Mongo state), publish success/error, recovery duration and row count, socket connect/disconnect reasons, and reconnect storm rate after deploys or Atlas blips.

## AI usage

Cursor was used to:

- Prepare Render and Vercel hosting (build command, CORS origin, env wiring)
- Show **Simulate Disconnect** / **Reconnect** on the hosted client (they were previously `import.meta.env.DEV` only)
- Draft this `SUBMISSION.md` from the repository

The feed design, persistence, recovery cursor, client ingest/dedup, and automated tests were implemented in this repo as the solution itself. I reviewed the generated submission text against the code before including it.

## Credibility note

I work as a Software Development Engineer at RapidFacto, a small manufacturing-documentation product used for document control, training records, logbooks, and compliance tracking (ISO 13485 / CDSCO-oriented workflows).

- **Problem:** plants still keep controlled documents and audit evidence in files and informal tools. The product replaces that with a single system operators and quality teams can actually keep current.
- **My contribution:** full-stack work on the web app and APIs, plus getting those services deployed and kept healthy in production (frontend, Node APIs, cloud deploy, and performance fixes).
- **Scale / complexity:** an early-stage product (small team, production customers). The operational constraint that matters is correctness of records, not internet-scale throughput: a lost or reordered document is worse than a slow page.
- **Difficult decision:** treating audit-facing writes as durable server records rather than optimistic UI state. That makes the interface feel less instant, but it keeps the source of truth on the server so reconnects and audits see the same identifiers and order. The same idea shows up in this challenge: Socket.IO is only the live pipe; Mongo owns identity and sequence.
- **Evidence:** GitHub https://github.com/AMANverma9118 and LinkedIn https://www.linkedin.com/in/aman-verma-527537272. Internal RapidFacto details stay confidential.

