import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "subtle" | "danger";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const styles: Record<Variant, string> = {
  primary:
    "bg-fg text-bg border-fg hover:opacity-90 disabled:opacity-50",
  ghost:
    "bg-transparent text-fg border-border-strong hover:bg-bg-subtle disabled:opacity-50",
  subtle:
    "bg-bg-subtle text-fg border-border hover:bg-bg-elev disabled:opacity-50",
  danger:
    "bg-transparent text-danger border-border-strong hover:bg-danger/10 disabled:opacity-50",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-sm font-medium transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        styles[variant],
        className,
      )}
      {...rest}
    />
  );
});
