"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { AccountWithHierarchy } from "@/utils/hierarchy";

interface AccountHierarchyCardProps {
  account: AccountWithHierarchy;
  showChildren?: boolean;
  onToggleChildren?: (accountId: string) => void;
  isChild?: boolean;
  depth?: number;
}

export function AccountHierarchyCard({ 
  account, 
  showChildren = true, 
  onToggleChildren,
  isChild = false,
  depth = 0
}: AccountHierarchyCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(account.isExpanded ?? true);
  const hasChildren = account.children && account.children.length > 0;

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case "ORGANIZATION": return <Building className="h-4 w-4" />;
      case "SUBSIDIARY": return <Building2 className="h-4 w-4 text-blue-500" />;
      case "INDIVIDUAL": return <User className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getAccountTypeBadge = (type: string) => {
    switch (type) {
      case "ORGANIZATION": return <Badge variant="default">Organization</Badge>;
      case "SUBSIDIARY": return <Badge variant="secondary">Subsidiary</Badge>;
      case "INDIVIDUAL": return <Badge variant="outline">Individual</Badge>;
      default: return <Badge>{type}</Badge>;
    }
  };

  const handleToggleExpansion = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (onToggleChildren) {
      onToggleChildren(account.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Account Card */}
      <Card 
        className={`hover:shadow-md transition-shadow ${isChild ? 'border-l-4 border-l-blue-200' : ''}`}
        style={{ marginLeft: `${depth * 20}px` }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1">
              {/* Hierarchy connector for child accounts */}
              {isChild && depth > 0 && (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-l-2 border-b-2 border-border rounded-bl-md mr-2" />
                </div>
              )}
              
              {/* Expansion toggle for parents */}
              {hasChildren && showChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleToggleExpansion}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              <div className="flex items-center space-x-2 flex-1">
                {getAccountTypeIcon(account.accountType)}
                <CardTitle className="text-lg">{account.name}</CardTitle>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getAccountTypeBadge(account.accountType)}
              {hasChildren && (
                <Badge variant="outline" className="text-xs">
                  {account.children!.length} {account.children!.length === 1 ? 'subsidiary' : 'subsidiaries'}
                </Badge>
              )}
            </div>
          </div>
          
          {account.companyName && account.companyName !== account.name && (
            <CardDescription>{account.companyName}</CardDescription>
          )}
          
          {account.parentAccount && !isChild && (
            <CardDescription className="text-blue-600">
              Parent: {account.parentAccount.name}
            </CardDescription>
          )}
          
          {account.path && depth > 0 && (
            <CardDescription className="text-xs text-muted-foreground">
              Path: {account.path}
            </CardDescription>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{account.stats.activeUsers}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{account.stats.pendingInvitations}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{account.stats.totalUsers}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>

          {/* Users Preview */}
          {account.accountUsers.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Users:</div>
              {account.accountUsers.slice(0, 2).map((accountUser, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <User className="h-3 w-3" />
                    <span>{accountUser.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {accountUser.user ? (
                      <Badge variant="outline" className="text-xs">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Invited</Badge>
                    )}
                  </div>
                </div>
              ))}
              {account.accountUsers.length > 2 && (
                <div className="text-xs text-muted-foreground">
                  +{account.accountUsers.length - 2} more users
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => router.push(`/accounts/${account.id}`)}
            >
              <Eye className="mr-2 h-3 w-3" />
              View
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push(`/accounts/${account.id}?tab=settings`)}
              title="Account Settings"
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // Open email compose for account users
                const accountUsers = account.accountUsers.filter(au => au.user).map(au => au.email);
                if (accountUsers.length > 0) {
                  const emailSubject = `Regarding ${account.name} Account`;
                  const mailtoLink = `mailto:${accountUsers.join(',')}?subject=${encodeURIComponent(emailSubject)}`;
                  window.open(mailtoLink, '_blank');
                }
              }}
              title="Email Account Users"
              disabled={!account.accountUsers.some(au => au.user)}
            >
              <Mail className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Child Account Cards */}
      {hasChildren && showChildren && isExpanded && (
        <div className="space-y-4 relative">
          {/* Connecting line for visual hierarchy */}
          <div 
            className="absolute top-0 bottom-0 border-l-2 border-dashed border-border"
            style={{ left: `${(depth + 1) * 20 - 10}px` }}
          />
          {account.children!.map((child) => (
            <AccountHierarchyCard
              key={child.id}
              account={child}
              showChildren={showChildren}
              onToggleChildren={onToggleChildren}
              isChild={true}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}