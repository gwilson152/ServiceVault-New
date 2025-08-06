"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  X,
  ArrowRight,
  Settings,
  Info,
  CheckCircle,
  AlertCircle,
  Trash2,
  Copy
} from "lucide-react";
import { FieldMapping, SourceField, TargetField, TransformRule, ValidationRule } from "@/lib/import/types";

interface FieldMappingEditorProps {
  sourceFields: SourceField[];
  targetFields: TargetField[];
  mappings: FieldMapping[];
  onChange: (mappings: FieldMapping[]) => void;
}

interface TargetFieldWithRelationships extends TargetField {
  relationships?: Array<{
    name: string;
    type: string;
    target: string;
    description: string;
  }>;
}

const TRANSFORM_TYPES = [
  { value: "static", label: "Static Value", description: "Set a fixed value" },
  { value: "function", label: "Function", description: "Apply a transformation function" },
  { value: "lookup", label: "Lookup Table", description: "Map values using a lookup table" },
  { value: "concatenate", label: "Concatenate", description: "Combine multiple fields" },
  { value: "split", label: "Split", description: "Extract part of a field" },
  { value: "format", label: "Format", description: "Format dates, numbers, etc." }
];

const VALIDATION_TYPES = [
  { value: "required", label: "Required", description: "Field must have a value" },
  { value: "minLength", label: "Minimum Length", description: "String minimum length" },
  { value: "maxLength", label: "Maximum Length", description: "String maximum length" },
  { value: "pattern", label: "Pattern", description: "Regular expression pattern" },
  { value: "range", label: "Range", description: "Numeric range validation" },
  { value: "enum", label: "Enum", description: "Value must be in allowed list" },
  { value: "custom", label: "Custom", description: "Custom validation function" }
];

const COMMON_FUNCTIONS = [
  "toLowerCase", "toUpperCase", "trim", "parseInt", "parseFloat", 
  "formatDate", "formatCurrency", "slugify", "sanitizeHtml"
];

export default function FieldMappingEditor({
  sourceFields,
  targetFields,
  mappings,
  onChange
}: FieldMappingEditorProps) {
  const [selectedMapping, setSelectedMapping] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleAddMapping = () => {
    const newMapping: FieldMapping = {
      id: `mapping-${Date.now()}`,
      sourceField: "",
      targetField: "",
      required: false
    };

    onChange([...mappings, newMapping]);
    setSelectedMapping(newMapping.id);
  };

  const handleUpdateMapping = (id: string, updates: Partial<FieldMapping>) => {
    const updated = mappings.map(mapping =>
      mapping.id === id ? { ...mapping, ...updates } : mapping
    );
    onChange(updated);
  };

  const handleDeleteMapping = (id: string) => {
    onChange(mappings.filter(m => m.id !== id));
    if (selectedMapping === id) {
      setSelectedMapping(null);
    }
  };

  const handleDuplicateMapping = (id: string) => {
    const original = mappings.find(m => m.id === id);
    if (!original) return;

    const duplicate: FieldMapping = {
      ...original,
      id: `mapping-${Date.now()}`,
      targetField: "", // Clear target field for user to select
    };

    onChange([...mappings, duplicate]);
    setSelectedMapping(duplicate.id);
  };

  const getSourceFieldType = (fieldName: string): string => {
    const field = sourceFields.find(f => f.name === fieldName);
    return field?.type || "string";
  };

  const getTargetFieldInfo = (fieldName: string): TargetField | undefined => {
    return targetFields.find(f => f.name === fieldName);
  };

  const isValidMapping = (mapping: FieldMapping): boolean => {
    return !!(mapping.sourceField && mapping.targetField);
  };

  const getMappingStatus = (mapping: FieldMapping): "valid" | "invalid" | "warning" => {
    if (!isValidMapping(mapping)) return "invalid";
    
    const sourceField = sourceFields.find(f => f.name === mapping.sourceField);
    const targetField = targetFields.find(f => f.name === mapping.targetField);
    
    if (!sourceField || !targetField) return "invalid";
    
    // Check type compatibility
    if (sourceField.type !== targetField.type && !mapping.transform) {
      return "warning";
    }
    
    return "valid";
  };

  const filteredSourceFields = sourceFields.filter(field =>
    field.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTargetFields = targetFields.filter(field =>
    field.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const unmappedTargetFields = targetFields.filter(field =>
    !mappings.some(mapping => mapping.targetField === field.name)
  );

  const requiredUnmappedFields = unmappedTargetFields.filter(field => field.required);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Field Lists */}
      <div className="space-y-4">
        {/* Search */}
        <div>
          <Input
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Source Fields */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Source Fields</CardTitle>
            <CardDescription>
              Available fields from your data source
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredSourceFields.map((field) => (
              <div
                key={field.name}
                className="flex items-center justify-between p-2 border rounded hover:bg-muted cursor-pointer"
                onClick={() => {
                  // Auto-create mapping if no mapping exists for this source field
                  const existingMapping = mappings.find(m => m.sourceField === field.name);
                  if (!existingMapping) {
                    const newMapping: FieldMapping = {
                      id: `mapping-${Date.now()}`,
                      sourceField: field.name,
                      targetField: "",
                      required: false
                    };
                    onChange([...mappings, newMapping]);
                    setSelectedMapping(newMapping.id);
                  }
                }}
              >
                <div>
                  <div className="font-mono text-sm">{field.name}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {field.type}
                    </Badge>
                    {field.nullable && (
                      <span className="text-xs text-muted-foreground">nullable</span>
                    )}
                  </div>
                </div>
                {mappings.some(m => m.sourceField === field.name) && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Target Fields */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Target Fields</CardTitle>
            <CardDescription>
              Fields in the target entity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredTargetFields.map((field) => (
              <div
                key={field.name}
                className={`flex items-center justify-between p-2 border rounded ${
                  field.required && !mappings.some(m => m.targetField === field.name)
                    ? "border-red-200 bg-red-50"
                    : mappings.some(m => m.targetField === field.name)
                    ? "border-green-200 bg-green-50"
                    : "hover:bg-muted"
                } cursor-pointer`}
              >
                <div>
                  <div className="font-mono text-sm flex items-center gap-2">
                    {field.name}
                    {field.required && <span className="text-red-500">*</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {field.type}
                    </Badge>
                    {field.unique && (
                      <Badge variant="secondary" className="text-xs">unique</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {field.description}
                  </div>
                </div>
                {mappings.some(m => m.targetField === field.name) && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Summary */}
        {(requiredUnmappedFields.length > 0 || mappings.length > 0) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Mapping Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Mappings:</span>
                <span>{mappings.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Valid Mappings:</span>
                <span className="text-green-600">
                  {mappings.filter(m => getMappingStatus(m) === "valid").length}
                </span>
              </div>
              {mappings.filter(m => getMappingStatus(m) === "warning").length > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Warnings:</span>
                  <span className="text-amber-600">
                    {mappings.filter(m => getMappingStatus(m) === "warning").length}
                  </span>
                </div>
              )}
              {mappings.filter(m => getMappingStatus(m) === "invalid").length > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Invalid:</span>
                  <span className="text-red-600">
                    {mappings.filter(m => getMappingStatus(m) === "invalid").length}
                  </span>
                </div>
              )}
              {requiredUnmappedFields.length > 0 && (
                <>
                  <Separator />
                  <div className="text-sm text-red-600">
                    Required fields not mapped: {requiredUnmappedFields.length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {requiredUnmappedFields.map(f => f.name).join(", ")}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mappings List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Field Mappings</h3>
          <Button onClick={handleAddMapping} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Mapping
          </Button>
        </div>

        <div className="space-y-2">
          {mappings.map((mapping) => (
            <Card
              key={mapping.id}
              className={`cursor-pointer transition-colors ${
                selectedMapping === mapping.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedMapping(mapping.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getMappingStatus(mapping) === "valid" && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    {getMappingStatus(mapping) === "warning" && (
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    )}
                    {getMappingStatus(mapping) === "invalid" && (
                      <X className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm font-medium">
                      {mapping.sourceField || "Select source"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateMapping(mapping.id);
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMapping(mapping.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-mono bg-muted px-2 py-1 rounded">
                    {mapping.sourceField || "?"}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono bg-muted px-2 py-1 rounded">
                    {mapping.targetField || "?"}
                  </span>
                </div>
                
                {mapping.transform && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      Transform: {mapping.transform.type}
                    </Badge>
                  </div>
                )}
                
                {mapping.validation && mapping.validation.length > 0 && (
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      {mapping.validation.length} validation rule(s)
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Mapping Editor */}
      <div>
        {selectedMapping && (
          <MappingEditor
            mapping={mappings.find(m => m.id === selectedMapping)!}
            sourceFields={sourceFields}
            targetFields={targetFields}
            onChange={(updates) => handleUpdateMapping(selectedMapping, updates)}
          />
        )}
      </div>
    </div>
  );
}

interface MappingEditorProps {
  mapping: FieldMapping;
  sourceFields: SourceField[];
  targetFields: TargetField[];
  onChange: (updates: Partial<FieldMapping>) => void;
}

function MappingEditor({
  mapping,
  sourceFields,
  targetFields,
  onChange
}: MappingEditorProps) {
  const [activeTab, setActiveTab] = useState("basic");

  const handleTransformChange = (updates: Partial<TransformRule>) => {
    onChange({
      transform: {
        type: "static",
        ...mapping.transform,
        ...updates
      }
    });
  };

  const handleAddValidation = () => {
    const newValidation: ValidationRule = {
      type: "required",
      message: "This field is required"
    };
    
    onChange({
      validation: [...(mapping.validation || []), newValidation]
    });
  };

  const handleUpdateValidation = (index: number, updates: Partial<ValidationRule>) => {
    const validations = [...(mapping.validation || [])];
    validations[index] = { ...validations[index], ...updates };
    onChange({ validation: validations });
  };

  const handleRemoveValidation = (index: number) => {
    const validations = [...(mapping.validation || [])];
    validations.splice(index, 1);
    onChange({ validation: validations });
  };

  const sourceField = sourceFields.find(f => f.name === mapping.sourceField);
  const targetField = targetFields.find(f => f.name === mapping.targetField);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Edit Field Mapping</CardTitle>
        <CardDescription>
          Configure how source data maps to target fields
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="transform">Transform</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div>
              <Label>Source Field</Label>
              <Select 
                value={mapping.sourceField} 
                onValueChange={(value) => onChange({ sourceField: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source field" />
                </SelectTrigger>
                <SelectContent>
                  {sourceFields.map((field) => (
                    <SelectItem key={field.name} value={field.name}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{field.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {field.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sourceField && (
                <div className="text-xs text-muted-foreground mt-1">
                  Type: {sourceField.type}
                  {sourceField.nullable && " • Nullable"}
                  {sourceField.maxLength && ` • Max length: ${sourceField.maxLength}`}
                </div>
              )}
            </div>

            <div>
              <Label>Target Field</Label>
              <Select 
                value={mapping.targetField} 
                onValueChange={(value) => onChange({ targetField: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target field" />
                </SelectTrigger>
                <SelectContent>
                  {targetFields.map((field) => (
                    <SelectItem key={field.name} value={field.name}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{field.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {field.type}
                        </Badge>
                        {field.required && <span className="text-red-500 text-xs">*</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {targetField && (
                <div className="text-xs text-muted-foreground mt-1">
                  {targetField.description}
                  {targetField.required && " • Required"}
                  {targetField.unique && " • Unique"}
                </div>
              )}
            </div>

            <div>
              <Label>Default Value (optional)</Label>
              <Input
                placeholder="Default value if source is empty"
                value={mapping.defaultValue || ""}
                onChange={(e) => onChange({ defaultValue: e.target.value || undefined })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={mapping.required || false}
                onCheckedChange={(checked) => onChange({ required: checked })}
              />
              <Label>Required field</Label>
            </div>
          </TabsContent>

          <TabsContent value="transform" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable Transformation</Label>
              <Switch
                checked={!!mapping.transform}
                onCheckedChange={(checked) => 
                  onChange({ transform: checked ? { type: "static" } : undefined })
                }
              />
            </div>

            {mapping.transform && (
              <>
                <div>
                  <Label>Transform Type</Label>
                  <Select 
                    value={mapping.transform.type} 
                    onValueChange={(value: any) => handleTransformChange({ type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSFORM_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {mapping.transform.type === "static" && (
                  <div>
                    <Label>Static Value</Label>
                    <Input
                      placeholder="Enter static value"
                      value={mapping.transform.value || ""}
                      onChange={(e) => handleTransformChange({ value: e.target.value })}
                    />
                  </div>
                )}

                {mapping.transform.type === "function" && (
                  <div>
                    <Label>Function</Label>
                    <Select 
                      value={mapping.transform.function || ""} 
                      onValueChange={(value) => handleTransformChange({ function: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select function" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_FUNCTIONS.map((func) => (
                          <SelectItem key={func} value={func}>
                            {func}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {mapping.transform.type === "lookup" && (
                  <div className="space-y-3">
                    <div>
                      <Label>Lookup Table (JSON)</Label>
                      <Textarea
                        placeholder='{"old_value": "new_value", "key": "value"}'
                        value={JSON.stringify(mapping.transform.lookupTable || {}, null, 2)}
                        onChange={(e) => {
                          try {
                            const lookupTable = JSON.parse(e.target.value);
                            handleTransformChange({ lookupTable });
                          } catch (error) {
                            // Invalid JSON, don't update
                          }
                        }}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div>
                      <Label>Default Value (if not found)</Label>
                      <Input
                        placeholder="Default value for unknown keys"
                        value={mapping.transform.lookupDefault || ""}
                        onChange={(e) => handleTransformChange({ lookupDefault: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {mapping.transform.type === "concatenate" && (
                  <div className="space-y-3">
                    <div>
                      <Label>Source Fields (comma-separated)</Label>
                      <Input
                        placeholder="field1,field2,field3"
                        value={mapping.transform.sourceFields?.join(",") || ""}
                        onChange={(e) => handleTransformChange({ 
                          sourceFields: e.target.value.split(",").map(f => f.trim()).filter(Boolean)
                        })}
                      />
                    </div>
                    <div>
                      <Label>Separator</Label>
                      <Input
                        placeholder=" (space)"
                        value={mapping.transform.separator || ""}
                        onChange={(e) => handleTransformChange({ separator: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {mapping.transform.type === "split" && (
                  <div className="space-y-3">
                    <div>
                      <Label>Split Delimiter</Label>
                      <Input
                        placeholder=","
                        value={mapping.transform.splitDelimiter || ""}
                        onChange={(e) => handleTransformChange({ splitDelimiter: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Index (0-based)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={mapping.transform.splitIndex || 0}
                        onChange={(e) => handleTransformChange({ splitIndex: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                )}

                {mapping.transform.type === "format" && (
                  <div>
                    <Label>Format String</Label>
                    <Input
                      placeholder="YYYY-MM-DD or $0,0.00"
                      value={mapping.transform.format || ""}
                      onChange={(e) => handleTransformChange({ format: e.target.value })}
                    />
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Validation Rules</Label>
              <Button onClick={handleAddValidation} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </div>

            {mapping.validation?.map((rule, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Rule Type</Label>
                    <Button
                      onClick={() => handleRemoveValidation(index)}
                      size="sm"
                      variant="ghost"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Select
                    value={rule.type}
                    onValueChange={(value: any) => handleUpdateValidation(index, { type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VALIDATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div>
                    <Label>Error Message</Label>
                    <Input
                      placeholder="Validation error message"
                      value={rule.message || ""}
                      onChange={(e) => handleUpdateValidation(index, { message: e.target.value })}
                    />
                  </div>

                  {(rule.type === "minLength" || rule.type === "maxLength") && (
                    <div>
                      <Label>Length</Label>
                      <Input
                        type="number"
                        value={rule.value || ""}
                        onChange={(e) => handleUpdateValidation(index, { value: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  )}

                  {rule.type === "pattern" && (
                    <div>
                      <Label>Regular Expression</Label>
                      <Input
                        placeholder="^[a-zA-Z0-9]+$"
                        value={rule.pattern || ""}
                        onChange={(e) => handleUpdateValidation(index, { pattern: e.target.value })}
                      />
                    </div>
                  )}

                  {rule.type === "range" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Min Value</Label>
                        <Input
                          type="number"
                          value={rule.min || ""}
                          onChange={(e) => handleUpdateValidation(index, { min: parseFloat(e.target.value) || undefined })}
                        />
                      </div>
                      <div>
                        <Label>Max Value</Label>
                        <Input
                          type="number"
                          value={rule.max || ""}
                          onChange={(e) => handleUpdateValidation(index, { max: parseFloat(e.target.value) || undefined })}
                        />
                      </div>
                    </div>
                  )}

                  {rule.type === "enum" && (
                    <div>
                      <Label>Allowed Values (comma-separated)</Label>
                      <Input
                        placeholder="value1,value2,value3"
                        value={rule.enumValues?.join(",") || ""}
                        onChange={(e) => handleUpdateValidation(index, { 
                          enumValues: e.target.value.split(",").map(v => v.trim()).filter(Boolean)
                        })}
                      />
                    </div>
                  )}

                  {rule.type === "custom" && (
                    <div>
                      <Label>Custom Function</Label>
                      <Input
                        placeholder="customValidationFunction"
                        value={rule.customFunction || ""}
                        onChange={(e) => handleUpdateValidation(index, { customFunction: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </Card>
            )) || (
              <div className="text-center py-8 text-muted-foreground">
                No validation rules configured
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}