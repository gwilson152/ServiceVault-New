/**
 * User Status Management Dialog
 * 
 * Comprehensive user status management interface:
 * - Enable/Disable user accounts
 * - Force password reset
 * - Revoke active sessions
 * - View user status and login activity
 * 
 * Features:
 * - Permission-based access control
 * - Status change confirmations
 * - Session management
 * - Security actions with proper warnings
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserCheck,
  UserX,
  Key,
  LogOut,
  AlertTriangle,
  Shield,
  Clock,
  Loader2,
  Monitor,
  Smartphone,
  Globe
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { usePermissions } from "@/hooks/usePermissions";

interface UserSession {
  id: string;
  deviceType: string;
  browser: string;
  ipAddress: string;
  location: string;
  lastActivity: string;
  isCurrentSession: boolean;
}

interface UserStatusData {
  id: string;
  isActive: boolean;
  lastLogin: string | null;
  loginAttempts: number;
  isLocked: boolean;
  lockedAt: string | null;
  passwordResetRequired: boolean;
  activeSessions: UserSession[];
}

interface UserStatusManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userEmail: string;
  onStatusChanged: () => void;
}

export function UserStatusManagementDialog({
  open,
  onOpenChange,
  userId,
  userName,
  userEmail,
  onStatusChanged
}: UserStatusManagementDialogProps) {
  const [userStatus, setUserStatus] = useState<UserStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [showConfirmation, setShowConfirmation] = useState<{
    type: 'disable' | 'enable' | 'force-password-reset' | 'revoke-sessions' | 'unlock';
    title: string;
    description: string;
    confirmText?: string;
  } | null>(null);

  const { toast } = useToast();
  const { canEditUsers } = usePermissions();

  useEffect(() => {
    if (open) {
      loadUserStatus();
    }
  }, [open, userId]);

  const loadUserStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}/status`);
      if (response.ok) {
        const status = await response.json();
        setUserStatus(status);
      } else {
        throw new Error('Failed to load user status');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load user status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusAction = async (action: string) => {
    const needsConfirmation = showConfirmation?.confirmText;
    if (needsConfirmation && confirmationText !== needsConfirmation) {
      toast({
        title: "Error",
        description: `Please type "${needsConfirmation}" to confirm`,
        variant: "destructive"
      });
      return;
    }

    try {
      setActionLoading(action);
      let endpoint = '';
      let method = 'POST';
      let body: any = {};

      switch (action) {
        case 'disable':
          endpoint = `/api/users/${userId}/disable`;
          break;
        case 'enable':
          endpoint = `/api/users/${userId}/enable`;
          break;
        case 'force-password-reset':
          endpoint = `/api/users/${userId}/force-password-reset`;
          break;
        case 'revoke-sessions':
          endpoint = `/api/users/${userId}/revoke-sessions`;
          break;
        case 'unlock':
          endpoint = `/api/users/${userId}/unlock`;
          break;
        default:
          throw new Error('Unknown action');
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${action.replace('-', ' ')}`);
      }

      toast({
        title: "Success",
        description: `User ${action.replace('-', ' ')} completed successfully`
      });

      setShowConfirmation(null);
      setConfirmationText("");
      loadUserStatus();
      onStatusChanged();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${action.replace('-', ' ')}`,
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setActionLoading(`revoke-${sessionId}`);
      const response = await fetch(`/api/users/${userId}/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to revoke session');
      }

      toast({
        title: "Success",
        description: "Session revoked successfully"
      });

      loadUserStatus();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to revoke session",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getConfirmationDialog = (type: string) => {
    const configs = {
      disable: {
        title: 'Disable User Account',
        description: `Disable ${userName}'s account? They will not be able to log in until the account is re-enabled.`,
      },
      enable: {
        title: 'Enable User Account',
        description: `Enable ${userName}'s account? They will be able to log in normally.`,
      },
      'force-password-reset': {
        title: 'Force Password Reset',
        description: `Force ${userName} to reset their password on next login? They will not be able to access the system until they create a new password.`,
        confirmText: 'FORCE RESET',
      },
      'revoke-sessions': {
        title: 'Revoke All Sessions',
        description: `Revoke all active sessions for ${userName}? They will be logged out from all devices and must log in again.`,
        confirmText: 'REVOKE ALL',
      },
      unlock: {
        title: 'Unlock User Account',
        description: `Unlock ${userName}'s account? This will reset failed login attempts and allow them to log in.`,
      },
    };

    return configs[type as keyof typeof configs] || null;
  };

  if (!canEditUsers) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              User Status Management - {userName}
            </DialogTitle>
            <DialogDescription>
              Manage user account status, security settings, and active sessions.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              Loading user status...
            </div>
          ) : !userStatus ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to load user status information.
              </AlertDescription>
            </Alert>
          ) : (
            <Tabs defaultValue="status" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="status">
                  Account Status
                </TabsTrigger>
                <TabsTrigger value="sessions">
                  Active Sessions ({userStatus.activeSessions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="status" className="space-y-6">
                {/* Current Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Account Status</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={userStatus.isActive ? "default" : "destructive"}>
                          {userStatus.isActive ? "Active" : "Disabled"}
                        </Badge>
                        {userStatus.isLocked && (
                          <Badge variant="destructive">Locked</Badge>
                        )}
                        {userStatus.passwordResetRequired && (
                          <Badge variant="secondary">Password Reset Required</Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-500">Last Login</Label>
                      <p className="text-sm">
                        {userStatus.lastLogin 
                          ? new Date(userStatus.lastLogin).toLocaleString()
                          : "Never"
                        }
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-500">Failed Login Attempts</Label>
                      <p className="text-sm">{userStatus.loginAttempts}</p>
                    </div>

                    {userStatus.isLocked && userStatus.lockedAt && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Locked At</Label>
                        <p className="text-sm">{new Date(userStatus.lockedAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-500">Actions</Label>
                    
                    {userStatus.isActive ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowConfirmation(getConfirmationDialog('disable'))}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === 'disable' ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <UserX className="h-4 w-4 mr-2" />
                        )}
                        Disable Account
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShowConfirmation(getConfirmationDialog('enable'))}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === 'enable' ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <UserCheck className="h-4 w-4 mr-2" />
                        )}
                        Enable Account
                      </Button>
                    )}

                    {userStatus.isLocked && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowConfirmation(getConfirmationDialog('unlock'))}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === 'unlock' ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Shield className="h-4 w-4 mr-2" />
                        )}
                        Unlock Account
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowConfirmation(getConfirmationDialog('force-password-reset'))}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === 'force-password-reset' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Key className="h-4 w-4 mr-2" />
                      )}
                      Force Password Reset
                    </Button>

                    {userStatus.activeSessions.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowConfirmation(getConfirmationDialog('revoke-sessions'))}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === 'revoke-sessions' ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <LogOut className="h-4 w-4 mr-2" />
                        )}
                        Revoke All Sessions
                      </Button>
                    )}
                  </div>
                </div>

                {/* Security Alerts */}
                {(userStatus.isLocked || userStatus.loginAttempts > 3 || userStatus.passwordResetRequired) && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Security Alert:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {userStatus.isLocked && <li>Account is currently locked due to failed login attempts</li>}
                        {userStatus.loginAttempts > 3 && <li>High number of failed login attempts detected</li>}
                        {userStatus.passwordResetRequired && <li>Password reset is required for security</li>}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="sessions" className="space-y-4">
                {userStatus.activeSessions.length === 0 ? (
                  <div className="text-center py-8">
                    <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No active sessions</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Device</TableHead>
                        <TableHead>Browser</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Last Activity</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userStatus.activeSessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getDeviceIcon(session.deviceType)}
                              <span className="capitalize">{session.deviceType}</span>
                              {session.isCurrentSession && (
                                <Badge variant="outline" className="text-xs">Current</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{session.browser}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {session.location}
                            </div>
                            <div className="text-xs text-gray-500">{session.ipAddress}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(session.lastActivity).toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeSession(session.id)}
                              disabled={session.isCurrentSession || actionLoading === `revoke-${session.id}`}
                              title={session.isCurrentSession ? "Cannot revoke current session" : "Revoke this session"}
                            >
                              {actionLoading === `revoke-${session.id}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <LogOut className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <Dialog open={true} onOpenChange={() => {
          setShowConfirmation(null);
          setConfirmationText("");
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                {showConfirmation.title}
              </DialogTitle>
              <DialogDescription>
                {showConfirmation.description}
              </DialogDescription>
            </DialogHeader>

            {showConfirmation.confirmText && (
              <div className="space-y-3">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This action requires confirmation. Type <code className="bg-gray-100 px-1 rounded">{showConfirmation.confirmText}</code> to proceed.
                  </AlertDescription>
                </Alert>
                
                <div>
                  <Label htmlFor="confirmation-text">
                    Type <code className="bg-gray-100 px-1 rounded">{showConfirmation.confirmText}</code> to confirm:
                  </Label>
                  <Input
                    id="confirmation-text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder={`Type ${showConfirmation.confirmText} here`}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowConfirmation(null);
                  setConfirmationText("");
                }}
                disabled={!!actionLoading}
              >
                Cancel
              </Button>
              <Button 
                variant={showConfirmation.title.includes('Enable') ? "default" : "destructive"}
                onClick={() => {
                  const action = showConfirmation.title.toLowerCase().includes('disable') ? 'disable' :
                                showConfirmation.title.toLowerCase().includes('enable') ? 'enable' :
                                showConfirmation.title.toLowerCase().includes('password') ? 'force-password-reset' :
                                showConfirmation.title.toLowerCase().includes('sessions') ? 'revoke-sessions' :
                                'unlock';
                  handleStatusAction(action);
                }}
                disabled={!!actionLoading || (showConfirmation.confirmText && confirmationText !== showConfirmation.confirmText)}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mr-2" />
                )}
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}