import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, Globe, Info } from 'lucide-react';

interface EmailPageProps {
  params: {
    id: string;
  };
}

export default function EmailPage({ params }: EmailPageProps) {
  return (
    <main className="max-w-7xl mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Email Management Moved</h1>
          <p className="text-gray-600">
            Email configuration is now managed globally at the system level
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-4">
              <p>
                <strong>Email management has been moved to a global configuration.</strong>
              </p>
              <p>
                Email integrations are now configured system-wide and route emails to accounts based on domain mappings. 
                This provides better scalability and centralized management.
              </p>
              <div className="flex items-center space-x-4">
                <Button 
                  onClick={() => window.location.href = '/settings?tab=email'}
                  className="flex items-center"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Go to Email Settings
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">What's Changed?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Before (Per-Account)</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Each account had its own email integrations</li>
                <li>• Duplicate configurations across accounts</li>
                <li>• Complex management and maintenance</li>
                <li>• Limited cross-account email routing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Now (Global)</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• System-wide email integrations</li>
                <li>• Domain-based account routing</li>
                <li>• Centralized configuration and monitoring</li>
                <li>• Flexible domain mapping with priorities</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}