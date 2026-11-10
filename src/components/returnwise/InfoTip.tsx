import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const RATE_LABEL = "Return rate (units)";
export const RATE_TIP = "Returned units / units sold";

/** Small (i) icon that shows an explanation on hover or keyboard focus. */
export function InfoTip({ tip, label }: { tip: string; label?: string }) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label={label ?? tip} className="inline-flex cursor-help align-middle opacity-70 hover:opacity-100">
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ReturnRateLabel() {
  return <span className="inline-flex items-center gap-1">{RATE_LABEL}<InfoTip tip={RATE_TIP} label={`${RATE_LABEL}: ${RATE_TIP}`} /></span>;
}
