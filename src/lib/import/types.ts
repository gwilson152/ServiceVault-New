import { ImportSourceType, ImportStatus, LogLevel } from '@prisma/client';

// Connection Configuration Types
export interface ConnectionConfig {
  type: ImportSourceType;
  // Database connections
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  // File connections
  filePath?: string;
  hasHeaders?: boolean;
  delimiter?: string;
  encoding?: string;
  // API connections - Enhanced with flexible authentication
  apiUrl?: string;
  apiKey?: string;
  apiPassword?: string;           // For basic auth with API key
  apiKeyHeader?: string;          // Custom header name (e.g., X-FreeScout-API-Key)
  apiKeyParam?: string;           // Custom query parameter name (e.g., api_key)
  headers?: Record<string, string>;
  authType?: 'none' | 'bearer' | 'basic' | 'api-key' | 'query-param';
  method?: string;                // HTTP method (GET, POST, etc.)
  limitParam?: string;            // Query parameter for limiting results (e.g., limit, count)
  // MongoDB specific
  connectionString?: string;
}

// Schema Discovery Types
export interface SourceSchema {
  tables?: SourceTable[];
  collections?: SourceCollection[];
  endpoints?: SourceEndpoint[];
  fields?: SourceField[];
}

export interface SourceTable {
  name: string;
  schema?: string;
  fields: SourceField[];
  recordCount?: number;
}

export interface SourceCollection {
  name: string;
  fields: SourceField[];
  documentCount?: number;
}

export interface SourceEndpoint {
  path: string;
  method: string;
  description?: string;
  schema?: SourceField[];
}

export interface SourceField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'json' | 'binary';
  nullable?: boolean;
  maxLength?: number;
  defaultValue?: any;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  referencedTable?: string;
  referencedField?: string;
  enum?: string[];
  format?: string; // For date/time formats
}

// Field Mapping Types
export interface FieldMapping {
  id: string;
  sourceField: string;
  targetField: string;
  transform?: TransformRule;
  defaultValue?: any;
  required?: boolean;
  validation?: ValidationRule[];
}

export interface TransformRule {
  type: 'static' | 'function' | 'lookup' | 'concatenate' | 'split' | 'format';
  value?: any;
  function?: string;
  parameters?: Record<string, any>;
  lookupTable?: Record<string, any>;
  lookupDefault?: any;
  sourceFields?: string[];
  separator?: string;
  format?: string;
  splitDelimiter?: string;
  splitIndex?: number;
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'range' | 'enum' | 'custom';
  message?: string;
  value?: any;
  min?: number;
  max?: number;
  pattern?: string;
  enumValues?: any[];
  customFunction?: string;
}

// Relationship Mapping Types
export interface RelationshipMapping {
  id: string;
  targetRelation: string;
  sourceKey: string;
  targetKey: string;
  relationType: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  createIfNotExists?: boolean;
  lookupConfig?: LookupConfig;
  cascadeDelete?: boolean;
}

export interface LookupConfig {
  sourceField: string;
  targetEntity: string;
  targetField: string;
  createNew?: boolean;
  defaultValues?: Record<string, any>;
}

// Import Execution Types
export interface ImportProgress {
  executionId: string;
  status: ImportStatus;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  currentRecord?: number;
  estimatedTimeRemaining?: number;
  startTime?: Date;
  errors: ImportError[];
  warnings: ImportWarning[];
}

export interface ImportError {
  recordIndex?: number;
  field?: string;
  message: string;
  details?: any;
  severity: 'error' | 'warning';
  code?: string;
}

export interface ImportWarning {
  recordIndex?: number;
  field?: string;
  message: string;
  details?: any;
}

export interface ImportResult {
  executionId: string;
  status: ImportStatus;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  skippedRecords: number;
  duration: number; // milliseconds
  errors: ImportError[];
  warnings: ImportWarning[];
  summary: Record<string, any>;
}

// Connection Test Result
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: any;
  schema?: SourceSchema;
  connectionTime?: number;
  recordCount?: number;
}

// Target Entity Schema Types
export interface TargetEntity {
  name: string;
  description: string;
  fields: TargetField[];
  relationships: TargetRelationship[];
  constraints?: TargetConstraint[];
}

export interface TargetField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'json' | 'enum';
  required: boolean;
  unique?: boolean;
  description: string;
  enum?: string[];
  maxLength?: number;
  format?: string;
  validation?: ValidationRule[];
}

export interface TargetRelationship {
  name: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  target: string;
  description: string;
  required?: boolean;
  cascadeDelete?: boolean;
}

export interface TargetConstraint {
  type: 'unique' | 'check' | 'foreign-key';
  fields: string[];
  message?: string;
  condition?: string;
}

// Import Configuration Types
export interface ImportConfigurationData {
  name: string;
  description?: string;
  sourceType: ImportSourceType;
  connectionConfig: ConnectionConfig;
  targetEntity: string;
  fieldMappings: FieldMapping[];
  relationshipMappings: RelationshipMapping[];
  validationRules: ValidationRule[];
  transformRules: TransformRule[];
}

// Data Processing Types
export interface ProcessedRecord {
  originalData: Record<string, any>;
  transformedData: Record<string, any>;
  validationResults: ValidationResult[];
  errors: ImportError[];
  warnings: ImportWarning[];
  skip: boolean;
}

export interface ValidationResult {
  field: string;
  valid: boolean;
  message?: string;
  value?: any;
}

// Log Entry Type
export interface LogEntry {
  level: LogLevel;
  message: string;
  details?: any;
  recordIndex?: number;
  timestamp: Date;
}