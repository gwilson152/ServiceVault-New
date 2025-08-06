import fs from 'fs';
import path from 'path';
import { ConnectionConfig, ConnectionTestResult, SourceSchema, SourceTable, SourceField } from './types';
import { ImportSourceType } from '@prisma/client';

// Dynamic imports to avoid bundling issues on client side
const getMysql = async () => {
  const mysql = await import('mysql2/promise');
  return mysql.default;
};

const getPostgreSQL = async () => {
  const { Pool } = await import('pg');
  return { Pool };
};

const getSQLite = async () => {
  const sqlite3 = await import('sqlite3');
  const { open } = await import('sqlite');
  return { sqlite3: sqlite3.default, open };
};

const getPapa = async () => {
  const Papa = await import('papaparse');
  return Papa.default;
};

const getXLSX = async () => {
  const XLSX = await import('xlsx');
  return XLSX;
};

export class ConnectionManager {
  static async testConnection(config: ConnectionConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      switch (config.type) {
        case ImportSourceType.DATABASE_MYSQL:
          return await this.testMySQLConnection(config, startTime);
        case ImportSourceType.DATABASE_POSTGRESQL:
          return await this.testPostgreSQLConnection(config, startTime);
        case ImportSourceType.DATABASE_SQLITE:
          return await this.testSQLiteConnection(config, startTime);
        case ImportSourceType.FILE_CSV:
          return await this.testCSVFile(config, startTime);
        case ImportSourceType.FILE_EXCEL:
          return await this.testExcelFile(config, startTime);
        case ImportSourceType.FILE_JSON:
          return await this.testJSONFile(config, startTime);
        case ImportSourceType.API_REST:
          return await this.testRESTAPI(config, startTime);
        default:
          return {
            success: false,
            message: `Unsupported source type: ${config.type}`,
            connectionTime: Date.now() - startTime
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        connectionTime: Date.now() - startTime,
        details: error
      };
    }
  }

  static async getTablePreview(config: ConnectionConfig, tableName: string, limit: number = 10): Promise<any[]> {
    try {
      switch (config.type) {
        case ImportSourceType.DATABASE_MYSQL:
          return await this.executeMySQLQuery(config, `SELECT * FROM ${tableName} LIMIT ${limit}`);
        case ImportSourceType.DATABASE_POSTGRESQL:
          return await this.executePostgreSQLQuery(config, `SELECT * FROM "${tableName}" LIMIT ${limit}`);
        case ImportSourceType.DATABASE_SQLITE:
          return await this.executeSQLiteQuery(config, `SELECT * FROM "${tableName}" LIMIT ${limit}`);
        case ImportSourceType.FILE_CSV:
          return await this.getCSVPreview(config, limit);
        case ImportSourceType.FILE_EXCEL:
          return await this.getExcelSheetPreview(config, tableName, limit);
        case ImportSourceType.FILE_JSON:
          return await this.getJSONPreview(config, limit);
        case ImportSourceType.API_REST:
          return await this.getAPIPreview(config, limit);
        default:
          throw new Error(`Preview not supported for source type: ${config.type}`);
      }
    } catch (error) {
      throw new Error(`Failed to get table preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getSourceSchema(config: ConnectionConfig): Promise<SourceSchema> {
    switch (config.type) {
      case ImportSourceType.DATABASE_MYSQL:
        return await this.getMySQLSchema(config);
      case ImportSourceType.DATABASE_POSTGRESQL:
        return await this.getPostgreSQLSchema(config);
      case ImportSourceType.DATABASE_SQLITE:
        return await this.getSQLiteSchema(config);
      case ImportSourceType.FILE_CSV:
        return await this.getCSVSchema(config);
      case ImportSourceType.FILE_EXCEL:
        return await this.getExcelSchema(config);
      case ImportSourceType.FILE_JSON:
        return await this.getJSONSchema(config);
      case ImportSourceType.API_REST:
        return await this.getRESTAPISchema(config);
      default:
        throw new Error(`Unsupported source type: ${config.type}`);
    }
  }

  static async executeQuery(config: ConnectionConfig, query: string): Promise<any[]> {
    switch (config.type) {
      case ImportSourceType.DATABASE_MYSQL:
        return await this.executeMySQLQuery(config, query);
      case ImportSourceType.DATABASE_POSTGRESQL:
        return await this.executePostgreSQLQuery(config, query);
      case ImportSourceType.DATABASE_SQLITE:
        return await this.executeSQLiteQuery(config, query);
      default:
        throw new Error(`Query execution not supported for source type: ${config.type}`);
    }
  }

  // MySQL Implementation
  private static async testMySQLConnection(config: ConnectionConfig, startTime: number): Promise<ConnectionTestResult> {
    const mysql = await getMysql();
    const connection = await mysql.createConnection({
      host: config.host!,
      port: config.port || 3306,
      user: config.username!,
      password: config.password!,
      database: config.database!,
      ssl: config.ssl
    });

    try {
      const [rows] = await connection.execute('SELECT 1 as test');
      const schema = await this.getMySQLSchema(config);
      
      await connection.end();
      
      const tableCount = schema.tables?.length || 0;
      const recordCount = schema.tables?.reduce((sum, table) => sum + (table.recordCount || 0), 0) || 0;
      
      return {
        success: true,
        message: `MySQL connection successful. Found ${tableCount} tables with ${recordCount} total records.`,
        connectionTime: Date.now() - startTime,
        schema,
        recordCount
      };
    } catch (error) {
      await connection.end();
      throw error;
    }
  }

  private static async getMySQLSchema(config: ConnectionConfig): Promise<SourceSchema> {
    const mysql = await getMysql();
    const connection = await mysql.createConnection({
      host: config.host!,
      port: config.port || 3306,
      user: config.username!,
      password: config.password!,
      database: config.database!,
      ssl: config.ssl
    });

    try {
      // Get tables (excluding system/framework tables)
      const [tables] = await connection.execute(`
        SELECT TABLE_NAME, TABLE_ROWS, TABLE_COMMENT
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ? 
          AND TABLE_TYPE = 'BASE TABLE'
          AND TABLE_NAME NOT IN ('migrations', 'failed_jobs', 'password_resets', 'personal_access_tokens')
          AND TABLE_NAME NOT LIKE 'cache_%'
          AND TABLE_NAME NOT LIKE 'sessions_%'
        ORDER BY TABLE_NAME
      `, [config.database]);

      console.log(`Found ${(tables as any[]).length} tables in database:`, (tables as any[]).map(t => t.TABLE_NAME));
      
      const sourceTables: SourceTable[] = [];

      for (const table of tables as any[]) {
        // Get columns for each table
        const [columns] = await connection.execute(`
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            IS_NULLABLE,
            CHARACTER_MAXIMUM_LENGTH,
            COLUMN_DEFAULT,
            COLUMN_KEY,
            EXTRA
          FROM information_schema.COLUMNS 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION
        `, [config.database, table.TABLE_NAME]);

        const fields: SourceField[] = (columns as any[]).map(col => ({
          name: col.COLUMN_NAME,
          type: this.mapMySQLTypeToGeneric(col.DATA_TYPE),
          nullable: col.IS_NULLABLE === 'YES',
          maxLength: col.CHARACTER_MAXIMUM_LENGTH,
          defaultValue: col.COLUMN_DEFAULT,
          isPrimaryKey: col.COLUMN_KEY === 'PRI',
          isForeignKey: col.COLUMN_KEY === 'MUL'
        }));

        sourceTables.push({
          name: table.TABLE_NAME,
          fields,
          recordCount: table.TABLE_ROWS
        });
      }

      await connection.end();
      
      if (sourceTables.length === 0) {
        console.warn('No tables found after filtering. Check database name and permissions.');
        // Fallback: try to get all tables without filtering
        const fallbackConnection = await mysql.createConnection({
          host: config.host!,
          port: config.port || 3306,
          user: config.username!,
          password: config.password!,
          database: config.database!,
          ssl: config.ssl
        });
        
        try {
          const [allTables] = await fallbackConnection.execute(`
            SELECT TABLE_NAME, TABLE_ROWS 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
          `, [config.database]);
          
          console.log('Fallback: Found all tables:', (allTables as any[]).map(t => t.TABLE_NAME));
          
          // Return at least some tables for the user to see
          for (const table of (allTables as any[]).slice(0, 10)) { // Limit to first 10 tables
            const [columns] = await fallbackConnection.execute(`
              SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                CHARACTER_MAXIMUM_LENGTH,
                COLUMN_DEFAULT,
                COLUMN_KEY,
                EXTRA
              FROM information_schema.COLUMNS 
              WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
              ORDER BY ORDINAL_POSITION
            `, [config.database, table.TABLE_NAME]);

            const fields: SourceField[] = (columns as any[]).map(col => ({
              name: col.COLUMN_NAME,
              type: this.mapMySQLTypeToGeneric(col.DATA_TYPE),
              nullable: col.IS_NULLABLE === 'YES',
              maxLength: col.CHARACTER_MAXIMUM_LENGTH,
              defaultValue: col.COLUMN_DEFAULT,
              isPrimaryKey: col.COLUMN_KEY === 'PRI',
              isForeignKey: col.COLUMN_KEY === 'MUL'
            }));

            sourceTables.push({
              name: table.TABLE_NAME,
              fields,
              recordCount: table.TABLE_ROWS
            });
          }
        } finally {
          await fallbackConnection.end();
        }
      }
      
      return { tables: sourceTables };
    } catch (error) {
      await connection.end();
      throw error;
    }
  }

  private static async executeMySQLQuery(config: ConnectionConfig, query: string): Promise<any[]> {
    const mysql = await getMysql();
    const connection = await mysql.createConnection({
      host: config.host!,
      port: config.port || 3306,
      user: config.username!,
      password: config.password!,
      database: config.database!,
      ssl: config.ssl
    });

    try {
      const [rows] = await connection.execute(query);
      await connection.end();
      return rows as any[];
    } catch (error) {
      await connection.end();
      throw error;
    }
  }

  private static mapMySQLTypeToGeneric(mysqlType: string): SourceField['type'] {
    const type = mysqlType.toLowerCase();
    if (type.includes('int') || type.includes('decimal') || type.includes('float') || type.includes('double')) {
      return 'number';
    }
    if (type.includes('bool') || type.includes('bit')) {
      return 'boolean';
    }
    if (type.includes('date') && !type.includes('time')) {
      return 'date';
    }
    if (type.includes('timestamp') || type.includes('datetime')) {
      return 'datetime';
    }
    if (type.includes('json')) {
      return 'json';
    }
    if (type.includes('blob') || type.includes('binary')) {
      return 'binary';
    }
    return 'string';
  }

  // PostgreSQL Implementation
  private static async testPostgreSQLConnection(config: ConnectionConfig, startTime: number): Promise<ConnectionTestResult> {
    const { Pool } = await getPostgreSQL();
    const pool = new Pool({
      host: config.host!,
      port: config.port || 5432,
      user: config.username!,
      password: config.password!,
      database: config.database!,
      ssl: config.ssl
    });

    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      const schema = await this.getPostgreSQLSchema(config);
      await pool.end();
      
      const tableCount = schema.tables?.length || 0;
      const recordCount = schema.tables?.reduce((sum, table) => sum + (table.recordCount || 0), 0) || 0;
      
      return {
        success: true,
        message: `PostgreSQL connection successful. Found ${tableCount} tables with ${recordCount} total records.`,
        connectionTime: Date.now() - startTime,
        schema,
        recordCount
      };
    } catch (error) {
      await pool.end();
      throw error;
    }
  }

  private static async getPostgreSQLSchema(config: ConnectionConfig): Promise<SourceSchema> {
    const { Pool } = await getPostgreSQL();
    const pool = new Pool({
      host: config.host!,
      port: config.port || 5432,
      user: config.username!,
      password: config.password!,
      database: config.database!,
      ssl: config.ssl
    });

    try {
      const client = await pool.connect();

      // Get tables (excluding system/framework tables)
      const tablesResult = await client.query(`
        SELECT 
          t.table_name,
          COALESCE(c.reltuples, 0) as row_count,
          obj_description(c.oid, 'pg_class') as table_comment
        FROM information_schema.tables t
        LEFT JOIN pg_class c ON c.relname = t.table_name
        WHERE t.table_schema = 'public' 
          AND t.table_type = 'BASE TABLE'
          AND t.table_name NOT IN ('migrations', 'failed_jobs', 'password_resets', 'personal_access_tokens')
          AND t.table_name NOT LIKE 'cache_%'
          AND t.table_name NOT LIKE 'sessions_%'
        ORDER BY t.table_name
      `);

      console.log(`Found ${tablesResult.rows.length} tables in PostgreSQL database:`, tablesResult.rows.map(t => t.table_name));
      
      const sourceTables: SourceTable[] = [];

      for (const table of tablesResult.rows) {
        // Get columns for each table
        const columnsResult = await client.query(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            character_maximum_length,
            column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [table.table_name]);

        const fields: SourceField[] = columnsResult.rows.map(col => ({
          name: col.column_name,
          type: this.mapPostgreSQLTypeToGeneric(col.data_type),
          nullable: col.is_nullable === 'YES',
          maxLength: col.character_maximum_length,
          defaultValue: col.column_default
        }));

        sourceTables.push({
          name: table.table_name,
          fields,
          recordCount: parseInt(table.row_count) || 0
        });
      }

      client.release();
      await pool.end();
      
      return { tables: sourceTables };
    } catch (error) {
      await pool.end();
      throw error;
    }
  }

  private static async executePostgreSQLQuery(config: ConnectionConfig, query: string): Promise<any[]> {
    const { Pool } = await getPostgreSQL();
    const pool = new Pool({
      host: config.host!,
      port: config.port || 5432,
      user: config.username!,
      password: config.password!,
      database: config.database!,
      ssl: config.ssl
    });

    try {
      const client = await pool.connect();
      const result = await client.query(query);
      client.release();
      await pool.end();
      return result.rows;
    } catch (error) {
      await pool.end();
      throw error;
    }
  }

  private static mapPostgreSQLTypeToGeneric(pgType: string): SourceField['type'] {
    const type = pgType.toLowerCase();
    if (type.includes('int') || type.includes('serial') || type.includes('numeric') || type.includes('decimal') || type.includes('real') || type.includes('double')) {
      return 'number';
    }
    if (type.includes('bool')) {
      return 'boolean';
    }
    if (type === 'date') {
      return 'date';
    }
    if (type.includes('timestamp') || type.includes('time')) {
      return 'datetime';
    }
    if (type.includes('json')) {
      return 'json';
    }
    if (type.includes('bytea')) {
      return 'binary';
    }
    return 'string';
  }

  // SQLite Implementation
  private static async testSQLiteConnection(config: ConnectionConfig, startTime: number): Promise<ConnectionTestResult> {
    if (!config.filePath || !fs.existsSync(config.filePath)) {
      throw new Error('SQLite file path is required and must exist');
    }

    const { sqlite3, open } = await getSQLite();
    const db = await open({
      filename: config.filePath,
      driver: sqlite3.Database
    });

    try {
      await db.get('SELECT 1');
      const schema = await this.getSQLiteSchema(config);
      await db.close();
      
      return {
        success: true,
        message: 'SQLite connection successful',
        connectionTime: Date.now() - startTime,
        schema,
        recordCount: schema.tables?.reduce((sum, table) => sum + (table.recordCount || 0), 0)
      };
    } catch (error) {
      await db.close();
      throw error;
    }
  }

  private static async getSQLiteSchema(config: ConnectionConfig): Promise<SourceSchema> {
    const { sqlite3, open } = await getSQLite();
    const db = await open({
      filename: config.filePath!,
      driver: sqlite3.Database
    });

    try {
      // Get tables
      const tables = await db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);

      const sourceTables: SourceTable[] = [];

      for (const table of tables) {
        // Get table info
        const columns = await db.all(`PRAGMA table_info(${table.name})`);
        const countResult = await db.get(`SELECT COUNT(*) as count FROM ${table.name}`);

        const fields: SourceField[] = columns.map((col: any) => ({
          name: col.name,
          type: this.mapSQLiteTypeToGeneric(col.type),
          nullable: col.notnull === 0,
          defaultValue: col.dflt_value,
          isPrimaryKey: col.pk === 1
        }));

        sourceTables.push({
          name: table.name,
          fields,
          recordCount: countResult?.count || 0
        });
      }

      await db.close();
      return { tables: sourceTables };
    } catch (error) {
      await db.close();
      throw error;
    }
  }

  private static async executeSQLiteQuery(config: ConnectionConfig, query: string): Promise<any[]> {
    const { sqlite3, open } = await getSQLite();
    const db = await open({
      filename: config.filePath!,
      driver: sqlite3.Database
    });

    try {
      const rows = await db.all(query);
      await db.close();
      return rows;
    } catch (error) {
      await db.close();
      throw error;
    }
  }

  private static mapSQLiteTypeToGeneric(sqliteType: string): SourceField['type'] {
    const type = sqliteType.toLowerCase();
    if (type.includes('int') || type.includes('real') || type.includes('numeric') || type.includes('decimal')) {
      return 'number';
    }
    if (type.includes('bool')) {
      return 'boolean';
    }
    if (type.includes('date')) {
      return 'date';
    }
    if (type.includes('timestamp') || type.includes('datetime')) {
      return 'datetime';
    }
    if (type.includes('blob')) {
      return 'binary';
    }
    return 'string';
  }

  // CSV File Implementation
  private static async testCSVFile(config: ConnectionConfig, startTime: number): Promise<ConnectionTestResult> {
    if (!config.filePath || !fs.existsSync(config.filePath)) {
      throw new Error('CSV file path is required and must exist');
    }

    const Papa = await getPapa();
    const fileContent = fs.readFileSync(config.filePath, 'utf-8');
    const parseResult = Papa.parse(fileContent, {
      header: config.hasHeaders !== false,
      skipEmptyLines: true,
      delimiter: config.delimiter || 'auto'
    });

    if (parseResult.errors.length > 0) {
      throw new Error(`CSV parsing errors: ${parseResult.errors.map(e => e.message).join(', ')}`);
    }

    const schema = await this.getCSVSchema(config);
    
    return {
      success: true,
      message: 'CSV file read successfully',
      connectionTime: Date.now() - startTime,
      schema,
      recordCount: parseResult.data.length
    };
  }

  private static async getCSVSchema(config: ConnectionConfig): Promise<SourceSchema> {
    const Papa = await getPapa();
    const fileContent = fs.readFileSync(config.filePath!, 'utf-8');
    const parseResult = Papa.parse(fileContent, {
      header: config.hasHeaders !== false,
      skipEmptyLines: true,
      delimiter: config.delimiter || 'auto',
      preview: 100 // Preview first 100 rows to infer types
    });

    const fields: SourceField[] = [];
    
    if (config.hasHeaders !== false && parseResult.meta.fields) {
      // Infer types from data
      for (const fieldName of parseResult.meta.fields) {
        const sampleValues = parseResult.data
          .slice(0, 50)
          .map((row: any) => row[fieldName])
          .filter(val => val !== null && val !== undefined && val !== '');

        const inferredType = this.inferFieldType(sampleValues);
        
        fields.push({
          name: fieldName,
          type: inferredType,
          nullable: true
        });
      }
    } else {
      // Generate column names
      if (parseResult.data.length > 0) {
        const firstRow = parseResult.data[0] as any[];
        for (let i = 0; i < firstRow.length; i++) {
          fields.push({
            name: `Column${i + 1}`,
            type: 'string',
            nullable: true
          });
        }
      }
    }

    return {
      tables: [{
        name: path.basename(config.filePath!, path.extname(config.filePath!)),
        fields,
        recordCount: parseResult.data.length
      }]
    };
  }

  // Excel File Implementation
  private static async testExcelFile(config: ConnectionConfig, startTime: number): Promise<ConnectionTestResult> {
    if (!config.filePath || !fs.existsSync(config.filePath)) {
      throw new Error('Excel file path is required and must exist');
    }

    const XLSX = await getXLSX();
    const workbook = XLSX.readFile(config.filePath);
    if (!workbook.SheetNames.length) {
      throw new Error('Excel file contains no sheets');
    }

    const schema = await this.getExcelSchema(config);
    
    return {
      success: true,
      message: 'Excel file read successfully',
      connectionTime: Date.now() - startTime,
      schema,
      recordCount: schema.tables?.reduce((sum, table) => sum + (table.recordCount || 0), 0)
    };
  }

  private static async getExcelSchema(config: ConnectionConfig): Promise<SourceSchema> {
    const XLSX = await getXLSX();
    const workbook = XLSX.readFile(config.filePath!);
    const sourceTables: SourceTable[] = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) continue;

      const headers = (jsonData[0] as any[]) || [];
      const dataRows = jsonData.slice(config.hasHeaders !== false ? 1 : 0);

      const fields: SourceField[] = headers.map((header, index) => {
        const columnData = dataRows
          .map((row: any) => row[index])
          .filter(val => val !== null && val !== undefined && val !== '');

        return {
          name: String(header || `Column${index + 1}`),
          type: this.inferFieldType(columnData),
          nullable: true
        };
      });

      sourceTables.push({
        name: sheetName,
        fields,
        recordCount: dataRows.length
      });
    }

    return { tables: sourceTables };
  }

  // JSON File Implementation
  private static async testJSONFile(config: ConnectionConfig, startTime: number): Promise<ConnectionTestResult> {
    if (!config.filePath || !fs.existsSync(config.filePath)) {
      throw new Error('JSON file path is required and must exist');
    }

    const fileContent = fs.readFileSync(config.filePath, 'utf-8');
    let data;
    
    try {
      data = JSON.parse(fileContent);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }

    if (!Array.isArray(data)) {
      throw new Error('JSON file must contain an array of objects');
    }

    const schema = await this.getJSONSchema(config);
    
    return {
      success: true,
      message: 'JSON file read successfully',
      connectionTime: Date.now() - startTime,
      schema,
      recordCount: data.length
    };
  }

  private static async getJSONSchema(config: ConnectionConfig): Promise<SourceSchema> {
    const fileContent = fs.readFileSync(config.filePath!, 'utf-8');
    const data = JSON.parse(fileContent);

    if (!Array.isArray(data) || data.length === 0) {
      return { tables: [] };
    }

    // Analyze first few objects to determine schema
    const sampleObjects = data.slice(0, 100);
    const allFields = new Set<string>();
    
    sampleObjects.forEach(obj => {
      if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach(key => allFields.add(key));
      }
    });

    const fields: SourceField[] = Array.from(allFields).map(fieldName => {
      const sampleValues = sampleObjects
        .map(obj => obj[fieldName])
        .filter(val => val !== null && val !== undefined);

      return {
        name: fieldName,
        type: this.inferFieldType(sampleValues),
        nullable: true
      };
    });

    return {
      tables: [{
        name: path.basename(config.filePath!, path.extname(config.filePath!)),
        fields,
        recordCount: data.length
      }]
    };
  }

  // REST API Implementation
  private static async testRESTAPI(config: ConnectionConfig, startTime: number): Promise<ConnectionTestResult> {
    if (!config.apiUrl) {
      throw new Error('API URL is required');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers
    };

    if (config.authType === 'bearer' && config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    } else if (config.authType === 'api-key' && config.apiKey) {
      headers['X-API-Key'] = config.apiKey;
    }

    const response = await fetch(config.apiUrl, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const schema = this.inferAPISchema(data);
    
    return {
      success: true,
      message: 'API connection successful',
      connectionTime: Date.now() - startTime,
      schema,
      recordCount: Array.isArray(data) ? data.length : 1
    };
  }

  private static async getRESTAPISchema(config: ConnectionConfig): Promise<SourceSchema> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers
    };

    if (config.authType === 'bearer' && config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    } else if (config.authType === 'api-key' && config.apiKey) {
      headers['X-API-Key'] = config.apiKey;
    }

    const response = await fetch(config.apiUrl!, {
      method: 'GET',
      headers
    });

    const data = await response.json();
    return this.inferAPISchema(data);
  }

  private static inferAPISchema(data: any): SourceSchema {
    if (Array.isArray(data) && data.length > 0) {
      // Array of objects
      const sampleObjects = data.slice(0, 100);
      const allFields = new Set<string>();
      
      sampleObjects.forEach(obj => {
        if (typeof obj === 'object' && obj !== null) {
          Object.keys(obj).forEach(key => allFields.add(key));
        }
      });

      const fields: SourceField[] = Array.from(allFields).map(fieldName => {
        const sampleValues = sampleObjects
          .map(obj => obj[fieldName])
          .filter(val => val !== null && val !== undefined);

        return {
          name: fieldName,
          type: this.inferFieldType(sampleValues),
          nullable: true
        };
      });

      return {
        tables: [{
          name: 'api_data',
          fields,
          recordCount: data.length
        }]
      };
    } else if (typeof data === 'object' && data !== null) {
      // Single object
      const fields: SourceField[] = Object.keys(data).map(fieldName => ({
        name: fieldName,
        type: this.inferFieldType([data[fieldName]]),
        nullable: true
      }));

      return {
        tables: [{
          name: 'api_data',
          fields,
          recordCount: 1
        }]
      };
    }

    return { tables: [] };
  }

  // Type inference helper
  private static async getCSVPreview(config: ConnectionConfig, limit: number): Promise<any[]> {
    const Papa = await getPapa();
    const fileContent = fs.readFileSync(config.filePath!, 'utf-8');
    const parseResult = Papa.parse(fileContent, {
      header: config.hasHeaders !== false,
      skipEmptyLines: true,
      delimiter: config.delimiter || 'auto',
      preview: limit
    });
    return parseResult.data;
  }

  private static async getExcelSheetPreview(config: ConnectionConfig, sheetName: string, limit: number): Promise<any[]> {
    const XLSX = await getXLSX();
    const workbook = XLSX.readFile(config.filePath!);
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: config.hasHeaders !== false ? 1 : undefined,
      range: limit > 0 ? `A1:${String.fromCharCode(65 + Object.keys(worksheet).length)}${limit + (config.hasHeaders !== false ? 1 : 0)}` : undefined
    });
    return jsonData;
  }

  private static async getJSONPreview(config: ConnectionConfig, limit: number): Promise<any[]> {
    const fileContent = fs.readFileSync(config.filePath!, 'utf-8');
    const data = JSON.parse(fileContent);
    if (Array.isArray(data)) {
      return data.slice(0, limit);
    }
    return [data];
  }

  private static async getAPIPreview(config: ConnectionConfig, limit: number): Promise<any[]> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers
    };

    // Enhanced API authentication options
    if (config.authType === 'bearer' && config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    } else if (config.authType === 'api-key' && config.apiKey) {
      if (config.apiKeyHeader) {
        // Custom API key header (e.g., X-FreeScout-API-Key)
        headers[config.apiKeyHeader] = config.apiKey;
      } else {
        // Default X-API-Key header
        headers['X-API-Key'] = config.apiKey;
      }
    } else if (config.authType === 'basic' && config.apiKey) {
      // HTTP Basic auth with API key as username and optional password
      const password = config.apiPassword || 'randompassword';
      const credentials = Buffer.from(`${config.apiKey}:${password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    // Build URL with optional API key parameter
    let url = config.apiUrl!;
    if (config.authType === 'query-param' && config.apiKey) {
      const paramName = config.apiKeyParam || 'api_key';
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}${paramName}=${config.apiKey}`;
    }

    // Add limit parameter if API supports it
    if (config.limitParam) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}${config.limitParam}=${limit}`;
    }

    const response = await fetch(url, {
      method: config.method || 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Handle different API response formats
    if (Array.isArray(data)) {
      return data.slice(0, limit);
    } else if (data.data && Array.isArray(data.data)) {
      return data.data.slice(0, limit);
    } else if (data.items && Array.isArray(data.items)) {
      return data.items.slice(0, limit);
    } else if (data.results && Array.isArray(data.results)) {
      return data.results.slice(0, limit);
    }
    
    return [data];
  }

  private static inferFieldType(values: any[]): SourceField['type'] {
    if (values.length === 0) return 'string';

    const types = values.map(val => {
      if (val === null || val === undefined) return 'null';
      if (typeof val === 'boolean') return 'boolean';
      if (typeof val === 'number') return 'number';
      if (typeof val === 'object') return 'json';
      if (typeof val === 'string') {
        // Try to detect dates
        if (val.match(/^\d{4}-\d{2}-\d{2}$/)) return 'date';
        if (val.match(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/)) return 'datetime';
        // Try to detect numbers
        if (!isNaN(Number(val)) && !isNaN(parseFloat(val))) return 'number';
        // Try to detect booleans
        if (val.toLowerCase() === 'true' || val.toLowerCase() === 'false') return 'boolean';
      }
      return 'string';
    });

    // Determine most common type
    const typeCounts = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Remove null from consideration
    delete typeCounts.null;

    const mostCommonType = Object.keys(typeCounts)
      .sort((a, b) => typeCounts[b] - typeCounts[a])[0];

    return (mostCommonType as SourceField['type']) || 'string';
  }
}

// Export the test function for API use
export async function testConnection(config: ConnectionConfig): Promise<ConnectionTestResult> {
  return ConnectionManager.testConnection(config);
}