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
import {
  Plus,
  X,
  ArrowRight,
  Link,
  Database,
  Target,
  AlertCircle,
  Info,
  CheckCircle,
  Settings,
  GitBranch,
  Key
} from "lucide-react";
import { ImportStageData, SourceField } from "@/lib/import/types";

export interface StageRelationship {
  id: string;
  name: string;
  description?: string;
  fromStageId: string;
  toStageId: string;
  relationType: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  fromField: string;
  toField: string;
  lookupStrategy: 'direct' | 'create_if_missing' | 'skip_if_missing' | 'use_default';
  defaultValue?: any;
  cascadeDelete?: boolean;
  isEnabled: boolean;
  conditions?: RelationshipCondition[];
}

export interface RelationshipCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex' | 'custom';
  value: any;
  enabled: boolean;
}

interface RelationshipMapperProps {
  stages: ImportStageData[];
  relationships: StageRelationship[];
  onChange: (relationships: StageRelationship[]) => void;
}

export default function RelationshipMapper({
  stages,
  relationships,
  onChange
}: RelationshipMapperProps) {
  const [selectedRelationship, setSelectedRelationship] = useState<string | null>(null);

  const handleAddRelationship = () => {
    const newRelationship: StageRelationship = {
      id: `relationship-${Date.now()}`,
      name: `New Relationship`,
      fromStageId: '',
      toStageId: '',
      relationType: 'one-to-many',
      fromField: '',
      toField: '',
      lookupStrategy: 'direct',
      isEnabled: true,
      conditions: []
    };

    onChange([...relationships, newRelationship]);
    setSelectedRelationship(newRelationship.id);
  };

  const handleUpdateRelationship = (id: string, updates: Partial<StageRelationship>) => {
    const updated = relationships.map(rel =>
      rel.id === id ? { ...rel, ...updates } : rel
    );
    onChange(updated);
  };

  const handleDeleteRelationship = (id: string) => {
    const filtered = relationships.filter(rel => rel.id !== id);
    onChange(filtered);
    if (selectedRelationship === id) {
      setSelectedRelationship(null);
    }
  };

  const validateRelationships = () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    relationships.forEach(rel => {
      if (!rel.fromStageId || !rel.toStageId) {
        errors.push(`Relationship "${rel.name}" is missing stage assignments`);
      }

      if (!rel.fromField || !rel.toField) {
        errors.push(`Relationship "${rel.name}" is missing field mappings`);
      }

      if (rel.fromStageId === rel.toStageId) {
        warnings.push(`Relationship "${rel.name}" maps stage to itself`);
      }

      // Check for circular dependencies
      const fromStage = stages.find(s => s.id === rel.fromStageId);
      const toStage = stages.find(s => s.id === rel.toStageId);
      
      if (fromStage && toStage && fromStage.order >= toStage.order) {
        errors.push(`Relationship "${rel.name}" creates invalid stage order dependency`);
      }
    });

    return { errors, warnings };
  };

  const validation = validateRelationships();
  const selectedRel = relationships.find(r => r.id === selectedRelationship);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Stage Relationship Mapping</h3>
          <p className="text-sm text-muted-foreground">
            Define how data from different import stages relate to each other
          </p>
        </div>
        <Button onClick={handleAddRelationship}>
          <Plus className="h-4 w-4 mr-2" />
          Add Relationship
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Import Stages</CardTitle>
            <CardDescription>
              Available stages for relationship mapping
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stages.length > 0 ? (
              stages
                .sort((a, b) => a.order - b.order)
                .map((stage) => {
                  const incomingRels = relationships.filter(r => r.toStageId === stage.id);
                  const outgoingRels = relationships.filter(r => r.fromStageId === stage.id);
                  
                  return (
                    <div key={stage.id} className="p-3 border rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">Stage {stage.order}</Badge>
                        <span className="font-medium text-sm">{stage.name}</span>
                        {!stage.isEnabled && (
                          <Badge variant="secondary" className="text-xs">Disabled</Badge>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {stage.sourceTable} → {stage.targetEntity}
                        </div>
                        <div className="flex items-center gap-4">
                          <span>In: {incomingRels.length}</span>
                          <span>Out: {outgoingRels.length}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <GitBranch className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No stages configured</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Relationships List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Relationships ({relationships.length})</CardTitle>
            <CardDescription>
              Click to configure relationship details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {relationships.map((rel) => {
              const fromStage = stages.find(s => s.id === rel.fromStageId);
              const toStage = stages.find(s => s.id === rel.toStageId);
              
              return (
                <div
                  key={rel.id}
                  className={`p-3 border rounded cursor-pointer transition-colors ${
                    selectedRelationship === rel.id
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedRelationship(rel.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{rel.name}</span>
                    <div className="flex items-center gap-1">
                      {!rel.isEnabled && <Badge variant="secondary" className="text-xs">Disabled</Badge>}
                      <Badge variant="outline" className="text-xs">{rel.relationType}</Badge>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span>{fromStage?.name || 'Unknown'}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>{toStage?.name || 'Unknown'}</span>
                    </div>
                    <div className="mt-1">
                      {rel.fromField} → {rel.toField}
                    </div>
                  </div>
                </div>
              );
            })}

            {relationships.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Link className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No relationships configured</p>
                <p className="text-xs">Add relationships to connect stage data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Relationship Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {selectedRel ? `Edit: ${selectedRel.name}` : 'Relationship Configuration'}
            </CardTitle>
            <CardDescription>
              {selectedRel 
                ? 'Configure the selected relationship mapping'
                : 'Select a relationship to configure its settings'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedRel ? (
              <RelationshipEditor
                relationship={selectedRel}
                stages={stages}
                onChange={(updates) => handleUpdateRelationship(selectedRel.id, updates)}
                onDelete={() => handleDeleteRelationship(selectedRel.id)}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a relationship to configure</p>
                <p className="text-xs">Choose from the list to edit relationship settings</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface RelationshipEditorProps {
  relationship: StageRelationship;
  stages: ImportStageData[];
  onChange: (updates: Partial<StageRelationship>) => void;
  onDelete: () => void;
}

function RelationshipEditor({
  relationship,
  stages,
  onChange,
  onDelete
}: RelationshipEditorProps) {
  const [activeTab, setActiveTab] = useState("basic");

  const fromStage = stages.find(s => s.id === relationship.fromStageId);
  const toStage = stages.find(s => s.id === relationship.toStageId);

  const getStageFields = (stageId: string): SourceField[] => {
    const stage = stages.find(s => s.id === stageId);
    // In a real implementation, this would fetch the actual schema
    // For now, return mock fields based on the target entity
    const mockFields: Record<string, SourceField[]> = {
      'Account': [
        { name: 'id', type: 'string', isPrimaryKey: true },
        { name: 'name', type: 'string' },
        { name: 'domain', type: 'string' },
        { name: 'isActive', type: 'boolean' },
      ],
      'User': [
        { name: 'id', type: 'string', isPrimaryKey: true },
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'accountId', type: 'string', isForeignKey: true },
        { name: 'role', type: 'string' },
      ],
      'Ticket': [
        { name: 'id', type: 'string', isPrimaryKey: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'accountId', type: 'string', isForeignKey: true },
        { name: 'assignedUserId', type: 'string', isForeignKey: true },
        { name: 'status', type: 'string' },
        { name: 'priority', type: 'number' },
      ]
    };
    
    return mockFields[stage?.targetEntity as keyof typeof mockFields] || [];
  };

  const fromFields = relationship.fromStageId ? getStageFields(relationship.fromStageId) : [];
  const toFields = relationship.toStageId ? getStageFields(relationship.toStageId) : [];

  const handleAddCondition = () => {
    const newCondition: RelationshipCondition = {
      id: `condition-${Date.now()}`,
      field: '',
      operator: 'equals',
      value: '',
      enabled: true
    };

    onChange({
      conditions: [...(relationship.conditions || []), newCondition]
    });
  };

  const handleUpdateCondition = (id: string, updates: Partial<RelationshipCondition>) => {
    const updated = (relationship.conditions || []).map(c =>
      c.id === id ? { ...c, ...updates } : c
    );
    onChange({ conditions: updated });
  };

  const handleDeleteCondition = (id: string) => {
    const filtered = (relationship.conditions || []).filter(c => c.id !== id);
    onChange({ conditions: filtered });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            checked={relationship.isEnabled}
            onCheckedChange={(checked) => onChange({ isEnabled: checked })}
          />
          <Label>Enable relationship</Label>
        </div>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="mapping">Mapping</TabsTrigger>
          <TabsTrigger value="conditions">Conditions</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div>
            <Label>Relationship Name</Label>
            <Input
              value={relationship.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Enter relationship name"
            />
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Textarea
              value={relationship.description || ''}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Describe this relationship"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>From Stage</Label>
              <Select
                value={relationship.fromStageId}
                onValueChange={(value) => onChange({ fromStageId: value, fromField: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Stage {stage.order}</Badge>
                        <span>{stage.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>To Stage</Label>
              <Select
                value={relationship.toStageId}
                onValueChange={(value) => onChange({ toStageId: value, toField: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages
                    .filter(s => s.id !== relationship.fromStageId)
                    .map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Stage {stage.order}</Badge>
                          <span>{stage.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Relationship Type</Label>
            <Select
              value={relationship.relationType}
              onValueChange={(value: any) => onChange({ relationType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one-to-one">One-to-One</SelectItem>
                <SelectItem value="one-to-many">One-to-Many</SelectItem>
                <SelectItem value="many-to-one">Many-to-One</SelectItem>
                <SelectItem value="many-to-many">Many-to-Many</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="mapping" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>From Field</Label>
              <Select
                value={relationship.fromField}
                onValueChange={(value) => onChange({ fromField: value })}
                disabled={!relationship.fromStageId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source field" />
                </SelectTrigger>
                <SelectContent>
                  {fromFields.map((field) => (
                    <SelectItem key={field.name} value={field.name}>
                      <div className="flex items-center gap-2">
                        <span>{field.name}</span>
                        <Badge variant="outline" className="text-xs">{field.type}</Badge>
                        {field.isPrimaryKey && <Key className="h-3 w-3" />}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>To Field</Label>
              <Select
                value={relationship.toField}
                onValueChange={(value) => onChange({ toField: value })}
                disabled={!relationship.toStageId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target field" />
                </SelectTrigger>
                <SelectContent>
                  {toFields.map((field) => (
                    <SelectItem key={field.name} value={field.name}>
                      <div className="flex items-center gap-2">
                        <span>{field.name}</span>
                        <Badge variant="outline" className="text-xs">{field.type}</Badge>
                        {field.isPrimaryKey && <Key className="h-3 w-3" />}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Lookup Strategy</Label>
            <Select
              value={relationship.lookupStrategy}
              onValueChange={(value: any) => onChange({ lookupStrategy: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direct Match</SelectItem>
                <SelectItem value="create_if_missing">Create if Missing</SelectItem>
                <SelectItem value="skip_if_missing">Skip if Missing</SelectItem>
                <SelectItem value="use_default">Use Default Value</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {relationship.lookupStrategy === 'use_default' && (
            <div>
              <Label>Default Value</Label>
              <Input
                value={relationship.defaultValue || ''}
                onChange={(e) => onChange({ defaultValue: e.target.value })}
                placeholder="Default value when lookup fails"
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              checked={relationship.cascadeDelete || false}
              onCheckedChange={(checked) => onChange({ cascadeDelete: checked })}
            />
            <Label>Cascade Delete</Label>
          </div>
        </TabsContent>

        <TabsContent value="conditions" className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Relationship Conditions</Label>
            <Button onClick={handleAddCondition} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Condition
            </Button>
          </div>

          <div className="space-y-3">
            {(relationship.conditions || []).map((condition) => (
              <ConditionEditor
                key={condition.id}
                condition={condition}
                availableFields={fromFields}
                onChange={(updates) => handleUpdateCondition(condition.id, updates)}
                onDelete={() => handleDeleteCondition(condition.id)}
              />
            ))}
            
            {(relationship.conditions || []).length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conditions configured</p>
                <p className="text-xs">Add conditions to filter relationship matches</p>
              </div>
            )}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Conditions allow you to filter when relationships should be applied.
              All conditions must be met for the relationship to be processed.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ConditionEditorProps {
  condition: RelationshipCondition;
  availableFields: SourceField[];
  onChange: (updates: Partial<RelationshipCondition>) => void;
  onDelete: () => void;
}

function ConditionEditor({
  condition,
  availableFields,
  onChange,
  onDelete
}: ConditionEditorProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Switch
            checked={condition.enabled}
            onCheckedChange={(checked) => onChange({ enabled: checked })}
          />
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Field</Label>
            <Select
              value={condition.field}
              onValueChange={(value) => onChange({ field: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map((field) => (
                  <SelectItem key={field.name} value={field.name}>
                    {field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Operator</Label>
            <Select
              value={condition.operator}
              onValueChange={(value: any) => onChange({ operator: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="not_equals">Not Equals</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="starts_with">Starts With</SelectItem>
                <SelectItem value="ends_with">Ends With</SelectItem>
                <SelectItem value="regex">Regex</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Value</Label>
            <Input
              value={condition.value || ''}
              onChange={(e) => onChange({ value: e.target.value })}
              placeholder="Condition value"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}