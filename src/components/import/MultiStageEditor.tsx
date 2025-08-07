"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Plus,
  X,
  ArrowRight,
  Settings,
  GripVertical,
  Copy,
  AlertCircle,
  Database,
  Target,
  Link,
  CheckCircle,
  Eye,
  Info
} from "lucide-react";
import { SourceSchema, SourceTable, ImportStageData } from "@/lib/import/types";
import FieldOverrideEditor, { FieldOverride } from "./FieldOverrideEditor";
import RelationshipMapper, { StageRelationship } from "./RelationshipMapper";

const TARGET_ENTITIES = [
  'Account', 
  'User', 
  'Ticket', 
  'TimeEntry', 
  'BillingRate',
  'AccountBillingRate',
  'RoleTemplate',
  'SystemRole',
  'MembershipRole'
];

interface MultiStageEditorProps {
  sourceSchema: SourceSchema;
  selectedTables: string[];
  stages: ImportStageData[];
  relationships?: StageRelationship[];
  onChange: (stages: ImportStageData[]) => void;
  onRelationshipsChange?: (relationships: StageRelationship[]) => void;
}

export default function MultiStageEditor({
  sourceSchema,
  selectedTables,
  stages,
  relationships = [],
  onChange,
  onRelationshipsChange
}: MultiStageEditorProps) {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const handleAddStage = () => {
    const nextOrder = Math.max(...stages.map(s => s.order), 0) + 1;
    const availableTables = selectedTables.filter(
      tableName => !stages.some(stage => stage.sourceTable === tableName)
    );
    
    const newStage: ImportStageData = {
      id: `stage-${Date.now()}`,
      order: nextOrder,
      name: `Stage ${nextOrder}`,
      description: '',
      sourceTable: availableTables[0] || '',
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
    setSelectedStageId(newStage.id);
  };

  const handleUpdateStage = (stageId: string, updates: Partial<ImportStageData>) => {
    const updated = stages.map(stage =>
      stage.id === stageId ? { ...stage, ...updates } : stage
    );
    onChange(updated);
  };

  const handleDeleteStage = (stageId: string) => {
    const filtered = stages.filter(s => s.id !== stageId);
    // Update order for remaining stages
    const reordered = filtered.map((stage, index) => ({
      ...stage,
      order: index + 1
    }));
    onChange(reordered);
    
    if (selectedStageId === stageId) {
      setSelectedStageId(null);
    }
  };

  const handleDuplicateStage = (stageId: string) => {
    const original = stages.find(s => s.id === stageId);
    if (!original) return;

    const nextOrder = Math.max(...stages.map(s => s.order), 0) + 1;
    const duplicate: ImportStageData = {
      ...original,
      id: `stage-${Date.now()}`,
      order: nextOrder,
      name: `${original.name} (Copy)`,
      sourceTable: '', // User needs to select a different table
    };

    onChange([...stages, duplicate]);
    setSelectedStageId(duplicate.id);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const reorderedStages = Array.from(stages);
    const [movedStage] = reorderedStages.splice(result.source.index, 1);
    reorderedStages.splice(result.destination.index, 0, movedStage);

    // Update order numbers
    const updatedStages = reorderedStages.map((stage, index) => ({
      ...stage,
      order: index + 1
    }));

    onChange(updatedStages);
  };

  const getAvailableTables = (excludeStageId?: string) => {
    const usedTables = stages
      .filter(stage => stage.id !== excludeStageId)
      .map(stage => stage.sourceTable);
    return selectedTables.filter(tableName => !usedTables.includes(tableName));
  };

  const getTableInfo = (tableName: string): SourceTable | undefined => {
    return sourceSchema.tables?.find(t => t.name === tableName);
  };

  const validateStages = () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for missing source tables
    const stagesWithoutTables = stages.filter(stage => !stage.sourceTable);
    if (stagesWithoutTables.length > 0) {
      errors.push(`${stagesWithoutTables.length} stages missing source tables`);
    }

    // Check for duplicate source tables
    const tableUsage = stages.reduce((acc, stage) => {
      if (stage.sourceTable) {
        acc[stage.sourceTable] = (acc[stage.sourceTable] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const duplicateTables = Object.entries(tableUsage)
      .filter(([_, count]) => count > 1)
      .map(([table]) => table);

    if (duplicateTables.length > 0) {
      errors.push(`Duplicate tables used: ${duplicateTables.join(', ')}`);
    }

    // Check for disabled dependencies
    stages.forEach(stage => {
      const disabledDeps = stage.dependsOnStages?.filter(depId => {
        const depStage = stages.find(s => s.id === depId);
        return depStage && !depStage.isEnabled;
      });
      
      if (disabledDeps && disabledDeps.length > 0) {
        warnings.push(`Stage "${stage.name}" depends on disabled stages`);
      }
    });

    // Check for circular dependencies
    const checkCircular = (stageId: string, visited: Set<string> = new Set()): boolean => {
      if (visited.has(stageId)) return true;
      visited.add(stageId);
      
      const stage = stages.find(s => s.id === stageId);
      if (!stage?.dependsOnStages) return false;
      
      return stage.dependsOnStages.some(depId => checkCircular(depId, new Set(visited)));
    };

    const circularStages = stages.filter(stage => checkCircular(stage.id));
    if (circularStages.length > 0) {
      errors.push('Circular dependencies detected');
    }

    return { errors, warnings };
  };

  const validation = validateStages();
  const selectedStage = stages.find(s => s.id === selectedStageId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Multi-Stage Import Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure the import pipeline with multiple stages and dependencies
          </p>
        </div>
        <Button onClick={handleAddStage} disabled={getAvailableTables().length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Add Stage
        </Button>
      </div>

      {/* Validation Results */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="space-y-2">
          {validation.errors.map((error, index) => (
            <Alert key={`error-${index}`} variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ))}
          {validation.warnings.map((warning, index) => (
            <Alert key={`warning-${index}`}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Relationships Section */}
      {stages.length >= 2 && onRelationshipsChange && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Stage Relationships</CardTitle>
              <CardDescription>
                Define how data from different stages relates to each other
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RelationshipMapper
                stages={stages}
                relationships={relationships}
                onChange={onRelationshipsChange}
              />
            </CardContent>
          </Card>
          <div className="my-6"><Separator /></div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stages List */}
        <Card>
          <CardHeader>
            <CardTitle>Import Stages ({stages.length})</CardTitle>
            <CardDescription>
              Drag to reorder stages. Dependencies will be automatically managed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="stages">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {stages
                      .sort((a, b) => a.order - b.order)
                      .map((stage, index) => (
                        <Draggable key={stage.id} draggableId={stage.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                                selectedStageId === stage.id
                                  ? 'ring-2 ring-primary bg-primary/5'
                                  : 'hover:bg-muted'
                              } ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                              onClick={() => setSelectedStageId(stage.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>
                                
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline">Stage {stage.order}</Badge>
                                    <span className="font-medium text-sm">{stage.name}</span>
                                    <div className="flex items-center gap-1">
                                      {!stage.isEnabled && (
                                        <Badge variant="secondary" className="text-xs">Disabled</Badge>
                                      )}
                                      {stage.dependsOnStages && stage.dependsOnStages.length > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                          {stage.dependsOnStages.length} deps
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Database className="h-3 w-3" />
                                    <span>{stage.sourceTable || 'No table selected'}</span>
                                    <ArrowRight className="h-3 w-3" />
                                    <Target className="h-3 w-3" />
                                    <span>{stage.targetEntity}</span>
                                  </div>
                                  
                                  {stage.description && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                      {stage.description}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDuplicateStage(stage.id);
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteStage(stage.id);
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {stages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No stages configured</p>
                <p className="text-xs">Add a stage to begin setting up your import pipeline</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stage Editor */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedStage ? `Edit Stage: ${selectedStage.name}` : 'Stage Configuration'}
            </CardTitle>
            <CardDescription>
              {selectedStage 
                ? 'Configure the selected stage settings and dependencies'
                : 'Select a stage from the list to configure its settings'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedStage ? (
              <StageEditor
                stage={selectedStage}
                availableTables={getAvailableTables(selectedStage.id)}
                availableStages={stages.filter(s => s.id !== selectedStage.id && s.order < selectedStage.order)}
                sourceSchema={sourceSchema}
                onChange={(updates) => handleUpdateStage(selectedStage.id, updates)}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Select a stage to configure</p>
                <p className="text-xs">Choose a stage from the list to edit its settings</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StageEditorProps {
  stage: ImportStageData;
  availableTables: string[];
  availableStages: ImportStageData[];
  sourceSchema: SourceSchema;
  onChange: (updates: Partial<ImportStageData>) => void;
}

function StageEditor({
  stage,
  availableTables,
  availableStages,
  sourceSchema,
  onChange
}: StageEditorProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const tableInfo = sourceSchema.tables?.find(t => t.name === stage.sourceTable);

  // Mock target fields for the selected entity (this should come from an API in a real implementation)
  const getTargetFields = (entityName: string) => {
    // This is a simplified mock - in a real app, this would fetch from an API
    const mockFields = {
      'Account': [
        { name: 'name', type: 'string', required: true, unique: false, description: 'Account name' },
        { name: 'domain', type: 'string', required: false, unique: true, description: 'Email domain' },
        { name: 'isActive', type: 'boolean', required: true, unique: false, description: 'Account status' },
      ],
      'User': [
        { name: 'name', type: 'string', required: true, unique: false, description: 'Full name' },
        { name: 'email', type: 'string', required: true, unique: true, description: 'Email address' },
        { name: 'role', type: 'string', required: true, unique: false, description: 'User role' },
      ],
      'Ticket': [
        { name: 'title', type: 'string', required: true, unique: false, description: 'Ticket title' },
        { name: 'description', type: 'string', required: false, unique: false, description: 'Ticket description' },
        { name: 'status', type: 'string', required: true, unique: false, description: 'Ticket status' },
        { name: 'priority', type: 'number', required: true, unique: false, description: 'Priority level' },
      ]
    };
    return mockFields[entityName as keyof typeof mockFields] || [];
  };

  const targetFields = getTargetFields(stage.targetEntity);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="basic">Basic</TabsTrigger>
        <TabsTrigger value="fields">Fields</TabsTrigger>
        <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
        <TabsTrigger value="advanced">Advanced</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="space-y-4">
        {/* Basic Configuration */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="stage-name">Stage Name</Label>
            <Input
              id="stage-name"
              value={stage.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Enter stage name"
            />
          </div>

          <div>
            <Label htmlFor="stage-description">Description (optional)</Label>
            <Textarea
              id="stage-description"
              value={stage.description || ''}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Describe what this stage does"
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={stage.isEnabled}
              onCheckedChange={(checked) => onChange({ isEnabled: checked })}
            />
            <Label>Enable this stage</Label>
          </div>
        </div>

        <Separator />

        {/* Source Table Selection */}
        <div className="space-y-3">
          <Label>Source Table</Label>
          <Select
            value={stage.sourceTable}
            onValueChange={(value) => onChange({ sourceTable: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select source table" />
            </SelectTrigger>
            <SelectContent>
              {Array.from(new Set([...availableTables, ...(stage.sourceTable ? [stage.sourceTable] : [])])).map((tableName) => {
                const table = sourceSchema.tables?.find(t => t.name === tableName);
                return (
                  <SelectItem key={tableName} value={tableName}>
                    <div className="flex items-center gap-2">
                      <Database className="h-3 w-3" />
                      <span>{tableName}</span>
                      {table && (
                        <div className="flex items-center gap-1 ml-2">
                          <Badge variant="outline" className="text-xs">
                            {table.fields.length} fields
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {table.recordCount?.toLocaleString() || '?'} records
                          </Badge>
                        </div>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {tableInfo && (
            <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
              <div className="flex items-center gap-4">
                <span><strong>Fields:</strong> {tableInfo.fields.length}</span>
                <span><strong>Records:</strong> {tableInfo.recordCount?.toLocaleString() || 'Unknown'}</span>
              </div>
              <div className="mt-1">
                <strong>Available fields:</strong> {tableInfo.fields.slice(0, 5).map(f => f.name).join(', ')}
                {tableInfo.fields.length > 5 && ` and ${tableInfo.fields.length - 5} more...`}
              </div>
            </div>
          )}
        </div>

        {/* Target Entity Selection */}
        <div>
          <Label>Target Entity</Label>
          <Select
            value={stage.targetEntity}
            onValueChange={(value) => onChange({ targetEntity: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TARGET_ENTITIES.map((entity) => (
                <SelectItem key={entity} value={entity}>
                  <div className="flex items-center gap-2">
                    <Target className="h-3 w-3" />
                    {entity}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Stage Summary</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Order: {stage.order}</div>
            <div>Status: {stage.isEnabled ? 'Enabled' : 'Disabled'}</div>
            <div>Dependencies: {stage.dependsOnStages?.length || 0}</div>
            <div>Field overrides: {Object.keys(stage.fieldOverrides || {}).length}</div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="fields" className="space-y-4">
        {tableInfo ? (
          <FieldOverrideEditor
            sourceFields={tableInfo.fields}
            targetFields={targetFields}
            overrides={stage.fieldOverrides || {}}
            onChange={(overrides) => onChange({ fieldOverrides: overrides })}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Select a source table first</p>
            <p className="text-xs">Choose a source table to configure field mappings and overrides</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="dependencies" className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            <Label>Dependencies</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Select stages that must complete before this stage can run
          </p>

          {availableStages.length > 0 ? (
            <div className="space-y-2">
              {availableStages.map((availableStage) => (
                <div key={availableStage.id} className="flex items-center space-x-2">
                  <Switch
                    checked={stage.dependsOnStages?.includes(availableStage.id) || false}
                    onCheckedChange={(checked) => {
                      const currentDeps = stage.dependsOnStages || [];
                      const newDeps = checked
                        ? [...currentDeps, availableStage.id]
                        : currentDeps.filter(id => id !== availableStage.id);
                      onChange({ dependsOnStages: newDeps });
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Stage {availableStage.order}</Badge>
                      <span className="text-sm">{availableStage.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {availableStage.sourceTable} → {availableStage.targetEntity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground p-2 bg-muted rounded">
              No earlier stages available for dependencies
            </p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="advanced" className="space-y-4">
        <div>
          <Label>Cross-Stage Mapping (JSON)</Label>
          <Textarea
            value={JSON.stringify(stage.crossStageMapping || {}, null, 2)}
            onChange={(e) => {
              try {
                const crossStageMapping = JSON.parse(e.target.value);
                onChange({ crossStageMapping });
              } catch (error) {
                // Invalid JSON, don't update
              }
            }}
            placeholder='{"fieldName": "previousStageId.fieldName"}'
            className="font-mono text-sm"
            rows={6}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Map fields to values from previous stages. Use format: {`{"fieldName": "stageId.fieldName"}`}
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Advanced settings allow cross-stage data mapping and complex transformation logic.
            Changes here affect how this stage processes data from dependent stages.
          </AlertDescription>
        </Alert>
      </TabsContent>
    </Tabs>
  );
}