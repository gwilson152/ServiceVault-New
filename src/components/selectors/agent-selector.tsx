"use client";

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { User, Mail } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AgentSelectorProps {
  agents: Agent[];
  selectedAgentId: string;
  onAgentChange: (agentId: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function AgentSelector({
  agents,
  selectedAgentId,
  onAgentChange,
  label = "Assigned Agent",
  placeholder = "Select an agent",
  className = "",
  disabled = false
}: AgentSelectorProps) {
  
  // Filter to only show employees and admins (not account users)
  const availableAgents = agents.filter(agent => 
    agent.role === 'ADMIN' || agent.role === 'EMPLOYEE'
  );

  const renderAgentOptions = () => {
    const options = [
      <SelectItem key="unassigned" value="unassigned">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>Unassigned</span>
        </div>
      </SelectItem>
    ];

    availableAgents.forEach(agent => {
      options.push(
        <SelectItem key={`agent-${agent.id}`} value={agent.id}>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            <div className="flex flex-col">
              <span className="font-medium">{agent.name}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {agent.email} • {agent.role}
              </span>
            </div>
          </div>
        </SelectItem>
      );
    });

    return options;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="agent-select">
        {label}
        <span className="text-xs text-muted-foreground ml-2">
          (Internal staff who will work on this ticket)
        </span>
      </Label>
      <Select 
        value={selectedAgentId} 
        onValueChange={onAgentChange}
        disabled={disabled}
      >
        <SelectTrigger id="agent-select">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {renderAgentOptions()}
        </SelectContent>
      </Select>
    </div>
  );
}

export type { Agent };