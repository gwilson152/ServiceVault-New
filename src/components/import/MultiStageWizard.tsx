"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Database,
  Target,
  Link,
  Lightbulb,
  Eye,
  ChevronDown,
  ChevronRight,
  Workflow,
  MapPin,
  FileText,
  Info,
  Play,
  Plus
} from "lucide-react";
import { SourceSchema, SourceTable, ImportStageData, ConnectionConfig } from "@/lib/import/types";
import { StageRelationship } from "./RelationshipMapper";

const TARGET_ENTITIES = [
  { 
    value: 'Account', 
    label: 'Account',
    description: 'Business accounts with domains and settings',
    fields: ['name', 'domain', 'isActive', 'parentAccountId']
  },
  { 
    value: 'User', 
    label: 'User',
    description: 'User accounts with authentication and permissions',
    fields: ['name', 'email', 'role', 'accountId']
  },
  { 
    value: 'Ticket', 
    label: 'Ticket',
    description: 'Support tickets with assignments and tracking',
    fields: ['title', 'description', 'status', 'priority', 'accountId', 'assignedToId']
  },
  { 
    value: 'TimeEntry', 
    label: 'Time Entry',
    description: 'Time tracking entries for tickets',
    fields: ['description', 'startTime', 'duration', 'ticketId', 'userId']
  }
];

interface MultiStageWizardProps {
  sourceSchema: SourceSchema;
  selectedTables: string[];
  stages: ImportStageData[];
  relationships?: StageRelationship[];
  connectionConfig: ConnectionConfig;
  onChange: (stages: ImportStageData[]) => void;
  onRelationshipsChange?: (relationships: StageRelationship[]) => void;
}

interface TableSample {
  tableName: string;
  columns: string[];
  rows: any[][];
  loading: boolean;
  error?: string;
}

export default function MultiStageWizard({
  sourceSchema,
  selectedTables,
  stages,
  relationships = [],
  connectionConfig,
  onChange,
  onRelationshipsChange
}: MultiStageWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedStageIndex, setSelectedStageIndex] = useState<number | null>(null);
  const [tableSamples, setTableSamples] = useState<Record<string, TableSample>>({});
  const [expandedExamples, setExpandedExamples] = useState<Set<string>>(new Set());

  const steps = [
    { id: 'overview', title: 'Pipeline Overview', description: 'Understand multi-stage imports' },
    { id: 'stages', title: 'Configure Stages', description: 'Set up import stages' },
    { id: 'relationships', title: 'Link Data', description: 'Define relationships between stages' },
    { id: 'preview', title: 'Review & Test', description: 'Preview the complete pipeline' }
  ];

  // Load sample data for tables when component mounts
  useEffect(() => {
    selectedTables.forEach(tableName => {
      loadTableSample(tableName);
    });
  }, [selectedTables]);

  const loadTableSample = async (tableName: string) => {
    if (tableSamples[tableName]?.loading) return;

    setTableSamples(prev => ({
      ...prev,
      [tableName]: { tableName, columns: [], rows: [], loading: true }
    }));

    try {
      const response = await fetch("/api/import/table-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionConfig,
          tableName,
          limit: 3 // Just need a few sample rows
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTableSamples(prev => ({
          ...prev,
          [tableName]: {
            tableName,
            columns: data.columns || [],
            rows: data.rows || [],
            loading: false
          }
        }));
      } else {
        throw new Error('Failed to load sample data');
      }
    } catch (error) {
      setTableSamples(prev => ({
        ...prev,
        [tableName]: {
          tableName,
          columns: [],
          rows: [],
          loading: false,
          error: 'Failed to load sample data'
        }
      }));
    }
  };

  const getTableInfo = (tableName: string): SourceTable | undefined => {
    return sourceSchema.tables?.find(t => t.name === tableName);
  };

  const getAvailableTables = (excludeStageIndex?: number) => {
    const usedTables = stages
      .filter((_, index) => index !== excludeStageIndex)
      .map(stage => stage.sourceTable);
    return selectedTables.filter(tableName => !usedTables.includes(tableName));
  };

  const handleAddStage = () => {
    const availableTables = getAvailableTables();
    if (availableTables.length === 0) return;

    const newStage: ImportStageData = {
      id: `stage-${Date.now()}`,
      order: stages.length + 1,
      name: `Stage ${stages.length + 1}`,
      description: '',
      sourceTable: '',
      targetEntity: 'Account',
      fieldMappings: [],
      fieldOverrides: {},
      dependsOnStages: [],
      crossStageMapping: {},
      validationRules: [],
      transformRules: [],
      isEnabled: true
    };

    onChange([...stages, newStage]);
  };

  const handleUpdateStage = (index: number, updates: Partial<ImportStageData>) => {
    const updated = stages.map((stage, i) =>
      i === index ? { ...stage, ...updates } : stage
    );
    onChange(updated);
  };

  const handleDeleteStage = (index: number) => {
    const filtered = stages.filter((_, i) => i !== index);
    const reordered = filtered.map((stage, i) => ({
      ...stage,
      order: i + 1
    }));
    onChange(reordered);
    setSelectedStageIndex(null);
  };

  const renderStepOverview = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-blue-500" />
            What is Multi-Stage Import?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Multi-stage imports allow you to import related data in a specific order, maintaining relationships between different entities.
            This is essential when your data has dependencies - for example, users must exist before you can create tickets assigned to them.
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Benefits
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• Maintains data integrity</li>
                <li>• Handles complex relationships</li>
                <li>• Prevents foreign key errors</li>
                <li>• Allows data transformation</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Example Use Cases
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• Import accounts, then users</li>
                <li>• Create tickets with assignments</li>
                <li>• Link time entries to tickets</li>
                <li>• Hierarchical data structures</li>
              </ul>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Your Data</AlertTitle>
            <AlertDescription>
              You have selected {selectedTables.length} tables: <strong>{selectedTables.join(', ')}</strong>.
              We'll help you create stages for each table and define how they relate to each other.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline Process</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <Database className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="text-sm font-medium">1. Extract</p>
              <p className="text-xs text-muted-foreground">Read source data</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="text-center">
              <Workflow className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium">2. Transform</p>
              <p className="text-xs text-muted-foreground">Map & validate</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="text-sm font-medium">3. Load</p>
              <p className="text-xs text-muted-foreground">Import to system</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStageConfiguration = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Configure Import Stages</h3>
          <p className="text-sm text-muted-foreground">
            Create a stage for each table, defining the order and target entities
          </p>
        </div>
        <Button onClick={handleAddStage} disabled={getAvailableTables().length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Add Stage
        </Button>
      </div>

      {stages.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Workflow className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No stages configured</h3>
            <p className="text-muted-foreground mb-4">
              Start by adding your first import stage
            </p>
            <Button onClick={handleAddStage}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Stage
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Stages List */}
          <Card>
            <CardHeader>
              <CardTitle>Import Stages ({stages.length})</CardTitle>
              <CardDescription>
                Click a stage to configure its settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    selectedStageIndex === index
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedStageIndex(index)}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">Stage {stage.order}</Badge>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{stage.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {stage.sourceTable ? (
                          <>
                            <Database className="h-3 w-3" />
                            <span>{stage.sourceTable}</span>
                            <ArrowRight className="h-3 w-3" />
                            <Target className="h-3 w-3" />
                            <span>{stage.targetEntity}</span>
                          </>
                        ) : (
                          <span className="text-orange-600">Not configured</span>
                        )}
                      </div>
                    </div>
                    {!stage.isEnabled && (
                      <Badge variant="secondary" className="text-xs">Disabled</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Stage Editor */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedStageIndex !== null 
                  ? `Configure Stage ${stages[selectedStageIndex]?.order}` 
                  : 'Stage Configuration'
                }
              </CardTitle>
              <CardDescription>
                {selectedStageIndex !== null 
                  ? 'Set up the source table, target entity, and see data examples'
                  : 'Select a stage from the list to configure its settings'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedStageIndex !== null ? (
                <StageEditor
                  stage={stages[selectedStageIndex]}
                  stageIndex={selectedStageIndex}
                  availableTables={getAvailableTables(selectedStageIndex)}
                  sourceSchema={sourceSchema}
                  tableSamples={tableSamples}
                  onUpdate={(updates) => handleUpdateStage(selectedStageIndex, updates)}
                  onDelete={() => handleDeleteStage(selectedStageIndex)}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Select a stage to configure</p>
                  <p className="text-xs">Choose a stage from the list to edit its settings</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  const renderRelationshipConfiguration = () => (
    <div className="space-y-6">
      <Alert>
        <Link className="h-4 w-4" />
        <AlertTitle>Stage Relationships</AlertTitle>
        <AlertDescription>
          Define how data from different stages relates to each other. This ensures data integrity and proper linking.
        </AlertDescription>
      </Alert>
      
      {/* Relationship configuration would go here */}
      <Card>
        <CardContent className="text-center py-12">
          <Link className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Relationship Mapping</h3>
          <p className="text-muted-foreground">
            This feature will be enhanced with visual relationship mapping
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const renderPipelinePreview = () => (
    <div className="space-y-6">
      <Alert>
        <Play className="h-4 w-4" />
        <AlertTitle>Pipeline Preview</AlertTitle>
        <AlertDescription>
          Review your complete import pipeline before execution. You can test individual stages or the entire pipeline.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {stages.map((stage, index) => (
          <Card key={stage.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge>Stage {stage.order}</Badge>
                  <div>
                    <p className="font-medium">{stage.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {stage.sourceTable} → {stage.targetEntity}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Multi-Stage Import Wizard</h2>
              <Badge variant="outline">{currentStep + 1} of {steps.length}</Badge>
            </div>
            
            <Progress value={(currentStep + 1) / steps.length * 100} className="h-2" />
            
            <div className="grid grid-cols-4 gap-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`text-center p-2 rounded cursor-pointer transition-colors ${
                    index === currentStep
                      ? 'bg-primary text-primary-foreground'
                      : index < currentStep
                      ? 'bg-green-100 text-green-800'
                      : 'bg-muted text-muted-foreground'
                  }`}
                  onClick={() => setCurrentStep(index)}
                >
                  <p className="font-medium text-sm">{step.title}</p>
                  <p className="text-xs">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <div>
        {currentStep === 0 && renderStepOverview()}
        {currentStep === 1 && renderStageConfiguration()}
        {currentStep === 2 && renderRelationshipConfiguration()}
        {currentStep === 3 && renderPipelinePreview()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <div className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {steps.length}
        </div>
        
        <Button
          onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
          disabled={currentStep === steps.length - 1}
        >
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Stage Editor Component with Real Data Examples
interface StageEditorProps {
  stage: ImportStageData;
  stageIndex: number;
  availableTables: string[];
  sourceSchema: SourceSchema;
  tableSamples: Record<string, TableSample>;
  onUpdate: (updates: Partial<ImportStageData>) => void;
  onDelete: () => void;
}

function StageEditor({
  stage,
  stageIndex,
  availableTables,
  sourceSchema,
  tableSamples,
  onUpdate,
  onDelete
}: StageEditorProps) {
  const [showDataPreview, setShowDataPreview] = useState(false);
  
  const tableInfo = sourceSchema.tables?.find(t => t.name === stage.sourceTable);
  const tableSample = tableSamples[stage.sourceTable];
  const targetEntity = TARGET_ENTITIES.find(e => e.value === stage.targetEntity);

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="stage-name">Stage Name</Label>
          <Input
            id="stage-name"
            value={stage.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Enter descriptive name for this stage"
          />
        </div>

        <div>
          <Label htmlFor="stage-description">Description (Optional)</Label>
          <Textarea
            id="stage-description"
            value={stage.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Describe what this stage imports and why"
            rows={2}
          />
        </div>
      </div>

      <Separator />

      {/* Source Table Selection */}
      <div className="space-y-4">
        <div>
          <Label>Source Table</Label>
          <Select
            value={stage.sourceTable}
            onValueChange={(value) => onUpdate({ sourceTable: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose source table" />
            </SelectTrigger>
            <SelectContent>
              {[...availableTables, ...(stage.sourceTable ? [stage.sourceTable] : [])].map((tableName) => {
                const table = sourceSchema.tables?.find(t => t.name === tableName);
                return (
                  <SelectItem key={tableName} value={tableName}>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <div>
                        <p className="font-medium">{tableName}</p>
                        <p className="text-xs text-muted-foreground">
                          {table?.fields.length} fields, {table?.recordCount?.toLocaleString() || '?'} records
                        </p>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Data Preview */}
        {stage.sourceTable && tableSample && (
          <Collapsible open={showDataPreview} onOpenChange={setShowDataPreview}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                {showDataPreview ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                {tableSample.loading ? 'Loading sample data...' : 'View Sample Data'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-2">
                <CardContent className="p-3">
                  {tableSample.error ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{tableSample.error}</AlertDescription>
                    </Alert>
                  ) : tableSample.rows.length > 0 ? (
                    <div>
                      <p className="text-sm font-medium mb-2">Sample Data (First 3 rows)</p>
                      <ScrollArea className="h-32">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {tableSample.columns.map((col) => (
                                <TableHead key={col} className="text-xs">{col}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tableSample.rows.map((row, index) => (
                              <TableRow key={index}>
                                {row.map((cell, cellIndex) => (
                                  <TableCell key={cellIndex} className="text-xs">
                                    {String(cell || '')}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No sample data available</p>
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      <Separator />

      {/* Target Entity Selection */}
      <div className="space-y-4">
        <div>
          <Label>Target Entity</Label>
          <Select
            value={stage.targetEntity}
            onValueChange={(value) => onUpdate({ targetEntity: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TARGET_ENTITIES.map((entity) => (
                <SelectItem key={entity.value} value={entity.value}>
                  <div>
                    <p className="font-medium">{entity.label}</p>
                    <p className="text-xs text-muted-foreground">{entity.description}</p>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {targetEntity && (
          <Alert>
            <Target className="h-4 w-4" />
            <AlertTitle>Target: {targetEntity.label}</AlertTitle>
            <AlertDescription>
              <p className="mb-2">{targetEntity.description}</p>
              <p className="text-sm">
                <strong>Available fields:</strong> {targetEntity.fields.join(', ')}
              </p>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="destructive" onClick={onDelete} size="sm">
          Delete Stage
        </Button>
        <div className="text-xs text-muted-foreground">
          Stage {stage.order} configuration
        </div>
      </div>
    </div>
  );
}