"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Info, Database, FileText, Globe, Key, Lock } from "lucide-react";
import { ImportSourceType } from "@prisma/client";
import { ConnectionConfig } from "@/lib/import/types";

interface SourceConfigEditorProps {
  sourceType: ImportSourceType;
  config: ConnectionConfig;
  onChange: (config: ConnectionConfig) => void;
}

export default function SourceConfigEditor({ sourceType, config, onChange }: SourceConfigEditorProps) {
  const updateConfig = (updates: Partial<ConnectionConfig>) => {
    onChange({ ...config, ...updates });
  };

  const renderDatabaseConfig = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="host">Host / Server *</Label>
          <Input
            id="host"
            placeholder="localhost or server IP"
            value={config.host || ""}
            onChange={(e) => updateConfig({ host: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="port">Port</Label>
          <Input
            id="port"
            type="number"
            placeholder={sourceType === ImportSourceType.DATABASE_MYSQL ? "3306" : "5432"}
            value={config.port || ""}
            onChange={(e) => updateConfig({ port: parseInt(e.target.value) || undefined })}
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="database">Database Name *</Label>
        <Input
          id="database"
          placeholder="Enter database name"
          value={config.database || ""}
          onChange={(e) => updateConfig({ database: e.target.value })}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="username">Username *</Label>
          <Input
            id="username"
            placeholder="Database username"
            value={config.username || ""}
            onChange={(e) => updateConfig({ username: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Database password"
            value={config.password || ""}
            onChange={(e) => updateConfig({ password: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={config.ssl || false}
          onCheckedChange={(checked) => updateConfig({ ssl: checked })}
        />
        <Label>Use SSL/TLS encryption</Label>
      </div>

      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          <div className="font-medium mb-1">Database Connection</div>
          Make sure your database server is accessible and the credentials are correct. 
          The user should have SELECT permissions on the tables you want to import.
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderSQLiteConfig = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="filePath">SQLite File Path *</Label>
        <Input
          id="filePath"
          placeholder="/path/to/database.sqlite or C:\path\to\database.db"
          value={config.filePath || ""}
          onChange={(e) => updateConfig({ filePath: e.target.value })}
        />
      </div>

      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <div className="font-medium mb-1">SQLite Database File</div>
          Provide the full path to your SQLite database file. The file must be accessible from the server.
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderFileConfig = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="filePath">File Path *</Label>
        <Input
          id="filePath"
          placeholder="/path/to/file or C:\path\to\file"
          value={config.filePath || ""}
          onChange={(e) => updateConfig({ filePath: e.target.value })}
        />
      </div>

      {sourceType === ImportSourceType.FILE_CSV && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">CSV Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.hasHeaders !== false}
                onCheckedChange={(checked) => updateConfig({ hasHeaders: checked })}
              />
              <Label>File has header row</Label>
            </div>

            <div>
              <Label>Field Delimiter</Label>
              <Select
                value={config.delimiter || "auto"}
                onValueChange={(value) => updateConfig({ delimiter: value === "auto" ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value=",">Comma (,)</SelectItem>
                  <SelectItem value=";">Semicolon (;)</SelectItem>
                  <SelectItem value="\t">Tab</SelectItem>
                  <SelectItem value="|">Pipe (|)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>File Encoding</Label>
              <Select
                value={config.encoding || "utf-8"}
                onValueChange={(value) => updateConfig({ encoding: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utf-8">UTF-8</SelectItem>
                  <SelectItem value="utf-16">UTF-16</SelectItem>
                  <SelectItem value="iso-8859-1">ISO-8859-1</SelectItem>
                  <SelectItem value="windows-1252">Windows-1252</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <div className="font-medium mb-1">File Import</div>
          Ensure the file is accessible from the server and is in the correct format. 
          Large files may take longer to process during import.
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderAPIConfig = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="apiUrl">API URL *</Label>
        <Input
          id="apiUrl"
          placeholder="https://api.example.com/data"
          value={config.apiUrl || ""}
          onChange={(e) => updateConfig({ apiUrl: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>HTTP Method</Label>
          <Select
            value={config.method || "GET"}
            onValueChange={(value) => updateConfig({ method: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label>Authentication Type</Label>
          <Select
            value={config.authType || "none"}
            onValueChange={(value: any) => updateConfig({ authType: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="bearer">Bearer Token</SelectItem>
              <SelectItem value="api-key">API Key (Header)</SelectItem>
              <SelectItem value="basic">Basic Auth</SelectItem>
              <SelectItem value="query-param">Query Parameter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {config.authType !== "none" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Key className="h-4 w-4" />
              Authentication Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="apiKey">
                {config.authType === 'bearer' ? 'Bearer Token' : 'API Key'} *
              </Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Your API key or token"
                value={config.apiKey || ""}
                onChange={(e) => updateConfig({ apiKey: e.target.value })}
              />
            </div>

            {config.authType === 'basic' && (
              <div>
                <Label htmlFor="apiPassword">Password (optional)</Label>
                <Input
                  id="apiPassword"
                  type="password"
                  placeholder="Leave empty for random password"
                  value={config.apiPassword || ""}
                  onChange={(e) => updateConfig({ apiPassword: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Uses API key as username. If no password provided, will use a random password.
                </p>
              </div>
            )}

            {config.authType === 'api-key' && (
              <div>
                <Label htmlFor="apiKeyHeader">Header Name (optional)</Label>
                <Input
                  id="apiKeyHeader"
                  placeholder="X-API-Key (default) or custom header name"
                  value={config.apiKeyHeader || ""}
                  onChange={(e) => updateConfig({ apiKeyHeader: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to use default "X-API-Key" header
                </p>
              </div>
            )}

            {config.authType === 'query-param' && (
              <div>
                <Label htmlFor="apiKeyParam">Parameter Name (optional)</Label>
                <Input
                  id="apiKeyParam"
                  placeholder="api_key (default)"
                  value={config.apiKeyParam || ""}
                  onChange={(e) => updateConfig({ apiKeyParam: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Query parameter name for the API key (e.g., api_key, token)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Advanced Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="limitParam">Limit Parameter (optional)</Label>
            <Input
              id="limitParam"
              placeholder="limit, count, per_page"
              value={config.limitParam || ""}
              onChange={(e) => updateConfig({ limitParam: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Query parameter name for limiting results during preview and testing
            </p>
          </div>

          <div>
            <Label htmlFor="customHeaders">Custom Headers (JSON, optional)</Label>
            <Textarea
              id="customHeaders"
              placeholder='{"Content-Type": "application/json", "User-Agent": "ImportBot"}'
              value={JSON.stringify(config.headers || {}, null, 2)}
              onChange={(e) => {
                try {
                  const headers = JSON.parse(e.target.value || "{}");
                  updateConfig({ headers });
                } catch (error) {
                  // Invalid JSON, don't update
                }
              }}
              rows={3}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Globe className="h-4 w-4" />
        <AlertDescription>
          <div className="font-medium mb-1">API Import</div>
          Ensure the API endpoint returns data in a consistent format. 
          The system can handle JSON responses with arrays of objects or nested data structures.
        </AlertDescription>
      </Alert>
    </div>
  );

  // Main render logic
  switch (sourceType) {
    case ImportSourceType.DATABASE_MYSQL:
    case ImportSourceType.DATABASE_POSTGRESQL:
      return renderDatabaseConfig();
    
    case ImportSourceType.DATABASE_SQLITE:
      return renderSQLiteConfig();
    
    case ImportSourceType.FILE_CSV:
    case ImportSourceType.FILE_EXCEL:
    case ImportSourceType.FILE_JSON:
      return renderFileConfig();
    
    case ImportSourceType.API_REST:
      return renderAPIConfig();
    
    default:
      return (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Configuration for {sourceType} is not yet implemented.
          </AlertDescription>
        </Alert>
      );
  }
}