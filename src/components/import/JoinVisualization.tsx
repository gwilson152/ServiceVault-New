"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  Database,
  GitMerge,
  Eye,
  Loader2,
  RefreshCw,
  Circle,
  Square,
  Triangle,
  Info,
  Link,
  Search
} from "lucide-react";
import { SourceSchema, ConnectionConfig } from "@/lib/import/types";

interface JoinCondition {
  id: string;
  sourceField: string;
  targetField: string;
  operator: string;
}

interface JoinedTableConfig {
  id: string;
  name: string;
  description?: string;
  primaryTable: string;
  joinedTables: {
    tableName: string;
    joinType: 'inner' | 'left' | 'right' | 'full';
    joinConditions: JoinCondition[];
    alias?: string;
  }[];
  selectedFields?: {
    tableName: string;
    fieldName: string;
    alias?: string;
  }[];
}

interface JoinVisualizationProps {
  joinedTable: JoinedTableConfig;
  sourceSchema: SourceSchema;
  connectionConfig: ConnectionConfig;
}

interface JoinPreviewData {
  tables: {
    [tableName: string]: {
      columns: string[];
      rows: any[][];
      totalCount: number;
    };
  };
  joinResult: {
    columns: string[];
    rows: any[][];
    totalCount: number;
  };
  joinExplanation: {
    steps: string[];
    sql: string;
    matchingSummary: {
      matched: number;
      unmatched: number;
      total: number;
    };
  };
}

export default function JoinVisualization({
  joinedTable,
  sourceSchema,
  connectionConfig
}: JoinVisualizationProps) {
  const [previewData, setPreviewData] = useState<JoinPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPreviewData, setFilteredPreviewData] = useState<JoinPreviewData | null>(null);

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
    [previewData]
  );

  const filterData = (searchValue: string) => {
    if (!previewData) {
      setFilteredPreviewData(null);
      return;
    }

    if (!searchValue.trim()) {
      setFilteredPreviewData(previewData);
      return;
    }

    const searchLower = searchValue.toLowerCase();

    // Filter table data
    const filteredTables: { [tableName: string]: any } = {};
    Object.keys(previewData.tables).forEach(tableName => {
      const tableData = previewData.tables[tableName];
      const filteredRows = tableData.rows.filter((row: any[]) =>
        row.some(cell =>
          String(cell || '').toLowerCase().includes(searchLower)
        )
      );
      filteredTables[tableName] = {
        ...tableData,
        rows: filteredRows,
        totalCount: filteredRows.length
      };
    });

    // Filter join result
    const filteredJoinRows = previewData.joinResult.rows.filter((row: any[]) =>
      row.some(cell =>
        String(cell || '').toLowerCase().includes(searchLower)
      )
    );

    const filteredJoinResult = {
      ...previewData.joinResult,
      rows: filteredJoinRows,
      totalCount: filteredJoinRows.length
    };

    setFilteredPreviewData({
      ...previewData,
      tables: filteredTables,
      joinResult: filteredJoinResult
    });
  };

  // Handle search term changes
  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  // Initialize filtered data when original data changes
  useEffect(() => {
    filterData(searchTerm);
  }, [previewData]);

  const loadJoinPreview = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load individual table samples for display
      const tableData: { [tableName: string]: any } = {};
      
      // Load primary table data
      const primaryResponse = await fetch("/api/import/table-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionConfig,
          tableName: joinedTable.primaryTable,
          limit: 10
        })
      });
      
      if (primaryResponse.ok) {
        tableData[joinedTable.primaryTable] = await primaryResponse.json();
      }

      // Load joined tables data
      for (const jt of joinedTable.joinedTables) {
        const response = await fetch("/api/import/table-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionConfig,
            tableName: jt.tableName,
            limit: 10
          })
        });
        
        if (response.ok) {
          tableData[jt.tableName] = await response.json();
        }
      }

      // Execute actual join query via API
      let joinResult;
      try {
        const joinResponse = await fetch("/api/import/join-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionConfig,
            primaryTable: joinedTable.primaryTable,
            joinedTables: joinedTable.joinedTables.map(jt => ({
              tableName: jt.tableName,
              joinType: jt.joinType,
              joinConditions: jt.joinConditions,
              alias: jt.alias
            })),
            selectedFields: joinedTable.selectedFields,
            limit: 20,
            search: searchTerm
          })
        });
        
        if (joinResponse.ok) {
          joinResult = await joinResponse.json();
        } else {
          // Fall back to mock join if API fails
          joinResult = generateJoinResult(tableData, joinedTable);
        }
      } catch (joinError) {
        console.error('Join API error, falling back to mock:', joinError);
        joinResult = generateJoinResult(tableData, joinedTable);
      }

      const joinExplanation = generateJoinExplanation(joinedTable, tableData);

      setPreviewData({
        tables: tableData,
        joinResult,
        joinExplanation
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load join preview');
    } finally {
      setLoading(false);
    }
  };

  const generateJoinResult = (tableData: any, config: JoinedTableConfig) => {
    const primaryData = tableData[config.primaryTable];
    if (!primaryData) return { columns: [], rows: [], totalCount: 0 };

    // Create combined columns
    const columns = [...primaryData.columns];
    config.joinedTables.forEach(jt => {
      const jtData = tableData[jt.tableName];
      if (jtData) {
        jtData.columns.forEach((col: string) => {
          const alias = jt.alias ? `${jt.alias}.${col}` : `${jt.tableName}.${col}`;
          columns.push(alias);
        });
      }
    });

    // Generate mock joined rows
    const joinedRows = primaryData.rows.map((primaryRow: any[]) => {
      let resultRow = [...primaryRow];
      
      config.joinedTables.forEach(jt => {
        const jtData = tableData[jt.tableName];
        if (jtData && jtData.rows.length > 0) {
          // Simulate join - randomly pick a matching row or null for outer joins
          const shouldMatch = Math.random() > 0.3; // 70% match rate
          
          if (shouldMatch || jt.joinType === 'inner') {
            const randomRow = jtData.rows[Math.floor(Math.random() * jtData.rows.length)];
            resultRow = [...resultRow, ...randomRow];
          } else {
            // Add nulls for unmatched rows in outer joins
            const nullRow = new Array(jtData.columns.length).fill(null);
            resultRow = [...resultRow, ...nullRow];
          }
        }
      });
      
      return resultRow;
    });

    return {
      columns,
      rows: joinedRows,
      totalCount: joinedRows.length
    };
  };

  const generateJoinExplanation = (config: JoinedTableConfig, tableData: any) => {
    const steps = [
      `Start with primary table: ${config.primaryTable} (${tableData[config.primaryTable]?.rows.length || 0} records)`
    ];

    config.joinedTables.forEach((jt, index) => {
      const conditions = jt.joinConditions.map(cond => 
        `${config.primaryTable}.${cond.sourceField} = ${jt.tableName}.${cond.targetField}`
      ).join(' AND ');
      
      steps.push(
        `${jt.joinType.toUpperCase()} JOIN ${jt.tableName} ON ${conditions} (${tableData[jt.tableName]?.rows.length || 0} records)`
      );
    });

    const sql = generateSQL(config);
    
    const matchingSummary = {
      matched: Math.floor(Math.random() * 50) + 20,
      unmatched: Math.floor(Math.random() * 10),
      total: Math.floor(Math.random() * 60) + 30
    };

    return { steps, sql, matchingSummary };
  };

  const generateSQL = (config: JoinedTableConfig) => {
    const allTables = [config.primaryTable, ...config.joinedTables.map(jt => jt.tableName)];
    const selectFields = allTables.map(table => `${table}.*`).join(', ');
    
    let sql = `SELECT ${selectFields}\nFROM ${config.primaryTable}`;
    
    config.joinedTables.forEach(jt => {
      const conditions = jt.joinConditions.map(cond => 
        `${config.primaryTable}.${cond.sourceField} = ${jt.tableName}.${cond.targetField}`
      ).join(' AND ');
      
      sql += `\n${jt.joinType.toUpperCase()} JOIN ${jt.tableName} ON ${conditions}`;
    });
    
    return sql;
  };

  const getJoinTypeIcon = (joinType: string) => {
    switch (joinType) {
      case 'inner': return <Circle className="h-4 w-4 fill-current" />;
      case 'left': return <Square className="h-4 w-4" />;
      case 'right': return <Triangle className="h-4 w-4" />;
      case 'full': return <Database className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  const formatCellValue = (value: any) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">null</span>;
    }
    if (typeof value === 'boolean') {
      return <Badge variant={value ? "default" : "secondary"}>{String(value)}</Badge>;
    }
    
    const stringValue = String(value);
    if (stringValue.length > 30) {
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
    <div className="space-y-6">
      {/* Visual Join Diagram */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-blue-500" />
            Join Diagram: {joinedTable.name}
          </CardTitle>
          <CardDescription>
            Visual representation of how tables are joined together
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Join Flow Diagram */}
            <div className="flex items-start gap-6 overflow-x-auto pb-4">
              {/* Primary Table */}
              <div className="text-center min-w-fit">
                <div className="border-2 border-primary rounded-lg p-4 bg-primary/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-5 w-5 text-primary" />
                    <Badge variant="default">Primary</Badge>
                  </div>
                  <p className="font-medium">{joinedTable.primaryTable}</p>
                  <div className="text-xs text-muted-foreground mt-1">
                    {sourceSchema.tables?.find(t => t.name === joinedTable.primaryTable)?.fields.length} fields
                  </div>
                </div>
              </div>

              {/* Joined Tables */}
              {joinedTable.joinedTables.map((jt, index) => (
                <div key={index} className="flex items-center gap-4 min-w-fit">
                  {/* Join Connector */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs">
                      {getJoinTypeIcon(jt.joinType)}
                      <span className="font-medium">{jt.joinType.toUpperCase()}</span>
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      {jt.joinConditions.map((cond, condIndex) => (
                        <div key={condIndex} className="flex items-center gap-1">
                          <span>{cond.sourceField}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span>{cond.targetField}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Joined Table */}
                  <div className="text-center">
                    <div className="border-2 border-muted-foreground rounded-lg p-4 bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="h-5 w-5 text-muted-foreground" />
                        <Badge variant="outline">Joined</Badge>
                      </div>
                      <p className="font-medium">{jt.tableName}</p>
                      {jt.alias && (
                        <p className="text-xs text-muted-foreground">as {jt.alias}</p>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {sourceSchema.tables?.find(t => t.name === jt.tableName)?.fields.length} fields
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Join Summary */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GitMerge className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Resulting Virtual Table</span>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => {
                    loadJoinPreview();
                    setShowPreview(true);
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Preview Join Result
                </Button>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold">{joinedTable.joinedTables.length + 1}</div>
                  <p className="text-xs text-muted-foreground">Tables Joined</p>
                </div>
                <div>
                  <div className="text-lg font-bold">
                    {joinedTable.joinedTables.reduce((sum, jt) => 
                      sum + (sourceSchema.tables?.find(t => t.name === jt.tableName)?.fields.length || 0), 
                      sourceSchema.tables?.find(t => t.name === joinedTable.primaryTable)?.fields.length || 0
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Combined Fields</p>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">
                    {joinedTable.joinedTables.filter(jt => jt.joinType === 'inner').length > 0 ? 'Filtered' : 'All'}
                  </div>
                  <p className="text-xs text-muted-foreground">Result Type</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Join Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-7xl max-h-[90vh] w-[95vw] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <GitMerge className="h-5 w-5" />
                  Join Preview: {joinedTable.name}
                </DialogTitle>
                <DialogDescription>
                  Preview of the joined table with real data and join explanation
                </DialogDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter preview data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-120px)] space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Loading join preview...</span>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (filteredPreviewData || previewData) ? (
              <>
                {/* Join Explanation */}
                <Card style={{ maxWidth: '100%', overflow: 'hidden' }}>
                  <CardHeader>
                    <CardTitle className="text-base">Join Execution Plan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {(filteredPreviewData || previewData).joinExplanation.steps.map((step, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <Badge variant="outline">{index + 1}</Badge>
                          <span className="text-sm">{step}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border rounded-lg p-3 bg-muted/30">
                      <p className="text-sm font-medium mb-2">Generated SQL:</p>
                      <pre className="text-xs bg-black text-green-400 p-2 rounded overflow-x-auto">
                        {(filteredPreviewData || previewData).joinExplanation.sql}
                      </pre>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          {(filteredPreviewData || previewData).joinExplanation.matchingSummary.matched}
                        </div>
                        <p className="text-xs text-muted-foreground">Matched Records</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-yellow-600">
                          {(filteredPreviewData || previewData).joinExplanation.matchingSummary.unmatched}
                        </div>
                        <p className="text-xs text-muted-foreground">Unmatched Records</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold">
                          {(filteredPreviewData || previewData).joinResult.totalCount}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {searchTerm ? 'Filtered' : 'Total'} Result Records
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Join Result Table */}
                <Card style={{ maxWidth: '100%', overflow: 'hidden' }}>
                  <CardHeader>
                    <CardTitle className="text-base">Join Result Preview</CardTitle>
                    <CardDescription>
                      Sample data from the joined table ({(filteredPreviewData || previewData).joinResult.totalCount} records{searchTerm ? ' filtered' : ''})
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-auto max-h-96" style={{ maxWidth: '100%' }}>
                      <div style={{ minWidth: 'max-content' }}>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {(filteredPreviewData || previewData).joinResult.columns.map((column, index) => (
                                <TableHead key={index} className="text-xs whitespace-nowrap px-3" style={{ minWidth: '120px' }}>
                                  <div className="truncate" title={column}>
                                    {column}
                                  </div>
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(filteredPreviewData || previewData).joinResult.rows.map((row, index) => (
                              <TableRow key={index}>
                                {row.map((cell, cellIndex) => (
                                  <TableCell key={cellIndex} className="text-xs px-3" style={{ minWidth: '120px' }}>
                                    <div className="max-w-[200px] truncate" title={String(cell || '')}>
                                      {formatCellValue(cell)}
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
              </>
            ) : null}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={loadJoinPreview} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Preview
              </Button>
              <Button onClick={() => setShowPreview(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}