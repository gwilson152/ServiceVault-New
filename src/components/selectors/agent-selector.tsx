"use client";

import React, { useState, useEffect } from 'react';
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
  selectedAgentId: string;
  onAgentChange: (agentId: string) => void;
  accountId?: string; // Optional account context for scoped permissions
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function AgentSelector({
  selectedAgentId,
  onAgentChange,
  accountId,
  label = "Assigned Agent",
  placeholder = "Select an agent",
  className = "",
  disabled = false
}: AgentSelectorProps) {
  const [assignableAgents, setAssignableAgents] = useState<Agent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  // Fetch assignable agents based on permissions
  useEffect(() => {
    setIsLoadingAgents(true);
    const url = accountId 
      ? `/api/users/assignable?accountId=${accountId}`
      : '/api/users/assignable';
    
    fetch(url)
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Failed to fetch assignable agents');
      })
      .then((data: { assignableUsers: Agent[] }) => {
        setAssignableAgents(data.assignableUsers || []);
      })
      .catch(error => {
        console.error('Error fetching assignable agents:', error);
        setAssignableAgents([]);
      })
      .finally(() => {
        setIsLoadingAgents(false);
      });
  }, [accountId]);

  const renderAgentOptions = () => {
    const options = [
      <SelectItem key="unassigned" value="unassigned">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>Unassigned</span>
        </div>
      </SelectItem>
    ];

    assignableAgents.forEach(agent => {
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
        {isLoadingAgents && (
          <span className="text-xs text-muted-foreground ml-2">(Loading agents...)</span>
        )}
        <span className="text-xs text-muted-foreground ml-2">
          (Users with assignment permissions)
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