import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="grid h-full min-h-[480px] place-items-center px-6 py-20 text-center">
      <div>
        <p className="m-0 text-[160px] font-bold leading-none tracking-tighter">
          404<span>.</span>
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          This record can't be located.
        </h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-fg-muted">
          The chart you're looking for may have been merged, deleted, or never existed.
          Try searching by MRN or returning to the patient list.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Link to="/patients">
            <Button variant="ghost">Search patients</Button>
          </Link>
          <Link to="/">
            <Button>Go to overview</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
