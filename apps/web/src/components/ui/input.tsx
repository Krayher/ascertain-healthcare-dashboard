import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & { error?: boolean };

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { className, error, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-md border bg-bg-elev px-3 py-2 text-sm text-fg outline-none transition-colors",
        "placeholder:text-fg-subtle focus:border-accent",
        error ? "border-danger focus:border-danger" : "border-border",
        className,
      )}
      {...rest}
    />
  );
});
