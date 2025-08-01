"use client";

import React from 'react';
import { 
  HierarchicalSelector, 
  HierarchicalItem, 
  ItemDisplayConfig, 
  FilterConfig 
} from "@/components/ui/hierarchical-selector";
import { FileText, AlertCircle, Clock, CheckCircle, XCircle, Pause } from "lucide-react";

// Ticket interface extending HierarchicalItem
export interface Ticket extends HierarchicalItem {
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  account: {
    id: string;
    name: string;
  };
  assignee?: {
    id: string;
    name: string;
  } | null;
  totalTimeSpent?: number;
  timeEntriesCount?: number;
}

export interface TicketSelectorProps {
  tickets: Ticket[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  enableFilters?: boolean;
  enableGrouping?: boolean;
  className?: string;
}

export function TicketSelector({
  tickets,
  value,
  onValueChange,
  placeholder = "Select a ticket",
  enableFilters = true,
  enableGrouping = true,
  className = ""
}: TicketSelectorProps) {
  
  // Convert tickets to hierarchical items (tickets are flat, so no parentId)
  const hierarchicalTickets: Ticket[] = tickets.map(ticket => ({
    ...ticket,
    name: `${ticket.ticketNumber} - ${ticket.title}`,
    parentId: null
  }));

  // Ticket-specific display configuration
  const displayConfig: ItemDisplayConfig<Ticket> = {
    getIcon: (ticket) => {
      switch (ticket.status) {
        case 'OPEN':
          return <AlertCircle className="h-4 w-4" />;
        case 'IN_PROGRESS':
          return <Clock className="h-4 w-4" />;
        case 'CLOSED':
          return <CheckCircle className="h-4 w-4" />;
        case 'CANCELLED':
          return <XCircle className="h-4 w-4" />;
        case 'ON_HOLD':
          return <Pause className="h-4 w-4" />;
        default:
          return <FileText className="h-4 w-4" />;
      }
    },
    
    getBadge: (ticket) => {
      const getStatusVariant = (status: string) => {
        switch (status) {
          case 'OPEN':
            return 'destructive' as const;
          case 'IN_PROGRESS':
            return 'default' as const;
          case 'CLOSED':
            return 'secondary' as const;
          case 'CANCELLED':
            return 'outline' as const;
          case 'ON_HOLD':
            return 'secondary' as const;
          default:
            return 'outline' as const;
        }
      };
      
      return {
        text: ticket.status.replace('_', ' '),
        variant: getStatusVariant(ticket.status)
      };
    },
    
    getGroup: (ticket) => {
      if (enableGrouping) {
        return ticket.account.name;
      }
      return undefined;
    },
    
    getSearchableText: (ticket) => {
      const searchableTexts = [
        ticket.ticketNumber,
        ticket.title,
        ticket.account.name
      ];
      
      if (ticket.assignee?.name) {
        searchableTexts.push(ticket.assignee.name);
      }
      
      return searchableTexts;
    }
  };

  // Ticket-specific filter configurations
  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      icon: <FileText className="h-3 w-3 mr-1" />,
      getValue: (ticket: Ticket) => ticket.status
    },
    {
      key: 'priority',
      label: 'Priority',
      icon: <AlertCircle className="h-3 w-3 mr-1" />,
      getValue: (ticket: Ticket) => ticket.priority
    }
  ];

  return (
    <HierarchicalSelector<Ticket>
      items={hierarchicalTickets}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      displayConfig={displayConfig}
      filterConfigs={enableFilters ? filterConfigs : []}
      enableGrouping={enableGrouping}
      enableSearch={true}
      enableFilters={enableFilters}
      searchPlaceholder="Search tickets..."
      emptyMessage="No tickets found"
      className={className}
    />
  );
}

// Re-export the Ticket interface for convenience
export type { Ticket };