"use client";

import React, { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Search, Building, Building2, User, ChevronRight, Filter, X, TreePine } from "lucide-react";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  name: string;
  accountType: string;
  companyName?: string;
  parentAccountId?: string | null;
  parentAccount?: {
    id: string;
    name: string;
    accountType: string;
  } | null;
  childAccounts?: {
    id: string;
    name: string;
    accountType: string;
  }[];
}

interface HierarchicalAccountSelectorProps {
  accounts: Account[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function HierarchicalAccountSelector({
  accounts,
  value,
  onValueChange,
  placeholder = "Select an account"
}: HierarchicalAccountSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Build hierarchical structure
  const accountHierarchy = useMemo(() => {
    const rootAccounts = accounts.filter(acc => !acc.parentAccountId);
    
    const buildTree = (account: Account, depth = 0): any => {
      const children = accounts.filter(acc => acc.parentAccountId === account.id);
      return {
        ...account,
        depth,
        children: children.map(child => buildTree(child, depth + 1))
      };
    };

    return rootAccounts.map(acc => buildTree(acc));
  }, [accounts]);

  // Flatten hierarchy for display with proper indentation
  const flattenedAccounts = useMemo(() => {
    const flattened: any[] = [];
    
    const flatten = (accounts: any[], parentPath = "") => {
      accounts.forEach(account => {
        const path = parentPath ? `${parentPath} > ${account.name}` : account.name;
        flattened.push({
          ...account,
          path,
          displayName: account.name,
        });
        
        if (account.children && account.children.length > 0) {
          flatten(account.children, path);
        }
      });
    };
    
    flatten(accountHierarchy);
    return flattened;
  }, [accountHierarchy]);

  // Filter accounts based on search query and filters
  const filteredAccounts = useMemo(() => {
    let filtered = flattenedAccounts;
    
    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(account => 
        account.name.toLowerCase().includes(query) ||
        account.companyName?.toLowerCase().includes(query) ||
        account.path.toLowerCase().includes(query)
      );
    }
    
    // Apply type filters
    if (activeFilters.size > 0) {
      filtered = filtered.filter(account => 
        activeFilters.has(account.accountType)
      );
    }
    
    return filtered;
  }, [flattenedAccounts, searchQuery, activeFilters]);
  
  // Group accounts by type for better organization
  const groupedAccounts = useMemo(() => {
    const groups = {
      ORGANIZATION: [] as any[],
      SUBSIDIARY: [] as any[],
      INDIVIDUAL: [] as any[]
    };
    
    filteredAccounts.forEach(account => {
      if (groups[account.accountType as keyof typeof groups]) {
        groups[account.accountType as keyof typeof groups].push(account);
      }
    });
    
    return groups;
  }, [filteredAccounts]);
  
  const toggleFilter = (accountType: string) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(accountType)) {
      newFilters.delete(accountType);
    } else {
      newFilters.add(accountType);
    }
    setActiveFilters(newFilters);
  };
  
  const clearAllFilters = () => {
    setActiveFilters(new Set());
    setSearchQuery("");
  };

  const getAccountIcon = (accountType: string) => {
    switch (accountType) {
      case 'ORGANIZATION':
        return <Building className="h-4 w-4" />;
      case 'SUBSIDIARY':
        return <Building2 className="h-4 w-4" />;
      case 'INDIVIDUAL':
        return <User className="h-4 w-4" />;
      default:
        return <Building className="h-4 w-4" />;
    }
  };

  const getAccountTypeColor = (accountType: string) => {
    switch (accountType) {
      case 'ORGANIZATION':
        return 'default';
      case 'SUBSIDIARY':
        return 'secondary';
      case 'INDIVIDUAL':
        return 'outline';
      default:
        return 'default';
    }
  };

  const selectedAccount = accounts.find(acc => acc.id === value);

  return (
    <Select value={value} onValueChange={onValueChange} open={isOpen} onOpenChange={setIsOpen}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {selectedAccount && (
            <div className="flex items-center gap-2">
              {getAccountIcon(selectedAccount.accountType)}
              <span>{selectedAccount.name}</span>
              {selectedAccount.parentAccount && (
                <span className="text-muted-foreground text-xs">
                  ({selectedAccount.parentAccount.name})
                </span>
              )}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[400px]">
        <div className="sticky top-0 bg-background p-2 border-b space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-20 h-9"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
            <div className="absolute right-1 top-1 flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFilters(!showFilters);
                }}
              >
                <Filter className="h-3 w-3" />
              </Button>
              {(searchQuery || activeFilters.size > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAllFilters();
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          {showFilters && (
            <div className="flex flex-wrap gap-1">
              {['ORGANIZATION', 'SUBSIDIARY', 'INDIVIDUAL'].map(type => (
                <Button
                  key={type}
                  variant={activeFilters.has(type) ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFilter(type);
                  }}
                >
                  {type === 'ORGANIZATION' && <Building className="h-3 w-3 mr-1" />}
                  {type === 'SUBSIDIARY' && <Building2 className="h-3 w-3 mr-1" />}
                  {type === 'INDIVIDUAL' && <User className="h-3 w-3 mr-1" />}
                  {type}
                </Button>
              ))}
            </div>
          )}
          
          {(searchQuery || activeFilters.size > 0) && (
            <div className="text-xs text-muted-foreground">
              {filteredAccounts.length} of {flattenedAccounts.length} accounts
            </div>
          )}
        </div>
        
        <div className="p-1">
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <TreePine className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div>No accounts found</div>
              {(searchQuery || activeFilters.size > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAllFilters();
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            Object.entries(groupedAccounts).map(([type, accounts]) => {
              if (accounts.length === 0) return null;
              
              return (
                <div key={type}>
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted/30 sticky top-0">
                    <div className="flex items-center gap-1">
                      {getAccountIcon(type)}
                      {type} ({accounts.length})
                    </div>
                  </div>
                  {accounts.map((account) => (
                    <SelectItem
                      key={account.id}
                      value={account.id}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 w-full">
                        {/* Hierarchy visualization */}
                        <div className="flex items-center" style={{ marginLeft: `${account.depth * 16}px` }}>
                          {account.depth > 0 && (
                            <div className="flex items-center">
                              {Array.from({ length: account.depth }).map((_, i) => (
                                <div key={i} className="w-4 flex justify-center">
                                  {i === account.depth - 1 ? (
                                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                  ) : (
                                    <div className="w-px h-4 bg-border" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {getAccountIcon(account.accountType)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{account.displayName}</div>
                          {account.depth > 0 && (
                            <div className="text-xs text-muted-foreground truncate">
                              {account.path.split(' > ').slice(0, -1).join(' > ')}
                            </div>
                          )}
                          {account.companyName && account.companyName !== account.name && (
                            <div className="text-xs text-muted-foreground truncate">
                              {account.companyName}
                            </div>
                          )}
                        </div>
                        
                        <Badge variant={getAccountTypeColor(account.accountType) as any} className="text-xs shrink-0">
                          {account.accountType}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                  <Separator className="my-1" />
                </div>
              );
            })
          )}
        </div>
        
        {filteredAccounts.length > 0 && (
          <div className="border-t p-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                Organization
              </div>
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Subsidiary
              </div>
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Individual
              </div>
            </div>
          </div>
        )}
      </SelectContent>
    </Select>
  );
}