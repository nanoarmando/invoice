import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full min-w-0 border border-[#E5E5E5] rounded-lg bg-[#FAFAFA] px-3 py-2 text-[13px] text-[#111111] placeholder:text-[#BBBBBB] focus:outline-none focus:border-[#111111] transition-colors resize-none",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
