// "Is anything listening on localhost:<port>?" - the one implementation, shared by the port
// registry (which needs the answer SYNCHRONOUSLY, so it runs this file as a child process) and
// the shell guard hook (which is async and imports it directly).
//
// A probe only ever CONNECTS. It never sends, never kills, never assumes whose server it found.

import { connect } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** True when something accepts TCP connections on localhost:port. */
export function isPortBusy(port, timeoutMs = 500) {
  return new Promise((resolve) => {
    const socket = connect({ port, host: '127.0.0.1' });
    const finish = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

// CLI: `node scripts/port-probe.mjs 5202 5203` prints {"5202":true,"5203":false}. The registry
// probes a whole candidate pair in ONE child process, so allocation costs one spawn per port
// it tries rather than two.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ports = process.argv.slice(2).map(Number).filter((p) => Number.isInteger(p) && p > 0);
  const results = await Promise.all(ports.map((p) => isPortBusy(p)));
  console.log(JSON.stringify(Object.fromEntries(ports.map((p, i) => [p, results[i]]))));
}
