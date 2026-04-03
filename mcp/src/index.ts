import { createHttpServer } from "./server.js";

const port = Number(process.env.PORT ?? "8787");

const server = createHttpServer();

server.listen(port, () => {
  console.log(`witnessops-governed-recon listening on http://localhost:${port}/mcp`);
});
