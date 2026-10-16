/**
 * Serves one of two production builds at a single origin, so a service worker
 * installed from the current build later finds the next one, as after a deploy.
 * `POST /__e2e__/release/next` (or `/current`) switches the build behind it.
 */
import { createServer, request as forwardRequest, type Server } from "node:http";

export const releaseSwitchPath = "/__e2e__/release/";

export type ReleaseUpstreams = { current: number; next: number };

export function startReleaseServer(port: number, upstreams: ReleaseUpstreams): Promise<Server> {
  let served: keyof ReleaseUpstreams = "current";
  const server = createServer((request, response) => {
    const url = request.url ?? "/";
    if (request.method === "POST" && url.startsWith(releaseSwitchPath)) {
      const release = url.slice(releaseSwitchPath.length);
      if (release !== "current" && release !== "next") {
        response.writeHead(404).end(`Unknown release "${release}"; use current or next.`);
        return;
      }
      served = release;
      response.writeHead(204).end();
      return;
    }
    const upstreamPort = upstreams[served];
    const upstream = forwardRequest(
      {
        host: "localhost",
        port: upstreamPort,
        path: url,
        method: request.method,
        headers: { ...request.headers, host: `localhost:${upstreamPort}` },
      },
      (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
        upstreamResponse.pipe(response);
      },
    );
    upstream.on("error", (error) => {
      response.writeHead(502).end(`The ${served} build on port ${upstreamPort}: ${error.message}`);
    });
    request.pipe(upstream);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "localhost", () => resolve(server));
  });
}
