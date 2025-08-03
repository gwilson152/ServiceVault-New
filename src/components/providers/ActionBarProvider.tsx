"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback } from "react";

export interface ActionItem {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
}

interface ActionBarContextValue {
  actions: ActionItem[];
  setActions: (actions: ActionItem[]) => void;
  addAction: (action: ActionItem) => void;
  removeAction: (id: string) => void;
  clearActions: () => void;
}

const ActionBarContext = createContext<ActionBarContextValue | undefined>(undefined);

export function ActionBarProvider({ children }: { children: ReactNode }) {
  const [actions, setActionsState] = useState<ActionItem[]>([]);

  const setActions = useCallback((newActions: ActionItem[]) => {
    setActionsState(newActions);
  }, []);

  const addAction = useCallback((action: ActionItem) => {
    setActionsState(prev => {
      // Replace if action with same ID exists, otherwise add
      const existing = prev.findIndex(a => a.id === action.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = action;
        return updated;
      }
      return [...prev, action];
    });
  }, []);

  const removeAction = useCallback((id: string) => {
    setActionsState(prev => prev.filter(action => action.id !== id));
  }, []);

  const clearActions = useCallback(() => {
    setActionsState([]);
  }, []);

  const contextValue = useMemo(() => ({
    actions,
    setActions,
    addAction,
    removeAction,
    clearActions
  }), [actions, setActions, addAction, removeAction, clearActions]);

  return (
    <ActionBarContext.Provider value={contextValue}>
      {children}
    </ActionBarContext.Provider>
  );
}

export function useActionBar() {
  const context = useContext(ActionBarContext);
  if (context === undefined) {
    throw new Error('useActionBar must be used within an ActionBarProvider');
  }
  return context;
}