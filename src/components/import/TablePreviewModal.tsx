"use client";

import { useState, useEffect } from "react";
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
  Database,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  AlertCircle,
  Eye,
  X
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

  const totalPages = Math.ceil((filteredData?.totalCount || 0) / pageSize);

  useEffect(() => {
    if (isOpen && tableName) {
      loadTableData();
    }
  }, [isOpen, tableName, currentPage, pageSize]);

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
    if (value === null || value === undefined) return <span className="text-muted-foreground italic">null</span>;
    if (typeof value === 'boolean') return <Badge variant={value ? "default" : "secondary"}>{String(value)}</Badge>;
    if (typeof value === 'object') return <code className="text-xs bg-muted px-1 rounded">{JSON.stringify(value)}</code>;
    
    const stringValue = String(value);
    if (stringValue.length > 100) {
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
      <DialogContent className="max-w-7xl max-h-[90vh] w-[90vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Table Preview: {tableName}
          </DialogTitle>
          <DialogDescription>
            {tableInfo && (
              <div className="flex items-center gap-4 text-sm">
                <span>{tableInfo.fields.length} columns</span>
                <span>•</span>
                <span>{tableInfo.recordCount?.toLocaleString() || 'Unknown'} records</span>
                {filteredData && searchTerm && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600">{filteredData.totalCount} filtered</span>
                  </>
                )}
              </div>
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
          <div className="border rounded-lg">
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
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {filteredData.columns.map((column, index) => (
                        <TableHead key={index} className="min-w-32">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{column}</span>
                            {tableInfo?.fields.find(f => f.name === column)?.isPrimaryKey && (
                              <Badge variant="secondary" className="text-xs">PK</Badge>
                            )}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.rows.slice(0, pageSize).map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {((currentPage - 1) * pageSize) + rowIndex + 1}
                        </TableCell>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex} className="max-w-xs">
                            {formatCellValue(cell)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : null}
          </div>

          {/* Pagination */}
          {filteredData && totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {Math.min((currentPage - 1) * pageSize + 1, filteredData.totalCount)} to {Math.min(currentPage * pageSize, filteredData.totalCount)} of {filteredData.totalCount} rows
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