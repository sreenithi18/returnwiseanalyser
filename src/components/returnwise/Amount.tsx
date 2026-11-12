import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { inr } from "@/lib/returnwise/client";
import { inrShort } from "@/lib/returnwise/format";

/** Large amount in short form (₹5.5L); the full value shows on hover or focus. */
export function Amount({ value, className = "" }: { value: number; className?: string }) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className={`cursor-help tabular ${className}`} aria-label={inr(value)}>{inrShort(value)}</span>
        </TooltipTrigger>
        <TooltipContent>{inr(value)}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
