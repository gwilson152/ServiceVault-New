"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  FileText,
  Globe,
  Settings,
  Eye,
  Edit,
  Trash2,
  Download
} from "lucide-react";
import { ImportSourceType, ImportStatus } from "@prisma/client";

interface ImportConfiguration {
  id: string;
  name: string;
  description?: string;
  sourceType: ImportSourceType;
  targetEntity: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    executions: number;
  };
}

interface ImportExecution {
  id: string;
  status: ImportStatus;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

const SOURCE_TYPE_ICONS = {
  [ImportSourceType.DATABASE_MYSQL]: <Database className="h-4 w-4" />,
  [ImportSourceType.DATABASE_POSTGRESQL]: <Database className="h-4 w-4" />,
  [ImportSourceType.DATABASE_SQLITE]: <Database className="h-4 w-4" />,
  [ImportSourceType.DATABASE_MONGODB]: <Database className="h-4 w-4" />,
  [ImportSourceType.FILE_CSV]: <FileText className="h-4 w-4" />,
  [ImportSourceType.FILE_EXCEL]: <FileText className="h-4 w-4" />,
  [ImportSourceType.FILE_JSON]: <FileText className="h-4 w-4" />,
  [ImportSourceType.API_REST]: <Globe className="h-4 w-4" />
};

const STATUS_COLORS = {
  [ImportStatus.PENDING]: "default",
  [ImportStatus.RUNNING]: "default",
  [ImportStatus.COMPLETED]: "default",
  [ImportStatus.FAILED]: "destructive",
  [ImportStatus.CANCELLED]: "secondary"
} as const;

const STATUS_ICONS = {
  [ImportStatus.PENDING]: <Clock className="h-3 w-3" />,
  [ImportStatus.RUNNING]: <Play className="h-3 w-3" />,
  [ImportStatus.COMPLETED]: <CheckCircle className="h-3 w-3" />,
  [ImportStatus.FAILED]: <XCircle className="h-3 w-3" />,
  [ImportStatus.CANCELLED]: <Pause className="h-3 w-3" />
};

export default function ImportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { canViewImports, canCreateImports, loading: permissionsLoading } = usePermissions();

  const [configurations, setConfigurations] = useState<ImportConfiguration[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<ImportExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && !permissionsLoading) {
      if (!canViewImports) {
        router.push("/dashboard");
        return;
      }
      loadData();
    }
  }, [status, canViewImports, permissionsLoading, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load configurations
      const configResponse = await fetch("/api/import/configurations");
      if (configResponse.ok) {
        const configData = await configResponse.json();
        setConfigurations(configData.configurations || []);
      }

      // Load recent executions
      const execResponse = await fetch("/api/import/executions?limit=10");
      if (execResponse.ok) {
        const execData = await execResponse.json();
        setRecentExecutions(execData.executions || []);
      }
    } catch (error) {
      console.error("Failed to load import data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    router.push("/import/new");
  };

  const handleViewConfiguration = (id: string) => {
    router.push(`/import/${id}`);
  };

  const handleEditConfiguration = (id: string) => {
    router.push(`/import/${id}/edit`);
  };

  const handleExecuteImport = async (id: string) => {
    try {
      const response = await fetch(`/api/import/configurations/${id}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ dryRun: false })
      });

      if (response.ok) {
        const result = await response.json();
        router.push(`/import/executions/${result.executionId}`);
      } else {
        const error = await response.json();
        alert(`Failed to start import: ${error.message}`);
      }
    } catch (error) {
      console.error("Failed to execute import:", error);
      alert("Failed to start import execution");
    }
  };

  const filteredConfigurations = configurations.filter(config => {
    const matchesSearch = config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         config.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         config.targetEntity.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSourceType = sourceTypeFilter === "all" || config.sourceType === sourceTypeFilter;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && config.isActive) ||
                         (statusFilter === "inactive" && !config.isActive);

    return matchesSearch && matchesSourceType && matchesStatus;
  });

  if (loading || permissionsLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="space-y-6">
          <div className="text-center py-12">
            <div className="text-lg">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Import Management</h1>
            <p className="text-muted-foreground">
              Configure and manage data imports from various sources
            </p>
          </div>
          {canCreateImports && (
            <Button onClick={handleCreateNew} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Import Configuration
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Configurations</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{configurations.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Configurations</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {configurations.filter(c => c.isActive).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
              <Play className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {configurations.reduce((sum, c) => sum + c._count.executions, 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Running Imports</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {recentExecutions.filter(e => e.status === ImportStatus.RUNNING).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Configurations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search configurations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={sourceTypeFilter} onValueChange={setSourceTypeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Source Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value={ImportSourceType.DATABASE_MYSQL}>MySQL</SelectItem>
                  <SelectItem value={ImportSourceType.DATABASE_POSTGRESQL}>PostgreSQL</SelectItem>
                  <SelectItem value={ImportSourceType.DATABASE_SQLITE}>SQLite</SelectItem>
                  <SelectItem value={ImportSourceType.FILE_CSV}>CSV File</SelectItem>
                  <SelectItem value={ImportSourceType.FILE_EXCEL}>Excel File</SelectItem>
                  <SelectItem value={ImportSourceType.FILE_JSON}>JSON File</SelectItem>
                  <SelectItem value={ImportSourceType.API_REST}>REST API</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Configurations List */}
        <Card>
          <CardHeader>
            <CardTitle>Import Configurations</CardTitle>
            <CardDescription>
              Manage your data import configurations and execute imports
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredConfigurations.length === 0 ? (
              <div className="text-center py-12">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No configurations found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || sourceTypeFilter !== "all" || statusFilter !== "all"
                    ? "No configurations match the current filters."
                    : "Get started by creating your first import configuration."
                  }
                </p>
                {canCreateImports && (
                  <Button onClick={handleCreateNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Import Configuration
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredConfigurations.map((config) => (
                  <div
                    key={config.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {SOURCE_TYPE_ICONS[config.sourceType]}
                        <div>
                          <h3 className="font-semibold">{config.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {config.description || "No description"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={config.isActive ? "default" : "secondary"}>
                          {config.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">
                          {config.targetEntity}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        <span>Created {formatDistanceToNow(new Date(config.createdAt))} ago</span>
                        <span className="mx-2">•</span>
                        <span>{config._count.executions} executions</span>
                        <span className="mx-2">•</span>
                        <span>by {config.creator.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewConfiguration(config.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canCreateImports && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditConfiguration(config.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {config.isActive && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleExecuteImport(config.id)}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Execute
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Executions */}
        {recentExecutions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Executions</CardTitle>
              <CardDescription>
                Latest import execution activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentExecutions.slice(0, 5).map((execution) => (
                  <div
                    key={execution.id}
                    className="flex items-center justify-between border rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      {STATUS_ICONS[execution.status]}
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={STATUS_COLORS[execution.status]}>
                            {execution.status}
                          </Badge>
                          <span className="text-sm">
                            {execution.successfulRecords}/{execution.totalRecords} records
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Started {formatDistanceToNow(new Date(execution.createdAt))} ago
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/import/executions/${execution.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}