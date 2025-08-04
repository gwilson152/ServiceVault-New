"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Check, X, Edit2 } from "lucide-react";

interface InvoiceDateFieldProps {
  value?: string;
  type: "issue" | "due";
  canUpdate: boolean;
  onUpdate: (newDate: string | null) => Promise<void>;
}

export function InvoiceDateField({ value, type, canUpdate, onUpdate }: InvoiceDateFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleStartEdit = () => {
    setEditValue(value || "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditValue(value || "");
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate(editValue || null);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update date:", error);
      // Reset to original value on error
      setEditValue(value || "");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) {
      return type === "due" ? "Not set" : "Today";
    }
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={formatDateForInput(editValue)}
          onChange={(e) => setEditValue(e.target.value)}
          className="flex-1"
          disabled={isLoading}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSaveEdit}
          disabled={isLoading}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancelEdit}
          disabled={isLoading}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className={`${!value && type === "due" ? "text-muted-foreground" : ""}`}>
        {formatDate(value)}
      </div>
      {canUpdate && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleStartEdit}
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}