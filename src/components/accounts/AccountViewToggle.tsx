"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { LayoutGrid, ListTree } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = 'grid' | 'tree';

interface AccountViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
}

export function AccountViewToggle({ currentView, onViewChange, className }: AccountViewToggleProps) {
  return (
    <div className={cn("flex items-center rounded-lg border p-1", className)}>
      <Button
        variant={currentView === 'grid' ? 'default' : 'ghost'}
        size="sm"
        className="h-8 px-3"
        onClick={() => onViewChange('grid')}
      >
        <LayoutGrid className="h-4 w-4 mr-2" />
        Grid
      </Button>
      <Button
        variant={currentView === 'tree' ? 'default' : 'ghost'}
        size="sm"
        className="h-8 px-3"
        onClick={() => onViewChange('tree')}
      >
        <ListTree className="h-4 w-4 mr-2" />
        Tree
      </Button>
    </div>
  );
}