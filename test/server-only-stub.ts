// `server-only` throws unless it is resolved under React's "react-server"
// condition. Vitest aliases the package to this empty module so server modules
// can be imported directly in integration tests.
export {};
