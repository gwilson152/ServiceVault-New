"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SetupWizard } from "@/components/setup/SetupWizard";
import type { SetupStatus } from "@/types/setup";

export default function SetupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const response = await fetch('/api/setup/status');
      if (response.ok) {
        const status: SetupStatus = await response.json();
        setSetupStatus(status);
        
        // If setup is not required, redirect to login
        if (!status.isSetupRequired) {
          router.push('/');
          return;
        }
      } else {
        console.error('Failed to check setup status');
      }
    } catch (error) {
      console.error('Error checking setup status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking setup status...</p>
        </div>
      </div>
    );
  }

  if (!setupStatus?.isSetupRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Setup Already Complete
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The system has already been configured.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SetupWizard 
        setupStatus={setupStatus}
        onComplete={() => {
          // Redirect to login after successful setup
          router.push('/?setup=complete');
        }}
      />
    </div>
  );
}