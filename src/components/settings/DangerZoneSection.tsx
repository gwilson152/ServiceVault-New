"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  AlertTriangle, 
  Database, 
  Loader2, 
  Skull, 
  AlertCircle,
  CheckCircle,
  RefreshCw
} from "lucide-react";

interface DangerZoneSectionProps {
  onSettingsChange?: () => void;
}

export function DangerZoneSection({ onSettingsChange }: DangerZoneSectionProps) {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [includeReseed, setIncludeReseed] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleNuclearReset = async () => {
    if (confirmationText !== "RESET DATABASE") {
      return;
    }

    setIsResetting(true);
    setResetResult(null);

    try {
      const response = await fetch("/api/system/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmationText,
          includeReseed
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetResult({
          success: true,
          message: data.message || "Database reset completed successfully"
        });
        
        // Clear form
        setConfirmationText("");
        setIncludeReseed(true);
        
        // Notify parent component if needed
        if (onSettingsChange) {
          onSettingsChange();
        }
        
        // Auto-close dialog after success
        setTimeout(() => {
          setIsResetDialogOpen(false);
          setResetResult(null);
        }, 3000);
        
      } else {
        setResetResult({
          success: false,
          message: data.error || "Failed to reset database"
        });
      }
    } catch (error) {
      console.error("Error during nuclear reset:", error);
      setResetResult({
        success: false,
        message: "Network error occurred during database reset"
      });
    } finally {
      setIsResetting(false);
    }
  };

  const isConfirmationValid = confirmationText === "RESET DATABASE";
  const isDevelopment = process.env.NODE_ENV !== "production";

  return (
    <>
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <Skull className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-red-600">
            Destructive actions that cannot be undone. Use with extreme caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isDevelopment && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Database reset is only available in development environments for safety.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="border border-red-200 rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h3 className="font-semibold text-red-700 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Nuclear Database Reset
                  </h3>
                  <p className="text-sm text-red-600">
                    Completely wipe the database and optionally restore seed data. 
                    This will permanently delete ALL data including:
                  </p>
                  <ul className="text-xs text-red-500 ml-4 space-y-1">
                    <li>• All user accounts and sessions</li>
                    <li>• All tickets and time entries</li>
                    <li>• All invoices and billing data</li>
                    <li>• All settings and configurations</li>
                    <li>• All account relationships</li>
                  </ul>
                </div>
                <Button
                  onClick={() => setIsResetDialogOpen(true)}
                  variant="destructive"
                  size="sm"
                  disabled={!isDevelopment}
                  className="ml-4"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Reset Database
                </Button>
              </div>
            </div>
          </div>

          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              <strong>WARNING:</strong> These actions are irreversible and will immediately affect all users. 
              Always backup your data before performing destructive operations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Nuclear Reset Confirmation Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Skull className="h-5 w-5" />
              Nuclear Database Reset
            </DialogTitle>
            <DialogDescription className="text-red-600">
              This action will <strong>permanently delete all data</strong> in the database. 
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {resetResult && (
              <Alert className={resetResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                {resetResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={resetResult.success ? "text-green-700" : "text-red-700"}>
                  {resetResult.message}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="confirmation" className="text-sm font-medium">
                Type <code className="bg-gray-100 px-1 rounded text-red-600">RESET DATABASE</code> to confirm:
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="RESET DATABASE"
                className={isConfirmationValid ? "border-green-300" : "border-red-300"}
                disabled={isResetting}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="include-reseed"
                checked={includeReseed}
                onCheckedChange={setIncludeReseed}
                disabled={isResetting}
              />
              <Label htmlFor="include-reseed" className="text-sm">
                Re-seed database with sample data after reset
              </Label>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-xs text-red-700">
                <strong>What will happen:</strong>
              </p>
              <ol className="text-xs text-red-600 mt-1 ml-4 space-y-1">
                <li>1. All existing data will be permanently deleted</li>
                <li>2. Database will be reset to clean state</li>
                {includeReseed && <li>3. Sample data will be inserted for testing</li>}
                <li>{includeReseed ? "4" : "3"}. You will need to log in again</li>
              </ol>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsResetDialogOpen(false);
                setConfirmationText("");
                setResetResult(null);
              }}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleNuclearReset}
              disabled={!isConfirmationValid || isResetting}
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Database
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}