import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="eyebrow text-gold-600">404</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="mt-3 text-muted">The design may have been removed or the link is incomplete.</p>
      <Link
        href="/catalog"
        className="mt-6 inline-flex h-12 items-center rounded-md bg-maroon px-6 font-semibold text-white"
      >
        Browse catalog
      </Link>
    </div>
  );
}
