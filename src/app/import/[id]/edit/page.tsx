"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { usePermissions } from "@/hooks/usePermissions";
import ImportLayout, { ImportStatusBadge, SourceTypeDisplay } from "@/components/import/ImportLayout";
import ImportWizard from "@/components/import/ImportWizard";
import MultiStageEditor from "@/components/import/MultiStageEditor";
import MultiStageWizard from "@/components/import/MultiStageWizard";
import SourceConfigEditor from "@/components/import/SourceConfigEditor";
import SourceTableSelector from "@/components/import/SourceTableSelector";
import { StageRelationship } from "@/components/import/RelationshipMapper";
import {
  ArrowLeft,
  Save,
  TestTube,
  Database,
  FileText,
  Globe,
  AlertCircle,
  CheckCircle,
  Loader2,
  HelpCircle,
  Info,
  Settings,
  Eye,
  Edit,
  RefreshCw,
  Lightbulb,
  BookOpen,
  Shield,
  X
} from "lucide-react";
import { ImportSourceType } from "@prisma/client";
import {
  ConnectionConfig,
  SourceSchema,
  ImportStageData
} from "@/lib/import/types";

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
  stages: ImportStageData[];
  _count: {
    executions: number;
  };
}

export default function EditImportConfigurationPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { canEditImports, loading: permissionsLoading } = usePermissions();
  const resolvedParams = use(params);

  const [configuration, setConfiguration] = useState<ImportConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTables, setSavingTables] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tablesSaved, setTablesSaved] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>({
    type: ImportSourceType.FILE_CSV
  });
  const [sourceSchema, setSourceSchema] = useState<SourceSchema | null>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [stages, setStages] = useState<ImportStageData[]>([]);
  const [relationships, setRelationships] = useState<StageRelationship[]>([]);
  const [joinedTables, setJoinedTables] = useState<any[]>([]);

  // Connection test result
  const [connectionTest, setConnectionTest] = useState<{
    success: boolean;
    message: string;
    recordCount?: number;
  } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && !permissionsLoading) {
      if (!canEditImports) {
        router.push("/import");
        return;
      }
      loadConfiguration();
    }
  }, [status, canEditImports, permissionsLoading, router, resolvedParams.id]);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/import/configurations/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setConfiguration(data);

        // Initialize form state
        setName(data.name);
        setDescription(data.description || '');
        setIsActive(data.isActive);
        setConnectionConfig(data.connectionConfig);
        setSelectedTables(data.sourceTableConfig?.selectedTables || []);
        setStages(data.stages || []);

        // Try to reconstruct source schema if available
        if (data.sourceTableConfig?.schema) {
          setSourceSchema(data.sourceTableConfig.schema);
        }

        // Initialize relationships (would come from API in real implementation)
        setRelationships([]);
      } else if (response.status === 404) {
        router.push("/import");
      }
    } catch (error) {
      console.error("Failed to load configuration:", error);
      setError("Failed to load import configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionTest(null);
    setError(null);

    try {
      const response = await fetch("/api/import/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(connectionConfig)
      });

      const result = await response.json();

      if (response.ok) {
        setConnectionTest({
          success: true,
          message: result.message,
          recordCount: result.recordCount
        });
        setSourceSchema(result.schema);
      } else {
        setConnectionTest({
          success: false,
          message: result.message || "Connection test failed"
        });
      }
    } catch (error) {
      setConnectionTest({
        success: false,
        message: "Failed to test connection"
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveConfiguration = async () => {
    setSaving(true);
    setError(null);

    try {
      const updateData = {
        name,
        description,
        connectionConfig,
        sourceTableConfig: {
          selectedTables,
          schema: sourceSchema
        },
        isMultiStage: configuration?.isMultiStage || false,
        stages: configuration?.isMultiStage ? stages : [],
        relationships: configuration?.isMultiStage ? relationships : [],
        isActive,
        connectionTestPassed: connectionTest?.success || false
      };

      const response = await fetch(`/api/import/configurations/${resolvedParams.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        router.push(`/import/${resolvedParams.id}`);
      } else {
        const error = await response.json();
        setError(error.message || "Failed to update configuration");
      }
    } catch (error) {
      setError("Failed to update configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTableConfiguration = async () => {
    setSavingTables(true);
    setError(null);
    setTablesSaved(false);

    try {
      const updateData = {
        sourceTableConfig: {
          selectedTables,
          schema: sourceSchema
        }
      };

      const response = await fetch(`/api/import/configurations/${resolvedParams.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        setTablesSaved(true);
        // Clear the success message after 3 seconds
        setTimeout(() => setTablesSaved(false), 3000);
      } else {
        const error = await response.json();
        setError(error.message || "Failed to update table configuration");
      }
    } catch (error) {
      setError("Failed to update table configuration");
    } finally {
      setSavingTables(false);
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push(`/import/${resolvedParams.id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Configuration
          </Button>
          <div className="flex items-center gap-3">
            {sourceIcon}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Edit Import Configuration</h1>
              <p className="text-muted-foreground">
                Modify settings for "{configuration.name}"
              </p>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={searchParams.get('tab') || "basic"} onValueChange={(value) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set('tab', value);
          router.push(`/import/${resolvedParams.id}/edit?${params.toString()}`, { scroll: false });
        }} className="space-y-6">
          <TabsList>
            <TabsTrigger value="basic">Basic Settings</TabsTrigger>
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="tables">Source Tables</TabsTrigger>
            {configuration.isMultiStage && (
              <TabsTrigger value="stages">Stages & Relationships</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Update the name, description, and status of your import configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Configuration Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter configuration name"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this import configuration does"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <Label>Active configuration</Label>
                </div>

                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Source Type:</span>
                      <div className="font-medium">{configuration.sourceType}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Import Type:</span>
                      <div className="font-medium">
                        {configuration.isMultiStage ? "Multi-Stage" : "Single-Stage"}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Selected Tables:</span>
                      <div className="font-medium">{selectedTables.length}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Executions:</span>
                      <div className="font-medium">{configuration._count.executions}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <div className="font-medium">
                        {new Date(configuration.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="connection">
            <Card>
              <CardHeader>
                <CardTitle>Connection Configuration</CardTitle>
                <CardDescription>
                  Update connection settings and test the connection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Connection configuration editing is currently read-only.
                    To change the connection settings, create a new import configuration.
                  </AlertDescription>
                </Alert>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Current Connection Settings</h4>
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(connectionConfig, null, 2)}
                  </pre>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Test Connection</h4>
                      <p className="text-sm text-muted-foreground">
                        Verify the connection is still working with current settings
                      </p>
                    </div>
                    <Button onClick={handleTestConnection} disabled={testingConnection}>
                      {testingConnection ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4 mr-2" />
                      )}
                      Test Connection
                    </Button>
                  </div>

                  {connectionTest && (
                    <Alert className={`mt-4 ${connectionTest.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                      {connectionTest.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <AlertDescription>
                        <div className="font-medium mb-1">
                          {connectionTest.success ? "Connection Successful" : "Connection Failed"}
                        </div>
                        <div>{connectionTest.message}</div>
                        {connectionTest.recordCount && (
                          <div className="text-sm mt-2">
                            Found {connectionTest.recordCount.toLocaleString()} records
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tables">
            <Card>
              <CardHeader>
                <CardTitle>Source Table Management</CardTitle>
                <CardDescription>
                  Select and manage the source tables for your import configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tablesSaved && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      Table configuration saved successfully!
                    </AlertDescription>
                  </Alert>
                )}

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Changes to table selection will affect your stages configuration. 
                    Make sure to update your stages after modifying table selection.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Current Selection</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedTables.length} table(s) selected for import
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={handleTestConnection}
                        disabled={testingConnection}
                      >
                        {testingConnection ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh Schema
                      </Button>
                      <Button 
                        onClick={handleSaveTableConfiguration}
                        disabled={savingTables}
                      >
                        {savingTables ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Tables
                      </Button>
                    </div>
                  </div>

                  {selectedTables.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {selectedTables.map((tableName) => (
                        <div key={tableName} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <Database className="h-4 w-4" />
                          <span className="text-sm font-medium">{tableName}</span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedTables(prev => prev.filter(t => t !== tableName))}
                            className="ml-auto h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {sourceSchema ? (
                  <div className="border-t pt-4">
                    <SourceTableSelector
                      connectionConfig={connectionConfig}
                      sourceSchema={sourceSchema}
                      selectedTables={selectedTables}
                      onTableSelectionChange={setSelectedTables}
                    />
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Source schema not available. Please test your connection first to load available tables.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {configuration.isMultiStage && (
            <TabsContent value="stages" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    Multi-Stage Pipeline Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure your multi-stage import pipeline and stage relationships
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert className="mb-6">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Advanced Configuration</AlertTitle>
                    <AlertDescription>
                      Multi-stage configurations allow complex data imports with dependencies between stages.
                      Each stage can depend on previous stages and map relationships between different data sources.
                    </AlertDescription>
                  </Alert>

                  {sourceSchema ? (
                    <MultiStageWizard
                      sourceSchema={sourceSchema}
                      selectedTables={selectedTables}
                      stages={stages}
                      relationships={relationships}
                      joinedTables={joinedTables}
                      connectionConfig={connectionConfig}
                      onChange={setStages}
                      onRelationshipsChange={setRelationships}
                      onJoinedTablesChange={setJoinedTables}
                    />
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Schema Required</AlertTitle>
                      <AlertDescription>
                        Source schema information is required to configure multi-stage pipelines.
                        Please test your connection first to load the table schema.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}