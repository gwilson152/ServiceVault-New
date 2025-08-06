"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Pause,
  Play,
  Info,
  FileText,
  Activity,
  TrendingUp,
  Users,
  Database,
  Loader2
} from "lucide-react";
import { ImportStatus, LogLevel } from "@prisma/client";

interface ImportExecution {
  id: string;
  configurationId: string;
  status: ImportStatus;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  executedBy: string;
  configuration: {
    name: string;
    description?: string;
    sourceType: string;
    targetEntity: string;
  };
  creator: {
    name: string;
    email: string;
  };
  _count: {
    logs: number;
  };
}

interface ImportLog {
  id: string;
  level: LogLevel;
  message: string;
  details?: string;
  recordIndex?: number;
  timestamp: string;
}

const STATUS_CONFIG = {
  [ImportStatus.PENDING]: {
    color: "bg-blue-100 text-blue-800",
    icon: <Clock className="h-4 w-4" />,
    label: "Pending"
  },
  [ImportStatus.RUNNING]: {
    color: "bg-orange-100 text-orange-800",
    icon: <Play className="h-4 w-4" />,
    label: "Running"
  },
  [ImportStatus.COMPLETED]: {
    color: "bg-green-100 text-green-800",
    icon: <CheckCircle className="h-4 w-4" />,
    label: "Completed"
  },
  [ImportStatus.FAILED]: {
    color: "bg-red-100 text-red-800",
    icon: <XCircle className="h-4 w-4" />,
    label: "Failed"
  },
  [ImportStatus.CANCELLED]: {
    color: "bg-gray-100 text-gray-800",
    icon: <Pause className="h-4 w-4" />,
    label: "Cancelled"
  }
};

const LOG_LEVEL_CONFIG = {
  [LogLevel.DEBUG]: {
    color: "text-gray-600",
    icon: <Info className="h-3 w-3" />,
    bgColor: "bg-gray-50"
  },
  [LogLevel.INFO]: {
    color: "text-blue-600",
    icon: <Info className="h-3 w-3" />,
    bgColor: "bg-blue-50"
  },
  [LogLevel.WARN]: {
    color: "text-yellow-600",
    icon: <AlertCircle className="h-3 w-3" />,
    bgColor: "bg-yellow-50"
  },
  [LogLevel.ERROR]: {
    color: "text-red-600",
    icon: <XCircle className="h-3 w-3" />,
    bgColor: "bg-red-50"
  }
};

export default function ImportExecutionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { canViewImports, loading: permissionsLoading } = usePermissions();

  const [execution, setExecution] = useState<ImportExecution | null>(null);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [logLevel, setLogLevel] = useState<string>("all");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && !permissionsLoading) {
      if (!canViewImports) {
        router.push("/import");
        return;
      }
      loadExecutionData();
    }
  }, [status, canViewImports, permissionsLoading, router, params.id]);

  useEffect(() => {
    if (autoRefresh && execution && execution.status === ImportStatus.RUNNING) {
      const interval = setInterval(() => {
        loadExecutionData(false);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, execution]);

  const loadExecutionData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const response = await fetch(`/api/import/executions/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setExecution(data.execution);
      } else if (response.status === 404) {
        router.push("/import");
      }
    } catch (error) {
      console.error("Failed to load execution data:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await fetch(`/api/import/executions/${params.id}/logs?level=${logLevel}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
      }
    } catch (error) {
      console.error("Failed to load logs:", error);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (execution) {
      loadLogs();
    }
  }, [execution, logLevel]);

  const handleCancelExecution = async () => {
    try {
      const response = await fetch(`/api/import/executions/${params.id}/cancel`, {
        method: "POST"
      });
      
      if (response.ok) {
        await loadExecutionData(false);
      }
    } catch (error) {
      console.error("Failed to cancel execution:", error);
    }
  };

  const downloadLogs = async () => {
    try {
      const response = await fetch(`/api/import/executions/${params.id}/logs/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `import-execution-${params.id}-logs.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to download logs:", error);
    }
  };

  const getProgressPercentage = () => {
    if (!execution || execution.totalRecords === 0) return 0;
    return Math.round((execution.processedRecords / execution.totalRecords) * 100);
  };

  const getSuccessRate = () => {
    if (!execution || execution.processedRecords === 0) return 0;
    return Math.round((execution.successfulRecords / execution.processedRecords) * 100);
  };

  const getEstimatedTimeRemaining = () => {
    if (!execution || execution.status !== ImportStatus.RUNNING || !execution.startedAt) {
      return null;
    }

    const startTime = new Date(execution.startedAt).getTime();
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;
    const processedRecords = execution.processedRecords;
    const remainingRecords = execution.totalRecords - processedRecords;

    if (processedRecords === 0) return null;

    const averageTimePerRecord = elapsedTime / processedRecords;
    const estimatedRemainingTime = averageTimePerRecord * remainingRecords;

    return Math.round(estimatedRemainingTime / 1000); // Convert to seconds
  };

  if (loading || permissionsLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Execution Not Found</h3>
          <p className="text-muted-foreground mb-4">
            The import execution you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => router.push("/import")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Import Management
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[execution.status];
  const progressPercentage = getProgressPercentage();
  const successRate = getSuccessRate();
  const estimatedTimeRemaining = getEstimatedTimeRemaining();

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/import")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Import Execution</h1>
              <p className="text-muted-foreground">
                {execution.configuration.name} → {execution.configuration.targetEntity}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {execution.status === ImportStatus.RUNNING && (
              <>
                <Button variant="outline" size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                  {autoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}
                </Button>
                <Button variant="destructive" size="sm" onClick={handleCancelExecution}>
                  <Pause className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => loadExecutionData()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={downloadLogs}>
              <Download className="h-4 w-4 mr-2" />
              Export Logs
            </Button>
          </div>
        </div>

        {/* Status Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-full flex items-center gap-2 ${statusConfig.color}`}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </div>
                <div className="text-sm text-muted-foreground">
                  Started {execution.startedAt ? formatDistanceToNow(new Date(execution.startedAt)) : formatDistanceToNow(new Date(execution.createdAt))} ago
                  {execution.completedAt && (
                    <>
                      {" • "}Completed {formatDistanceToNow(new Date(execution.completedAt))} ago
                    </>
                  )}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Executed by {execution.creator.name}
              </div>
            </div>
            
            {execution.status === ImportStatus.RUNNING && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress: {execution.processedRecords} / {execution.totalRecords} records</span>
                  <span>{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="w-full" />
                {estimatedTimeRemaining && (
                  <div className="text-xs text-muted-foreground">
                    Estimated time remaining: {Math.floor(estimatedTimeRemaining / 60)}m {estimatedTimeRemaining % 60}s
                  </div>
                )}
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{execution.totalRecords.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processed</CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{execution.processedRecords.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                {progressPercentage}% of total
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Successful</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{execution.successfulRecords.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                {successRate}% success rate
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{execution.failedRecords.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                {Math.round((execution.failedRecords / Math.max(execution.processedRecords, 1)) * 100)}% failure rate
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Execution Details */}
        <Tabs defaultValue="logs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="logs">Execution Logs ({execution._count.logs})</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Execution Logs</CardTitle>
                    <CardDescription>
                      Real-time logs from the import execution
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      value={logLevel} 
                      onChange={(e) => setLogLevel(e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="all">All Levels</option>
                      <option value="ERROR">Errors Only</option>
                      <option value="WARN">Warnings & Errors</option>
                      <option value="INFO">Info & Above</option>
                      <option value="DEBUG">Debug & Above</option>
                    </select>
                    {logsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No logs found for the selected level
                  </div>
                ) : (
                  <ScrollArea className="h-[500px] w-full">
                    <div className="space-y-2">
                      {logs.map((log) => {
                        const levelConfig = LOG_LEVEL_CONFIG[log.level];
                        return (
                          <div
                            key={log.id}
                            className={`p-3 rounded border ${levelConfig.bgColor}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className={`flex items-center gap-1 ${levelConfig.color}`}>
                                  {levelConfig.icon}
                                  <span className="text-xs font-medium">{log.level}</span>
                                </div>
                                {log.recordIndex !== null && (
                                  <Badge variant="outline" className="text-xs">
                                    Record #{log.recordIndex + 1}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(log.timestamp).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-sm">{log.message}</div>
                            {log.details && (
                              <details className="mt-2">
                                <summary className="text-xs text-muted-foreground cursor-pointer">
                                  Show details
                                </summary>
                                <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                  {typeof log.details === 'string' 
                                    ? log.details 
                                    : JSON.stringify(JSON.parse(log.details), null, 2)
                                  }
                                </pre>
                              </details>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="configuration">
            <Card>
              <CardHeader>
                <CardTitle>Configuration Details</CardTitle>
                <CardDescription>
                  Import configuration used for this execution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Configuration Name</Label>
                    <div className="text-sm">{execution.configuration.name}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Source Type</Label>
                    <div className="text-sm">{execution.configuration.sourceType}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Target Entity</Label>
                    <div className="text-sm">{execution.configuration.targetEntity}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Execution ID</Label>
                    <div className="text-sm font-mono">{execution.id}</div>
                  </div>
                </div>
                
                {execution.configuration.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <div className="text-sm">{execution.configuration.description}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Execution performance and timing information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{successRate}%</div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {execution.processedRecords > 0 && execution.startedAt && execution.completedAt
                          ? Math.round(execution.processedRecords / ((new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000))
                          : "—"
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">Records/Second</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {execution.startedAt && execution.completedAt
                          ? `${Math.round((new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000)}s`
                          : "—"
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">Total Duration</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}