"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { usePermissions } from "@/hooks/usePermissions";
import { ConnectionManager } from "@/lib/import/ConnectionManager";
import FieldMappingEditor from "@/components/import/FieldMappingEditor";
import SourceTableSelector from "@/components/import/SourceTableSelector";
import {
  ArrowLeft,
  Save,
  TestTube,
  Database,
  FileText,
  Globe,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
  Play,
  Eye
} from "lucide-react";
import { ImportSourceType } from "@prisma/client";
import { 
  ConnectionConfig, 
  SourceSchema, 
  SourceField, 
  TargetField, 
  FieldMapping,
  ImportConfigurationData
} from "@/lib/import/types";

const SOURCE_TYPE_OPTIONS = [
  { value: ImportSourceType.DATABASE_MYSQL, label: "MySQL Database", icon: <Database className="h-4 w-4" /> },
  { value: ImportSourceType.DATABASE_POSTGRESQL, label: "PostgreSQL Database", icon: <Database className="h-4 w-4" /> },
  { value: ImportSourceType.DATABASE_SQLITE, label: "SQLite Database", icon: <Database className="h-4 w-4" /> },
  { value: ImportSourceType.FILE_CSV, label: "CSV File", icon: <FileText className="h-4 w-4" /> },
  { value: ImportSourceType.FILE_EXCEL, label: "Excel File", icon: <FileText className="h-4 w-4" /> },
  { value: ImportSourceType.FILE_JSON, label: "JSON File", icon: <FileText className="h-4 w-4" /> },
  { value: ImportSourceType.API_REST, label: "REST API", icon: <Globe className="h-4 w-4" /> }
];

const TARGET_ENTITIES = [
  'Account', 'User', 'Ticket', 'TimeEntry', 'BillingRate'
];

export default function NewImportConfigurationPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { canCreateImports, loading: permissionsLoading } = usePermissions();

  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Configuration data
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState<ImportSourceType | "">("");
  const [isMultiStage, setIsMultiStage] = useState(false);
  const [isActive, setIsActive] = useState(true);
  
  // Connection config
  const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>({
    type: ImportSourceType.FILE_CSV
  });
  
  // Schema and table selection data
  const [sourceSchema, setSourceSchema] = useState<SourceSchema | null>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [targetEntity, setTargetEntity] = useState("");
  const [targetFields, setTargetFields] = useState<TargetField[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  
  // Connection test result
  const [connectionTest, setConnectionTest] = useState<{
    success: boolean;
    message: string;
    recordCount?: number;
  } | null>(null);

  // Steps configuration  
  const steps = [
    { id: "basic", title: "Basic Information", description: "Name and description" },
    { id: "source", title: "Data Source", description: "Configure source connection" },
    { id: "tables", title: "Select Tables", description: "Choose source tables to import" },
    { id: "stages", title: "Configure Stages", description: "Set up multi-stage import pipeline" },
    { id: "review", title: "Review & Save", description: "Review and save configuration" }
  ];

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && !permissionsLoading && !canCreateImports) {
      router.push("/import");
    }
  }, [status, canCreateImports, permissionsLoading, router]);

  useEffect(() => {
    if (sourceType) {
      setConnectionConfig(prev => ({ ...prev, type: sourceType }));
    }
  }, [sourceType]);

  useEffect(() => {
    if (targetEntity) {
      loadTargetEntityFields();
    }
  }, [targetEntity]);

  const loadTargetEntityFields = async () => {
    try {
      const response = await fetch(`/api/import/schema/fields?entity=${targetEntity}`);
      if (response.ok) {
        const data = await response.json();
        setTargetFields(data.fields || []);
      }
    } catch (error) {
      console.error("Failed to load target entity fields:", error);
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
      // If user wants to activate but connection test failed, prevent it
      const finalIsActive = isActive && connectionTest?.success;
      if (isActive && !connectionTest?.success) {
        setError("Cannot activate configuration without a successful connection test. Configuration will be saved as inactive.");
      }

      // Create source table configuration
      const sourceTableConfig = {
        selectedTables,
        schema: sourceSchema
      };

      // Create basic stages for each selected table (enhanced configuration will come later)
      const stages = selectedTables.map((tableName, index) => ({
        order: index + 1,
        name: `Import ${tableName}`,
        description: `Import data from ${tableName} table`,
        sourceTable: tableName,
        targetEntity: 'Account', // Default for now - will be configurable in stage configuration
        fieldMappings: [],
        fieldOverrides: {},
        dependsOnStages: [],
        crossStageMapping: {},
        validationRules: [],
        transformRules: [],
        isEnabled: true
      }));

      const configData = {
        name,
        description,
        sourceType: sourceType as ImportSourceType,
        connectionConfig,
        sourceTableConfig,
        isMultiStage,
        stages: isMultiStage ? stages : [], // Only include stages for multi-stage imports
        isActive: finalIsActive,
        connectionTestPassed: connectionTest?.success || false
      };

      const response = await fetch("/api/import/configurations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configData)
      });

      if (response.ok) {
        const result = await response.json();
        router.push(`/import/${result.configuration.id}`);
      } else {
        const error = await response.json();
        setError(error.message || "Failed to save configuration");
      }
    } catch (error) {
      setError("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const canProceedToStep = (step: number): boolean => {
    switch (step) {
      case 1: return !!(name && sourceType);
      case 2: return !!(sourceSchema); // Allow proceeding with schema even if connection test failed
      case 3: return selectedTables.length > 0; // Must select at least one table
      case 4: return selectedTables.length > 0; // Can configure stages if tables are selected
      default: return true;
    }
  };

  const getValidationSummary = () => {
    const requiredTargetFields = targetFields.filter(f => f.required);
    const mappedRequiredFields = requiredTargetFields.filter(f => 
      fieldMappings.some(m => m.targetField === f.name)
    );
    
    return {
      totalMappings: fieldMappings.length,
      requiredFields: requiredTargetFields.length,
      mappedRequiredFields: mappedRequiredFields.length,
      missingRequired: requiredTargetFields.length - mappedRequiredFields.length
    };
  };

  if (status === "loading" || loading || permissionsLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/import")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Import Management
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Import Configuration</h1>
            <p className="text-muted-foreground">
              Configure a new data import from external sources
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                      currentStep >= index
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground text-muted-foreground'
                    }`}
                  >
                    {currentStep > index ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium">{step.title}</div>
                    <div className="text-xs text-muted-foreground">{step.description}</div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-px mx-4 ${
                      currentStep > index ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <Progress value={((currentStep + 1) / steps.length) * 100} className="w-full" />
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Provide a name and description for your import configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Configuration Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter a descriptive name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this import configuration does"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="sourceType">Source Type *</Label>
                <Select value={sourceType} onValueChange={(value: ImportSourceType) => setSourceType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select data source type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          {option.icon}
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Active configuration</Label>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Data Source Configuration</CardTitle>
              <CardDescription>
                Configure the connection to your data source
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SourceConfigEditor
                sourceType={sourceType as ImportSourceType}
                config={connectionConfig}
                onChange={setConnectionConfig}
              />
              
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Test Connection</h3>
                    <p className="text-sm text-muted-foreground">
                      Test the connection to discover schema automatically, or proceed to manually configure field mappings
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleTestConnection} disabled={testingConnection}>
                      {testingConnection ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4 mr-2" />
                      )}
                      Test Connection
                    </Button>
                    {connectionTest && !connectionTest.success && (
                      <Button variant="outline" onClick={() => setSourceSchema({ fields: [], tables: [] })}>
                        Skip Test & Configure Manually
                      </Button>
                    )}
                  </div>
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
        )}

        {currentStep === 2 && sourceSchema && (
          <div className="space-y-4">
            {/* Debug Information */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div><strong>Debug Info:</strong></div>
                  <div>Tables found: {sourceSchema.tables?.length || 0}</div>
                  <div>Table names: {sourceSchema.tables?.map(t => t.name).join(", ") || "None"}</div>
                  {sourceSchema.tables?.length === 0 && (
                    <div className="text-red-600">
                      No tables discovered. Check database permissions and connection.
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
            
            <SourceTableSelector
              connectionConfig={connectionConfig}
              sourceSchema={sourceSchema}
              selectedTables={selectedTables}
              onTableSelectionChange={setSelectedTables}
            />
          </div>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Configure Import Stages</CardTitle>
              <CardDescription>
                Set up multi-stage import pipeline with field mappings and relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Switch checked={isMultiStage} onCheckedChange={setIsMultiStage} />
                  <Label>Enable multi-stage import</Label>
                </div>

                {!isMultiStage && selectedTables.length === 1 && (
                  <div>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Single-stage import mode: All records from "{selectedTables[0]}" will be imported in one stage.
                        You can enable multi-stage import to set up complex relationships between tables.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {!isMultiStage && selectedTables.length > 1 && (
                  <div>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Multiple tables selected but multi-stage import is disabled. 
                        Enable multi-stage import to configure relationships between {selectedTables.join(", ")}.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {isMultiStage && (
                  <div>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Multi-stage import configuration interface coming soon. 
                        For now, the system will create a basic stage for each selected table: {selectedTables.join(", ")}.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Review Configuration</CardTitle>
              <CardDescription>
                Review your import configuration before saving
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-medium mb-2">Basic Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span>{name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Source Type:</span>
                    <span>{SOURCE_TYPE_OPTIONS.find(o => o.value === sourceType)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Selected Tables:</span>
                    <span>{selectedTables.join(", ") || "None"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Import Type:</span>
                    <span>{isMultiStage ? "Multi-Stage" : "Single-Stage"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={isActive ? "default" : "secondary"}>
                      {isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Selected Tables Summary */}
              <div>
                <h3 className="text-lg font-medium mb-2">Selected Tables ({selectedTables.length})</h3>
                <div className="space-y-2">
                  {selectedTables.map((tableName) => {
                    const table = sourceSchema?.tables?.find(t => t.name === tableName);
                    return (
                      <div key={tableName} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{tableName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {table && (
                            <>
                              <Badge variant="outline" className="text-xs">
                                {table.fields.length} fields
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {table.recordCount?.toLocaleString() || "Unknown"} records
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div>
            {currentStep > 0 && (
              <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                Previous
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {currentStep < steps.length - 1 && (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceedToStep(currentStep + 1)}
              >
                Next
              </Button>
            )}
            
            {currentStep === steps.length - 1 && (
              <Button onClick={handleSaveConfiguration} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Configuration
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Source Configuration Editor Component
interface SourceConfigEditorProps {
  sourceType: ImportSourceType;
  config: ConnectionConfig;
  onChange: (config: ConnectionConfig) => void;
}

function SourceConfigEditor({ sourceType, config, onChange }: SourceConfigEditorProps) {
  const updateConfig = (updates: Partial<ConnectionConfig>) => {
    onChange({ ...config, ...updates });
  };

  if ([ImportSourceType.DATABASE_MYSQL, ImportSourceType.DATABASE_POSTGRESQL].includes(sourceType)) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Host *</Label>
            <Input
              placeholder="localhost"
              value={config.host || ""}
              onChange={(e) => updateConfig({ host: e.target.value })}
            />
          </div>
          <div>
            <Label>Port</Label>
            <Input
              type="number"
              placeholder={sourceType === ImportSourceType.DATABASE_MYSQL ? "3306" : "5432"}
              value={config.port || ""}
              onChange={(e) => updateConfig({ port: parseInt(e.target.value) || undefined })}
            />
          </div>
        </div>
        
        <div>
          <Label>Database *</Label>
          <Input
            placeholder="database_name"
            value={config.database || ""}
            onChange={(e) => updateConfig({ database: e.target.value })}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Username *</Label>
            <Input
              placeholder="username"
              value={config.username || ""}
              onChange={(e) => updateConfig({ username: e.target.value })}
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              placeholder="password"
              value={config.password || ""}
              onChange={(e) => updateConfig({ password: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={config.ssl || false}
            onCheckedChange={(checked) => updateConfig({ ssl: checked })}
          />
          <Label>Use SSL</Label>
        </div>
      </div>
    );
  }

  if (sourceType === ImportSourceType.DATABASE_SQLITE) {
    return (
      <div>
        <Label>SQLite File Path *</Label>
        <Input
          placeholder="/path/to/database.sqlite"
          value={config.filePath || ""}
          onChange={(e) => updateConfig({ filePath: e.target.value })}
        />
      </div>
    );
  }

  if ([ImportSourceType.FILE_CSV, ImportSourceType.FILE_EXCEL, ImportSourceType.FILE_JSON].includes(sourceType)) {
    return (
      <div className="space-y-4">
        <div>
          <Label>File Path *</Label>
          <Input
            placeholder="/path/to/file"
            value={config.filePath || ""}
            onChange={(e) => updateConfig({ filePath: e.target.value })}
          />
        </div>

        {sourceType === ImportSourceType.FILE_CSV && (
          <>
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.hasHeaders !== false}
                onCheckedChange={(checked) => updateConfig({ hasHeaders: checked })}
              />
              <Label>File has headers</Label>
            </div>

            <div>
              <Label>Delimiter</Label>
              <Select
                value={config.delimiter || "auto"}
                onValueChange={(value) => updateConfig({ delimiter: value === "auto" ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value=",">Comma (,)</SelectItem>
                  <SelectItem value=";">Semicolon (;)</SelectItem>
                  <SelectItem value="\t">Tab</SelectItem>
                  <SelectItem value="|">Pipe (|)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>
    );
  }

  if (sourceType === ImportSourceType.API_REST) {
    return (
      <div className="space-y-4">
        <div>
          <Label>API URL *</Label>
          <Input
            placeholder="https://api.example.com/data"
            value={config.apiUrl || ""}
            onChange={(e) => updateConfig({ apiUrl: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>HTTP Method</Label>
            <Select
              value={config.method || "GET"}
              onValueChange={(value: string) => updateConfig({ method: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Authentication Type</Label>
            <Select
              value={config.authType || "none"}
              onValueChange={(value: any) => updateConfig({ authType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="api-key">API Key (Header)</SelectItem>
                <SelectItem value="basic">Basic Auth</SelectItem>
                <SelectItem value="query-param">Query Parameter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {config.authType !== "none" && (
          <div className="space-y-4">
            <div>
              <Label>API Key / Token *</Label>
              <Input
                type="password"
                placeholder="Your API key or token"
                value={config.apiKey || ""}
                onChange={(e) => updateConfig({ apiKey: e.target.value })}
              />
            </div>

            {config.authType === 'basic' && (
              <div>
                <Label>Password (optional)</Label>
                <Input
                  type="password"
                  placeholder="Leave empty for random password"
                  value={config.apiPassword || ""}
                  onChange={(e) => updateConfig({ apiPassword: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Uses API key as username. If no password provided, will use "randompassword"
                </p>
              </div>
            )}

            {config.authType === 'api-key' && (
              <div>
                <Label>Header Name</Label>
                <Input
                  placeholder="X-API-Key (default) or X-FreeScout-API-Key"
                  value={config.apiKeyHeader || ""}
                  onChange={(e) => updateConfig({ apiKeyHeader: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to use default "X-API-Key" header
                </p>
              </div>
            )}

            {config.authType === 'query-param' && (
              <div>
                <Label>Parameter Name</Label>
                <Input
                  placeholder="api_key (default)"
                  value={config.apiKeyParam || ""}
                  onChange={(e) => updateConfig({ apiKeyParam: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Query parameter name for the API key (e.g., api_key, token)
                </p>
              </div>
            )}
          </div>
        )}

        <div>
          <Label>Limit Parameter (optional)</Label>
          <Input
            placeholder="limit, count, per_page"
            value={config.limitParam || ""}
            onChange={(e) => updateConfig({ limitParam: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Query parameter name for limiting results during preview
          </p>
        </div>
      </div>
    );
  }

  return <div>Configuration for {sourceType} not implemented yet.</div>;
}

// Validation Summary Component
interface ValidationSummaryProps {
  targetFields: TargetField[];
  fieldMappings: FieldMapping[];
}

function ValidationSummary({ targetFields, fieldMappings }: ValidationSummaryProps) {
  const requiredFields = targetFields.filter(f => f.required);
  const mappedRequiredFields = requiredFields.filter(f => 
    fieldMappings.some(m => m.targetField === f.name)
  );
  const missingRequiredFields = requiredFields.filter(f => 
    !fieldMappings.some(m => m.targetField === f.name)
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{fieldMappings.length}</div>
          <div className="text-sm text-muted-foreground">Total Mappings</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{mappedRequiredFields.length}</div>
          <div className="text-sm text-muted-foreground">Required Mapped</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${missingRequiredFields.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {missingRequiredFields.length}
          </div>
          <div className="text-sm text-muted-foreground">Missing Required</div>
        </div>
      </div>

      {missingRequiredFields.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-1">Missing Required Field Mappings</div>
            <div className="text-sm">
              The following required fields are not mapped: {missingRequiredFields.map(f => f.name).join(", ")}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}