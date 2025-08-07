"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Database,
  FileText,
  Globe,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { ImportSourceType } from "@prisma/client";

const SOURCE_ICONS = {
  [ImportSourceType.DATABASE_MYSQL]: <Database className="h-4 w-4 text-blue-500" />,
  [ImportSourceType.DATABASE_POSTGRESQL]: <Database className="h-4 w-4 text-blue-600" />,
  [ImportSourceType.DATABASE_SQLITE]: <Database className="h-4 w-4 text-green-500" />,
  [ImportSourceType.FILE_CSV]: <FileText className="h-4 w-4 text-green-600" />,
  [ImportSourceType.FILE_EXCEL]: <FileText className="h-4 w-4 text-green-700" />,
  [ImportSourceType.FILE_JSON]: <FileText className="h-4 w-4 text-yellow-600" />,
  [ImportSourceType.API_REST]: <Globe className="h-4 w-4 text-purple-500" />,
};

const SOURCE_LABELS = {
  [ImportSourceType.DATABASE_MYSQL]: "MySQL Database",
  [ImportSourceType.DATABASE_POSTGRESQL]: "PostgreSQL Database", 
  [ImportSourceType.DATABASE_SQLITE]: "SQLite Database",
  [ImportSourceType.FILE_CSV]: "CSV File",
  [ImportSourceType.FILE_EXCEL]: "Excel File",
  [ImportSourceType.FILE_JSON]: "JSON File",
  [ImportSourceType.API_REST]: "REST API",
};

export interface ImportStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
}

interface ImportLayoutProps {
  title: string;
  subtitle?: string;
  sourceType?: ImportSourceType;
  backHref?: string;
  backLabel?: string;
  steps?: ImportStep[];
  actions?: ReactNode;
  children: ReactNode;
}

export default function ImportLayout({
  title,
  subtitle,
  sourceType,
  backHref = "/import",
  backLabel = "Back to Import Management",
  steps,
  actions,
  children
}: ImportLayoutProps) {
  const router = useRouter();

  const sourceIcon = sourceType ? SOURCE_ICONS[sourceType] : null;
  const sourceLabel = sourceType ? SOURCE_LABELS[sourceType] : null;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push(backHref)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {backLabel}
            </Button>
            <div className="flex items-center gap-3">
              {sourceIcon}
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                {subtitle && (
                  <p className="text-muted-foreground">{subtitle}</p>
                )}
                {sourceLabel && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {sourceLabel}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>

        {/* Progress Steps */}
        {steps && steps.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  {steps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
                    >
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                          step.completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : step.current
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-muted-foreground text-muted-foreground'
                        }`}
                      >
                        {step.completed ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : step.current ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      <div className="ml-3">
                        <div className={`text-sm font-medium ${
                          step.current ? 'text-primary' : step.completed ? 'text-green-600' : 'text-muted-foreground'
                        }`}>
                          {step.title}
                        </div>
                        <div className="text-xs text-muted-foreground">{step.description}</div>
                      </div>
                      {index < steps.length - 1 && (
                        <div className={`flex-1 h-px mx-4 ${
                          step.completed ? 'bg-green-500' : 'bg-muted'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                
                <Progress 
                  value={((steps.filter(s => s.completed).length + (steps.find(s => s.current) ? 0.5 : 0)) / steps.length) * 100} 
                  className="w-full" 
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ImportStatusBadge({ 
  isActive, 
  executionCount = 0, 
  hasErrors = false 
}: { 
  isActive: boolean; 
  executionCount?: number;
  hasErrors?: boolean;
}) {
  if (hasErrors) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Error
      </Badge>
    );
  }
  
  if (!isActive) {
    return <Badge variant="secondary">Inactive</Badge>;
  }
  
  if (executionCount > 0) {
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Active ({executionCount} runs)
      </Badge>
    );
  }
  
  return <Badge variant="outline">Active (Not Run)</Badge>;
}

export function SourceTypeDisplay({ sourceType }: { sourceType: ImportSourceType }) {
  const icon = SOURCE_ICONS[sourceType];
  const label = SOURCE_LABELS[sourceType];
  
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span>{label}</span>
    </div>
  );
}