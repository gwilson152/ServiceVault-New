"use client";

import { Button } from "@/components/ui/button";
import { useActionBar } from "@/components/providers/ActionBarProvider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function ActionBar() {
  const { actions } = useActionBar();

  if (actions.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <Tooltip key={action.id}>
            <TooltipTrigger asChild>
              <Button
                variant={action.variant || "default"}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                className="flex items-center gap-2"
              >
                {action.icon}
                <span className="hidden sm:inline">{action.label}</span>
                {action.loading && (
                  <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
                )}
              </Button>
            </TooltipTrigger>
            {action.tooltip && (
              <TooltipContent>
                <p>{action.tooltip}</p>
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}