"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  ArrowDown,
  Link,
  Database,
  Target,
  Plus,
  X,
  Info,
  CheckCircle,
  AlertTriangle,
  Users,
  Building,
  Ticket,
  Clock
} from "lucide-react";
import { ImportStageData, SourceSchema } from "@/lib/import/types";
import { StageRelationship } from "./RelationshipMapper";

interface VisualRelationshipMapperProps {
  stages: ImportStageData[];
  relationships: StageRelationship[];
  sourceSchema: SourceSchema;
  onChange: (relationships: StageRelationship[]) => void;
}

const ENTITY_ICONS = {
  Account: <Building className="h-4 w-4" />,
  User: <Users className="h-4 w-4" />,
  Ticket: <Ticket className="h-4 w-4" />,
  TimeEntry: <Clock className="h-4 w-4" />
};

const RELATIONSHIP_EXAMPLES = {
  'Account -> User': {
    description: 'Users belong to accounts',
    example: 'John Doe (User) belongs to Acme Corp (Account)',
    sourceField: 'account_id',
    targetField: 'id',
    type: 'many-to-one' as const
  },
  'User -> Ticket': {
    description: 'Tickets are assigned to users',
    example: 'Bug Report #123 (Ticket) assigned to John Doe (User)',
    sourceField: 'assigned_to_id',
    targetField: 'id',
    type: 'many-to-one' as const
  },
  'Ticket -> TimeEntry': {
    description: 'Time entries are logged on tickets',
    example: '2.5 hours (TimeEntry) logged on Bug Report #123 (Ticket)',
    sourceField: 'ticket_id',
    targetField: 'id',
    type: 'many-to-one' as const
  }
};

export default function VisualRelationshipMapper({
  stages,
  relationships,
  sourceSchema,
  onChange
}: VisualRelationshipMapperProps) {
  const [selectedRelationship, setSelectedRelationship] = useState<string | null>(null);

  const getStageIcon = (targetEntity: string) => {
    return ENTITY_ICONS[targetEntity as keyof typeof ENTITY_ICONS] || <Database className="h-4 w-4" />;
  };

  const getSuggestedRelationships = () => {
    const suggestions: Array<{
      fromStage: ImportStageData;
      toStage: ImportStageData;
      suggestion: typeof RELATIONSHIP_EXAMPLES[keyof typeof RELATIONSHIP_EXAMPLES];
      confidence: 'high' | 'medium' | 'low';
    }> = [];

    stages.forEach(fromStage => {
      stages.forEach(toStage => {
        if (fromStage.id === toStage.id) return;
        
        const relationshipKey = `${fromStage.targetEntity} -> ${toStage.targetEntity}` as keyof typeof RELATIONSHIP_EXAMPLES;
        if (RELATIONSHIP_EXAMPLES[relationshipKey]) {
          suggestions.push({
            fromStage,
            toStage,
            suggestion: RELATIONSHIP_EXAMPLES[relationshipKey],
            confidence: 'high'
          });
        }
      });
    });

    return suggestions;
  };

  const addRelationship = (fromStage: ImportStageData, toStage: ImportStageData, suggestion: any) => {
    const newRelationship: StageRelationship = {
      id: `rel-${Date.now()}`,
      fromStageId: fromStage.id,
      toStageId: toStage.id,
      sourceField: suggestion.sourceField,
      targetField: suggestion.targetField,
      relationType: suggestion.type,
      description: suggestion.description
    };

    onChange([...relationships, newRelationship]);
  };

  const removeRelationship = (relationshipId: string) => {
    onChange(relationships.filter(rel => rel.id !== relationshipId));
  };

  const getStageById = (stageId: string) => stages.find(s => s.id === stageId);

  return (
    <div className="space-y-6">
      {/* Visual Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Data Pipeline Visualization
          </CardTitle>
          <CardDescription>
            Visual representation of how your data flows through the import stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Stages Flow */}
            <div className="flex items-center gap-4 overflow-x-auto pb-4">
              {stages.map((stage, index) => (
                <div key={stage.id} className="flex items-center gap-4 min-w-fit">
                  <div className="text-center">
                    <div className="border-2 border-primary rounded-lg p-4 bg-primary/5">
                      <div className="flex items-center gap-2 mb-2">
                        {getStageIcon(stage.targetEntity)}
                        <Badge variant="outline">Stage {stage.order}</Badge>
                      </div>
                      <p className="font-medium text-sm">{stage.name}</p>
                      <div className="text-xs text-muted-foreground mt-1">
                        <p>{stage.sourceTable}</p>
                        <ArrowDown className="h-3 w-3 mx-auto my-1" />
                        <p>{stage.targetEntity}</p>
                      </div>
                    </div>
                  </div>
                  
                  {index < stages.length - 1 && (
                    <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Relationships */}
            {relationships.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Active Relationships
                </h4>
                {relationships.map((relationship) => {
                  const fromStage = getStageById(relationship.fromStageId);
                  const toStage = getStageById(relationship.toStageId);
                  
                  return (
                    <div key={relationship.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {fromStage && getStageIcon(fromStage.targetEntity)}
                          <span className="text-sm font-medium">{fromStage?.targetEntity}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="flex items-center gap-2">
                          {toStage && getStageIcon(toStage.targetEntity)}
                          <span className="text-sm font-medium">{toStage?.targetEntity}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {relationship.relationType}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRelationship(relationship.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Suggested Relationships */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Suggested Relationships
          </CardTitle>
          <CardDescription>
            Based on your target entities, here are the relationships we recommend
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {getSuggestedRelationships().length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No relationship suggestions available. Add more stages to see recommendations.
              </AlertDescription>
            </Alert>
          ) : (
            getSuggestedRelationships().map((suggestion, index) => {
              const existingRelationship = relationships.find(rel => 
                rel.fromStageId === suggestion.fromStage.id && 
                rel.toStageId === suggestion.toStage.id
              );

              return (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getStageIcon(suggestion.fromStage.targetEntity)}
                          <span className="font-medium">{suggestion.fromStage.targetEntity}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="flex items-center gap-2">
                          {getStageIcon(suggestion.toStage.targetEntity)}
                          <span className="font-medium">{suggestion.toStage.targetEntity}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.confidence} confidence
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {suggestion.suggestion.description}
                      </p>
                      
                      <Alert className="border-blue-200 bg-blue-50">
                        <Ticket className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800">
                          <strong>Example:</strong> {suggestion.suggestion.example}
                        </AlertDescription>
                      </Alert>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Source field: <code>{suggestion.suggestion.sourceField}</code></span>
                        <span>Target field: <code>{suggestion.suggestion.targetField}</code></span>
                        <span>Type: {suggestion.suggestion.type}</span>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      {existingRelationship ? (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Added
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => addRelationship(
                            suggestion.fromStage, 
                            suggestion.toStage, 
                            suggestion.suggestion
                          )}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Manual Relationship Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Relationships</CardTitle>
          <CardDescription>
            Create custom relationships between your stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Advanced Feature</AlertTitle>
            <AlertDescription>
              Manual relationship configuration will be available in the next version. 
              Use the suggested relationships above for now.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}