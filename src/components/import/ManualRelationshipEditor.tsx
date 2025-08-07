"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  X,
  Edit,
  Link,
  Database,
  Target,
  ArrowRight,
  Settings,
  Eye,
  Check,
  AlertCircle,
  Info,
  Zap,
  GitMerge,
  Loader2,
  Search,
  ChevronDown
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ImportStageData, SourceSchema, SourceField, ConnectionConfig } from "@/lib/import/types";
import { StageRelationship } from "./RelationshipMapper";

interface ExtendedStageRelationship extends StageRelationship {
  joinType?: 'inner' | 'left' | 'right' | 'full';
  conditions?: RelationshipCondition[];
  isJoinedTable?: boolean;
  customSQL?: string;
}

interface RelationshipCondition {
  id: string;
  sourceField: string;
  targetField: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';
  value?: string;
}

interface JoinedTableConfig {
  id: string;
  name: string;
  description?: string;
  primaryTable: string;
  joinedTables: {
    tableName: string;
    joinType: 'inner' | 'left' | 'right' | 'full';
    joinConditions: RelationshipCondition[];
    alias?: string;
  }[];
  selectedFields: {
    tableName: string;
    fieldName: string;
    alias?: string;
  }[];
  whereConditions?: RelationshipCondition[];
}

interface ManualRelationshipEditorProps {
  stages: ImportStageData[];
  relationships: ExtendedStageRelationship[];
  sourceSchema: SourceSchema;
  joinedTables: JoinedTableConfig[];
  connectionConfig: ConnectionConfig;
  onChange: (relationships: ExtendedStageRelationship[]) => void;
  onJoinedTablesChange: (joinedTables: JoinedTableConfig[]) => void;
  hideRelationships?: boolean;
}

const JOIN_TYPES = [
  { 
    value: 'inner', 
    label: 'Inner Join', 
    description: 'Only matching records from both tables',
    explanation: 'Returns only rows where the join condition is met in both tables. Non-matching rows are excluded.',
    useCase: 'Use when you only want records that exist in both tables (e.g., users who have orders)'
  },
  { 
    value: 'left', 
    label: 'Left Join', 
    description: 'All records from left table, matching from right',
    explanation: 'Returns all rows from the left (primary) table, and matching rows from the right table. Non-matching right table values become NULL.',
    useCase: 'Use when you want all records from the primary table, even if they don\'t have matches (e.g., all users, even those without orders)'
  },
  { 
    value: 'right', 
    label: 'Right Join', 
    description: 'All records from right table, matching from left',
    explanation: 'Returns all rows from the right (joined) table, and matching rows from the left table. Non-matching left table values become NULL.',
    useCase: 'Use when you want all records from the joined table, even if they don\'t have matches (rarely used in practice)'
  },
  { 
    value: 'full', 
    label: 'Full Outer Join', 
    description: 'All records from both tables',
    explanation: 'Returns all rows from both tables. When no match is found, NULL values are used for missing data from either side.',
    useCase: 'Use when you need a complete picture of data from both tables (e.g., all users and all orders, showing which don\'t match)'
  }
];

const OPERATORS = [
  { value: '=', label: 'Equals (=)' },
  { value: '!=', label: 'Not Equals (!=)' },
  { value: '>', label: 'Greater Than (>)' },
  { value: '<', label: 'Less Than (<)' },
  { value: '>=', label: 'Greater or Equal (>=)' },
  { value: '<=', label: 'Less or Equal (<=)' },
  { value: 'LIKE', label: 'Like (LIKE)' },
  { value: 'IN', label: 'In (IN)' }
];

export default function ManualRelationshipEditor({
  stages,
  relationships,
  sourceSchema,
  joinedTables,
  connectionConfig,
  onChange,
  onJoinedTablesChange,
  hideRelationships = false
}: ManualRelationshipEditorProps) {
  const [selectedRelationship, setSelectedRelationship] = useState<ExtendedStageRelationship | null>(null);
  const [isEditingRelationship, setIsEditingRelationship] = useState(false);
  const [selectedJoinedTable, setSelectedJoinedTable] = useState<JoinedTableConfig | null>(null);
  const [isEditingJoinedTable, setIsEditingJoinedTable] = useState(false);

  const addManualRelationship = () => {
    const newRelationship: ExtendedStageRelationship = {
      id: `manual-rel-${Date.now()}`,
      fromStageId: '',
      toStageId: '',
      sourceField: '',
      targetField: '',
      relationType: 'many-to-one',
      description: '',
      joinType: 'inner',
      conditions: [{
        id: `cond-${Date.now()}`,
        sourceField: '',
        targetField: '',
        operator: '='
      }]
    };
    setSelectedRelationship(newRelationship);
    setIsEditingRelationship(true);
  };

  const addJoinedTable = () => {
    const newJoinedTable: JoinedTableConfig = {
      id: `joined-${Date.now()}`,
      name: '',
      description: '',
      primaryTable: '',
      joinedTables: [],
      selectedFields: [],
      whereConditions: []
    };
    setSelectedJoinedTable(newJoinedTable);
    setIsEditingJoinedTable(true);
  };

  const saveRelationship = (relationship: ExtendedStageRelationship) => {
    const updated = relationships.filter(r => r.id !== relationship.id);
    onChange([...updated, relationship]);
    setIsEditingRelationship(false);
    setSelectedRelationship(null);
  };

  const saveJoinedTable = (joinedTable: JoinedTableConfig) => {
    const updated = joinedTables.filter(jt => jt.id !== joinedTable.id);
    onJoinedTablesChange([...updated, joinedTable]);
    setIsEditingJoinedTable(false);
    setSelectedJoinedTable(null);
  };

  const deleteRelationship = (relationshipId: string) => {
    onChange(relationships.filter(r => r.id !== relationshipId));
  };

  const deleteJoinedTable = (joinedTableId: string) => {
    onJoinedTablesChange(joinedTables.filter(jt => jt.id !== joinedTableId));
  };

  const getStageByStageId = (stageId: string) => stages.find(s => s.id === stageId);
  const getTableFields = (tableName: string) => sourceSchema.tables?.find(t => t.name === tableName)?.fields || [];

  return (
    <div className="space-y-6">
      {/* Joined Tables Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-blue-500" />
            Joined Tables Configuration
          </CardTitle>
          <CardDescription>
            Create virtual tables by joining multiple source tables together for complex data relationships
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {joinedTables.length} joined table(s) configured
              </p>
            </div>
            <Button onClick={addJoinedTable}>
              <Plus className="h-4 w-4 mr-2" />
              Add Joined Table
            </Button>
          </div>

          {joinedTables.length > 0 && (
            <div className="space-y-3">
              {joinedTables.map((joinedTable) => (
                <div key={joinedTable.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <GitMerge className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{joinedTable.name || 'Untitled Join'}</span>
                        <Badge variant="outline">{joinedTable.joinedTables.length + 1} tables</Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {joinedTable.description || 'No description'}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs">
                        <Database className="h-3 w-3" />
                        <span>Primary: {joinedTable.primaryTable}</span>
                        {joinedTable.joinedTables.map((jt, index) => (
                          <span key={index} className="flex items-center gap-1">
                            <ArrowRight className="h-3 w-3" />
                            {jt.joinType.toUpperCase()} {jt.tableName}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedJoinedTable(joinedTable);
                          setIsEditingJoinedTable(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteJoinedTable(joinedTable.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Relationships Section */}
      {!hideRelationships && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5 text-green-500" />
            Manual Relationship Definition
          </CardTitle>
          <CardDescription>
            Create custom relationships between stages with advanced join conditions and field mappings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {relationships.length} relationship(s) configured
              </p>
            </div>
            <Button onClick={addManualRelationship}>
              <Plus className="h-4 w-4 mr-2" />
              Add Relationship
            </Button>
          </div>

          {relationships.length > 0 && (
            <div className="space-y-3">
              {relationships.map((relationship) => {
                const fromStage = getStageByStageId(relationship.fromStageId);
                const toStage = getStageByStageId(relationship.toStageId);
                
                return (
                  <div key={relationship.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Link className="h-4 w-4 text-green-500" />
                          <span className="font-medium">{fromStage?.targetEntity}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{toStage?.targetEntity}</span>
                          <Badge variant="outline">{relationship.joinType}</Badge>
                          <Badge variant="secondary">{relationship.relationType}</Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {relationship.description || 'No description'}
                        </p>
                        
                        <div className="text-xs text-muted-foreground">
                          <span>Field mapping: {relationship.sourceField} → {relationship.targetField}</span>
                          {relationship.conditions && relationship.conditions.length > 1 && (
                            <span className="ml-2">({relationship.conditions.length} conditions)</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRelationship(relationship);
                            setIsEditingRelationship(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRelationship(relationship.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Relationship Editor Dialog */}
      <Dialog open={isEditingRelationship} onOpenChange={setIsEditingRelationship}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Relationship</DialogTitle>
            <DialogDescription>
              Define how stages relate to each other with custom conditions and join types
            </DialogDescription>
          </DialogHeader>
          
          {selectedRelationship && (
            <RelationshipConfigForm
              relationship={selectedRelationship}
              stages={stages}
              sourceSchema={sourceSchema}
              onSave={saveRelationship}
              onCancel={() => setIsEditingRelationship(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Joined Table Editor Dialog */}
      <Dialog open={isEditingJoinedTable} onOpenChange={setIsEditingJoinedTable}>
        <DialogContent className="max-w-6xl max-h-[90vh] w-[95vw] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Configure Joined Table</DialogTitle>
            <DialogDescription>
              Create a virtual table by joining multiple source tables together
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            {selectedJoinedTable && (
              <JoinedTableConfigForm
                joinedTable={selectedJoinedTable}
                sourceSchema={sourceSchema}
                connectionConfig={connectionConfig}
                onSave={saveJoinedTable}
                onCancel={() => setIsEditingJoinedTable(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Relationship Configuration Form Component
interface RelationshipConfigFormProps {
  relationship: ExtendedStageRelationship;
  stages: ImportStageData[];
  sourceSchema: SourceSchema;
  onSave: (relationship: ExtendedStageRelationship) => void;
  onCancel: () => void;
}

function RelationshipConfigForm({
  relationship,
  stages,
  sourceSchema,
  onSave,
  onCancel
}: RelationshipConfigFormProps) {
  const [config, setConfig] = useState<ExtendedStageRelationship>(relationship);

  const updateConfig = (updates: Partial<ExtendedStageRelationship>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const addCondition = () => {
    const newCondition: RelationshipCondition = {
      id: `cond-${Date.now()}`,
      sourceField: '',
      targetField: '',
      operator: '='
    };
    updateConfig({
      conditions: [...(config.conditions || []), newCondition]
    });
  };

  const updateCondition = (conditionId: string, updates: Partial<RelationshipCondition>) => {
    updateConfig({
      conditions: config.conditions?.map(c => 
        c.id === conditionId ? { ...c, ...updates } : c
      ) || []
    });
  };

  const removeCondition = (conditionId: string) => {
    updateConfig({
      conditions: config.conditions?.filter(c => c.id !== conditionId) || []
    });
  };

  const getTableFields = (tableName: string) => 
    sourceSchema.tables?.find(t => t.name === tableName)?.fields || [];

  const fromStage = stages.find(s => s.id === config.fromStageId);
  const toStage = stages.find(s => s.id === config.toStageId);

  return (
    <div className="space-y-6">
      {/* Basic Configuration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>From Stage</Label>
          <Select 
            value={config.fromStageId} 
            onValueChange={(value) => updateConfig({ fromStageId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select source stage" />
            </SelectTrigger>
            <SelectContent>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name} ({stage.targetEntity})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>To Stage</Label>
          <Select 
            value={config.toStageId} 
            onValueChange={(value) => updateConfig({ toStageId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select target stage" />
            </SelectTrigger>
            <SelectContent>
              {stages.filter(s => s.id !== config.fromStageId).map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name} ({stage.targetEntity})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Join Type</Label>
          <Select 
            value={config.joinType} 
            onValueChange={(value) => updateConfig({ joinType: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOIN_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <span>
                    <span className="font-medium block">{type.label}</span>
                    <span className="text-xs text-muted-foreground block">{type.description}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Relationship Type</Label>
          <Select 
            value={config.relationType} 
            onValueChange={(value) => updateConfig({ relationType: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one-to-one">One to One</SelectItem>
              <SelectItem value="one-to-many">One to Many</SelectItem>
              <SelectItem value="many-to-one">Many to One</SelectItem>
              <SelectItem value="many-to-many">Many to Many</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={config.description || ''}
          onChange={(e) => updateConfig({ description: e.target.value })}
          placeholder="Describe this relationship"
        />
      </div>

      {/* Conditions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">Join Conditions</Label>
          <Button onClick={addCondition} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Condition
          </Button>
        </div>

        {config.conditions?.map((condition) => (
          <div key={condition.id} className="border rounded-lg p-4">
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <Label className="text-xs">Source Field</Label>
                <Select
                  value={condition.sourceField}
                  onValueChange={(value) => updateCondition(condition.id, { sourceField: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {fromStage && getTableFields(fromStage.sourceTable).map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.name} ({field.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label className="text-xs">Operator</Label>
                <Select
                  value={condition.operator}
                  onValueChange={(value) => updateCondition(condition.id, { operator: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-4">
                <Label className="text-xs">Target Field</Label>
                <Select
                  value={condition.targetField}
                  onValueChange={(value) => updateCondition(condition.id, { targetField: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {toStage && getTableFields(toStage.sourceTable).map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.name} ({field.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCondition(condition.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {(!config.conditions || config.conditions.length === 0) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Add at least one join condition to define how the tables relate to each other.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={() => onSave(config)}
          disabled={!config.fromStageId || !config.toStageId || !config.conditions?.length}
        >
          Save Relationship
        </Button>
      </div>
    </div>
  );
}

// Joined Table Configuration Form Component
interface JoinedTableConfigFormProps {
  joinedTable: JoinedTableConfig;
  sourceSchema: SourceSchema;
  connectionConfig: ConnectionConfig;
  onSave: (joinedTable: JoinedTableConfig) => void;
  onCancel: () => void;
}

function JoinedTableConfigForm({
  joinedTable,
  sourceSchema,
  connectionConfig,
  onSave,
  onCancel
}: JoinedTableConfigFormProps) {
  const [config, setConfig] = useState<JoinedTableConfig>(joinedTable);
  const [tableSamples, setTableSamples] = useState<Record<string, any>>({});
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [showJoinExplanation, setShowJoinExplanation] = useState(false);
  const [joinPreview, setJoinPreview] = useState<any>(null);
  const [previewRecordCount, setPreviewRecordCount] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredTableSamples, setFilteredTableSamples] = useState<Record<string, any>>({});
  const [filteredJoinPreview, setFilteredJoinPreview] = useState<any>(null);

  const updateConfig = (updates: Partial<JoinedTableConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  // Debounced search functionality
  const debouncedSearch = useCallback(
    (() => {
      let timeout: NodeJS.Timeout;
      return (searchValue: string) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          filterData(searchValue);
        }, 500);
      };
    })(),
    [tableSamples, joinPreview]
  );

  const filterData = (searchValue: string) => {
    if (!searchValue.trim()) {
      setFilteredTableSamples(tableSamples);
      setFilteredJoinPreview(joinPreview);
      return;
    }

    const searchLower = searchValue.toLowerCase();

    // Filter table samples
    const filteredSamples: Record<string, any> = {};
    Object.keys(tableSamples).forEach(tableName => {
      const tableData = tableSamples[tableName];
      if (tableData) {
        const filteredRows = tableData.rows.filter((row: any[]) =>
          row.some(cell =>
            String(cell || '').toLowerCase().includes(searchLower)
          )
        );
        filteredSamples[tableName] = {
          ...tableData,
          rows: filteredRows,
          totalCount: filteredRows.length
        };
      }
    });

    // Filter join preview
    let filteredPreview = null;
    if (joinPreview) {
      const filteredRows = joinPreview.rows.filter((row: any[]) =>
        row.some((cell: any) =>
          String(cell || '').toLowerCase().includes(searchLower)
        )
      );
      filteredPreview = {
        ...joinPreview,
        rows: filteredRows,
        totalCount: filteredRows.length
      };
    }

    setFilteredTableSamples(filteredSamples);
    setFilteredJoinPreview(filteredPreview);
  };

  // Handle search term changes
  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  // Initialize filtered data when original data changes
  useEffect(() => {
    filterData(searchTerm);
  }, [tableSamples, joinPreview]);

  const loadSampleData = async (tableName: string, limit: number = previewRecordCount) => {
    if (!tableName) return;
    
    try {
      const response = await fetch("/api/import/table-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionConfig,
          tableName,
          limit
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTableSamples(prev => ({ ...prev, [tableName]: data }));
      }
    } catch (error) {
      console.error('Failed to load sample data:', error);
    }
  };

  const generateJoinPreview = async () => {
    if (!config.primaryTable || config.joinedTables.length === 0) return;
    
    setLoadingSamples(true);
    try {
      // First load individual table samples for display
      await Promise.all([
        loadSampleData(config.primaryTable, previewRecordCount),
        ...config.joinedTables.map(jt => loadSampleData(jt.tableName, previewRecordCount))
      ]);
      
      // Now execute the actual join query via API
      const response = await fetch("/api/import/join-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionConfig,
          primaryTable: config.primaryTable,
          joinedTables: config.joinedTables.map(jt => ({
            tableName: jt.tableName,
            joinType: jt.joinType,
            joinConditions: jt.joinConditions,
            alias: jt.alias
          })),
          selectedFields: config.selectedFields,
          limit: previewRecordCount,
          search: searchTerm
        })
      });
      
      if (response.ok) {
        const joinResult = await response.json();
        setJoinPreview(joinResult);
      } else {
        console.error('Failed to load join preview:', response.statusText);
        // Fall back to client-side join if API fails
        const primaryData = tableSamples[config.primaryTable];
        if (primaryData) {
          const mockResult = generateMockJoinResult(primaryData, config);
          setJoinPreview(mockResult);
        }
      }
    } catch (error) {
      console.error('Error generating join preview:', error);
      // Fall back to client-side join on error
      const primaryData = tableSamples[config.primaryTable];
      if (primaryData) {
        const mockResult = generateMockJoinResult(primaryData, config);
        setJoinPreview(mockResult);
      }
    } finally {
      setLoadingSamples(false);
    }
  };

  const generateMockJoinResult = (primaryData: any, joinConfig: JoinedTableConfig) => {
    const joinedData = joinConfig.joinedTables.map(jt => tableSamples[jt.tableName]).filter(Boolean);
    
    // Build columns based on selected fields, or all columns if none selected
    let resultColumns: string[] = [];
    
    if (joinConfig.selectedFields.length === 0) {
      // Default behavior: include all columns
      resultColumns = [...primaryData.columns];
      
      // Add columns from joined tables
      joinConfig.joinedTables.forEach((jt, index) => {
        const jtData = joinedData[index];
        if (jtData) {
          jtData.columns.forEach((col: string) => {
            const alias = jt.alias ? `${jt.alias}.${col}` : `${jt.tableName}.${col}`;
            resultColumns.push(alias);
          });
        }
      });
    } else {
      // Use selected fields only
      joinConfig.selectedFields.forEach(field => {
        if (field.alias) {
          resultColumns.push(field.alias);
        } else if (field.tableName === joinConfig.primaryTable) {
          resultColumns.push(field.fieldName);
        } else {
          // Find the joined table to get alias
          const joinedTable = joinConfig.joinedTables.find(jt => jt.tableName === field.tableName);
          const tableAlias = joinedTable?.alias || field.tableName;
          resultColumns.push(`${tableAlias}.${field.fieldName}`);
        }
      });
    }
    
    // Simplified row generation for selected fields preview
    // Note: This is a simplified preview. The actual API join will handle field selection properly.
    let resultRows: any[][] = [];
    
    if (joinConfig.selectedFields.length === 0) {
      // Use existing complex join logic when no fields are selected (backward compatibility)
      resultRows = primaryData.rows.slice(0, Math.min(previewRecordCount, 5)).map((primaryRow: any[]) => {
        let fullRow = [...primaryRow];
        
        // Add data from joined tables (simplified)
        joinConfig.joinedTables.forEach((jt, index) => {
          const jtData = joinedData[index];
          if (jtData && jtData.rows.length > 0) {
            // Simple random matching for preview
            const randomRow = jtData.rows[Math.floor(Math.random() * jtData.rows.length)];
            fullRow = [...fullRow, ...randomRow];
          } else {
            // Add nulls for empty joined tables
            const nullRow = new Array(20).fill(null); // Assume max 20 columns
            fullRow = [...fullRow, ...nullRow];
          }
        });
        
        return fullRow;
      });
    } else {
      // Generate rows with only selected fields
      resultRows = primaryData.rows.slice(0, Math.min(previewRecordCount, 5)).map((primaryRow: any[]) => {
        const resultRow: any[] = [];
        
        joinConfig.selectedFields.forEach(field => {
          if (field.tableName === joinConfig.primaryTable) {
            // Get field from primary table
            const fieldIndex = primaryData.columns.indexOf(field.fieldName);
            resultRow.push(fieldIndex >= 0 ? primaryRow[fieldIndex] : null);
          } else {
            // Get field from joined table
            const joinedTableData = joinedData.find((_, index) => 
              joinConfig.joinedTables[index].tableName === field.tableName
            );
            
            if (joinedTableData && joinedTableData.rows.length > 0) {
              const fieldIndex = joinedTableData.columns.indexOf(field.fieldName);
              // For preview, use a random row from the joined table
              const randomRow = joinedTableData.rows[Math.floor(Math.random() * joinedTableData.rows.length)];
              resultRow.push(fieldIndex >= 0 ? randomRow[fieldIndex] : null);
            } else {
              resultRow.push(null);
            }
          }
        });
        
        return resultRow;
      });
    }
    
    return {
      columns: resultColumns,
      rows: resultRows,
      totalCount: resultRows.length
    };
  };

  // Load sample data when tables change
  useEffect(() => {
    if (config.primaryTable) {
      loadSampleData(config.primaryTable);
    }
    config.joinedTables.forEach(jt => {
      if (jt.tableName) {
        loadSampleData(jt.tableName);
      }
    });
  }, [config.primaryTable, config.joinedTables]);

  const availableTables = sourceSchema.tables?.map(t => t.name) || [];
  const getTableFields = (tableName: string) => 
    sourceSchema.tables?.find(t => t.name === tableName)?.fields || [];

  const addJoinedTable = () => {
    updateConfig({
      joinedTables: [...config.joinedTables, {
        tableName: '',
        joinType: 'inner',
        joinConditions: [{
          id: `cond-${Date.now()}`,
          sourceField: '',
          targetField: '',
          operator: '='
        }]
      }]
    });
  };

  return (
    <div className="space-y-6">
      {/* Basic Configuration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Joined Table Name</Label>
          <Input
            value={config.name}
            onChange={(e) => updateConfig({ name: e.target.value })}
            placeholder="Enter name for joined table"
          />
        </div>
        <div>
          <Label>Primary Table</Label>
          <Select 
            value={config.primaryTable} 
            onValueChange={(value) => updateConfig({ primaryTable: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select primary table" />
            </SelectTrigger>
            <SelectContent>
              {availableTables.map((table) => (
                <SelectItem key={table} value={table}>
                  {table}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={config.description || ''}
          onChange={(e) => updateConfig({ description: e.target.value })}
          placeholder="Describe what this joined table represents"
        />
      </div>

      {/* Joined Tables */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">Tables to Join</Label>
          <Button onClick={addJoinedTable} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Table
          </Button>
        </div>

        {config.joinedTables.map((joinTable, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Table</Label>
                  <Select
                    value={joinTable.tableName}
                    onValueChange={(value) => {
                      const updated = [...config.joinedTables];
                      updated[index] = { ...joinTable, tableName: value };
                      updateConfig({ joinedTables: updated });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select table" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTables.filter(t => t !== config.primaryTable).map((table) => (
                        <SelectItem key={table} value={table}>
                          {table}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Join Type</Label>
                  <Select
                    value={joinTable.joinType}
                    onValueChange={(value) => {
                      const updated = [...config.joinedTables];
                      updated[index] = { ...joinTable, joinType: value as any };
                      updateConfig({ joinedTables: updated });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOIN_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="space-y-1">
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Join Type Explanation */}
                  {joinTable.joinType && (
                    <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                      <div className="font-medium mb-1">
                        {JOIN_TYPES.find(t => t.value === joinTable.joinType)?.label}
                      </div>
                      <div className="text-muted-foreground mb-1">
                        {JOIN_TYPES.find(t => t.value === joinTable.joinType)?.explanation}
                      </div>
                      <div className="text-blue-600">
                        <strong>When to use:</strong> {JOIN_TYPES.find(t => t.value === joinTable.joinType)?.useCase}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Alias (Optional)</Label>
                  <Input
                    value={joinTable.alias || ''}
                    onChange={(e) => {
                      const updated = [...config.joinedTables];
                      updated[index] = { ...joinTable, alias: e.target.value };
                      updateConfig({ joinedTables: updated });
                    }}
                    placeholder="Table alias"
                  />
                </div>
              </div>

              {/* Join Conditions for this table */}
              <div className="space-y-2">
                <Label className="text-xs">Join Conditions</Label>
                {joinTable.joinConditions.map((condition, condIndex) => (
                  <div key={condition.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <Select
                        value={condition.sourceField}
                        onValueChange={(value) => {
                          const updated = [...config.joinedTables];
                          updated[index].joinConditions[condIndex] = { ...condition, sourceField: value };
                          updateConfig({ joinedTables: updated });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Primary field" />
                        </SelectTrigger>
                        <SelectContent>
                          {getTableFields(config.primaryTable).map((field) => (
                            <SelectItem key={field.name} value={field.name}>
                              {field.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="col-span-2 text-center">
                      <span className="text-sm text-muted-foreground">=</span>
                    </div>
                    
                    <div className="col-span-4">
                      <Select
                        value={condition.targetField}
                        onValueChange={(value) => {
                          const updated = [...config.joinedTables];
                          updated[index].joinConditions[condIndex] = { ...condition, targetField: value };
                          updateConfig({ joinedTables: updated });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Join field" />
                        </SelectTrigger>
                        <SelectContent>
                          {joinTable.tableName && getTableFields(joinTable.tableName).map((field) => (
                            <SelectItem key={field.name} value={field.name}>
                              {field.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="col-span-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updated = [...config.joinedTables];
                          updated[index].joinConditions = updated[index].joinConditions.filter(
                            (_, ci) => ci !== condIndex
                          );
                          updateConfig({ joinedTables: updated });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Field Selection */}
      {config.primaryTable && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base">Select Fields to Include</Label>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Select all fields from all tables
                  const allFields: {tableName: string; fieldName: string; alias?: string}[] = [];
                  
                  // Add primary table fields
                  getTableFields(config.primaryTable).forEach(field => {
                    allFields.push({
                      tableName: config.primaryTable,
                      fieldName: field.name
                    });
                  });
                  
                  // Add joined table fields
                  config.joinedTables.forEach(jt => {
                    getTableFields(jt.tableName).forEach(field => {
                      allFields.push({
                        tableName: jt.tableName,
                        fieldName: field.name,
                        alias: jt.alias ? `${jt.alias}.${field.name}` : undefined
                      });
                    });
                  });
                  
                  updateConfig({ selectedFields: allFields });
                }}
              >
                Select All
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => updateConfig({ selectedFields: [] })}
              >
                Clear All
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Primary Table Fields */}
            <Collapsible defaultOpen={false}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      <Database className="h-4 w-4 text-primary" />
                      {config.primaryTable} (Primary)
                      <Badge variant="secondary" className="text-xs ml-auto">
                        {config.selectedFields.filter(sf => sf.tableName === config.primaryTable).length} / {getTableFields(config.primaryTable).length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-2 pt-0">
                {getTableFields(config.primaryTable).map(field => {
                  const isSelected = config.selectedFields.some(
                    sf => sf.tableName === config.primaryTable && sf.fieldName === field.name
                  );
                  
                  return (
                    <div key={field.name} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`${config.primaryTable}-${field.name}`}
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Add field
                            updateConfig({
                              selectedFields: [
                                ...config.selectedFields,
                                {
                                  tableName: config.primaryTable,
                                  fieldName: field.name
                                }
                              ]
                            });
                          } else {
                            // Remove field
                            updateConfig({
                              selectedFields: config.selectedFields.filter(
                                sf => !(sf.tableName === config.primaryTable && sf.fieldName === field.name)
                              )
                            });
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <label 
                        htmlFor={`${config.primaryTable}-${field.name}`}
                        className="text-sm flex-1 cursor-pointer flex items-center gap-2"
                      >
                        <span>{field.name}</span>
                        <span className="text-xs text-muted-foreground">({field.type})</span>
                        {field.isPrimaryKey && (
                          <Badge variant="secondary" className="text-xs">PK</Badge>
                        )}
                      </label>
                    </div>
                  );
                })}
              </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Joined Table Fields */}
            {config.joinedTables.map((jt, index) => (
              <Collapsible key={index} defaultOpen={false}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        <Database className="h-4 w-4 text-muted-foreground" />
                        {jt.tableName} {jt.alias && `(${jt.alias})`}
                        <Badge variant="outline" className="text-xs">{jt.joinType.toUpperCase()}</Badge>
                        <Badge variant="secondary" className="text-xs ml-auto">
                          {config.selectedFields.filter(sf => sf.tableName === jt.tableName).length} / {getTableFields(jt.tableName).length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-2 pt-0">
                      {getTableFields(jt.tableName).map(field => {
                        const isSelected = config.selectedFields.some(
                          sf => sf.tableName === jt.tableName && sf.fieldName === field.name
                        );
                        
                        return (
                          <div key={field.name} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`${jt.tableName}-${field.name}`}
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // Add field
                                  updateConfig({
                                    selectedFields: [
                                      ...config.selectedFields,
                                      {
                                        tableName: jt.tableName,
                                        fieldName: field.name,
                                        alias: jt.alias ? `${jt.alias}.${field.name}` : undefined
                                      }
                                    ]
                                  });
                                } else {
                                  // Remove field
                                  updateConfig({
                                    selectedFields: config.selectedFields.filter(
                                      sf => !(sf.tableName === jt.tableName && sf.fieldName === field.name)
                                    )
                                  });
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <label 
                              htmlFor={`${jt.tableName}-${field.name}`}
                              className="text-sm flex-1 cursor-pointer flex items-center gap-2"
                            >
                              <span>{field.name}</span>
                              <span className="text-xs text-muted-foreground">({field.type})</span>
                              {field.isPrimaryKey && (
                                <Badge variant="secondary" className="text-xs">PK</Badge>
                              )}
                              {jt.joinConditions.some(cond => cond.targetField === field.name) && (
                                <Badge variant="secondary" className="text-xs">JOIN KEY</Badge>
                              )}
                            </label>
                          </div>
                        );
                      })}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>

          {config.selectedFields.length === 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No Fields Selected</AlertTitle>
              <AlertDescription>
                Select the fields you want to include in the joined table output. 
                You can choose specific fields from each table to optimize performance and reduce data size.
              </AlertDescription>
            </Alert>
          )}

          {config.selectedFields.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <strong>{config.selectedFields.length}</strong> field(s) selected for output
            </div>
          )}
        </div>
      )}

      {/* Join Preview and Examples */}
      {config.primaryTable && config.joinedTables.length > 0 && (
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Join Preview</h4>
              <p className="text-sm text-muted-foreground">
                See how your join will work with real data from the datasource
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Preview records:</Label>
                <Select 
                  value={String(previewRecordCount)} 
                  onValueChange={(value) => {
                    setPreviewRecordCount(Number(value));
                    // Clear existing data to force reload
                    setTableSamples({});
                    setJoinPreview(null);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={generateJoinPreview}
                disabled={loadingSamples}
                size="sm"
              >
                {loadingSamples ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading...</>
                ) : (
                  <><Eye className="h-4 w-4 mr-2" />Preview Join</>
                )}
              </Button>
            </div>
          </div>

          {/* Join Explanation Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                Understanding Your Join
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p className="mb-2"><strong>Primary Table:</strong> {config.primaryTable}</p>
                <p className="mb-2"><strong>Joined Tables:</strong> {config.joinedTables.map(jt => jt.tableName).join(', ')}</p>
              </div>
              
              {config.joinedTables.map((jt, index) => {
                const joinType = JOIN_TYPES.find(t => t.value === jt.joinType);
                return (
                  <div key={index} className="border-l-2 border-blue-300 pl-3 text-sm">
                    <div className="font-medium">{joinType?.label} with {jt.tableName}</div>
                    <div className="text-muted-foreground mb-1">{joinType?.explanation}</div>
                    {jt.joinConditions.length > 0 && (
                      <div className="text-xs bg-white/50 rounded p-2">
                        <strong>Join Conditions:</strong> {jt.joinConditions.map(cond => 
                          `${config.primaryTable}.${cond.sourceField} = ${jt.tableName}.${cond.targetField}`
                        ).join(' AND ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Sample Data Preview */}
          {Object.keys(tableSamples).length > 0 && (
            <div className="space-y-4" style={{ maxWidth: '100%', overflow: 'hidden' }}>
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Sample Data from Source Tables</h4>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter data..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4" style={{ maxWidth: '100%' }}>
                {/* Primary Table Sample */}
                {(filteredTableSamples[config.primaryTable] || tableSamples[config.primaryTable]) && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Database className="h-4 w-4 text-primary" />
                        {config.primaryTable} (Primary)
                        <Badge variant="default" className="text-xs">Primary Table</Badge>
                        {searchTerm && (
                          <Badge variant="secondary" className="text-xs">
                            {(filteredTableSamples[config.primaryTable] || tableSamples[config.primaryTable])?.rows.length || 0} filtered
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto" style={{ maxWidth: '100%', width: '100%' }}>
                        <div style={{ minWidth: 'max-content', width: 'max-content' }}>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {(filteredTableSamples[config.primaryTable] || tableSamples[config.primaryTable]).columns.map((col: string, index: number) => (
                                  <TableHead key={index} className="text-xs whitespace-nowrap px-3" style={{ minWidth: '100px' }}>
                                    {col}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(filteredTableSamples[config.primaryTable] || tableSamples[config.primaryTable]).rows.slice(0, previewRecordCount).map((row: any[], rowIndex: number) => (
                                <TableRow key={rowIndex}>
                                  {row.map((cell: any, cellIndex: number) => (
                                    <TableCell key={cellIndex} className="text-xs px-3" style={{ minWidth: '100px' }}>
                                      <div className="max-w-[200px] truncate" title={String(cell || '')}>
                                        {cell === null ? <span className="text-muted-foreground italic">null</span> : String(cell)}
                                      </div>
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Joined Tables Samples */}
                {config.joinedTables.map((jt, index) => (
                  (filteredTableSamples[jt.tableName] || tableSamples[jt.tableName]) && (
                    <Card key={index}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Database className="h-4 w-4 text-muted-foreground" />
                          {jt.tableName} {jt.alias && `(${jt.alias})`}
                          <Badge variant="outline" className="text-xs">{jt.joinType.toUpperCase()} JOIN</Badge>
                          {searchTerm && (
                            <Badge variant="secondary" className="text-xs">
                              {(filteredTableSamples[jt.tableName] || tableSamples[jt.tableName])?.rows.length || 0} filtered
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto" style={{ maxWidth: '100%', width: '100%' }}>
                          <div style={{ minWidth: 'max-content', width: 'max-content' }}>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {(filteredTableSamples[jt.tableName] || tableSamples[jt.tableName]).columns.map((col: string, colIndex: number) => (
                                    <TableHead key={colIndex} className="text-xs whitespace-nowrap px-3" style={{ minWidth: '120px' }}>
                                      <div className="flex items-center gap-1">
                                        <span>{col}</span>
                                        {jt.joinConditions.some(cond => cond.targetField === col) && (
                                          <Badge variant="secondary" className="text-xs shrink-0">JOIN KEY</Badge>
                                        )}
                                      </div>
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(filteredTableSamples[jt.tableName] || tableSamples[jt.tableName]).rows.slice(0, previewRecordCount).map((row: any[], rowIndex: number) => (
                                  <TableRow key={rowIndex}>
                                    {row.map((cell: any, cellIndex: number) => (
                                      <TableCell key={cellIndex} className="text-xs px-3" style={{ minWidth: '120px' }}>
                                        <div className="max-w-[200px] truncate" title={String(cell || '')}>
                                          {cell === null ? <span className="text-muted-foreground italic">null</span> : String(cell)}
                                        </div>
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Join Result Preview */}
          {(filteredJoinPreview || joinPreview) && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GitMerge className="h-4 w-4 text-green-600" />
                  Join Result Preview
                  <Badge variant="secondary" className="text-xs">{(filteredJoinPreview || joinPreview).totalCount} sample records</Badge>
                  {searchTerm && (
                    <Badge variant="secondary" className="text-xs">filtered</Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  This shows how the joined data will look with your current configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto" style={{ maxWidth: '100%', width: '100%' }}>
                  <div style={{ minWidth: 'max-content', width: 'max-content' }}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {(filteredJoinPreview || joinPreview).columns.map((col: string, index: number) => (
                            <TableHead key={index} className="text-xs whitespace-nowrap px-3" style={{ minWidth: '120px' }}>
                              <div className="truncate" title={col}>
                                {col}
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(filteredJoinPreview || joinPreview).rows.map((row: any[], rowIndex: number) => (
                          <TableRow key={rowIndex}>
                            {row.map((cell: any, cellIndex: number) => (
                              <TableCell key={cellIndex} className="text-xs px-3" style={{ minWidth: '120px' }}>
                                <div className="max-w-[200px] truncate" title={String(cell || '')}>
                                  {cell === null ? <span className="text-muted-foreground italic">null</span> : String(cell)}
                                </div>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={() => onSave(config)}
          disabled={!config.name || !config.primaryTable}
        >
          Save Joined Table
        </Button>
      </div>
    </div>
  );
}