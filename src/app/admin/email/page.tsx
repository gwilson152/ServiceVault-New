import { Suspense } from 'react';
import { GlobalEmailManager } from '@/components/email/GlobalEmailManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailSecuritySettings } from '@/components/email/EmailSecuritySettings';
import { QuarantineManager } from '@/components/email/QuarantineManager';
import { AuditDashboard } from '@/components/email/AuditDashboard';
import { DomainMappingManager } from '@/components/email/DomainMappingManager';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminEmailPage() {
  return (
    <main className="max-w-7xl mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Global Email Management</h1>
          <p className="text-gray-600">
            Configure system-wide email integrations, domain mappings, security settings, and monitor email processing
          </p>
        </div>

        <Tabs defaultValue="integrations" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="domains">Domain Mapping</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="quarantine">Quarantine</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="integrations" className="space-y-6">
            <Suspense fallback={<EmailIntegrationSkeleton />}>
              <GlobalEmailManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="domains" className="space-y-6">
            <Suspense fallback={<DomainMappingSkeleton />}>
              <DomainMappingManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Suspense fallback={<SecuritySettingsSkeleton />}>
              <EmailSecuritySettings />
            </Suspense>
          </TabsContent>

          <TabsContent value="quarantine" className="space-y-6">
            <Suspense fallback={<QuarantineSkeleton />}>
              <QuarantineManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <Suspense fallback={<AuditSkeleton />}>
              <AuditDashboard />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function EmailIntegrationSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-right space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-8 w-8" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DomainMappingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="border rounded-lg">
        <div className="border-b p-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4 py-4 border-b last:border-b-0">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-4 w-16" />
                <div className="flex space-x-1">
                  {[1, 2].map((j) => (
                    <Skeleton key={j} className="h-8 w-8" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SecuritySettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <div className="border rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="text-center space-y-2">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-4 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg">
            <div className="border-b p-4">
              <Skeleton className="h-6 w-48" />
            </div>
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuarantineSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      <div className="border rounded-lg">
        <div className="border-b p-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4 py-4 border-b last:border-b-0">
                <Skeleton className="h-4 w-4" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      <div className="border-b">
        <div className="flex space-x-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32 mb-2" />
            <div className="flex items-center">
              <Skeleton className="h-4 w-4 mr-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}