"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DragStart
} from "@hello-pangea/dnd";
import {
  ArrowRight,
  Database,
  Target,
  Link,
  X,
  Check,
  AlertCircle,
  Info,
  GripVertical,
  Plus
} from "lucide-react";
import { ImportStageData, SourceField, SourceSchema } from "@/lib/import/types";

interface FieldMapping {
  id: string;
  sourceField: string;
  targetField: string;
  sourceType: string;
  targetType: string;
  isRequired: boolean;
  transform?: string;
}

interface DragDropFieldMapperProps {
  stage: ImportStageData;
  sourceSchema: SourceSchema;
  onMappingChange: (mappings: FieldMapping[]) => void;
}

const TARGET_ENTITY_FIELDS = {
  Account: [
    { name: 'name', type: 'string', required: true, description: 'Account name' },
    { name: 'domain', type: 'string', required: false, description: 'Email domain' },
    { name: 'isActive', type: 'boolean', required: true, description: 'Account status' },
    { name: 'parentAccountId', type: 'string', required: false, description: 'Parent account reference' }
  ],
  User: [
    { name: 'name', type: 'string', required: true, description: 'Full name' },
    { name: 'email', type: 'string', required: true, description: 'Email address' },
    { name: 'role', type: 'string', required: true, description: 'User role' },
    { name: 'accountId', type: 'string', required: true, description: 'Account reference' }
  ],
  Ticket: [
    { name: 'title', type: 'string', required: true, description: 'Ticket title' },
    { name: 'description', type: 'string', required: false, description: 'Ticket description' },
    { name: 'status', type: 'string', required: true, description: 'Ticket status' },
    { name: 'priority', type: 'string', required: true, description: 'Priority level' },
    { name: 'assignedToId', type: 'string', required: false, description: 'Assigned user reference' },
    { name: 'accountId', type: 'string', required: true, description: 'Account reference' }
  ],
  TimeEntry: [
    { name: 'description', type: 'string', required: true, description: 'Work description' },
    { name: 'startTime', type: 'datetime', required: true, description: 'Start time' },
    { name: 'duration', type: 'number', required: true, description: 'Duration in minutes' },
    { name: 'ticketId', type: 'string', required: true, description: 'Ticket reference' },
    { name: 'userId', type: 'string', required: true, description: 'User reference' }
  ]
};

export default function DragDropFieldMapper({ 
  stage, 
  sourceSchema, 
  onMappingChange 
}: DragDropFieldMapperProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [draggedField, setDraggedField] = useState<string | null>(null);

  const sourceTable = sourceSchema.tables?.find(t => t.name === stage.sourceTable);
  const targetFields = TARGET_ENTITY_FIELDS[stage.targetEntity as keyof typeof TARGET_ENTITY_FIELDS] || [];

  const handleDragStart = (start: DragStart) => {
    setDraggedField(start.draggableId);
  };

  const handleDragEnd = (result: DropResult) => {
    setDraggedField(null);
    
    if (!result.destination) return;

    const sourceFieldName = result.draggableId;
    const targetFieldName = result.destination.droppableId.replace('target-', '');

    // Check if mapping already exists
    const existingMapping = mappings.find(m => m.targetField === targetFieldName);
    if (existingMapping) {
      // Update existing mapping
      const updatedMappings = mappings.map(m => 
        m.id === existingMapping.id 
          ? { ...m, sourceField: sourceFieldName }
          : m
      );
      setMappings(updatedMappings);
      onMappingChange(updatedMappings);
      return;
    }

    // Create new mapping
    const sourceField = sourceTable?.fields.find(f => f.name === sourceFieldName);
    const targetField = targetFields.find(f => f.name === targetFieldName);
    
    if (sourceField && targetField) {
      const newMapping: FieldMapping = {
        id: `mapping-${Date.now()}`,
        sourceField: sourceField.name,
        targetField: targetField.name,
        sourceType: sourceField.type,
        targetType: targetField.type,
        isRequired: targetField.required,
        transform: sourceField.type !== targetField.type ? 'convert' : undefined
      };

      const updatedMappings = [...mappings, newMapping];
      setMappings(updatedMappings);
      onMappingChange(updatedMappings);
    }
  };

  const removeMapping = (mappingId: string) => {
    const updatedMappings = mappings.filter(m => m.id !== mappingId);
    setMappings(updatedMappings);
    onMappingChange(updatedMappings);
  };

  const getTypeCompatibility = (sourceType: string, targetType: string) => {
    if (sourceType === targetType) return 'exact';
    
    const compatibleTypes = {
      'string': ['string', 'datetime'],
      'number': ['number', 'string'],
      'boolean': ['boolean', 'string'],
      'datetime': ['datetime', 'string'],
      'date': ['date', 'datetime', 'string']
    };
    
    return compatibleTypes[sourceType as keyof typeof compatibleTypes]?.includes(targetType) 
      ? 'compatible' 
      : 'incompatible';
  };

  const getMappingForTarget = (targetFieldName: string) => {
    return mappings.find(m => m.targetField === targetFieldName);
  };

  if (!sourceTable) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please select a source table first to configure field mappings.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="font-medium mb-2">Field Mapping</h3>
          <p className="text-sm text-muted-foreground">
            Drag source fields from the left and drop them onto target fields on the right to create mappings.
          </p>
        </div>

        {/* Mapping Interface */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Source Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4 text-blue-500" />
                Source: {stage.sourceTable}
              </CardTitle>
              <CardDescription>
                Drag fields to map them to target entity fields
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <Droppable droppableId="source-fields" isDropDisabled>
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {sourceTable.fields.map((field, index) => {
                        const isMapped = mappings.some(m => m.sourceField === field.name);
                        
                        return (
                          <Draggable key={field.name} draggableId={field.name} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-3 border rounded-lg cursor-grab active:cursor-grabbing transition-all ${
                                  snapshot.isDragging
                                    ? 'shadow-lg border-primary bg-primary/5'
                                    : isMapped
                                    ? 'bg-green-50 border-green-200'
                                    : 'hover:bg-muted'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{field.name}</p>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {field.type}
                                      </Badge>
                                      {field.isPrimaryKey && (
                                        <Badge variant="secondary" className="text-xs">PK</Badge>
                                      )}
                                      {isMapped && (
                                        <Badge variant="secondary" className="text-xs text-green-700">
                                          <Check className="h-3 w-3 mr-1" />
                                          Mapped
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Target Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-green-500" />
                Target: {stage.targetEntity}
              </CardTitle>
              <CardDescription>
                Drop source fields here to create mappings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {targetFields.map((targetField) => {
                    const mapping = getMappingForTarget(targetField.name);
                    const isDropTarget = draggedField && !mapping;
                    
                    return (
                      <Droppable key={targetField.name} droppableId={`target-${targetField.name}`}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`p-3 border rounded-lg transition-all min-h-[60px] ${
                              snapshot.isDraggingOver
                                ? 'border-primary bg-primary/5'
                                : mapping
                                ? 'border-green-200 bg-green-50'
                                : isDropTarget
                                ? 'border-dashed border-muted-foreground'
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-sm">{targetField.name}</p>
                                  {targetField.required && (
                                    <Badge variant="destructive" className="text-xs">Required</Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {targetField.type}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {targetField.description}
                                </p>
                                
                                {mapping && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <div className="flex items-center gap-1 text-xs">
                                      <ArrowRight className="h-3 w-3" />
                                      <span className="font-medium">{mapping.sourceField}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {mapping.sourceType}
                                      </Badge>
                                    </div>
                                    
                                    {mapping.transform && (
                                      <Badge variant="secondary" className="text-xs">
                                        Convert
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {mapping && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeMapping(mapping.id)}
                                  className="ml-2"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            
                            {isDropTarget && (
                              <div className="text-center py-2">
                                <p className="text-xs text-muted-foreground">
                                  Drop here to map {draggedField}
                                </p>
                              </div>
                            )}
                            
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Mapping Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mapping Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mappings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No field mappings configured. Drag source fields to target fields to create mappings.
                </p>
              ) : (
                mappings.map((mapping) => {
                  const compatibility = getTypeCompatibility(mapping.sourceType, mapping.targetType);
                  
                  return (
                    <div key={mapping.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{mapping.sourceField}</span>
                        <Badge variant="outline" className="text-xs">{mapping.sourceType}</Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-sm">{mapping.targetField}</span>
                        <Badge variant="outline" className="text-xs">{mapping.targetType}</Badge>
                        
                        {compatibility === 'exact' && (
                          <Badge variant="secondary" className="text-xs text-green-700">
                            <Check className="h-3 w-3 mr-1" />
                            Perfect match
                          </Badge>
                        )}
                        {compatibility === 'compatible' && (
                          <Badge variant="secondary" className="text-xs text-yellow-700">
                            <Info className="h-3 w-3 mr-1" />
                            Compatible
                          </Badge>
                        )}
                        {compatibility === 'incompatible' && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Type mismatch
                          </Badge>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMapping(mapping.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Validation Summary */}
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold">{mappings.length}</div>
                  <p className="text-xs text-muted-foreground">Total Mappings</p>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {mappings.filter(m => getTypeCompatibility(m.sourceType, m.targetType) !== 'incompatible').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Compatible</p>
                </div>
                <div>
                  <div className="text-lg font-bold">
                    {targetFields.filter(f => f.required && !mappings.find(m => m.targetField === f.name)).length}
                  </div>
                  <p className="text-xs text-muted-foreground">Required Missing</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DragDropContext>
  );
}