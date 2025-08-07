"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import TablePreviewModal from "./TablePreviewModal";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Database,
  FileText,
  Globe,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  RefreshCw
} from "lucide-react";
import { ConnectionConfig, SourceTable, SourceSchema } from "@/lib/import/types";
import { ImportSourceType } from "@prisma/client";

interface SourceTableSelectorProps {
  connectionConfig: ConnectionConfig;
  sourceSchema?: SourceSchema | null;
  selectedTables: string[];
  onTableSelectionChange: (selectedTables: string[]) => void;
  onPreviewTable?: (tableName: string) => void;
}

interface TablePreview {
  tableName: string;
  data: any[];
  loading: boolean;
  error?: string;
}

const SOURCE_ICONS = {
  [ImportSourceType.DATABASE_MYSQL]: <Database className="h-4 w-4 text-blue-500" />,
  [ImportSourceType.DATABASE_POSTGRESQL]: <Database className="h-4 w-4 text-blue-600" />,
  [ImportSourceType.DATABASE_SQLITE]: <Database className="h-4 w-4 text-green-500" />,
  [ImportSourceType.FILE_CSV]: <FileText className="h-4 w-4 text-green-600" />,
  [ImportSourceType.FILE_EXCEL]: <FileText className="h-4 w-4 text-green-700" />,
  [ImportSourceType.FILE_JSON]: <FileText className="h-4 w-4 text-yellow-600" />,
  [ImportSourceType.API_REST]: <Globe className="h-4 w-4 text-purple-500" />,
};

export default function SourceTableSelector({
  connectionConfig,
  sourceSchema,
  selectedTables,
  onTableSelectionChange,
  onPreviewTable
}: SourceTableSelectorProps) {
  const [previews, setPreviews] = useState<Record<string, TablePreview>>({});
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    tableName: string;
    tableInfo?: SourceTable;
  }>({ isOpen: false, tableName: '' });
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const availableTables = sourceSchema?.tables || [];
  const sourceIcon = SOURCE_ICONS[connectionConfig.type];

  const handleTableToggle = (tableName: string) => {
    const newSelection = selectedTables.includes(tableName)
      ? selectedTables.filter(t => t !== tableName)
      : [...selectedTables, tableName];
    onTableSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedTables.length === availableTables.length) {
      onTableSelectionChange([]);
    } else {
      onTableSelectionChange(availableTables.map(t => t.name));
    }
  };

  const handlePreview = async (tableName: string) => {
    if (previews[tableName]?.data) {
      // Toggle preview visibility
      setExpandedTables(prev => {
        const newSet = new Set(prev);
        if (newSet.has(tableName)) {
          newSet.delete(tableName);
        } else {
          newSet.add(tableName);
        }
        return newSet;
      });
      return;
    }

    // Load preview data
    setPreviews(prev => ({
      ...prev,
      [tableName]: { tableName, data: [], loading: true }
    }));

    try {
      const response = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionConfig,
          tableName,
          limit: 5
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to load preview: ${response.statusText}`);
      }

      const result = await response.json();
      
      setPreviews(prev => ({
        ...prev,
        [tableName]: {
          tableName,
          data: result.preview || [],
          loading: false
        }
      }));

      setExpandedTables(prev => new Set([...prev, tableName]));

      if (onPreviewTable) {
        onPreviewTable(tableName);
      }
    } catch (error) {
      setPreviews(prev => ({
        ...prev,
        [tableName]: {
          tableName,
          data: [],
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load preview'
        }
      }));
    }
  };

  const getTableTypeLabel = (table: SourceTable): string => {
    switch (connectionConfig.type) {
      case ImportSourceType.FILE_EXCEL:
        return 'Sheet';
      case ImportSourceType.API_REST:
        return 'Endpoint';
      case ImportSourceType.FILE_CSV:
      case ImportSourceType.FILE_JSON:
        return 'File';
      default:
        return 'Table';
    }
  };

  const formatRecordCount = (count?: number): string => {
    if (count === undefined || count === null) return 'Unknown';
    return count.toLocaleString();
  };

  if (!availableTables.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {sourceIcon}
            Source Tables
          </CardTitle>
          <CardDescription>
            No tables found in the source. Please check your connection configuration.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {sourceIcon}
            <div>
              <CardTitle>Select Source {getTableTypeLabel({ name: '', fields: [] })}s</CardTitle>
              <CardDescription>
                Choose which {getTableTypeLabel({ name: '', fields: [] }).toLowerCase()}s to import from your source
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {selectedTables.length} of {availableTables.length} selected
            </Badge>
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedTables.length === availableTables.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {availableTables.map((table) => {
            const isSelected = selectedTables.includes(table.name);
            const isExpanded = expandedTables.has(table.name);
            const preview = previews[table.name];

            return (
              <div key={table.name} className={`border rounded-lg p-4 ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleTableToggle(table.name)}
                    />
                    <div>
                      <h4 className="font-medium">{table.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{table.fields.length} fields</span>
                        <span>{formatRecordCount(table.recordCount)} records</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreview(table.name)}
                      disabled={preview?.loading}
                    >
                      {preview?.loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isExpanded ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      {preview?.loading ? 'Loading...' : isExpanded ? 'Hide Preview' : 'Preview'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewModal({ 
                        isOpen: true, 
                        tableName: table.name, 
                        tableInfo: table 
                      })}
                      title="Open in fullscreen"
                    >
                      <Database className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Field Summary */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {table.fields.slice(0, 8).map((field) => (
                    <Badge key={field.name} variant="secondary" className="text-xs">
                      {field.name}
                      <span className="ml-1 text-muted-foreground">
                        ({field.type})
                      </span>
                    </Badge>
                  ))}
                  {table.fields.length > 8 && (
                    <Badge variant="outline" className="text-xs">
                      +{table.fields.length - 8} more
                    </Badge>
                  )}
                </div>

                {/* Preview Data */}
                {isExpanded && preview && (
                  <div className="mt-4">
                    <Separator className="mb-3" />
                    {preview.error ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{preview.error}</AlertDescription>
                      </Alert>
                    ) : (
                      <div>
                        <h5 className="text-sm font-medium mb-2">Sample Data (First 5 Records)</h5>
                        {preview.data.length > 0 ? (
                          <ScrollArea className="h-48 w-full border rounded">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {Object.keys(preview.data[0] || {}).map((key) => (
                                    <TableHead key={key} className="min-w-[100px]">
                                      {key}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {preview.data.map((row, index) => (
                                  <TableRow key={index}>
                                    {Object.values(row).map((value: any, cellIndex) => (
                                      <TableCell key={cellIndex} className="max-w-[200px] truncate">
                                        {value === null ? (
                                          <span className="text-muted-foreground italic">null</span>
                                        ) : value === undefined ? (
                                          <span className="text-muted-foreground italic">undefined</span>
                                        ) : (
                                          String(value)
                                        )}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No data available for preview
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
      
      <TablePreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, tableName: '' })}
        tableName={previewModal.tableName}
        tableInfo={previewModal.tableInfo}
        connectionConfig={connectionConfig}
      />
    </Card>
  );
}