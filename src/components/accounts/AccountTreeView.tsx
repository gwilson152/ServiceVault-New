"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building, 
  Building2, 
  User, 
  Users, 
  Eye, 
  Settings, 
  Mail, 
  ChevronRight, 
  ChevronDown,
  Clock,
  FileText,
  ArrowRight
} from "lucide-react";
import { AccountWithHierarchy, buildAccountHierarchy, toggleAccountExpansion } from "@/utils/hierarchy";

interface AccountTreeViewProps {
  accounts: AccountWithHierarchy[];
  searchTerm?: string;
  onAccountSelect?: (accountId: string) => void;
  onAssignParent?: (account: AccountWithHierarchy) => void;
}

interface TreeNodeProps {
  account: AccountWithHierarchy;
  depth: number;
  onToggleExpansion: (accountId: string) => void;
  onAccountSelect?: (accountId: string) => void;
  onAssignParent?: (account: AccountWithHierarchy) => void;
}

function TreeNode({ account, depth, onToggleExpansion, onAccountSelect, onAssignParent }: TreeNodeProps) {
  const router = useRouter();
  const hasChildren = account.children && account.children.length > 0;

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case "ORGANIZATION": return <Building className="h-4 w-4 text-blue-600" />;
      case "SUBSIDIARY": return <Building2 className="h-4 w-4 text-green-600" />;
      case "INDIVIDUAL": return <User className="h-4 w-4 text-purple-600" />;
      default: return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAccountTypeBadge = (type: string) => {
    switch (type) {
      case "ORGANIZATION": return <Badge variant="default" className="text-xs">Organization</Badge>;
      case "SUBSIDIARY": return <Badge variant="secondary" className="text-xs">Subsidiary</Badge>;
      case "INDIVIDUAL": return <Badge variant="outline" className="text-xs">Individual</Badge>;
      default: return <Badge className="text-xs">{type}</Badge>;
    }
  };

  const handleAccountClick = () => {
    if (onAccountSelect) {
      onAccountSelect(account.id);
    } else {
      router.push(`/accounts/${account.id}`);
    }
  };

  return (
    <div className="select-none">
      {/* Account Row */}
      <div 
        className="flex items-center py-2 px-3 hover:bg-muted/50 rounded-lg cursor-pointer group"
        style={{ marginLeft: `${depth * 20}px` }}
      >
        {/* Hierarchy Lines and Expansion Toggle */}
        <div className="flex items-center mr-2" style={{ width: '20px' }}>
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 hover:bg-background"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpansion(account.id);
              }}
            >
              {account.isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="w-5 h-5 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-border" />
            </div>
          )}
        </div>

        {/* Account Icon and Type */}
        <div className="flex items-center mr-3">
          {getAccountTypeIcon(account.accountType)}
        </div>

        {/* Account Info */}
        <div className="flex-1 min-w-0 mr-4" onClick={handleAccountClick}>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-sm truncate">{account.name}</h3>
            {getAccountTypeBadge(account.accountType)}
            {hasChildren && (
              <Badge variant="outline" className="text-xs">
                {account.children!.length} {account.children!.length === 1 ? 'subsidiary' : 'subsidiaries'}
              </Badge>
            )}
          </div>
          {account.companyName && account.companyName !== account.name && (
            <p className="text-xs text-muted-foreground truncate">{account.companyName}</p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 mr-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span className="text-green-600 font-medium">{account.stats.activeUsers}</span>
            <span>/</span>
            <span>{account.stats.totalUsers}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>{account.stats.totalTickets}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{account.stats.totalHours}h</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/accounts/${account.id}`);
            }}
          >
            <Eye className="h-3 w-3" />
          </Button>
          {onAssignParent && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onAssignParent(account);
              }}
              title="Assign Parent Account"
            >
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/accounts/${account.id}?tab=settings`);
            }}
            title="Account Settings"
          >
            <Settings className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              // Open email compose for account users
              const accountUsers = account.memberships.filter(m => m.user).map(m => m.user!.email);
              if (accountUsers.length > 0) {
                const emailSubject = `Regarding ${account.name} Account`;
                const mailtoLink = `mailto:${accountUsers.join(',')}?subject=${encodeURIComponent(emailSubject)}`;
                window.open(mailtoLink, '_blank');
              }
            }}
            title="Email Account Users"
            disabled={!account.memberships.some(m => m.user)}
          >
            <Mail className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && account.isExpanded && (
        <div className="relative">
          {/* Connecting Line */}
          <div 
            className="absolute top-0 bottom-0 border-l border-border"
            style={{ left: `${depth * 20 + 10}px` }}
          />
          {account.children!.map((child, index) => (
            <div key={child.id} className="relative">
              {/* Horizontal Line */}
              <div 
                className="absolute border-t border-border"
                style={{ 
                  left: `${depth * 20 + 10}px`,
                  top: '20px',
                  width: '10px'
                }}
              />
              <TreeNode
                account={child}
                depth={depth + 1}
                onToggleExpansion={onToggleExpansion}
                onAccountSelect={onAccountSelect}
                onAssignParent={onAssignParent}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AccountTreeView({ accounts, searchTerm = "", onAccountSelect, onAssignParent }: AccountTreeViewProps) {
  const [hierarchicalAccounts, setHierarchicalAccounts] = useState<AccountWithHierarchy[]>([]);

  // Build hierarchy when accounts change
  useMemo(() => {
    const hierarchy = buildAccountHierarchy(accounts);
    setHierarchicalAccounts(hierarchy);
  }, [accounts]);

  // Filter accounts based on search term
  const filteredAccounts = useMemo(() => {
    if (!searchTerm.trim()) return hierarchicalAccounts;
    
    const term = searchTerm.toLowerCase();
    const filterTree = (accounts: AccountWithHierarchy[]): AccountWithHierarchy[] => {
      return accounts.reduce((filtered: AccountWithHierarchy[], account) => {
        const matchesSearch = 
          account.name.toLowerCase().includes(term) ||
          (account.companyName && account.companyName.toLowerCase().includes(term));
        
        const filteredChildren = account.children ? filterTree(account.children) : [];
        
        if (matchesSearch || filteredChildren.length > 0) {
          filtered.push({
            ...account,
            children: filteredChildren,
            isExpanded: filteredChildren.length > 0 || account.isExpanded
          });
        }
        
        return filtered;
      }, []);
    };
    
    return filterTree(hierarchicalAccounts);
  }, [hierarchicalAccounts, searchTerm]);

  const handleToggleExpansion = (accountId: string) => {
    setHierarchicalAccounts(prev => toggleAccountExpansion(prev, accountId));
  };

  if (filteredAccounts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Building className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-sm font-semibold mb-2">No accounts found</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm 
                ? "Try adjusting your search terms or clearing filters." 
                : "No accounts are available to display."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="space-y-1 p-2">
          {filteredAccounts.map((account) => (
            <TreeNode
              key={account.id}
              account={account}
              depth={0}
              onToggleExpansion={handleToggleExpansion}
              onAccountSelect={onAccountSelect}
              onAssignParent={onAssignParent}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}