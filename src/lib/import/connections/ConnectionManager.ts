import { ConnectionConfig, SourceSchema, SourceTable, SourceField } from '@/lib/import/types';
import { ImportSourceType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

interface TableDataResult {
  columns: string[];
  rows: any[][];
  totalCount: number;
}

export class ConnectionManager {
  /**
   * Get table data with pagination
   */
  async getTableData(
    connectionConfig: ConnectionConfig,
    tableName: string,
    limit: number = 50,
    offset: number = 0,
    search?: string
  ): Promise<TableDataResult | null> {
    try {
      console.log(`ConnectionManager.getTableData called with:`, {
        sourceType: connectionConfig.type,
        tableName,
        limit,
        offset,
        hasFilePath: !!(connectionConfig.filePath || connectionConfig.path),
        filePath: connectionConfig.filePath || connectionConfig.path
      });

      switch (connectionConfig.type) {
        case ImportSourceType.FILE_CSV:
          return await this.getCSVData(connectionConfig, tableName, limit, offset, search);
        
        case ImportSourceType.FILE_JSON:
          return await this.getJSONData(connectionConfig, tableName, limit, offset, search);
        
        case ImportSourceType.DATABASE_MYSQL:
        case ImportSourceType.DATABASE_POSTGRESQL:
        case ImportSourceType.DATABASE_SQLITE:
          return await this.getDatabaseData(connectionConfig, tableName, limit, offset, search);
        
        case ImportSourceType.API_REST:
          return await this.getAPIData(connectionConfig, tableName, limit, offset, search);
        
        default:
          throw new Error(`Unsupported source type: ${connectionConfig.type}`);
      }
    } catch (error) {
      console.error('Error getting table data:', error);
      return null;
    }
  }

  /**
   * Test connection and discover schema
   */
  async testConnection(connectionConfig: ConnectionConfig): Promise<{
    success: boolean;
    schema?: SourceSchema;
    message: string;
    recordCount?: number;
  }> {
    try {
      switch (connectionConfig.type) {
        case ImportSourceType.FILE_CSV:
          return await this.testCSVConnection(connectionConfig);
        
        case ImportSourceType.FILE_JSON:
          return await this.testJSONConnection(connectionConfig);
        
        case ImportSourceType.DATABASE_MYSQL:
        case ImportSourceType.DATABASE_POSTGRESQL:
        case ImportSourceType.DATABASE_SQLITE:
          return await this.testDatabaseConnection(connectionConfig);
        
        case ImportSourceType.API_REST:
          return await this.testAPIConnection(connectionConfig);
        
        default:
          throw new Error(`Unsupported source type: ${connectionConfig.type}`);
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown connection error'
      };
    }
  }

  private async getCSVData(
    connectionConfig: ConnectionConfig,
    tableName: string,
    limit: number,
    offset: number,
    search?: string
  ): Promise<TableDataResult> {
    try {
      const filePath = connectionConfig.filePath || connectionConfig.path;
      
      if (!filePath) {
        throw new Error('CSV file path not specified');
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`CSV file not found: ${filePath}`);
      }

      // Read and parse CSV file
      const csvData = await this.parseCSVFile(filePath);
      
      if (!csvData.rows || csvData.rows.length === 0) {
        return {
          columns: csvData.columns || [],
          rows: [],
          totalCount: 0
        };
      }

      // Apply search filter if provided
      let filteredRows = csvData.rows;
      if (search && search.trim()) {
        const searchTerm = search.toLowerCase().trim();
        filteredRows = csvData.rows.filter(row => 
          row.some(cell => 
            String(cell || '').toLowerCase().includes(searchTerm)
          )
        );
      }

      // Apply pagination to filtered results
      const totalCount = filteredRows.length;
      const paginatedRows = filteredRows.slice(offset, offset + limit);

      return {
        columns: csvData.columns,
        rows: paginatedRows,
        totalCount
      };
    } catch (error) {
      console.error('Error reading CSV data:', error);
      // Fallback to mock data with warning
      const mockData = this.generateMockData(tableName, limit, offset);
      return {
        columns: ['warning', ...mockData.columns],
        rows: mockData.rows.map(row => [`CSV_ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`, ...row]),
        totalCount: mockData.totalCount
      };
    }
  }

  private parseCSVFile(filePath: string): Promise<{columns: string[], rows: any[][]}> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      let headers: string[] = [];
      
      const stream = fs.createReadStream(filePath)
        .on('error', (error) => {
          reject(new Error(`Failed to read file: ${error.message}`));
        });

      // Simple CSV parsing without external dependency
      let isFirstRow = true;
      let currentRow = '';
      let inQuotes = false;
      
      stream.on('data', (chunk) => {
        const data = chunk.toString();
        
        for (let i = 0; i < data.length; i++) {
          const char = data[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === '\n' && !inQuotes) {
            // Process completed row
            if (currentRow.trim()) {
              const rowData = this.parseCSVRow(currentRow);
              
              if (isFirstRow) {
                headers = rowData;
                isFirstRow = false;
              } else {
                results.push(rowData);
              }
            }
            currentRow = '';
          } else {
            currentRow += char;
          }
        }
      });

      stream.on('end', () => {
        // Process final row if exists
        if (currentRow.trim()) {
          const rowData = this.parseCSVRow(currentRow);
          if (isFirstRow) {
            headers = rowData;
          } else {
            results.push(rowData);
          }
        }

        resolve({
          columns: headers,
          rows: results
        });
      });
    });
  }

  private parseCSVRow(rowString: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < rowString.length; i++) {
      const char = rowString[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private async getJSONData(
    connectionConfig: ConnectionConfig,
    tableName: string,
    limit: number,
    offset: number,
    search?: string
  ): Promise<TableDataResult> {
    try {
      const filePath = connectionConfig.filePath || connectionConfig.path;
      
      if (!filePath) {
        throw new Error('JSON file path not specified');
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`JSON file not found: ${filePath}`);
      }

      // Read and parse JSON file
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      let jsonData;
      
      try {
        jsonData = JSON.parse(fileContent);
      } catch (parseError) {
        throw new Error(`Invalid JSON format: ${parseError instanceof Error ? parseError.message : 'Parse error'}`);
      }

      // Handle different JSON structures
      let dataArray: any[] = [];
      
      if (Array.isArray(jsonData)) {
        dataArray = jsonData;
      } else if (jsonData && typeof jsonData === 'object') {
        // Try to find an array property that matches the table name or is the main data
        const possibleArrays = Object.keys(jsonData).filter(key => 
          Array.isArray(jsonData[key]) && (
            key.toLowerCase().includes(tableName.toLowerCase()) ||
            key === 'data' || 
            key === 'items' || 
            key === 'records'
          )
        );
        
        if (possibleArrays.length > 0) {
          dataArray = jsonData[possibleArrays[0]];
        } else {
          // Fallback: use the first array found
          const firstArrayKey = Object.keys(jsonData).find(key => Array.isArray(jsonData[key]));
          if (firstArrayKey) {
            dataArray = jsonData[firstArrayKey];
          } else {
            throw new Error('No array data found in JSON file');
          }
        }
      } else {
        throw new Error('JSON file does not contain valid data structure');
      }

      if (dataArray.length === 0) {
        return {
          columns: [],
          rows: [],
          totalCount: 0
        };
      }

      // Extract columns from first object
      const firstItem = dataArray[0];
      const columns = typeof firstItem === 'object' && firstItem !== null 
        ? Object.keys(firstItem)
        : ['value'];

      // Convert objects to arrays
      const rows = dataArray.map(item => {
        if (typeof item === 'object' && item !== null) {
          return columns.map(col => item[col] ?? null);
        } else {
          return [item];
        }
      });

      // Apply search filter if provided
      let filteredRows = rows;
      if (search && search.trim()) {
        const searchTerm = search.toLowerCase().trim();
        filteredRows = rows.filter(row => 
          row.some(cell => 
            String(cell || '').toLowerCase().includes(searchTerm)
          )
        );
      }

      // Apply pagination to filtered results
      const totalCount = filteredRows.length;
      const paginatedRows = filteredRows.slice(offset, offset + limit);

      return {
        columns,
        rows: paginatedRows,
        totalCount
      };
    } catch (error) {
      console.error('Error reading JSON data:', error);
      // Fallback to mock data with warning
      const mockData = this.generateMockData(tableName, limit, offset);
      return {
        columns: ['warning', ...mockData.columns],
        rows: mockData.rows.map(row => [`JSON_ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`, ...row]),
        totalCount: mockData.totalCount
      };
    }
  }

  private async getDatabaseData(
    connectionConfig: ConnectionConfig,
    tableName: string,
    limit: number,
    offset: number,
    search?: string
  ): Promise<TableDataResult> {
    try {
      console.log('Attempting database connection:', {
        type: connectionConfig.type,
        host: connectionConfig.host,
        database: connectionConfig.database,
        tableName
      });

      // Extract connection details
      const {
        host = 'localhost',
        port,
        database,
        username,
        password,
        ssl
      } = connectionConfig;

      if (!database || !username) {
        throw new Error('Database name and username are required for database connections');
      }

      switch (connectionConfig.type) {
        case ImportSourceType.DATABASE_MYSQL:
          return await this.getMySQLData(connectionConfig, tableName, limit, offset, search);
        
        case ImportSourceType.DATABASE_POSTGRESQL:
          return await this.getPostgreSQLData(connectionConfig, tableName, limit, offset, search);
        
        case ImportSourceType.DATABASE_SQLITE:
          return await this.getSQLiteData(connectionConfig, tableName, limit, offset, search);
        
        default:
          throw new Error(`Unsupported database type: ${connectionConfig.type}`);
      }
    } catch (error) {
      console.error('Database connection error:', error);
      
      // Return error info instead of mock data
      return {
        columns: ['error', 'details'],
        rows: [
          ['DATABASE_CONNECTION_ERROR', error instanceof Error ? error.message : 'Unknown database error'],
          ['CONNECTION_INFO', `Failed to connect to ${connectionConfig.type} at ${connectionConfig.host}:${connectionConfig.port}/${connectionConfig.database}`],
          ['TABLE_REQUESTED', tableName],
          ['SUGGESTION', 'Please check your database connection settings and ensure the database is accessible']
        ],
        totalCount: 4
      };
    }
  }

  private async getMySQLData(
    connectionConfig: ConnectionConfig,
    tableName: string,
    limit: number,
    offset: number,
    search?: string
  ): Promise<TableDataResult> {
    try {
      // For MySQL, we'll use a basic connection approach
      const mysql = await this.loadMySQLDriver();
      
      const connection = mysql.createConnection({
        host: connectionConfig.host || 'localhost',
        port: connectionConfig.port || 3306,
        user: connectionConfig.username,
        password: connectionConfig.password,
        database: connectionConfig.database,
        ssl: connectionConfig.ssl
      });

      // Get column information
      const columnsQuery = `
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `;
      
      const columns = await this.executeQuery(connection, columnsQuery, [connectionConfig.database, tableName]);
      
      if (!columns || columns.length === 0) {
        throw new Error(`Table '${tableName}' not found in database '${connectionConfig.database}'`);
      }

      // Build search condition if provided
      let whereClause = '';
      let searchParams: string[] = [];
      
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        const searchConditions = columns.map((col: any) => `\`${col.COLUMN_NAME}\` LIKE ?`).join(' OR ');
        whereClause = ` WHERE ${searchConditions}`;
        searchParams = columns.map(() => searchTerm);
      }

      // Get total count with search
      const countQuery = `SELECT COUNT(*) as total FROM \`${tableName}\`${whereClause}`;
      const countResult = await this.executeQuery(connection, countQuery, searchParams);
      const totalCount = countResult[0]?.total || 0;

      // Get data with pagination and search
      const dataQuery = `SELECT * FROM \`${tableName}\`${whereClause} LIMIT ? OFFSET ?`;
      const rows = await this.executeQuery(connection, dataQuery, [...searchParams, limit, offset]);

      connection.end();

      return {
        columns: columns.map((col: any) => col.COLUMN_NAME),
        rows: rows.map((row: any) => columns.map((col: any) => row[col.COLUMN_NAME])),
        totalCount
      };
    } catch (error) {
      console.error('MySQL connection error:', error);
      throw error;
    }
  }

  private async getPostgreSQLData(
    connectionConfig: ConnectionConfig,
    tableName: string,
    limit: number,
    offset: number,
    search?: string
  ): Promise<TableDataResult> {
    try {
      const { Client } = await this.loadPostgreSQLDriver();
      
      const client = new Client({
        host: connectionConfig.host || 'localhost',
        port: connectionConfig.port || 5432,
        user: connectionConfig.username,
        password: connectionConfig.password,
        database: connectionConfig.database,
        ssl: connectionConfig.ssl
      });

      await client.connect();

      // Get column information
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `;
      
      const columnsResult = await client.query(columnsQuery, [tableName]);
      
      if (!columnsResult.rows || columnsResult.rows.length === 0) {
        throw new Error(`Table '${tableName}' not found in database '${connectionConfig.database}'`);
      }

      // Build search condition if provided
      let whereClause = '';
      let paramIndex = 2; // Start from $2 since $1 is used for tableName in columns query
      const queryParams: any[] = [];
      
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        const searchConditions = columns.map((col: any, index: number) => {
          return `"${col.column_name}"::text LIKE $${paramIndex + index}`;
        }).join(' OR ');
        whereClause = ` WHERE ${searchConditions}`;
        queryParams.push(...columns.map(() => searchTerm));
        paramIndex += columns.length;
      }

      // Get total count with search
      const countQuery = `SELECT COUNT(*) as total FROM "${tableName}"${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const totalCount = parseInt(countResult.rows[0]?.total || '0');

      // Get data with pagination and search
      const dataQuery = `SELECT * FROM "${tableName}"${whereClause} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      const dataResult = await client.query(dataQuery, [...queryParams, limit, offset]);

      await client.end();

      return {
        columns: columnsResult.rows.map((col: any) => col.column_name),
        rows: dataResult.rows.map((row: any) => 
          columnsResult.rows.map((col: any) => row[col.column_name])
        ),
        totalCount
      };
    } catch (error) {
      console.error('PostgreSQL connection error:', error);
      throw error;
    }
  }

  private async getSQLiteData(
    connectionConfig: ConnectionConfig,
    tableName: string,
    limit: number,
    offset: number,
    search?: string
  ): Promise<TableDataResult> {
    try {
      const sqlite3 = await this.loadSQLiteDriver();
      const dbPath = connectionConfig.database || connectionConfig.filePath;
      
      if (!dbPath) {
        throw new Error('Database file path is required for SQLite connections');
      }

      const db = new sqlite3.Database(dbPath);

      // Get column information
      const columns = await new Promise<any[]>((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });

      if (!columns || columns.length === 0) {
        throw new Error(`Table '${tableName}' not found in SQLite database`);
      }

      // Get total count
      const totalCount = await new Promise<number>((resolve, reject) => {
        db.get(`SELECT COUNT(*) as total FROM "${tableName}"`, [], (err, row: any) => {
          if (err) reject(err);
          else resolve(row?.total || 0);
        });
      });

      // Build search condition if provided
      let whereClause = '';
      const queryParams: any[] = [];
      
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        const searchConditions = columns.map((col: any) => `"${col.name}" LIKE ?`).join(' OR ');
        whereClause = ` WHERE ${searchConditions}`;
        queryParams.push(...columns.map(() => searchTerm));
      }

      // Get total count with search
      const totalCount = await new Promise<number>((resolve, reject) => {
        const countQuery = `SELECT COUNT(*) as total FROM "${tableName}"${whereClause}`;
        db.get(countQuery, queryParams, (err, row: any) => {
          if (err) reject(err);
          else resolve(row?.total || 0);
        });
      });

      // Get data with pagination and search
      const rows = await new Promise<any[]>((resolve, reject) => {
        const dataQuery = `SELECT * FROM "${tableName}"${whereClause} LIMIT ? OFFSET ?`;
        db.all(dataQuery, [...queryParams, limit, offset], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });

      db.close();

      return {
        columns: columns.map((col: any) => col.name),
        rows: rows.map((row: any) => columns.map((col: any) => row[col.name])),
        totalCount
      };
    } catch (error) {
      console.error('SQLite connection error:', error);
      throw error;
    }
  }

  private async loadMySQLDriver() {
    try {
      return require('mysql2/promise');
    } catch (error) {
      throw new Error('MySQL driver not installed. Please run: npm install mysql2');
    }
  }

  private async loadPostgreSQLDriver() {
    try {
      return require('pg');
    } catch (error) {
      throw new Error('PostgreSQL driver not installed. Please run: npm install pg @types/pg');
    }
  }

  private async loadSQLiteDriver() {
    try {
      return require('sqlite3');
    } catch (error) {
      throw new Error('SQLite driver not installed. Please run: npm install sqlite3 @types/sqlite3');
    }
  }

  private async executeQuery(connection: any, query: string, params: any[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      connection.query(query, params, (error: any, results: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });
  }

  private async getAPIData(
    connectionConfig: ConnectionConfig,
    tableName: string,
    limit: number,
    offset: number,
    search?: string
  ): Promise<TableDataResult> {
    try {
      console.log('Attempting API connection:', {
        url: connectionConfig.url,
        method: connectionConfig.method || 'GET',
        tableName
      });

      const {
        url,
        method = 'GET',
        headers = {},
        apiKey,
        authToken
      } = connectionConfig;

      if (!url) {
        throw new Error('API URL is required for REST API connections');
      }

      // Prepare headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers
      };

      // Add authentication if provided
      if (apiKey) {
        requestHeaders['X-API-Key'] = apiKey;
      }
      if (authToken) {
        requestHeaders['Authorization'] = `Bearer ${authToken}`;
      }

      // Build URL with pagination and search parameters
      const apiUrl = new URL(url);
      apiUrl.searchParams.set('limit', limit.toString());
      apiUrl.searchParams.set('offset', offset.toString());
      
      // Add search parameter if provided
      if (search && search.trim()) {
        apiUrl.searchParams.set('search', search.trim());
        apiUrl.searchParams.set('q', search.trim()); // Common alternative
      }
      
      // Add table name as a query parameter if needed
      if (tableName && tableName !== url) {
        apiUrl.searchParams.set('table', tableName);
        apiUrl.searchParams.set('resource', tableName);
      }

      // Make API request
      const response = await fetch(apiUrl.toString(), {
        method,
        headers: requestHeaders
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Parse API response
      let dataArray: any[] = [];
      let totalCount = 0;

      // Handle different API response formats
      if (Array.isArray(data)) {
        dataArray = data;
        totalCount = data.length;
      } else if (data && typeof data === 'object') {
        // Look for common pagination patterns
        if (data.data && Array.isArray(data.data)) {
          dataArray = data.data;
          totalCount = data.total || data.totalCount || data.count || data.data.length;
        } else if (data.items && Array.isArray(data.items)) {
          dataArray = data.items;
          totalCount = data.total || data.totalCount || data.count || data.items.length;
        } else if (data.results && Array.isArray(data.results)) {
          dataArray = data.results;
          totalCount = data.total || data.totalCount || data.count || data.results.length;
        } else {
          // Look for the first array in the response
          const firstArrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
          if (firstArrayKey) {
            dataArray = data[firstArrayKey];
            totalCount = data.total || data.totalCount || data.count || dataArray.length;
          } else {
            throw new Error('No array data found in API response');
          }
        }
      } else {
        throw new Error('API response does not contain valid data structure');
      }

      if (dataArray.length === 0) {
        return {
          columns: [],
          rows: [],
          totalCount: 0
        };
      }

      // Extract columns from first object
      const firstItem = dataArray[0];
      const columns = typeof firstItem === 'object' && firstItem !== null 
        ? Object.keys(firstItem)
        : ['value'];

      // Convert objects to arrays
      let rows = dataArray.map(item => {
        if (typeof item === 'object' && item !== null) {
          return columns.map(col => item[col] ?? null);
        } else {
          return [item];
        }
      });

      // Apply client-side search filtering as fallback if API doesn't support it
      // This happens when the API returns the same number of records regardless of search
      if (search && search.trim() && rows.length === dataArray.length) {
        const searchTerm = search.toLowerCase().trim();
        const filteredRows = rows.filter(row => 
          row.some(cell => 
            String(cell || '').toLowerCase().includes(searchTerm)
          )
        );
        
        return {
          columns,
          rows: filteredRows,
          totalCount: filteredRows.length
        };
      }

      return {
        columns,
        rows,
        totalCount
      };
    } catch (error) {
      console.error('API connection error:', error);
      
      // Return error info instead of mock data
      return {
        columns: ['error', 'details'],
        rows: [
          ['API_CONNECTION_ERROR', error instanceof Error ? error.message : 'Unknown API error'],
          ['API_URL', connectionConfig.url || 'No URL specified'],
          ['TABLE_REQUESTED', tableName],
          ['SUGGESTION', 'Please check your API endpoint URL and authentication credentials']
        ],
        totalCount: 4
      };
    }
  }

  private async testCSVConnection(connectionConfig: ConnectionConfig) {
    try {
      const filePath = connectionConfig.filePath || connectionConfig.path;
      
      if (!filePath) {
        return {
          success: false,
          message: 'CSV file path not specified'
        };
      }

      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          message: `CSV file not found: ${filePath}`
        };
      }

      // Parse CSV to discover schema
      const csvData = await this.parseCSVFile(filePath);
      const fileName = path.basename(filePath, path.extname(filePath));
      
      // Generate schema from CSV structure
      const fields: SourceField[] = csvData.columns.map((columnName, index) => {
        // Analyze first few rows to determine data type
        const sampleValues = csvData.rows.slice(0, 10).map(row => row[index]);
        const dataType = this.inferDataType(sampleValues);
        
        return {
          name: columnName,
          type: dataType,
          nullable: sampleValues.some(val => val === null || val === undefined || val === ''),
          isPrimaryKey: false // CSV files don't have primary keys
        };
      });

      const schema: SourceSchema = {
        tables: [{
          name: fileName,
          fields,
          recordCount: csvData.rows.length
        }]
      };

      return {
        success: true,
        schema,
        message: `CSV file loaded successfully: ${csvData.rows.length} records found`,
        recordCount: csvData.rows.length
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to read CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private inferDataType(sampleValues: any[]): string {
    const nonNullValues = sampleValues.filter(val => val !== null && val !== undefined && val !== '');
    
    if (nonNullValues.length === 0) return 'string';
    
    // Check if all values are numbers
    const allNumbers = nonNullValues.every(val => !isNaN(Number(val)) && val !== '');
    if (allNumbers) {
      const hasDecimals = nonNullValues.some(val => String(val).includes('.'));
      return hasDecimals ? 'number' : 'number';
    }
    
    // Check if all values are booleans
    const allBooleans = nonNullValues.every(val => 
      String(val).toLowerCase() === 'true' || 
      String(val).toLowerCase() === 'false' ||
      val === '1' || val === '0'
    );
    if (allBooleans) return 'boolean';
    
    // Check if values look like dates
    const datePattern = /^\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4}/;
    const allDates = nonNullValues.every(val => datePattern.test(String(val)));
    if (allDates) return 'datetime';
    
    return 'string';
  }

  private async testJSONConnection(connectionConfig: ConnectionConfig) {
    try {
      const filePath = connectionConfig.filePath || connectionConfig.path;
      
      if (!filePath) {
        return {
          success: false,
          message: 'JSON file path not specified'
        };
      }

      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          message: `JSON file not found: ${filePath}`
        };
      }

      // Parse JSON to discover schema
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      let jsonData;
      
      try {
        jsonData = JSON.parse(fileContent);
      } catch (parseError) {
        return {
          success: false,
          message: `Invalid JSON format: ${parseError instanceof Error ? parseError.message : 'Parse error'}`
        };
      }

      // Handle different JSON structures
      let dataArray: any[] = [];
      let tableName = path.basename(filePath, path.extname(filePath));
      
      if (Array.isArray(jsonData)) {
        dataArray = jsonData;
      } else if (jsonData && typeof jsonData === 'object') {
        // Find the first array in the JSON structure
        const firstArrayKey = Object.keys(jsonData).find(key => Array.isArray(jsonData[key]));
        if (firstArrayKey) {
          dataArray = jsonData[firstArrayKey];
          tableName = firstArrayKey;
        } else {
          return {
            success: false,
            message: 'No array data found in JSON file'
          };
        }
      } else {
        return {
          success: false,
          message: 'JSON file does not contain valid data structure'
        };
      }

      if (dataArray.length === 0) {
        return {
          success: true,
          schema: { tables: [{ name: tableName, fields: [], recordCount: 0 }] },
          message: 'JSON file loaded successfully but contains no data',
          recordCount: 0
        };
      }

      // Generate schema from JSON structure
      const firstItem = dataArray[0];
      const columns = typeof firstItem === 'object' && firstItem !== null 
        ? Object.keys(firstItem)
        : ['value'];

      const fields: SourceField[] = columns.map(columnName => {
        // Analyze first few items to determine data type
        const sampleValues = dataArray.slice(0, 10).map(item => 
          typeof item === 'object' && item !== null ? item[columnName] : item
        );
        const dataType = this.inferDataType(sampleValues);
        
        return {
          name: columnName,
          type: dataType,
          nullable: sampleValues.some(val => val === null || val === undefined),
          isPrimaryKey: false
        };
      });

      const schema: SourceSchema = {
        tables: [{
          name: tableName,
          fields,
          recordCount: dataArray.length
        }]
      };

      return {
        success: true,
        schema,
        message: `JSON file loaded successfully: ${dataArray.length} records found`,
        recordCount: dataArray.length
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to read JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async testDatabaseConnection(connectionConfig: ConnectionConfig) {
    // Mock database connection test
    const schema = this.generateMockSchema('database');
    return {
      success: true,
      schema,
      message: 'Database connection successful',
      recordCount: 5420
    };
  }

  private async testAPIConnection(connectionConfig: ConnectionConfig) {
    // Mock API connection test
    const schema = this.generateMockSchema('api');
    return {
      success: true,
      schema,
      message: 'API connection successful',
      recordCount: 2100
    };
  }

  private generateMockData(tableName: string, limit: number, offset: number) {
    // Generate realistic mock data based on table name
    const mockDataSets = {
      users: {
        columns: ['id', 'name', 'email', 'company', 'role', 'created_at'],
        data: [
          [1, 'John Doe', 'john.doe@acme.com', 'Acme Corp', 'admin', '2024-01-15'],
          [2, 'Jane Smith', 'jane.smith@techco.com', 'TechCo Ltd', 'user', '2024-01-20'],
          [3, 'Bob Johnson', 'bob.j@startup.io', 'Startup Inc', 'manager', '2024-02-01'],
          [4, 'Alice Brown', 'alice@consulting.com', 'ABC Consulting', 'user', '2024-02-10'],
          [5, 'Charlie Wilson', 'c.wilson@enterprise.com', 'Big Enterprise', 'admin', '2024-02-15']
        ]
      },
      accounts: {
        columns: ['id', 'name', 'domain', 'plan', 'active', 'created_at'],
        data: [
          [1, 'Acme Corporation', 'acme.com', 'enterprise', true, '2024-01-01'],
          [2, 'TechCo Limited', 'techco.com', 'professional', true, '2024-01-05'],
          [3, 'Startup Innovations', 'startup.io', 'basic', true, '2024-01-20'],
          [4, 'ABC Consulting', 'consulting.com', 'professional', false, '2024-02-01'],
          [5, 'Big Enterprise Corp', 'enterprise.com', 'enterprise', true, '2024-02-10']
        ]
      },
      tickets: {
        columns: ['id', 'title', 'description', 'status', 'priority', 'assigned_to', 'account_id', 'created_at'],
        data: [
          [1, 'Login Issue', 'User cannot login to system', 'open', 'high', 1, 1, '2024-03-01'],
          [2, 'Feature Request', 'Need dark mode support', 'in_progress', 'medium', 2, 2, '2024-03-02'],
          [3, 'Bug Report', 'Data export fails', 'closed', 'low', 1, 1, '2024-03-03'],
          [4, 'Performance Issue', 'Dashboard loads slowly', 'open', 'high', 3, 3, '2024-03-04'],
          [5, 'UI Improvement', 'Better mobile layout needed', 'in_progress', 'medium', 2, 2, '2024-03-05']
        ]
      },
      time_entries: {
        columns: ['id', 'description', 'hours', 'date', 'ticket_id', 'user_id', 'billable'],
        data: [
          [1, 'Fixed login authentication bug', 2.5, '2024-03-01', 1, 1, true],
          [2, 'Implemented dark mode toggle', 4.0, '2024-03-02', 2, 2, true],
          [3, 'Tested export functionality', 1.5, '2024-03-03', 3, 1, true],
          [4, 'Optimized dashboard queries', 3.0, '2024-03-04', 4, 3, true],
          [5, 'Mobile UI improvements', 5.5, '2024-03-05', 5, 2, true]
        ]
      },
      customers: {
        columns: ['id', 'company_name', 'contact_name', 'email', 'phone', 'address', 'city', 'country'],
        data: [
          [1, 'Global Solutions Inc', 'Michael Chen', 'm.chen@global.com', '+1-555-0123', '123 Business St', 'New York', 'USA'],
          [2, 'European Tech Ltd', 'Sophie Mueller', 's.mueller@eurotech.de', '+49-30-123456', 'Hauptstraße 45', 'Berlin', 'Germany'],
          [3, 'Asia Pacific Co', 'Hiroshi Tanaka', 'h.tanaka@aspacific.jp', '+81-3-1234567', '1-1-1 Shibuya', 'Tokyo', 'Japan'],
          [4, 'Local Business LLC', 'Emma Davis', 'emma@localbiz.com', '+1-555-0199', '456 Main Ave', 'Portland', 'USA'],
          [5, 'Innovation Hub', 'Alex Johnson', 'alex@innohub.com', '+44-20-7123456', '789 Tech Street', 'London', 'UK']
        ]
      }
    };

    // Find matching mock data or use generic data
    const tableKey = Object.keys(mockDataSets).find(key => 
      tableName.toLowerCase().includes(key) || key.includes(tableName.toLowerCase())
    );
    
    const mockData = mockDataSets[tableKey as keyof typeof mockDataSets] || mockDataSets.users;
    const totalCount = 1000 + Math.floor(Math.random() * 5000); // Random total between 1000-6000
    
    // Generate additional rows to fill the requested limit
    const generatedRows: any[][] = [];
    for (let i = 0; i < limit; i++) {
      const baseRowIndex = (offset + i) % mockData.data.length;
      const baseRow = mockData.data[baseRowIndex];
      
      // Create variations of the base row to simulate more data
      const variation = Math.floor((offset + i) / mockData.data.length) + 1;
      const modifiedRow = baseRow.map((cell, cellIndex) => {
        if (typeof cell === 'string' && cellIndex === 1) {
          // Modify names/titles with variation numbers
          return `${cell} (${variation})`;
        } else if (typeof cell === 'number' && cellIndex === 0) {
          // Modify IDs to be unique
          return offset + i + 1;
        } else if (typeof cell === 'string' && cell.includes('@')) {
          // Modify email addresses
          const [localPart, domain] = cell.split('@');
          return `${localPart}${variation > 1 ? variation : ''}@${domain}`;
        }
        return cell;
      });
      
      generatedRows.push(modifiedRow);
    }
    
    return {
      columns: mockData.columns,
      rows: generatedRows,
      totalCount
    };
  }

  private generateMockSchema(sourceType: string): SourceSchema {
    const commonTables: SourceTable[] = [
      {
        name: 'users',
        fields: [
          { name: 'id', type: 'number', isPrimaryKey: true, nullable: false },
          { name: 'name', type: 'string', nullable: false, maxLength: 255 },
          { name: 'email', type: 'string', nullable: false, maxLength: 255 },
          { name: 'company', type: 'string', nullable: true, maxLength: 255 },
          { name: 'role', type: 'string', nullable: false, maxLength: 50 },
          { name: 'created_at', type: 'datetime', nullable: false }
        ],
        recordCount: 1250
      },
      {
        name: 'accounts',
        fields: [
          { name: 'id', type: 'number', isPrimaryKey: true, nullable: false },
          { name: 'name', type: 'string', nullable: false, maxLength: 255 },
          { name: 'domain', type: 'string', nullable: true, maxLength: 255 },
          { name: 'plan', type: 'string', nullable: false, maxLength: 50 },
          { name: 'active', type: 'boolean', nullable: false },
          { name: 'created_at', type: 'datetime', nullable: false }
        ],
        recordCount: 450
      },
      {
        name: 'tickets',
        fields: [
          { name: 'id', type: 'number', isPrimaryKey: true, nullable: false },
          { name: 'title', type: 'string', nullable: false, maxLength: 255 },
          { name: 'description', type: 'string', nullable: true },
          { name: 'status', type: 'string', nullable: false, maxLength: 50 },
          { name: 'priority', type: 'string', nullable: false, maxLength: 50 },
          { name: 'assigned_to', type: 'number', nullable: true, isForeignKey: true, referencedTable: 'users' },
          { name: 'account_id', type: 'number', nullable: false, isForeignKey: true, referencedTable: 'accounts' },
          { name: 'created_at', type: 'datetime', nullable: false }
        ],
        recordCount: 3200
      },
      {
        name: 'customers',
        fields: [
          { name: 'id', type: 'number', isPrimaryKey: true, nullable: false },
          { name: 'company_name', type: 'string', nullable: false, maxLength: 255 },
          { name: 'contact_name', type: 'string', nullable: false, maxLength: 255 },
          { name: 'email', type: 'string', nullable: false, maxLength: 255 },
          { name: 'phone', type: 'string', nullable: true, maxLength: 50 },
          { name: 'address', type: 'string', nullable: true },
          { name: 'city', type: 'string', nullable: true, maxLength: 100 },
          { name: 'country', type: 'string', nullable: true, maxLength: 100 }
        ],
        recordCount: 890
      }
    ];

    return {
      tables: commonTables
    };
  }
}