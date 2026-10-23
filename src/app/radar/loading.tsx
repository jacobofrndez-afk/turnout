export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-16" aria-busy="true" aria-label="Loading">
      <span className="skeleton skeleton-title" />
      <span className="skeleton skeleton-line mt-8" />
      <span className="skeleton skeleton-line" />
      <span className="skeleton skeleton-block mt-12" />
    </main>
  );
}
