"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDistanceToNow } from "date-fns";
import ImportLayout, { ImportStatusBadge, SourceTypeDisplay } from "@/components/import/ImportLayout";
import {
  ArrowLeft,
  Play,
  Edit,
  Trash2,
  Settings,
  Database,
  FileText,
  Globe,
  AlertCircle,
  CheckCircle,
  Loader2,
  Clock,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  TestTube,
  Eye,
  Copy,
  Download,
  History,
  Target,
  Link,
  Workflow,
  BookOpen,
  Lightbulb
} from "lucide-react";
import { ImportSourceType, ImportStatus } from "@prisma/client";

interface ImportConfiguration {
  id: string;
  name: string;
  description?: string;
  sourceType: ImportSourceType;
  connectionConfig: any;
  sourceTableConfig: any;
  isMultiStage: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  stages: ImportStage[];
  _count: {
    executions: number;
  };
}

interface ImportStage {
  id: string;
  order: number;
  name: string;
  description?: string;
  sourceTable: string;
  targetEntity: string;
  isEnabled: boolean;
}

const SOURCE_ICONS = {
  [ImportSourceType.DATABASE_MYSQL]: <Database className="h-4 w-4 text-blue-500" />,
  [ImportSourceType.DATABASE_POSTGRESQL]: <Database className="h-4 w-4 text-blue-600" />,
  [ImportSourceType.DATABASE_SQLITE]: <Database className="h-4 w-4 text-green-500" />,
  [ImportSourceType.DATABASE_MONGODB]: <Database className="h-4 w-4 text-green-600" />,
  [ImportSourceType.FILE_CSV]: <FileText className="h-4 w-4 text-green-600" />,
  [ImportSourceType.FILE_EXCEL]: <FileText className="h-4 w-4 text-green-700" />,
  [ImportSourceType.FILE_JSON]: <FileText className="h-4 w-4 text-yellow-600" />,
  [ImportSourceType.API_REST]: <Globe className="h-4 w-4 text-purple-500" />,
};

export default function ImportConfigurationPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { canViewImports, canCreateImports, canEditImports, loading: permissionsLoading } = usePermissions();
  const resolvedParams = use(params);

  const [configuration, setConfiguration] = useState<ImportConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && !permissionsLoading) {
      if (!canViewImports) {
        router.push("/dashboard");
        return;
      }
      loadConfiguration();
    }
  }, [status, canViewImports, permissionsLoading, router, resolvedParams.id]);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/import/configurations/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setConfiguration(data);
      } else if (response.status === 404) {
        router.push("/import");
      }
    } catch (error) {
      console.error("Failed to load configuration:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!configuration) return;

    setExecuting(true);
    try {
      const response = await fetch(`/api/import/configurations/${configuration.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false })
      });

      if (response.ok) {
        const result = await response.json();
        router.push(`/import/executions/${result.executionId}`);
      } else {
        const error = await response.json();
        alert(`Failed to start import: ${error.message}`);
      }
    } catch (error) {
      console.error("Failed to execute import:", error);
      alert("Failed to start import execution");
    } finally {
      setExecuting(false);
    }
  };

  if (loading || permissionsLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!configuration) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Configuration Not Found</h3>
          <p className="text-muted-foreground mb-4">
            The import configuration you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => router.push("/import")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Import Management
          </Button>
        </div>
      </div>
    );
  }

  const sourceIcon = SOURCE_ICONS[configuration.sourceType];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/import")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              {sourceIcon}
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{configuration.name}</h1>
                <p className="text-muted-foreground">
                  {configuration.description || "No description"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEditImports && (
              <Button variant="outline" onClick={() => router.push(`/import/${configuration.id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {canCreateImports && configuration.isActive && (
              <Button onClick={handleExecuteImport} disabled={executing}>
                {executing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Execute Import
              </Button>
            )}
          </div>
        </div>

        {/* Configuration Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Source Type</CardTitle>
              {sourceIcon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{configuration.sourceType}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Import Type</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {configuration.isMultiStage ? "Multi-Stage" : "Single-Stage"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{configuration._count.executions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              {configuration.isActive ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-gray-400" />
              )}
            </CardHeader>
            <CardContent>
              <Badge variant={configuration.isActive ? "default" : "secondary"}>
                {configuration.isActive ? "Active" : "Inactive"}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {configuration.isMultiStage && (
              <TabsTrigger value="stages">Stages ({configuration.stages?.length || 0})</TabsTrigger>
            )}
            <TabsTrigger value="source">Source Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Configuration Details</CardTitle>
                <CardDescription>
                  Import configuration information and metadata
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <div className="text-sm">{configuration.name}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Source Type</label>
                    <div className="text-sm">{configuration.sourceType}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Created</label>
                    <div className="text-sm">{formatDistanceToNow(new Date(configuration.createdAt))} ago</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Created By</label>
                    <div className="text-sm">{configuration.creator.name}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Last Updated</label>
                    <div className="text-sm">{formatDistanceToNow(new Date(configuration.updatedAt))} ago</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Selected Tables</label>
                    <div className="text-sm">
                      {configuration.sourceTableConfig?.selectedTables?.join(", ") || "None"}
                    </div>
                  </div>
                </div>

                {configuration.description && (
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <div className="text-sm">{configuration.description}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {configuration.isMultiStage && (
            <TabsContent value="stages">
              <Card>
                <CardHeader>
                  <CardTitle>Import Stages</CardTitle>
                  <CardDescription>
                    Multi-stage import pipeline configuration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(configuration.stages || []).map((stage) => (
                      <div key={stage.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">Stage {stage.order}</Badge>
                            <div>
                              <h4 className="font-medium">{stage.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {stage.sourceTable} → {stage.targetEntity}
                              </p>
                            </div>
                          </div>
                          <Badge variant={stage.isEnabled ? "default" : "secondary"}>
                            {stage.isEnabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        {stage.description && (
                          <p className="text-sm text-muted-foreground mt-2">{stage.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="source">
            <Card>
              <CardHeader>
                <CardTitle>Source Configuration</CardTitle>
                <CardDescription>
                  Connection and source data configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                  {JSON.stringify(configuration.connectionConfig, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}