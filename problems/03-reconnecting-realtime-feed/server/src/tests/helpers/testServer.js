import { createServer } from "node:http";
import { Server } from "socket.io";
import { createApp } from "../../app.js";
import { attachSocket } from "../../socket/index.js";

export async function startTestServer(feedService) {
  const app = createApp(feedService, {
    clientOrigin: "*",
    getMongoState: () => "connected",
  });
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });
  attachSocket(io, feedService);

  await new Promise((resolve) => {
    httpServer.listen(0, "127.0.0.1", () => resolve());
  });

  const address = httpServer.address();
  const url = `http://127.0.0.1:${address.port}`;

  return {
    httpServer,
    io,
    port: address.port,
    url,
    close: async () => {
      io.disconnectSockets(true);
      await new Promise((resolve, reject) => {
        io.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}
