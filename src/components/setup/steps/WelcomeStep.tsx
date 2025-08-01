"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Shield, Zap } from "lucide-react";
import type { SetupStepProps } from "@/types/setup";

export function WelcomeStep({ onNext, setIsValid }: SetupStepProps) {
  // Set validity only once when component mounts
  const [hasSetValidity, setHasSetValidity] = useState(false);
  
  useEffect(() => {
    if (!hasSetValidity) {
      setIsValid(true);
      setHasSetValidity(true);
    }
  }, [hasSetValidity, setIsValid]);

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
          <CheckCircle className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome to Service Vault
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Thank you for choosing Service Vault for your time management and invoicing needs. 
          This setup wizard will help you configure your system in just a few minutes.
        </p>
      </div>

      {/* Features Overview */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Time Tracking
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Track time against tickets and projects with detailed reporting and analytics.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Zap className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Invoice Generation
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generate professional invoices from time entries and ticket addons automatically.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="h-8 w-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Self-Hosted
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Complete control over your data with secure, self-hosted deployment.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* What We'll Configure */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
            What we'll configure together:
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="flex items-center text-sm text-blue-800 dark:text-blue-200">
              <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              Admin user account and authentication
            </div>
            <div className="flex items-center text-sm text-blue-800 dark:text-blue-200">
              <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              System configuration and branding
            </div>
            <div className="flex items-center text-sm text-blue-800 dark:text-blue-200">
              <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              Email settings for notifications
            </div>
            <div className="flex items-center text-sm text-blue-800 dark:text-blue-200">
              <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              Company information and billing
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estimated Time */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          <Clock className="h-4 w-4 inline mr-1" />
          Estimated setup time: 5-10 minutes
        </p>
      </div>

      {/* Action */}
      <div className="text-center">
        <Button onClick={onNext} size="lg" className="px-8">
          Let's Get Started
        </Button>
      </div>
    </div>
  );
}