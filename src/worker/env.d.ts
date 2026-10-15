// Bindningar för `env` från cloudflare:test.
declare namespace Cloudflare {
  interface Env {
    ROOM: DurableObjectNamespace<import('./room').Room>;
  }
}
