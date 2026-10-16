/**
 * Every E2E server port derives from `E2E_PORT`, so checkouts running their
 * suites side by side never collide.
 */
export const previewPort = Number(process.env.E2E_PORT ?? 4173);
/** One origin serving the current or the next build, switched by the update test. */
export const releasePort = previewPort + 1000;
/** `vite preview` of the next build, reached through the release server. */
export const nextBuildPort = previewPort + 2000;
