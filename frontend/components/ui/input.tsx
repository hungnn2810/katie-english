import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-border bg-white px-3 py-1 text-sm outline-none transition-colors",
        "placeholder:text-slate-400 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-highlight aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-highlight/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
