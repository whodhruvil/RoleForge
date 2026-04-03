import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      suppressHydrationWarning
      className={cn(
        "input-glass flex h-10 w-full rounded-md px-3 py-2 text-sm transition outline-none",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
