"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Eye,
  Database,
  Target,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  Play,
  X,
  Download,
  RefreshCw,
  Info
} from "lucide-react";
import { ImportStageData, SourceSchema, ConnectionConfig } from "@/lib/import/types";

interface StagePreviewData {
  sourceData: {
    columns: string[];
    rows: any[][];
    totalCount: number;
  };
  transformedData: {
    columns: string[];
    rows: any[][];
    totalCount: number;
  };
  validationResults: {
    valid: number;
    warnings: number;
    errors: number;
    details: Array<{
      type: 'error' | 'warning' | 'info';
      field: string;
      message: string;
      count: number;
    }>;
  };
  executionStats: {
    estimatedDuration: number;
    recordsPerSecond: number;
    dataSize: string;
  };
}

interface StagePreviewProps {
  stage: ImportStageData;
  sourceSchema: SourceSchema;
  connectionConfig: ConnectionConfig;
  isOpen: boolean;
  onClose: () => void;
}

export default function StagePreview({
  stage,
  sourceSchema,
  connectionConfig,
  isOpen,
  onClose
}: StagePreviewProps) {
  const [previewData, setPreviewData] = useState<StagePreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'source' | 'transformed' | 'validation' | 'execution'>('source');

  useEffect(() => {
    if (isOpen && stage.sourceTable) {
      loadPreviewData();
    }
  }, [isOpen, stage.sourceTable]);

  const loadPreviewData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load source data
      const sourceResponse = await fetch("/api/import/table-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionConfig,
          tableName: stage.sourceTable,
          limit: 100
        })
      });

      if (!sourceResponse.ok) {
        throw new Error('Failed to load source data');
      }

      const sourceData = await sourceResponse.json();

      // Generate mock transformed data and validation results
      const transformedData = generateTransformedData(sourceData, stage);
      const validationResults = generateValidationResults(sourceData, stage);
      const executionStats = generateExecutionStats(sourceData, stage);

      setPreviewData({
        sourceData,
        transformedData,
        validationResults,
        executionStats
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load preview data');
    } finally {
      setLoading(false);
    }
  };

  const generateTransformedData = (sourceData: any, stage: ImportStageData) => {
    // Mock transformation based on target entity
    const targetColumns = getTargetEntityColumns(stage.targetEntity);
    
    // Map source data to target structure
    const transformedRows = sourceData.rows.map((row: any[]) => {
      return targetColumns.map((targetCol) => {
        // Simple field mapping simulation
        const sourceIndex = sourceData.columns.findIndex((col: string) => 
          col.toLowerCase().includes(targetCol.toLowerCase()) ||
          targetCol.toLowerCase().includes(col.toLowerCase())
        );
        
        if (sourceIndex >= 0) {
          return transformValue(row[sourceIndex], targetCol);
        }
        
        // Generate default values for unmapped fields
        return generateDefaultValue(targetCol);
      });
    });

    return {
      columns: targetColumns,
      rows: transformedRows,
      totalCount: sourceData.totalCount
    };
  };

  const generateValidationResults = (sourceData: any, stage: ImportStageData) => {
    const totalRecords = sourceData.rows.length;
    const validRecords = Math.floor(totalRecords * 0.85);
    const warningRecords = Math.floor(totalRecords * 0.12);
    const errorRecords = totalRecords - validRecords - warningRecords;

    const details = [
      {
        type: 'error' as const,
        field: 'email',
        message: 'Invalid email format',
        count: Math.floor(errorRecords * 0.6)
      },
      {
        type: 'error' as const,
        field: 'required_field',
        message: 'Required field is empty',
        count: Math.floor(errorRecords * 0.4)
      },
      {
        type: 'warning' as const,
        field: 'phone',
        message: 'Phone format inconsistent',
        count: Math.floor(warningRecords * 0.7)
      },
      {
        type: 'warning' as const,
        field: 'date',
        message: 'Date format will be converted',
        count: Math.floor(warningRecords * 0.3)
      }
    ].filter(detail => detail.count > 0);

    return {
      valid: validRecords,
      warnings: warningRecords,
      errors: errorRecords,
      details
    };
  };

  const generateExecutionStats = (sourceData: any, stage: ImportStageData) => {
    const recordCount = sourceData.totalCount;
    const recordsPerSecond = 150; // Estimated processing rate
    const estimatedDuration = Math.ceil(recordCount / recordsPerSecond);
    const averageRecordSize = 2; // KB
    const dataSize = `${((recordCount * averageRecordSize) / 1024).toFixed(2)} MB`;

    return {
      estimatedDuration,
      recordsPerSecond,
      dataSize
    };
  };

  const getTargetEntityColumns = (targetEntity: string): string[] => {
    const entityColumns = {
      Account: ['id', 'name', 'domain', 'isActive', 'parentAccountId', 'createdAt'],
      User: ['id', 'name', 'email', 'role', 'accountId', 'isActive', 'createdAt'],
      Ticket: ['id', 'title', 'description', 'status', 'priority', 'assignedToId', 'accountId', 'createdAt'],
      TimeEntry: ['id', 'description', 'startTime', 'duration', 'ticketId', 'userId', 'createdAt']
    };
    
    return entityColumns[targetEntity as keyof typeof entityColumns] || ['id', 'name', 'createdAt'];
  };

  const transformValue = (value: any, targetColumn: string): any => {
    if (value === null || value === undefined) return null;
    
    // Mock transformations based on target column
    if (targetColumn === 'id') {
      return `${targetColumn}_${Math.floor(Math.random() * 10000)}`;
    }
    if (targetColumn === 'isActive') {
      return Math.random() > 0.2; // 80% active
    }
    if (targetColumn.includes('At')) {
      return new Date().toISOString();
    }
    
    return String(value);
  };

  const generateDefaultValue = (column: string): any => {
    if (column === 'id') return `${column}_${Math.floor(Math.random() * 10000)}`;
    if (column === 'isActive') return true;
    if (column.includes('At')) return new Date().toISOString();
    if (column === 'status') return 'active';
    if (column === 'priority') return 'medium';
    return `default_${column}`;
  };

  const formatCellValue = (value: any) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">null</span>;
    }
    if (typeof value === 'boolean') {
      return <Badge variant={value ? "default" : "secondary"}>{String(value)}</Badge>;
    }
    if (typeof value === 'object') {
      return <code className="text-xs bg-muted px-1 rounded">{JSON.stringify(value)}</code>;
    }
    
    const stringValue = String(value);
    if (stringValue.length > 50) {
      return (
        <div className="max-w-xs">
          <div className="truncate" title={stringValue}>
            {stringValue}
          </div>
        </div>
      );
    }
    
    return stringValue;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] w-[90vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Stage Preview: {stage.name}
          </DialogTitle>
          <DialogDescription>
            Preview how your data will be processed in this import stage
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-muted p-1 rounded-lg">
            {[
              { id: 'source', label: 'Source Data', icon: Database },
              { id: 'transformed', label: 'Transformed Data', icon: Target },
              { id: 'validation', label: 'Validation Results', icon: CheckCircle },
              { id: 'execution', label: 'Execution Plan', icon: Play }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="min-h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Loading preview data...</span>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Preview Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : previewData ? (
              <>
                {/* Source Data Tab */}
                {activeTab === 'source' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-blue-500" />
                        Source Data: {stage.sourceTable}
                      </CardTitle>
                      <CardDescription>
                        Raw data from your source table ({previewData.sourceData.totalCount.toLocaleString()} total records)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-80">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {previewData.sourceData.columns.map((column) => (
                                <TableHead key={column} className="min-w-32">
                                  {column}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewData.sourceData.rows.map((row, index) => (
                              <TableRow key={index}>
                                {row.map((cell, cellIndex) => (
                                  <TableCell key={cellIndex}>
                                    {formatCellValue(cell)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {/* Transformed Data Tab */}
                {activeTab === 'transformed' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-green-500" />
                        Transformed Data: {stage.targetEntity}
                      </CardTitle>
                      <CardDescription>
                        Data after transformation and mapping to target entity structure
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-80">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {previewData.transformedData.columns.map((column) => (
                                <TableHead key={column} className="min-w-32">
                                  {column}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewData.transformedData.rows.map((row, index) => (
                              <TableRow key={index}>
                                {row.map((cell, cellIndex) => (
                                  <TableCell key={cellIndex}>
                                    {formatCellValue(cell)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {/* Validation Results Tab */}
                {activeTab === 'validation' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {previewData.validationResults.valid}
                          </div>
                          <p className="text-sm text-muted-foreground">Valid Records</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-yellow-600">
                            {previewData.validationResults.warnings}
                          </div>
                          <p className="text-sm text-muted-foreground">Warnings</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {previewData.validationResults.errors}
                          </div>
                          <p className="text-sm text-muted-foreground">Errors</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Validation Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {previewData.validationResults.details.map((detail, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-2">
                                {detail.type === 'error' ? (
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                ) : detail.type === 'warning' ? (
                                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                                ) : (
                                  <Info className="h-4 w-4 text-blue-500" />
                                )}
                                <div>
                                  <p className="font-medium">{detail.message}</p>
                                  <p className="text-sm text-muted-foreground">Field: {detail.field}</p>
                                </div>
                              </div>
                              <Badge variant={detail.type === 'error' ? 'destructive' : 'secondary'}>
                                {detail.count} records
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Execution Plan Tab */}
                {activeTab === 'execution' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold">
                            {Math.floor(previewData.executionStats.estimatedDuration / 60)}:
                            {(previewData.executionStats.estimatedDuration % 60).toString().padStart(2, '0')}
                          </div>
                          <p className="text-sm text-muted-foreground">Estimated Duration</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold">
                            {previewData.executionStats.recordsPerSecond}
                          </div>
                          <p className="text-sm text-muted-foreground">Records/Second</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold">
                            {previewData.executionStats.dataSize}
                          </div>
                          <p className="text-sm text-muted-foreground">Data Size</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Execution Steps</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {[
                            { step: 1, name: 'Connect to Source', status: 'ready', description: 'Establish connection to source database' },
                            { step: 2, name: 'Extract Data', status: 'ready', description: `Extract ${previewData.sourceData.totalCount.toLocaleString()} records from ${stage.sourceTable}` },
                            { step: 3, name: 'Transform Data', status: 'ready', description: `Apply field mappings and convert to ${stage.targetEntity} format` },
                            { step: 4, name: 'Validate Data', status: 'ready', description: 'Run validation rules and check data integrity' },
                            { step: 5, name: 'Load Data', status: 'ready', description: `Import valid records into ${stage.targetEntity} table` }
                          ].map((step) => (
                            <div key={step.step} className="flex items-center gap-4 p-3 border rounded-lg">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                                {step.step}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{step.name}</p>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                              </div>
                              <Badge variant="outline">{step.status}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No preview data available
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={loadPreviewData} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}