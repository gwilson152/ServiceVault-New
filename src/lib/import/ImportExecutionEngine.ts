import { prisma } from '@/lib/prisma';
import { ConnectionManager } from './ConnectionManager';
import { 
  ConnectionConfig,
  FieldMapping,
  TransformRule,
  ValidationRule,
  ImportProgress,
  ImportResult,
  ImportError,
  ImportWarning,
  ProcessedRecord,
  ValidationResult,
  LogEntry
} from './types';
import { ImportStatus, LogLevel } from '@prisma/client';

export class ImportExecutionEngine {
  private executionId: string;
  private userId: string;
  private progressCallback?: (progress: ImportProgress) => void;
  private cancelled = false;

  constructor(executionId: string, userId: string, progressCallback?: (progress: ImportProgress) => void) {
    this.executionId = executionId;
    this.userId = userId;
    this.progressCallback = progressCallback;
  }

  async executeImport(
    connectionConfig: ConnectionConfig,
    fieldMappings: FieldMapping[],
    targetEntity: string,
    dryRun = false
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];
    let totalRecords = 0;
    let processedRecords = 0;
    let successfulRecords = 0;
    let failedRecords = 0;
    let skippedRecords = 0;

    try {
      // Update execution status to RUNNING
      await this.updateExecutionStatus(ImportStatus.RUNNING, { startedAt: new Date() });
      await this.logMessage(LogLevel.INFO, `Starting ${dryRun ? 'dry run' : 'import'} execution`);

      // Test connection and get schema
      const connectionTest = await ConnectionManager.testConnection(connectionConfig);
      if (!connectionTest.success || !connectionTest.schema) {
        throw new Error(`Connection failed: ${connectionTest.message}`);
      }

      // Get source data
      const sourceData = await this.getSourceData(connectionConfig);
      totalRecords = sourceData.length;

      await this.logMessage(LogLevel.INFO, `Found ${totalRecords} records to process`);
      await this.updateProgress(totalRecords, 0, 0, 0, errors, warnings);

      // Process each record
      for (let i = 0; i < sourceData.length && !this.cancelled; i++) {
        const record = sourceData[i];
        
        try {
          // Process the record
          const processedRecord = await this.processRecord(record, fieldMappings, i);
          processedRecords++;

          if (processedRecord.skip) {
            skippedRecords++;
            await this.logMessage(LogLevel.WARN, `Skipped record ${i + 1}`, { record: processedRecord.originalData });
          } else if (processedRecord.errors.length > 0) {
            failedRecords++;
            errors.push(...processedRecord.errors);
            await this.logMessage(LogLevel.ERROR, `Failed to process record ${i + 1}`, { 
              errors: processedRecord.errors,
              record: processedRecord.originalData 
            });
          } else {
            // Save the record (if not dry run)
            if (!dryRun) {
              await this.saveRecord(targetEntity, processedRecord.transformedData);
            }
            successfulRecords++;
            await this.logMessage(LogLevel.DEBUG, `Successfully processed record ${i + 1}`);
          }

          // Add warnings
          if (processedRecord.warnings.length > 0) {
            warnings.push(...processedRecord.warnings);
          }

          // Update progress every 10 records or on the last record
          if ((i + 1) % 10 === 0 || i === sourceData.length - 1) {
            await this.updateProgress(totalRecords, processedRecords, successfulRecords, failedRecords, errors, warnings);
          }

        } catch (recordError) {
          failedRecords++;
          const error: ImportError = {
            recordIndex: i,
            message: `Failed to process record: ${recordError instanceof Error ? recordError.message : 'Unknown error'}`,
            severity: 'error',
            details: recordError
          };
          errors.push(error);
          
          await this.logMessage(LogLevel.ERROR, `Error processing record ${i + 1}: ${error.message}`, { 
            error: recordError,
            record 
          });
        }
      }

      const duration = Date.now() - startTime;
      const finalStatus = this.cancelled ? ImportStatus.CANCELLED : 
                         errors.length > 0 ? ImportStatus.FAILED : ImportStatus.COMPLETED;

      // Update final execution status
      await this.updateExecutionStatus(finalStatus, {
        totalRecords,
        processedRecords,
        successfulRecords,
        failedRecords,
        completedAt: new Date()
      });

      await this.logMessage(LogLevel.INFO, 
        `${dryRun ? 'Dry run' : 'Import'} completed in ${duration}ms. ` +
        `Success: ${successfulRecords}, Failed: ${failedRecords}, Skipped: ${skippedRecords}`
      );

      return {
        executionId: this.executionId,
        status: finalStatus,
        totalRecords,
        successfulRecords,
        failedRecords,
        skippedRecords,
        duration,
        errors,
        warnings,
        summary: {
          dryRun,
          recordsPerSecond: totalRecords / (duration / 1000),
          averageProcessingTime: duration / totalRecords,
          errorRate: failedRecords / totalRecords,
          targetEntity
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.updateExecutionStatus(ImportStatus.FAILED, {
        totalRecords,
        processedRecords,
        successfulRecords,
        failedRecords,
        completedAt: new Date()
      });

      await this.logMessage(LogLevel.ERROR, `Import execution failed: ${errorMessage}`, { error });

      const fatalError: ImportError = {
        message: `Import execution failed: ${errorMessage}`,
        severity: 'error',
        details: error
      };

      return {
        executionId: this.executionId,
        status: ImportStatus.FAILED,
        totalRecords,
        successfulRecords,
        failedRecords,
        skippedRecords,
        duration,
        errors: [fatalError, ...errors],
        warnings,
        summary: {
          dryRun,
          fatalError: errorMessage,
          targetEntity
        }
      };
    }
  }

  cancel() {
    this.cancelled = true;
  }

  private async getSourceData(connectionConfig: ConnectionConfig): Promise<any[]> {
    // For database sources, we'll execute a simple SELECT query
    if (['DATABASE_MYSQL', 'DATABASE_POSTGRESQL', 'DATABASE_SQLITE'].includes(connectionConfig.type)) {
      // Get the first table from schema discovery
      const schema = await ConnectionManager.getSourceSchema(connectionConfig);
      if (!schema.tables || schema.tables.length === 0) {
        throw new Error('No tables found in source database');
      }

      const firstTable = schema.tables[0];
      const query = `SELECT * FROM ${firstTable.name}`;
      return await ConnectionManager.executeQuery(connectionConfig, query);
    }

    // For file sources, we'll parse the file
    if (connectionConfig.type === 'FILE_CSV') {
      const fs = await import('fs');
      const papaparse = await import('papaparse');
      const Papa = papaparse.default;
      
      if (!connectionConfig.filePath || !fs.default.existsSync(connectionConfig.filePath)) {
        throw new Error('CSV file not found');
      }

      const fileContent = fs.default.readFileSync(connectionConfig.filePath, 'utf-8');
      const parseResult = Papa.parse(fileContent, {
        header: connectionConfig.hasHeaders !== false,
        skipEmptyLines: true,
        delimiter: connectionConfig.delimiter || 'auto'
      });

      if (parseResult.errors.length > 0) {
        throw new Error(`CSV parsing errors: ${parseResult.errors.map((e: any) => e.message).join(', ')}`);
      }

      return parseResult.data;
    }

    if (connectionConfig.type === 'FILE_JSON') {
      const fs = await import('fs');
      
      if (!connectionConfig.filePath || !fs.default.existsSync(connectionConfig.filePath)) {
        throw new Error('JSON file not found');
      }

      const fileContent = fs.default.readFileSync(connectionConfig.filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      if (!Array.isArray(data)) {
        throw new Error('JSON file must contain an array of objects');
      }

      return data;
    }

    if (connectionConfig.type === 'FILE_EXCEL') {
      const fs = await import('fs');
      const xlsx = await import('xlsx');
      const XLSX = xlsx.default || xlsx;
      
      if (!connectionConfig.filePath || !fs.default.existsSync(connectionConfig.filePath)) {
        throw new Error('Excel file not found');
      }

      const workbook = XLSX.readFile(connectionConfig.filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      return XLSX.utils.sheet_to_json(worksheet);
    }

    if (connectionConfig.type === 'API_REST') {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...connectionConfig.headers
      };

      if (connectionConfig.authType === 'bearer' && connectionConfig.apiKey) {
        headers['Authorization'] = `Bearer ${connectionConfig.apiKey}`;
      } else if (connectionConfig.authType === 'api-key' && connectionConfig.apiKey) {
        headers['X-API-Key'] = connectionConfig.apiKey;
      }

      const response = await fetch(connectionConfig.apiUrl!, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [data];
    }

    throw new Error(`Unsupported source type: ${connectionConfig.type}`);
  }

  private async processRecord(
    record: any, 
    fieldMappings: FieldMapping[], 
    recordIndex: number
  ): Promise<ProcessedRecord> {
    const processedRecord: ProcessedRecord = {
      originalData: record,
      transformedData: {},
      validationResults: [],
      errors: [],
      warnings: [],
      skip: false
    };

    // Process each field mapping
    for (const mapping of fieldMappings) {
      try {
        let value = record[mapping.sourceField];

        // Apply default value if source is empty and default is specified
        if ((value === null || value === undefined || value === '') && mapping.defaultValue !== undefined) {
          value = mapping.defaultValue;
        }

        // Apply transformation if specified
        if (mapping.transform) {
          value = await this.applyTransform(value, mapping.transform, record);
        }

        // Apply validation if specified
        if (mapping.validation) {
          const validationResult = await this.validateValue(value, mapping.validation, mapping.targetField);
          processedRecord.validationResults.push(validationResult);

          if (!validationResult.valid) {
            if (mapping.required) {
              processedRecord.errors.push({
                recordIndex,
                field: mapping.targetField,
                message: validationResult.message || `Validation failed for field ${mapping.targetField}`,
                severity: 'error'
              });
            } else {
              processedRecord.warnings.push({
                recordIndex,
                field: mapping.targetField,
                message: validationResult.message || `Validation warning for field ${mapping.targetField}`
              });
            }
          }
        }

        // Check if required field is missing
        if (mapping.required && (value === null || value === undefined || value === '')) {
          processedRecord.errors.push({
            recordIndex,
            field: mapping.targetField,
            message: `Required field ${mapping.targetField} is missing or empty`,
            severity: 'error'
          });
        }

        // Set the transformed value
        processedRecord.transformedData[mapping.targetField] = value;

      } catch (fieldError) {
        processedRecord.errors.push({
          recordIndex,
          field: mapping.targetField,
          message: `Error processing field ${mapping.targetField}: ${fieldError instanceof Error ? fieldError.message : 'Unknown error'}`,
          severity: 'error',
          details: fieldError
        });
      }
    }

    return processedRecord;
  }

  private async applyTransform(value: any, transform: TransformRule, originalRecord: any): Promise<any> {
    switch (transform.type) {
      case 'static':
        return transform.value;

      case 'function':
        return await this.applyFunction(value, transform.function, transform.parameters);

      case 'lookup':
        if (transform.lookupTable && typeof transform.lookupTable === 'object') {
          return transform.lookupTable[String(value)] ?? transform.lookupDefault ?? value;
        }
        return value;

      case 'concatenate':
        if (transform.sourceFields) {
          const values = transform.sourceFields
            .map(field => originalRecord[field])
            .filter(v => v !== null && v !== undefined && v !== '');
          return values.join(transform.separator || ' ');
        }
        return value;

      case 'split':
        if (typeof value === 'string' && transform.splitDelimiter) {
          const parts = value.split(transform.splitDelimiter);
          const index = transform.splitIndex || 0;
          return parts[index] || '';
        }
        return value;

      case 'format':
        return this.formatValue(value, transform.format);

      default:
        return value;
    }
  }

  private async applyFunction(value: any, functionName?: string, parameters?: Record<string, any>): Promise<any> {
    if (!functionName) return value;

    switch (functionName.toLowerCase()) {
      case 'tolowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      
      case 'touppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      
      case 'parseint':
        return parseInt(String(value)) || 0;
      
      case 'parsefloat':
        return parseFloat(String(value)) || 0;
      
      case 'formatdate':
        if (value && !isNaN(Date.parse(value))) {
          return new Date(value).toISOString().split('T')[0];
        }
        return value;
      
      case 'formatcurrency':
        const num = parseFloat(String(value));
        return isNaN(num) ? value : `$${num.toFixed(2)}`;
      
      case 'slugify':
        return typeof value === 'string' 
          ? value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          : value;
      
      default:
        // For custom functions, you could implement a plugin system
        return value;
    }
  }

  private formatValue(value: any, format?: string): any {
    if (!format || value === null || value === undefined) return value;

    // Date formatting
    if (format.includes('YYYY') || format.includes('MM') || format.includes('DD')) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return format
          .replace('YYYY', date.getFullYear().toString())
          .replace('MM', (date.getMonth() + 1).toString().padStart(2, '0'))
          .replace('DD', date.getDate().toString().padStart(2, '0'));
      }
    }

    // Number formatting
    if (format.includes('0,0') || format.includes('$')) {
      const num = parseFloat(String(value));
      if (!isNaN(num)) {
        if (format.includes('$')) {
          return `$${num.toLocaleString()}`;
        }
        return num.toLocaleString();
      }
    }

    return value;
  }

  private async validateValue(
    value: any, 
    validationRules: ValidationRule[], 
    fieldName: string
  ): Promise<ValidationResult> {
    for (const rule of validationRules) {
      const result = await this.validateSingleRule(value, rule, fieldName);
      if (!result.valid) {
        return result;
      }
    }

    return { field: fieldName, valid: true, value };
  }

  private async validateSingleRule(
    value: any, 
    rule: ValidationRule, 
    fieldName: string
  ): Promise<ValidationResult> {
    switch (rule.type) {
      case 'required':
        const isEmpty = value === null || value === undefined || value === '';
        return {
          field: fieldName,
          valid: !isEmpty,
          message: isEmpty ? (rule.message || `${fieldName} is required`) : undefined,
          value
        };

      case 'minLength':
        const minLength = rule.value || 0;
        const tooShort = typeof value === 'string' && value.length < minLength;
        return {
          field: fieldName,
          valid: !tooShort,
          message: tooShort ? (rule.message || `${fieldName} must be at least ${minLength} characters`) : undefined,
          value
        };

      case 'maxLength':
        const maxLength = rule.value || Infinity;
        const tooLong = typeof value === 'string' && value.length > maxLength;
        return {
          field: fieldName,
          valid: !tooLong,
          message: tooLong ? (rule.message || `${fieldName} must be no more than ${maxLength} characters`) : undefined,
          value
        };

      case 'pattern':
        if (rule.pattern && typeof value === 'string') {
          const regex = new RegExp(rule.pattern);
          const matches = regex.test(value);
          return {
            field: fieldName,
            valid: matches,
            message: matches ? undefined : (rule.message || `${fieldName} format is invalid`),
            value
          };
        }
        return { field: fieldName, valid: true, value };

      case 'range':
        const num = parseFloat(String(value));
        if (!isNaN(num)) {
          const min = rule.min ?? -Infinity;
          const max = rule.max ?? Infinity;
          const inRange = num >= min && num <= max;
          return {
            field: fieldName,
            valid: inRange,
            message: inRange ? undefined : (rule.message || `${fieldName} must be between ${min} and ${max}`),
            value
          };
        }
        return { field: fieldName, valid: true, value };

      case 'enum':
        if (rule.enumValues) {
          const isValid = rule.enumValues.includes(value);
          return {
            field: fieldName,
            valid: isValid,
            message: isValid ? undefined : (rule.message || `${fieldName} must be one of: ${rule.enumValues.join(', ')}`),
            value
          };
        }
        return { field: fieldName, valid: true, value };

      case 'custom':
        // For custom validation, you could implement a plugin system
        return { field: fieldName, valid: true, value };

      default:
        return { field: fieldName, valid: true, value };
    }
  }

  private async saveRecord(targetEntity: string, data: Record<string, any>): Promise<void> {
    // This is where you would save to your actual target database
    // For now, we'll just validate that we can connect to the database
    
    switch (targetEntity.toLowerCase()) {
      case 'account':
        // Would implement actual account creation
        break;
      case 'user':
        // Would implement actual user creation
        break;
      case 'ticket':
        // Would implement actual ticket creation
        break;
      case 'timeentry':
        // Would implement actual time entry creation
        break;
      case 'billingrate':
        // Would implement actual billing rate creation
        break;
      default:
        throw new Error(`Unknown target entity: ${targetEntity}`);
    }
  }

  private async updateExecutionStatus(status: ImportStatus, updates: any = {}) {
    await prisma.importExecution.update({
      where: { id: this.executionId },
      data: { status, ...updates }
    });
  }

  private async updateProgress(
    totalRecords: number,
    processedRecords: number, 
    successfulRecords: number,
    failedRecords: number,
    errors: ImportError[],
    warnings: ImportWarning[]
  ) {
    await prisma.importExecution.update({
      where: { id: this.executionId },
      data: {
        totalRecords,
        processedRecords,
        successfulRecords,
        failedRecords
      }
    });

    if (this.progressCallback) {
      const progress: ImportProgress = {
        executionId: this.executionId,
        status: ImportStatus.RUNNING,
        totalRecords,
        processedRecords,
        successfulRecords,
        failedRecords,
        currentRecord: processedRecords + 1,
        estimatedTimeRemaining: this.calculateEstimatedTime(processedRecords, totalRecords),
        errors,
        warnings
      };
      this.progressCallback(progress);
    }
  }

  private calculateEstimatedTime(processed: number, total: number): number {
    if (processed === 0) return 0;
    const rate = processed / (Date.now() - (this.progressCallback as any)?.startTime || Date.now());
    return Math.round((total - processed) / rate);
  }

  private async logMessage(level: LogLevel, message: string, details?: any, recordIndex?: number) {
    await prisma.importExecutionLog.create({
      data: {
        executionId: this.executionId,
        level,
        message,
        details: details ? JSON.stringify(details) : null,
        recordIndex,
        timestamp: new Date()
      }
    });
  }
}