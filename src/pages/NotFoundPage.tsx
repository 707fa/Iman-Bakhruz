import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-white px-6 text-center text-charcoal dark:bg-black dark:text-white">
      <div className="max-w-md space-y-4">
        <p className="text-6xl font-black text-burgundy-700">404</p>
        <h1 className="text-xl font-bold">Page not found</h1>
        <p className="text-sm text-charcoal/60 dark:text-zinc-400">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-block rounded-xl bg-burgundy-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-burgundy-800"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
