"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDistanceToNow } from "date-fns";
import ImportLayout, { ImportStatusBadge, SourceTypeDisplay } from "@/components/import/ImportLayout";
import ImportWizard from "@/components/import/ImportWizard";
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
  Download,
  TrendingUp,
  Activity,
  BarChart3,
  Loader2
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
  const [showCreateWizard, setShowCreateWizard] = useState(false);

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
    setShowCreateWizard(true);
  };

  const handleWizardComplete = (configurationId: string) => {
    setShowCreateWizard(false);
    loadData(); // Refresh the data
    router.push(`/import/${configurationId}`);
  };

  const handleWizardCancel = () => {
    setShowCreateWizard(false);
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
      <ImportLayout
        title="Import Management"
        subtitle="Configure and manage data imports from various sources"
      >
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <div className="text-lg">Loading import data...</div>
        </div>
      </ImportLayout>
    );
  }

  if (showCreateWizard) {
    return (
      <ImportWizard
        mode="create"
        onComplete={handleWizardComplete}
        onCancel={handleWizardCancel}
      />
    );
  }

  return (
    <ImportLayout
      title="Import Management"
      subtitle="Configure and manage data imports from various sources"
      actions={
        canCreateImports ? (
          <Button onClick={handleCreateNew} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Import Configuration
          </Button>
        ) : undefined
      }
    >

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="configurations" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurations
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Dashboard Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Configurations</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{configurations.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {configurations.filter(c => c.isActive).length} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {configurations.reduce((sum, c) => sum + c._count.executions, 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all configurations
                </p>
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
                <p className="text-xs text-muted-foreground mt-1">
                  Currently processing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {recentExecutions.length > 0 
                    ? Math.round((recentExecutions.filter(e => e.status === ImportStatus.COMPLETED).length / recentExecutions.length) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Last {recentExecutions.length} executions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Source Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Source Type Distribution</CardTitle>
              <CardDescription>
                Overview of your configured import sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Object.values(ImportSourceType).map(sourceType => {
                  const count = configurations.filter(c => c.sourceType === sourceType).length;
                  if (count === 0) return null;
                  
                  return (
                    <div key={sourceType} className="flex items-center justify-between p-3 border rounded">
                      <SourceTypeDisplay sourceType={sourceType} />
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configurations" className="space-y-6">

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, description, or target entity..."
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Import Configurations ({filteredConfigurations.length})</CardTitle>
                  <CardDescription>
                    Manage your data import configurations and execute imports
                  </CardDescription>
                </div>
                {canCreateImports && filteredConfigurations.length > 0 && (
                  <Button onClick={handleCreateNew} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filteredConfigurations.length === 0 ? (
                <div className="text-center py-12">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No configurations found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || sourceTypeFilter !== "all" || statusFilter !== "all"
                      ? "No configurations match the current filters. Try adjusting your search criteria."
                      : "Get started by creating your first import configuration using the wizard."
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
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <SourceTypeDisplay sourceType={config.sourceType} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">{config.name}</h3>
                              <ImportStatusBadge 
                                isActive={config.isActive} 
                                executionCount={config._count.executions}
                              />
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {config.description || "No description provided"}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Target: {config.targetEntity}</span>
                              <span>•</span>
                              <span>{config._count.executions} runs</span>
                              <span>•</span>
                              <span>by {config.creator.name}</span>
                              <span>•</span>
                              <span>{formatDistanceToNow(new Date(config.createdAt))} ago</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewConfiguration(config.id)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canCreateImports && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditConfiguration(config.id)}
                                title="Edit configuration"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {config.isActive && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleExecuteImport(config.id)}
                                  className="ml-2"
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
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">

          <Card>
            <CardHeader>
              <CardTitle>Recent Import Activity</CardTitle>
              <CardDescription>
                Latest execution history and import activity across all configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentExecutions.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No execution history</h3>
                  <p className="text-muted-foreground mb-4">
                    Import execution history will appear here once you start running imports.
                  </p>
                  {canCreateImports && configurations.some(c => c.isActive) && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        You have {configurations.filter(c => c.isActive).length} active configuration(s) ready to run.
                      </p>
                      <Button onClick={() => {
                        const activeConfig = configurations.find(c => c.isActive);
                        if (activeConfig) handleExecuteImport(activeConfig.id);
                      }} disabled={!configurations.some(c => c.isActive)}>
                        <Play className="mr-2 h-4 w-4" />
                        Run Your First Import
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {recentExecutions.map((execution) => {
                    const successRate = execution.totalRecords > 0 
                      ? Math.round((execution.successfulRecords / execution.totalRecords) * 100)
                      : 0;
                    
                    return (
                      <div
                        key={execution.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {STATUS_ICONS[execution.status]}
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={STATUS_COLORS[execution.status]}>
                                  {execution.status}
                                </Badge>
                                <span className="text-sm font-medium">
                                  {execution.successfulRecords}/{execution.totalRecords} records
                                </span>
                                <span className="text-xs text-muted-foreground">({successRate}% success)</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <span>Started {formatDistanceToNow(new Date(execution.createdAt))} ago</span>
                                {execution.completedAt && (
                                  <span> • Completed {formatDistanceToNow(new Date(execution.completedAt))} ago</span>
                                )}
                              </div>
                              {execution.failedRecords > 0 && (
                                <div className="text-sm text-destructive mt-1">
                                  {execution.failedRecords} records failed
                                </div>
                              )}
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
                      </div>
                    );
                  })}
                  
                  {recentExecutions.length >= 10 && (
                    <div className="text-center pt-4 border-t">
                      <Button variant="outline" onClick={() => router.push("/import/executions")}>
                        View All Executions
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </ImportLayout>
  );
}