"use client";

import React from 'react';
import { 
  HierarchicalSelector, 
  HierarchicalItem, 
  ItemDisplayConfig, 
  FilterConfig 
} from "@/components/ui/hierarchical-selector";
import { 
  FileText, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Pause, 
  User, 
  Building, 
  Calendar,
  Timer,
  UserCheck 
} from "lucide-react";

// Extended Ticket interface with all available fields
export interface Ticket extends HierarchicalItem {
  ticketNumber: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  account: {
    id: string;
    name: string;
    accountType?: string;
  };
  assignee?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  creator?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  assignedAccountUser?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  totalTimeSpent?: number;
  timeEntriesCount?: number;
  addonsCount?: number;
  totalAddonCost?: number;
}

export interface TicketSelectorProps {
  tickets: Ticket[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  enableFilters?: boolean;
  enableGrouping?: boolean;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
  // Filter options - control which filters are shown
  showStatusFilter?: boolean;
  showPriorityFilter?: boolean;
  showAccountFilter?: boolean;
  showAssigneeFilter?: boolean;
  showCreatorFilter?: boolean;
  showCustomerFilter?: boolean;
  showTimeTrackingFilter?: boolean;
  showCreatedDateFilter?: boolean;
  // Display options
  showSubtitle?: boolean;
  showTimeInfo?: boolean;
  maxHeight?: string;
}

export function TicketSelector({
  tickets,
  value,
  onValueChange,
  placeholder = "Select a ticket",
  enableFilters = true,
  enableGrouping = true,
  disabled = false,
  className = "",
  allowClear = false,
  // Filter visibility controls (default all to true when filters are enabled)
  showStatusFilter = true,
  showPriorityFilter = true,
  showAccountFilter = true,
  showAssigneeFilter = true,
  showCreatorFilter = false, // Hidden by default as it's less commonly needed
  showCustomerFilter = true,
  showTimeTrackingFilter = true,
  showCreatedDateFilter = true,
  // Display options
  showSubtitle = true,
  showTimeInfo = true,
  maxHeight = "400px"
}: TicketSelectorProps) {
  
  // Convert tickets to hierarchical items (tickets are flat, so no parentId)
  const hierarchicalTickets: Ticket[] = tickets.map(ticket => ({
    ...ticket,
    name: `${ticket.ticketNumber} - ${ticket.title}`,
    parentId: null
  }));

  // Enhanced ticket display configuration
  const displayConfig: ItemDisplayConfig<Ticket> = {
    getIcon: (ticket) => {
      switch (ticket.status) {
        case 'OPEN':
          return <AlertCircle className="h-4 w-4 text-red-500" />;
        case 'IN_PROGRESS':
          return <Clock className="h-4 w-4 text-blue-500" />;
        case 'RESOLVED':
          return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'CLOSED':
          return <CheckCircle className="h-4 w-4 text-gray-500" />;
        case 'CANCELLED':
          return <XCircle className="h-4 w-4 text-gray-400" />;
        case 'ON_HOLD':
          return <Pause className="h-4 w-4 text-yellow-500" />;
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
          case 'RESOLVED':
            return 'secondary' as const;
          case 'CLOSED':
            return 'outline' as const;
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
        // Group by account for better organization
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
      
      if (ticket.description) {
        searchableTexts.push(ticket.description);
      }
      
      if (ticket.assignee?.name) {
        searchableTexts.push(ticket.assignee.name);
      }
      
      if (ticket.creator?.name) {
        searchableTexts.push(ticket.creator.name);
      }
      
      if (ticket.assignedAccountUser?.name) {
        searchableTexts.push(ticket.assignedAccountUser.name);
      }
      
      return searchableTexts;
    },

    getSubtitle: (ticket) => {
      if (!showSubtitle) return undefined;
      
      const parts = [];
      
      // Add assignee info
      if (ticket.assignee) {
        parts.push(`Assigned to: ${ticket.assignee.name}`);
      } else {
        parts.push("Unassigned");
      }
      
      // Add customer info if available
      if (ticket.assignedAccountUser) {
        parts.push(`Customer: ${ticket.assignedAccountUser.name}`);
      }
      
      // Add time info if available and enabled
      if (showTimeInfo && ticket.totalTimeSpent && ticket.totalTimeSpent > 0) {
        const hours = Math.floor(ticket.totalTimeSpent / 60);
        const minutes = ticket.totalTimeSpent % 60;
        parts.push(`Time: ${hours}h ${minutes}m`);
      }
      
      return parts.length > 0 ? parts.join(" • ") : undefined;
    }
  };

  // Comprehensive filter configurations with conditional inclusion
  const filterConfigs: FilterConfig[] = [];
  
  if (enableFilters) {
    if (showStatusFilter) {
      filterConfigs.push({
        key: 'status',
        label: 'Status',
        icon: <FileText className="h-3 w-3 mr-1" />,
        getValue: (ticket: Ticket) => ticket.status,
        formatValue: (value: string) => value.replace('_', ' ')
      });
    }
    
    if (showPriorityFilter) {
      filterConfigs.push({
        key: 'priority',
        label: 'Priority',
        icon: <AlertCircle className="h-3 w-3 mr-1" />,
        getValue: (ticket: Ticket) => ticket.priority
      });
    }
    
    if (showAccountFilter) {
      filterConfigs.push({
        key: 'account',
        label: 'Account',
        icon: <Building className="h-3 w-3 mr-1" />,
        getValue: (ticket: Ticket) => ticket.account.name
      });
    }
    
    if (showAssigneeFilter) {
      filterConfigs.push({
        key: 'assignee',
        label: 'Assignee',
        icon: <User className="h-3 w-3 mr-1" />,
        getValue: (ticket: Ticket) => ticket.assignee?.name || 'Unassigned',
        formatValue: (value: string) => value === 'undefined' ? 'Unassigned' : value
      });
    }
    
    if (showCreatorFilter) {
      filterConfigs.push({
        key: 'creator',
        label: 'Creator',
        icon: <UserCheck className="h-3 w-3 mr-1" />,
        getValue: (ticket: Ticket) => ticket.creator?.name || 'Unknown',
        formatValue: (value: string) => value === 'undefined' ? 'Unknown' : value
      });
    }
    
    if (showCustomerFilter) {
      filterConfigs.push({
        key: 'customer',
        label: 'Customer',
        icon: <User className="h-3 w-3 mr-1" />,
        getValue: (ticket: Ticket) => ticket.assignedAccountUser?.name || 'No Customer',
        formatValue: (value: string) => value === 'undefined' ? 'No Customer' : value
      });
    }
    
    if (showTimeTrackingFilter) {
      filterConfigs.push({
        key: 'hasTimeEntries',
        label: 'Time Tracking',
        icon: <Timer className="h-3 w-3 mr-1" />,
        getValue: (ticket: Ticket) => {
          const count = ticket.timeEntriesCount || 0;
          if (count === 0) return 'No Time Logged';
          if (count === 1) return '1 Entry';
          return `${count} Entries`;
        }
      });
    }
    
    if (showCreatedDateFilter) {
      filterConfigs.push({
        key: 'createdDate',
        label: 'Created',
        icon: <Calendar className="h-3 w-3 mr-1" />,
        getValue: (ticket: Ticket) => {
          const date = new Date(ticket.createdAt);
          const now = new Date();
          const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 0) return 'Today';
          if (diffDays === 1) return 'Yesterday';
          if (diffDays < 7) return 'This Week';
          if (diffDays < 30) return 'This Month';
          if (diffDays < 90) return 'Last 3 Months';
          return 'Older';
        }
      });
    }
  }

  return (
    <HierarchicalSelector<Ticket>
      items={hierarchicalTickets}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      displayConfig={displayConfig}
      filterConfigs={filterConfigs}
      enableGrouping={enableGrouping}
      enableSearch={true}
      enableFilters={enableFilters}
      allowClear={allowClear}
      searchPlaceholder="Search tickets by number, title, description, assignee..."
      emptyMessage="No tickets found"
      disabled={disabled}
      className={className}
      maxHeight={maxHeight}
    />
  );
}

// Re-export the Ticket interface for convenience
export type { Ticket };