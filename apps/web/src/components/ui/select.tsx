import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Props = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        "w-full appearance-none rounded-md border border-border bg-bg-elev px-3 py-2 pr-8 text-sm text-fg outline-none focus:border-accent",
        "bg-[linear-gradient(45deg,transparent_50%,var(--text-muted)_50%),linear-gradient(135deg,var(--text-muted)_50%,transparent_50%)] bg-[length:4px_4px,4px_4px] bg-[position:calc(100%-16px)_50%,calc(100%-12px)_50%] bg-no-repeat",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});
