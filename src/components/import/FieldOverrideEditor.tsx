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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  X,
  Settings,
  AlertCircle,
  CheckCircle,
  Info,
  Code,
  Filter,
  RefreshCw,
  Shield,
  Database,
  Target
} from "lucide-react";
import { SourceField, TargetField } from "@/lib/import/types";

export interface FieldOverride {
  fieldName: string;
  skipField: boolean;
  renameField?: string;
  defaultValue?: any;
  dataType?: string;
  nullable?: boolean;
  unique?: boolean;
  indexed?: boolean;
  transformations: FieldTransformation[];
  validations: FieldValidation[];
  conditionalLogic?: ConditionalLogic[];
  customCode?: string;
  metadata: Record<string, any>;
}

export interface FieldTransformation {
  id: string;
  type: 'rename' | 'format' | 'calculate' | 'lookup' | 'split' | 'combine' | 'custom';
  order: number;
  enabled: boolean;
  config: Record<string, any>;
  description?: string;
}

export interface FieldValidation {
  id: string;
  type: 'required' | 'type' | 'range' | 'pattern' | 'custom' | 'unique' | 'reference';
  enabled: boolean;
  config: Record<string, any>;
  message?: string;
  severity: 'error' | 'warning';
}

export interface ConditionalLogic {
  id: string;
  condition: string;
  action: 'skip' | 'transform' | 'validate' | 'set_value';
  actionConfig: Record<string, any>;
  enabled: boolean;
}

interface FieldOverrideEditorProps {
  sourceFields: SourceField[];
  targetFields: TargetField[];
  overrides: Record<string, FieldOverride>;
  onChange: (overrides: Record<string, FieldOverride>) => void;
}

export default function FieldOverrideEditor({
  sourceFields,
  targetFields,
  overrides,
  onChange
}: FieldOverrideEditorProps) {
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [searchTerm, setSearchTerm] = useState("");

  const handleCreateOverride = (fieldName: string) => {
    const newOverride: FieldOverride = {
      fieldName,
      skipField: false,
      transformations: [],
      validations: [],
      metadata: {}
    };

    onChange({
      ...overrides,
      [fieldName]: newOverride
    });

    setSelectedField(fieldName);
  };

  const handleUpdateOverride = (fieldName: string, updates: Partial<FieldOverride>) => {
    const existing = overrides[fieldName];
    onChange({
      ...overrides,
      [fieldName]: { ...existing, ...updates }
    });
  };

  const handleDeleteOverride = (fieldName: string) => {
    const { [fieldName]: deleted, ...remaining } = overrides;
    onChange(remaining);
    if (selectedField === fieldName) {
      setSelectedField(null);
    }
  };

  const filteredSourceFields = sourceFields.filter(field =>
    field.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedFieldData = selectedField ? sourceFields.find(f => f.name === selectedField) : null;
  const selectedOverride = selectedField ? overrides[selectedField] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Field Control & Override System</h3>
        <p className="text-sm text-muted-foreground">
          Configure advanced field-level transformations, validations, and overrides
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Field List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Source Fields</CardTitle>
            <CardDescription>
              Click to configure field overrides and transformations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <Input
              placeholder="Search fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* Fields */}
            <div className="space-y-2">
              {filteredSourceFields.map((field) => {
                const hasOverride = overrides[field.name];
                const isSkipped = hasOverride?.skipField;
                
                return (
                  <div
                    key={field.name}
                    className={`p-3 border rounded cursor-pointer transition-colors ${
                      selectedField === field.name
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-muted'
                    } ${isSkipped ? 'opacity-60 border-dashed' : ''}`}
                    onClick={() => {
                      if (!hasOverride) {
                        handleCreateOverride(field.name);
                      } else {
                        setSelectedField(field.name);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm">{field.name}</span>
                      <div className="flex items-center gap-1">
                        {isSkipped && <Badge variant="outline" className="text-xs">Skipped</Badge>}
                        {hasOverride && !isSkipped && (
                          <div className="flex items-center gap-1">
                            {hasOverride.transformations.filter(t => t.enabled).length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {hasOverride.transformations.filter(t => t.enabled).length}T
                              </Badge>
                            )}
                            {hasOverride.validations.filter(v => v.enabled).length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {hasOverride.validations.filter(v => v.enabled).length}V
                              </Badge>
                            )}
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-xs">
                        {field.type}
                      </Badge>
                      {field.nullable && (
                        <span className="text-muted-foreground">nullable</span>
                      )}
                      {field.isPrimaryKey && (
                        <Badge variant="secondary" className="text-xs">PK</Badge>
                      )}
                    </div>
                    
                    {hasOverride?.renameField && (
                      <div className="text-xs text-muted-foreground mt-1">
                        → {hasOverride.renameField}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="pt-3 border-t">
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Total fields: {sourceFields.length}</div>
                <div>Configured: {Object.keys(overrides).length}</div>
                <div>Skipped: {Object.values(overrides).filter(o => o.skipField).length}</div>
                <div>With transformations: {Object.values(overrides).filter(o => o.transformations.some(t => t.enabled)).length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Field Configuration */}
        <div className="lg:col-span-2">
          {selectedField && selectedOverride ? (
            <FieldConfigEditor
              field={selectedFieldData!}
              override={selectedOverride}
              targetFields={targetFields}
              onChange={(updates) => handleUpdateOverride(selectedField, updates)}
              onDelete={() => handleDeleteOverride(selectedField)}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center text-muted-foreground">
                  <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Select a field to configure overrides</p>
                  <p className="text-xs mt-1">Choose a field from the list to customize its behavior</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

interface FieldConfigEditorProps {
  field: SourceField;
  override: FieldOverride;
  targetFields: TargetField[];
  onChange: (updates: Partial<FieldOverride>) => void;
  onDelete: () => void;
}

function FieldConfigEditor({
  field,
  override,
  targetFields,
  onChange,
  onDelete
}: FieldConfigEditorProps) {
  const [activeTab, setActiveTab] = useState("general");

  const handleAddTransformation = () => {
    const newTransform: FieldTransformation = {
      id: `transform-${Date.now()}`,
      type: 'format',
      order: override.transformations.length + 1,
      enabled: true,
      config: {}
    };

    onChange({
      transformations: [...override.transformations, newTransform]
    });
  };

  const handleUpdateTransformation = (id: string, updates: Partial<FieldTransformation>) => {
    const updated = override.transformations.map(t =>
      t.id === id ? { ...t, ...updates } : t
    );
    onChange({ transformations: updated });
  };

  const handleDeleteTransformation = (id: string) => {
    const filtered = override.transformations.filter(t => t.id !== id);
    onChange({ transformations: filtered });
  };

  const handleAddValidation = () => {
    const newValidation: FieldValidation = {
      id: `validation-${Date.now()}`,
      type: 'required',
      enabled: true,
      config: {},
      severity: 'error'
    };

    onChange({
      validations: [...override.validations, newValidation]
    });
  };

  const handleUpdateValidation = (id: string, updates: Partial<FieldValidation>) => {
    const updated = override.validations.map(v =>
      v.id === id ? { ...v, ...updates } : v
    );
    onChange({ validations: updated });
  };

  const handleDeleteValidation = (id: string) => {
    const filtered = override.validations.filter(v => v.id !== id);
    onChange({ validations: filtered });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              {field.name}
              {override.renameField && (
                <>
                  <span className="text-muted-foreground">→</span>
                  <Target className="h-4 w-4" />
                  {override.renameField}
                </>
              )}
            </CardTitle>
            <CardDescription>
              Type: {field.type} • {field.nullable ? 'Nullable' : 'Not null'}
              {field.isPrimaryKey && ' • Primary Key'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={override.skipField}
              onCheckedChange={(checked) => onChange({ skipField: checked })}
            />
            <Label className="text-sm">Skip field</Label>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="transforms">Transforms</TabsTrigger>
            <TabsTrigger value="validations">Validations</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rename Field (optional)</Label>
                <Input
                  value={override.renameField || ''}
                  onChange={(e) => onChange({ renameField: e.target.value || undefined })}
                  placeholder="New field name"
                />
              </div>
              <div>
                <Label>Default Value (optional)</Label>
                <Input
                  value={override.defaultValue || ''}
                  onChange={(e) => onChange({ defaultValue: e.target.value || undefined })}
                  placeholder="Default value if empty"
                />
              </div>
            </div>

            <div>
              <Label>Data Type Override (optional)</Label>
              <Select
                value={override.dataType || field.type}
                onValueChange={(value) => onChange({ dataType: value !== field.type ? value : undefined })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="datetime">DateTime</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={override.nullable ?? field.nullable}
                  onCheckedChange={(checked) => onChange({ nullable: checked })}
                />
                <Label>Nullable</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={override.unique ?? false}
                  onCheckedChange={(checked) => onChange({ unique: checked })}
                />
                <Label>Unique</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={override.indexed ?? false}
                  onCheckedChange={(checked) => onChange({ indexed: checked })}
                />
                <Label>Indexed</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transforms" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Field Transformations</Label>
              <Button onClick={handleAddTransformation} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Transform
              </Button>
            </div>

            <div className="space-y-3">
              {override.transformations.map((transform, index) => (
                <TransformationEditor
                  key={transform.id}
                  transform={transform}
                  onChange={(updates) => handleUpdateTransformation(transform.id, updates)}
                  onDelete={() => handleDeleteTransformation(transform.id)}
                />
              ))}
              
              {override.transformations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No transformations configured</p>
                  <p className="text-xs">Add transformations to modify field data</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="validations" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Field Validations</Label>
              <Button onClick={handleAddValidation} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Validation
              </Button>
            </div>

            <div className="space-y-3">
              {override.validations.map((validation) => (
                <ValidationEditor
                  key={validation.id}
                  validation={validation}
                  onChange={(updates) => handleUpdateValidation(validation.id, updates)}
                  onDelete={() => handleDeleteValidation(validation.id)}
                />
              ))}
              
              {override.validations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No validations configured</p>
                  <p className="text-xs">Add validations to ensure data quality</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div>
              <Label>Custom Code (JavaScript)</Label>
              <Textarea
                value={override.customCode || ''}
                onChange={(e) => onChange({ customCode: e.target.value || undefined })}
                placeholder="// Custom transformation code
function transform(value, record, context) {
  // Your custom logic here
  return value;
}"
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Write custom JavaScript to transform field values. Available parameters: value, record, context
              </p>
            </div>

            <Alert>
              <Code className="h-4 w-4" />
              <AlertDescription>
                Custom code executes in a sandboxed environment with access to common utilities.
                Use with caution and test thoroughly.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface TransformationEditorProps {
  transform: FieldTransformation;
  onChange: (updates: Partial<FieldTransformation>) => void;
  onDelete: () => void;
}

function TransformationEditor({ transform, onChange, onDelete }: TransformationEditorProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={transform.enabled}
              onCheckedChange={(checked) => onChange({ enabled: checked })}
            />
            <Badge variant="outline">Transform {transform.order}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Type</Label>
            <Select
              value={transform.type}
              onValueChange={(value: any) => onChange({ type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="format">Format</SelectItem>
                <SelectItem value="calculate">Calculate</SelectItem>
                <SelectItem value="lookup">Lookup</SelectItem>
                <SelectItem value="split">Split</SelectItem>
                <SelectItem value="combine">Combine</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {transform.type === 'format' && (
            <div>
              <Label>Format Pattern</Label>
              <Input
                value={transform.config.pattern || ''}
                onChange={(e) => onChange({
                  config: { ...transform.config, pattern: e.target.value }
                })}
                placeholder="e.g., YYYY-MM-DD, $0,0.00"
              />
            </div>
          )}

          {transform.type === 'lookup' && (
            <div>
              <Label>Lookup Table (JSON)</Label>
              <Textarea
                value={JSON.stringify(transform.config.lookupTable || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const lookupTable = JSON.parse(e.target.value);
                    onChange({
                      config: { ...transform.config, lookupTable }
                    });
                  } catch (error) {
                    // Invalid JSON, don't update
                  }
                }}
                className="font-mono text-sm"
                rows={3}
              />
            </div>
          )}

          <div>
            <Label>Description (optional)</Label>
            <Input
              value={transform.description || ''}
              onChange={(e) => onChange({ description: e.target.value || undefined })}
              placeholder="Describe what this transformation does"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ValidationEditorProps {
  validation: FieldValidation;
  onChange: (updates: Partial<FieldValidation>) => void;
  onDelete: () => void;
}

function ValidationEditor({ validation, onChange, onDelete }: ValidationEditorProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={validation.enabled}
              onCheckedChange={(checked) => onChange({ enabled: checked })}
            />
            <Badge variant={validation.severity === 'error' ? 'destructive' : 'secondary'}>
              {validation.type}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select
                value={validation.type}
                onValueChange={(value: any) => onChange({ type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="required">Required</SelectItem>
                  <SelectItem value="type">Type Check</SelectItem>
                  <SelectItem value="range">Range</SelectItem>
                  <SelectItem value="pattern">Pattern</SelectItem>
                  <SelectItem value="unique">Unique</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity</Label>
              <Select
                value={validation.severity}
                onValueChange={(value: any) => onChange({ severity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Error Message</Label>
            <Input
              value={validation.message || ''}
              onChange={(e) => onChange({ message: e.target.value || undefined })}
              placeholder="Custom validation error message"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}