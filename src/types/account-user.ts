// Account User Status Types

export type AccountUserInvitationStatus = 'activated' | 'pending' | 'none';

export interface AccountUserStatus {
  hasLogin: boolean;           // Whether they've activated their account (userId exists)
  canBeAssigned: boolean;      // Whether they can receive ticket assignments (isActive)
  invitationStatus: AccountUserInvitationStatus;
}

export interface AccountUserWithStatus {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  invitationToken?: string;
  invitationExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  account: {
    id: string;
    name: string;
    accountType: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  
  // Computed status fields
  hasLogin: boolean;
  canBeAssigned: boolean;
  invitationStatus: AccountUserInvitationStatus;
}

// Helper functions for status checking
export const getAccountUserStatusDisplay = (accountUser: AccountUserWithStatus) => {
  if (!accountUser.isActive) {
    return {
      assignmentStatus: 'Disabled',
      loginStatus: accountUser.hasLogin ? 'Has Login (Disabled)' : 'No Login',
      canAssign: false,
      icon: '❌',
      iconColor: 'text-red-600'
    };
  }
  
  if (accountUser.hasLogin) {
    return {
      assignmentStatus: 'Active',
      loginStatus: 'Login Activated',
      canAssign: true,
      icon: '🔵',
      iconColor: 'text-blue-600'
    };
  }
  
  return {
    assignmentStatus: 'Active',
    loginStatus: accountUser.invitationToken ? 'Invitation Pending' : 'No Invitation',
    canAssign: true,
    icon: '🟡',
    iconColor: 'text-yellow-600'
  };
};

export const canAssignToAccountUser = (accountUser: AccountUserWithStatus): boolean => {
  return accountUser.isActive && accountUser.canBeAssigned;
};