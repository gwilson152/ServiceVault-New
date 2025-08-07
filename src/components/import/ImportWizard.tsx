"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import ImportLayout, { ImportStep } from "./ImportLayout";
import SourceConfigEditor from "./SourceConfigEditor";
import SourceTableSelector from "./SourceTableSelector";
import MultiStageEditor from "./MultiStageEditor";
import { StageRelationship } from "./RelationshipMapper";
import {
  Save,
  TestTube,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Settings,
  Database,
  FileText,
  Globe
} from "lucide-react";
import { ImportSourceType } from "@prisma/client";
import { 
  ConnectionConfig, 
  SourceSchema, 
  ImportStageData,
  ImportConfigurationData
} from "@/lib/import/types";

const SOURCE_TYPE_OPTIONS = [
  { 
    value: ImportSourceType.DATABASE_MYSQL, 
    label: "MySQL Database", 
    icon: <Database className="h-4 w-4" />,
    description: "Connect to MySQL/MariaDB database"
  },
  { 
    value: ImportSourceType.DATABASE_POSTGRESQL, 
    label: "PostgreSQL Database", 
    icon: <Database className="h-4 w-4" />,
    description: "Connect to PostgreSQL database"
  },
  { 
    value: ImportSourceType.DATABASE_SQLITE, 
    label: "SQLite Database", 
    icon: <Database className="h-4 w-4" />,
    description: "Import from SQLite database file"
  },
  { 
    value: ImportSourceType.FILE_CSV, 
    label: "CSV File", 
    icon: <FileText className="h-4 w-4" />,
    description: "Import from comma-separated values file"
  },
  { 
    value: ImportSourceType.FILE_EXCEL, 
    label: "Excel File", 
    icon: <FileText className="h-4 w-4" />,
    description: "Import from Excel spreadsheet"
  },
  { 
    value: ImportSourceType.FILE_JSON, 
    label: "JSON File", 
    icon: <FileText className="h-4 w-4" />,
    description: "Import from JSON data file"
  },
  { 
    value: ImportSourceType.API_REST, 
    label: "REST API", 
    icon: <Globe className="h-4 w-4" />,
    description: "Import from REST API endpoint"
  }
];

interface ImportWizardProps {
  mode?: 'create' | 'edit';
  configurationId?: string;
  initialData?: Partial<ImportConfigurationData>;
  onComplete?: (configurationId: string) => void;
  onCancel?: () => void;
}

export default function ImportWizard({
  mode = 'create',
  configurationId,
  initialData,
  onComplete,
  onCancel
}: ImportWizardProps) {
  const router = useRouter();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [sourceType, setSourceType] = useState<ImportSourceType | "">(initialData?.sourceType || "");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [isMultiStage, setIsMultiStage] = useState(initialData?.isMultiStage ?? false);
  
  // Connection and schema data
  const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>({
    type: ImportSourceType.FILE_CSV,
    ...initialData?.connectionConfig
  });
  const [sourceSchema, setSourceSchema] = useState<SourceSchema | null>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>(
    initialData?.sourceTableConfig?.selectedTables || []
  );
  const [stages, setStages] = useState<ImportStageData[]>(initialData?.stages || []);
  const [relationships, setRelationships] = useState<StageRelationship[]>([]);
  
  // Connection test state
  const [connectionTest, setConnectionTest] = useState<{
    success: boolean;
    message: string;
    recordCount?: number;
  } | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // Define wizard steps
  const steps: ImportStep[] = [
    {
      id: "source",
      title: "Source Type",
      description: "Choose your data source",
      completed: !!sourceType,
      current: currentStep === 0
    },
    {
      id: "basic",
      title: "Basic Info",
      description: "Name and description",
      completed: !!(name && sourceType),
      current: currentStep === 1
    },
    {
      id: "connection",
      title: "Connection",
      description: "Configure data source",
      completed: !!connectionTest?.success,
      current: currentStep === 2
    },
    {
      id: "tables",
      title: "Tables",
      description: "Select data tables",
      completed: selectedTables.length > 0,
      current: currentStep === 3
    },
    {
      id: "pipeline",
      title: "Pipeline",
      description: "Configure import stages",
      completed: !isMultiStage || stages.length > 0,
      current: currentStep === 4
    },
    {
      id: "review",
      title: "Review",
      description: "Final review and save",
      completed: false,
      current: currentStep === 5
    }
  ];

  // Update connection config when source type changes
  useEffect(() => {
    if (sourceType) {
      setConnectionConfig(prev => ({ ...prev, type: sourceType }));
    }
  }, [sourceType]);

  const handleTestConnection = useCallback(async () => {
    if (!connectionConfig) return;
    
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
        
        // Auto-advance if connection successful
        setTimeout(() => {
          if (currentStep === 2) {
            setCurrentStep(3);
          }
        }, 1500);
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
  }, [connectionConfig, currentStep]);

  const handleSaveConfiguration = async () => {
    setSaving(true);
    setError(null);

    try {
      const finalStages = isMultiStage && stages.length > 0 ? stages : selectedTables.map((tableName, index) => ({
        id: `stage-${index + 1}`,
        order: index + 1,
        name: `Import ${tableName}`,
        description: `Import data from ${tableName} table`,
        sourceTable: tableName,
        targetEntity: 'Account',
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
        sourceTableConfig: {
          selectedTables,
          schema: sourceSchema
        },
        isMultiStage,
        stages: finalStages,
        relationships: isMultiStage ? relationships : [],
        isActive,
        connectionTestPassed: connectionTest?.success || false
      };

      const url = mode === 'edit' && configurationId 
        ? `/api/import/configurations/${configurationId}`
        : '/api/import/configurations';
      
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configData)
      });

      if (response.ok) {
        const result = await response.json();
        const resultConfigId = result.configuration?.id || configurationId;
        
        if (onComplete) {
          onComplete(resultConfigId);
        } else {
          router.push(`/import/${resultConfigId}`);
        }
      } else {
        const error = await response.json();
        setError(error.message || `Failed to ${mode === 'edit' ? 'update' : 'create'} configuration`);
      }
    } catch (error) {
      setError(`Failed to ${mode === 'edit' ? 'update' : 'create'} configuration`);
    } finally {
      setSaving(false);
    }
  };

  const canProceedToStep = (step: number): boolean => {
    switch (step) {
      case 1: return !!sourceType;
      case 2: return !!(name && sourceType);
      case 3: return !!sourceSchema || mode === 'edit';
      case 4: return selectedTables.length > 0;
      case 5: return !isMultiStage || stages.length > 0;
      default: return true;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1 && canProceedToStep(currentStep + 1)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Source Type Selection
        return (
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Data Source</CardTitle>
              <CardDescription>
                Select the type of data source you want to import from
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {SOURCE_TYPE_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      sourceType === option.value
                        ? 'ring-2 ring-primary border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSourceType(option.value)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {option.icon}
                      <h3 className="font-semibold">{option.label}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                    {sourceType === option.value && (
                      <div className="mt-3 flex items-center gap-1 text-primary">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Selected</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 1: // Basic Information
        return (
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
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this import configuration does"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Activate configuration after creation</Label>
              </div>
            </CardContent>
          </Card>
        );

      case 2: // Connection Configuration
        return (
          <Card>
            <CardHeader>
              <CardTitle>Connection Configuration</CardTitle>
              <CardDescription>
                Configure the connection to your {SOURCE_TYPE_OPTIONS.find(o => o.value === sourceType)?.label.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <SourceConfigEditor
                sourceType={sourceType as ImportSourceType}
                config={connectionConfig}
                onChange={setConnectionConfig}
              />
              
              <div className="pt-6 border-t">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium">Test Connection</h3>
                    <p className="text-sm text-muted-foreground">
                      Verify connection and discover available data
                    </p>
                  </div>
                  <Button 
                    onClick={handleTestConnection} 
                    disabled={testingConnection}
                    className="min-w-[140px]"
                  >
                    {testingConnection ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <TestTube className="h-4 w-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                </div>

                {connectionTest && (
                  <Alert className={connectionTest.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                    {connectionTest.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription>
                      <div className="font-medium mb-1">
                        {connectionTest.success ? "Connection Successful!" : "Connection Failed"}
                      </div>
                      <div>{connectionTest.message}</div>
                      {connectionTest.recordCount && (
                        <div className="text-sm mt-2">
                          Found {connectionTest.recordCount.toLocaleString()} total records
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 3: // Table Selection
        return sourceSchema ? (
          <SourceTableSelector
            connectionConfig={connectionConfig}
            sourceSchema={sourceSchema}
            selectedTables={selectedTables}
            onTableSelectionChange={setSelectedTables}
          />
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Schema Available</h3>
              <p className="text-muted-foreground mb-4">
                Please test your connection first to discover available tables
              </p>
              <Button onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back to Connection
              </Button>
            </CardContent>
          </Card>
        );

      case 4: // Pipeline Configuration
        return (
          <Card>
            <CardHeader>
              <CardTitle>Import Pipeline</CardTitle>
              <CardDescription>
                Configure how your data will be processed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch checked={isMultiStage} onCheckedChange={setIsMultiStage} />
                <Label>Enable multi-stage import pipeline</Label>
              </div>

              {!isMultiStage ? (
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-1">Single-Stage Import</div>
                    <div>
                      All selected tables ({selectedTables.length}) will be imported in a simple, straightforward process.
                      This is perfect for basic imports without complex relationships.
                    </div>
                  </AlertDescription>
                </Alert>
              ) : sourceSchema ? (
                <MultiStageEditor
                  sourceSchema={sourceSchema}
                  selectedTables={selectedTables}
                  stages={stages}
                  relationships={relationships}
                  onChange={setStages}
                  onRelationshipsChange={setRelationships}
                />
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Schema information is required for multi-stage configuration. 
                    Please test your connection to load table details.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        );

      case 5: // Review
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuration Review</CardTitle>
                <CardDescription>
                  Review your import configuration before saving
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="font-medium mb-3">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <div className="font-medium">{name}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Source Type:</span>
                      <div className="font-medium">
                        {SOURCE_TYPE_OPTIONS.find(o => o.value === sourceType)?.label}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pipeline Type:</span>
                      <div className="font-medium">{isMultiStage ? "Multi-Stage" : "Single-Stage"}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={isActive ? "default" : "secondary"}>
                        {isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  {description && (
                    <div className="mt-4">
                      <span className="text-muted-foreground">Description:</span>
                      <div className="text-sm mt-1">{description}</div>
                    </div>
                  )}
                </div>

                {/* Tables */}
                <div>
                  <h3 className="font-medium mb-3">Selected Tables ({selectedTables.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTables.map((table) => (
                      <Badge key={table} variant="outline">{table}</Badge>
                    ))}
                  </div>
                </div>

                {/* Stages */}
                {isMultiStage && stages.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3">Pipeline Stages ({stages.length})</h3>
                    <div className="space-y-2">
                      {stages.map((stage) => (
                        <div key={stage.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Stage {stage.order}</Badge>
                            <span className="text-sm font-medium">{stage.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {stage.sourceTable} → {stage.targetEntity}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connection Status */}
                <div>
                  <h3 className="font-medium mb-3">Connection Status</h3>
                  {connectionTest ? (
                    <Alert className={connectionTest.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                      {connectionTest.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <AlertDescription>
                        {connectionTest.message}
                        {connectionTest.recordCount && (
                          <div className="text-sm mt-1">
                            {connectionTest.recordCount.toLocaleString()} records found
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Connection has not been tested. The configuration will be saved but may not work correctly.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <ImportLayout
      title={mode === 'edit' ? "Edit Import Configuration" : "Create Import Configuration"}
      subtitle={mode === 'edit' ? `Modify "${name || 'Untitled'}"` : "Set up a new data import"}
      sourceType={sourceType as ImportSourceType}
      steps={steps}
      actions={
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {currentStep > 0 && (
            <Button variant="outline" onClick={handlePrevious}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}
          {currentStep < steps.length - 1 ? (
            <Button 
              onClick={handleNext}
              disabled={!canProceedToStep(currentStep + 1)}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSaveConfiguration} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === 'edit' ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {mode === 'edit' ? 'Update Configuration' : 'Create Configuration'}
                </>
              )}
            </Button>
          )}
        </div>
      }
    >
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {renderStepContent()}
    </ImportLayout>
  );
}