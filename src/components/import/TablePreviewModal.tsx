"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Database,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  X,
  Settings
} from "lucide-react";
import { ConnectionConfig, SourceTable } from "@/lib/import/types";

interface TablePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  tableInfo?: SourceTable;
  connectionConfig: ConnectionConfig;
}

interface TableData {
  columns: string[];
  rows: any[][];
  totalCount: number;
}

export default function TablePreviewModal({
  isOpen,
  onClose,
  tableName,
  tableInfo,
  connectionConfig
}: TablePreviewModalProps) {
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState<TableData | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<{ column: string; startX: number; startWidth: number } | null>(null);

  const totalPages = Math.ceil((filteredData?.totalCount || 0) / pageSize);

  useEffect(() => {
    if (isOpen && tableName) {
      loadTableData();
    }
  }, [isOpen, tableName, currentPage, pageSize]);

  // Initialize visible columns and widths when data loads
  useEffect(() => {
    if (tableData?.columns) {
      const initialVisibility: Record<string, boolean> = {};
      const initialWidths: Record<string, number> = {};
      
      tableData.columns.forEach(column => {
        initialVisibility[column] = true;
        // Calculate initial width based on content
        const maxContentLength = Math.max(
          column.length,
          ...tableData.rows.slice(0, Math.min(10, tableData.rows.length)).map(row => {
            const cellIndex = tableData.columns.indexOf(column);
            const cellValue = row[cellIndex];
            return String(cellValue || '').length;
          })
        );
        initialWidths[column] = Math.min(Math.max(maxContentLength * 8 + 40, 120), 250);
      });
      
      setVisibleColumns(initialVisibility);
      setColumnWidths(initialWidths);
    }
  }, [tableData?.columns]);

  useEffect(() => {
    // Filter data when search term changes
    if (tableData && searchTerm) {
      const filtered = {
        columns: tableData.columns,
        rows: tableData.rows.filter(row =>
          row.some(cell => 
            String(cell || '').toLowerCase().includes(searchTerm.toLowerCase())
          )
        ),
        totalCount: tableData.rows.filter(row =>
          row.some(cell => 
            String(cell || '').toLowerCase().includes(searchTerm.toLowerCase())
          )
        ).length
      };
      setFilteredData(filtered);
    } else {
      setFilteredData(tableData);
    }
  }, [tableData, searchTerm]);

  const loadTableData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/import/table-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionConfig,
          tableName,
          page: currentPage,
          limit: pageSize
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTableData(data);
      } else {
        const error = await response.json();
        setError(error.message || "Failed to load table data");
      }
    } catch (error) {
      setError("Failed to load table data");
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const response = await fetch("/api/import/table-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionConfig,
          tableName,
          format: 'csv'
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tableName}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const formatCellValue = (value: any) => {
    if (value === null || value === undefined) return <span className="text-muted-foreground italic text-xs">null</span>;
    if (typeof value === 'boolean') return <Badge variant={value ? "default" : "secondary"} className="text-xs">{String(value)}</Badge>;
    if (typeof value === 'object') return <code className="text-xs bg-muted px-1 rounded">{JSON.stringify(value)}</code>;
    
    const stringValue = String(value);
    return <span className="text-xs">{stringValue}</span>;
  };

  const toggleColumnVisibility = (columnName: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnName]: !prev[columnName]
    }));
  };

  const getVisibleColumns = () => {
    return filteredData?.columns.filter(column => visibleColumns[column] !== false) || [];
  };

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length;
  const totalColumnCount = Object.keys(visibleColumns).length;

  // Mouse event handlers for column resizing
  const handleMouseDown = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    setResizing({
      column,
      startX: e.clientX,
      startWidth: columnWidths[column] || 150
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizing) return;
    
    const diff = e.clientX - resizing.startX;
    const newWidth = Math.max(80, Math.min(400, resizing.startWidth + diff));
    
    setColumnWidths(prev => ({
      ...prev,
      [resizing.column]: newWidth
    }));
  };

  const handleMouseUp = () => {
    setResizing(null);
  };

  // Global mouse events for resizing
  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [resizing]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] w-[95vw] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Table Preview: {tableName}
          </DialogTitle>
          <DialogDescription>
            {tableInfo && (
              <span className="flex items-center gap-4 text-sm">
                <span>{tableInfo.fields.length} columns</span>
                <span>•</span>
                <span>{tableInfo.recordCount?.toLocaleString() || 'Unknown'} records</span>
                {filteredData && searchTerm && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600">{filteredData.totalCount} filtered</span>
                  </>
                )}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search table data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              {searchTerm && (
                <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Popover open={columnSettingsOpen} onOpenChange={setColumnSettingsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Columns ({visibleColumnCount}/{totalColumnCount})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Show/Hide Columns</h4>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            const allVisible: Record<string, boolean> = {};
                            tableData?.columns.forEach(col => {
                              allVisible[col] = true;
                            });
                            setVisibleColumns(allVisible);
                          }}
                        >
                          All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            const noneVisible: Record<string, boolean> = {};
                            tableData?.columns.forEach(col => {
                              noneVisible[col] = false;
                            });
                            setVisibleColumns(noneVisible);
                          }}
                        >
                          None
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {tableData?.columns.map((column) => (
                        <div key={column} className="flex items-center space-x-2">
                          <Checkbox
                            id={`column-${column}`}
                            checked={visibleColumns[column] !== false}
                            onCheckedChange={() => toggleColumnVisibility(column)}
                          />
                          <label
                            htmlFor={`column-${column}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span>{column}</span>
                              {tableInfo?.fields.find(f => f.name === column)?.isPrimaryKey && (
                                <Badge variant="secondary" className="text-xs">PK</Badge>
                              )}
                            </div>
                          </label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleColumnVisibility(column)}
                          >
                            {visibleColumns[column] !== false ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <EyeOff className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      )) || []}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 rows</SelectItem>
                  <SelectItem value="50">50 rows</SelectItem>
                  <SelectItem value="100">100 rows</SelectItem>
                  <SelectItem value="200">200 rows</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={handleExportData}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Table Content */}
          <div className="border rounded-lg overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Loading table data...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12 text-destructive">
                <AlertCircle className="h-8 w-8 mr-2" />
                <span>{error}</span>
              </div>
            ) : filteredData ? (
              <div className="w-full overflow-auto" style={{ maxHeight: '400px' }}>
                <div style={{ minWidth: 'fit-content' }}>
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-16 min-w-16 sticky left-0 bg-background z-20 border-r">#</TableHead>
                        {getVisibleColumns().map((column, index) => {
                          const width = columnWidths[column] || 150;
                          
                          return (
                            <TableHead 
                              key={index} 
                              style={{ width: `${width}px`, minWidth: `${width}px` }}
                              className="border-r last:border-r-0 relative group"
                            >
                              <div className="flex items-center gap-2 pr-6">
                                <span className="font-medium truncate" title={column}>{column}</span>
                                {tableInfo?.fields.find(f => f.name === column)?.isPrimaryKey && (
                                  <Badge variant="secondary" className="text-xs flex-shrink-0">PK</Badge>
                                )}
                              </div>
                              {/* Resize handle */}
                              <div 
                                className="absolute right-0 top-0 w-2 h-full cursor-col-resize bg-transparent hover:bg-blue-200 opacity-0 group-hover:opacity-100 transition-opacity"
                                onMouseDown={(e) => handleMouseDown(e, column)}
                                title="Drag to resize column"
                              />
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.rows.slice(0, pageSize).map((row, rowIndex) => {
                        const visibleCells = getVisibleColumns().map(visibleColumn => {
                          const originalIndex = filteredData.columns.indexOf(visibleColumn);
                          return row[originalIndex];
                        });
                        
                        return (
                          <TableRow key={rowIndex}>
                            <TableCell className="font-mono text-xs text-muted-foreground sticky left-0 bg-background z-10 border-r w-16">
                              {((currentPage - 1) * pageSize) + rowIndex + 1}
                            </TableCell>
                            {visibleCells.map((cell, cellIndex) => {
                              const column = getVisibleColumns()[cellIndex];
                              const width = columnWidths[column] || 150;
                              
                              return (
                                <TableCell 
                                  key={cellIndex} 
                                  style={{ width: `${width}px`, minWidth: `${width}px` }}
                                  className="border-r last:border-r-0 p-2"
                                >
                                  <div className="truncate" title={String(cell || '')}>
                                    {formatCellValue(cell)}
                                  </div>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}
          </div>

          {/* Pagination */}
          {tableData && totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {Math.min((currentPage - 1) * pageSize + 1, tableData.totalCount)} to {Math.min(currentPage * pageSize, tableData.totalCount)} of {tableData.totalCount} rows
                {debouncedSearchTerm && <span className="text-blue-600 ml-1">(filtered)</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}