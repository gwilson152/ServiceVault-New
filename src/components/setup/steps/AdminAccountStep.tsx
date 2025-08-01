"use client";

import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, User, Mail, Lock, AlertCircle } from "lucide-react";
import type { SetupStepProps } from "@/types/setup";
import { validateAdminAccount } from "@/types/setup";

export function AdminAccountStep({ data, updateData, setIsValid }: SetupStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const validation = validateAdminAccount(data.adminAccount);
    setErrors(validation.errors);
    setIsValid(validation.isValid);
  }, [data.adminAccount, setIsValid]);

  const updateAdminAccount = useCallback((field: string, value: string) => {
    updateData(prevData => ({
      adminAccount: {
        ...prevData.adminAccount,
        [field]: value
      }
    }));
  }, [updateData]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
          <User className="h-6 w-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Create Admin Account
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          This will be your primary administrator account with full system access.
        </p>
      </div>

      {/* Form Fields */}
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        {/* Name Field */}
        <div>
          <Label htmlFor="admin-name" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Full Name
          </Label>
          <Input
            id="admin-name"
            type="text"
            placeholder="John Doe"
            autoComplete="name"
            value={data.adminAccount.name}
            onChange={(e) => updateAdminAccount('name', e.target.value)}
            className={errors.name ? 'border-red-300' : ''}
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.name}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <Label htmlFor="admin-email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address
          </Label>
          <Input
            id="admin-email"
            type="email"
            placeholder="admin@yourcompany.com"
            autoComplete="email"
            value={data.adminAccount.email}
            onChange={(e) => updateAdminAccount('email', e.target.value)}
            className={errors.email ? 'border-red-300' : ''}
          />
          {errors.email && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.email}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            This will be your login email address
          </p>
        </div>

        {/* Password Field */}
        <div>
          <Label htmlFor="admin-password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Password
          </Label>
          <div className="relative">
            <Input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              placeholder="Choose a strong password"
              autoComplete="new-password"
              value={data.adminAccount.password}
              onChange={(e) => updateAdminAccount('password', e.target.value)}
              className={errors.password ? 'border-red-300 pr-10' : 'pr-10'}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.password}
            </p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <Label htmlFor="admin-confirm-password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Confirm Password
          </Label>
          <div className="relative">
            <Input
              id="admin-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              autoComplete="new-password"
              value={data.adminAccount.confirmPassword}
              onChange={(e) => updateAdminAccount('confirmPassword', e.target.value)}
              className={errors.confirmPassword ? 'border-red-300 pr-10' : 'pr-10'}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.confirmPassword}
            </p>
          )}
        </div>
      </form>

      {/* Security Notice */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>Security Tips:</strong>
          <ul className="mt-2 text-sm space-y-1">
            <li>• Use a strong, unique password with at least 8 characters</li>
            <li>• Include uppercase, lowercase, numbers, and symbols</li>
            <li>• This account will have full administrative privileges</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}