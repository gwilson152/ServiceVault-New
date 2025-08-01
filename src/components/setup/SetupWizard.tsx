"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Note: Using custom progress bar since Progress component may not exist
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

// Import step components
import { WelcomeStep } from "./steps/WelcomeStep";
import { AdminAccountStep } from "./steps/AdminAccountStep";
import { SystemConfigStep } from "./steps/SystemConfigStep";
import { EmailConfigStep } from "./steps/EmailConfigStep";
import { CompanyInfoStep } from "./steps/CompanyInfoStep";
import { ReviewStep } from "./steps/ReviewStep";

import type { SetupStatus, SetupData } from "@/types/setup";
import { DEFAULT_SETUP_DATA } from "@/types/setup";

interface SetupWizardProps {
  setupStatus: SetupStatus;
  onComplete: () => void;
}

const SETUP_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Welcome to Service Vault',
    component: WelcomeStep
  },
  {
    id: 'admin',
    title: 'Admin Account',
    description: 'Create your admin account',
    component: AdminAccountStep
  },
  {
    id: 'system',
    title: 'System Config',
    description: 'Configure basic settings',
    component: SystemConfigStep
  },
  {
    id: 'email',
    title: 'Email Setup',
    description: 'Configure email settings',
    component: EmailConfigStep
  },
  {
    id: 'company',
    title: 'Company Info',
    description: 'Add company details',
    component: CompanyInfoStep
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Review and complete setup',
    component: ReviewStep
  }
];

export function SetupWizard({ setupStatus, onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [setupData, setSetupData] = useState<SetupData>(DEFAULT_SETUP_DATA);
  const [stepValidity, setStepValidity] = useState<Record<number, boolean>>({});
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const updateData = useCallback((updates: Partial<SetupData> | ((prev: SetupData) => Partial<SetupData>)) => {
    if (typeof updates === 'function') {
      setSetupData(prev => ({
        ...prev,
        ...updates(prev)
      }));
    } else {
      setSetupData(prev => ({
        ...prev,
        ...updates
      }));
    }
    setError(null); // Clear errors when data changes
  }, []);

  const setStepValid = useCallback((stepIndex: number, isValid: boolean) => {
    setStepValidity(prev => ({
      ...prev,
      [stepIndex]: isValid
    }));
  }, []);

  const goToNext = useCallback(() => {
    if (currentStep < SETUP_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const goToPrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setError(null);
    }
  }, [currentStep]);

  const completeSetup = async () => {
    setIsCompleting(true);
    setError(null);

    try {
      const response = await fetch('/api/setup/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(setupData)
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        // Handle specific error cases
        if (result.message && result.message.includes('already exists')) {
          setError('A user with this email already exists. Please use a different email address or reset the database if this is a fresh installation.');
        } else {
          setError(result.error || 'Setup failed');
        }
        
        if (result.details) {
          console.error('Setup validation errors:', result.details);
        }
      }
    } catch (error) {
      console.error('Setup error:', error);
      setError('Network error occurred during setup');
    } finally {
      setIsCompleting(false);
    }
  };

  const CurrentStepComponent = SETUP_STEPS[currentStep].component;
  const progress = ((currentStep + 1) / SETUP_STEPS.length) * 100;
  const isCurrentStepValid = stepValidity[currentStep] !== false;

  // Create a stable setIsValid function for the current step
  const currentStepSetIsValid = useMemo(
    () => (valid: boolean) => setStepValid(currentStep, valid),
    [currentStep, setStepValid]
  );

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Complete!</h2>
              <p className="text-gray-600 mb-4">
                Your Service Vault installation has been configured successfully.
              </p>
              <p className="text-sm text-gray-500">
                Redirecting to login page...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Service Vault Setup
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Welcome! Let's get your time management system configured.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Step {currentStep + 1} of {SETUP_STEPS.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {SETUP_STEPS.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${index < currentStep 
                    ? 'bg-green-600 text-white' 
                    : index === currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {index < currentStep ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Current Step */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{SETUP_STEPS[currentStep].title}</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {SETUP_STEPS[currentStep].description}
            </p>
          </CardHeader>
          <CardContent>
            <CurrentStepComponent
              data={setupData}
              updateData={updateData}
              onNext={goToNext}
              onPrevious={goToPrevious}
              isValid={isCurrentStepValid}
              setIsValid={currentStepSetIsValid}
            />
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={goToPrevious}
            disabled={currentStep === 0 || isCompleting}
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {currentStep === SETUP_STEPS.length - 1 ? (
              <Button
                onClick={completeSetup}
                disabled={!isCurrentStepValid || isCompleting}
                className="px-8"
              >
                {isCompleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Completing Setup...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </Button>
            ) : (
              <Button
                onClick={goToNext}
                disabled={!isCurrentStepValid}
                className="px-8"
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}