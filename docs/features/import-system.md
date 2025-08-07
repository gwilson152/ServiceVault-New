# Import System

The Import System provides a comprehensive solution for importing data from various external sources into Service Vault. It supports multiple data sources, dynamic field mapping, data transformation, validation, and real-time execution monitoring.

## Overview

The Import System is designed to be:
- **Isolated**: Completely separate from existing business data with its own database schema
- **Flexible**: Supports multiple data source types with dynamic configuration
- **Robust**: Includes comprehensive error handling, validation, and logging
- **User-Friendly**: Provides intuitive UI for configuration and monitoring
- **Permission-Based**: Fully integrated with the ABAC permission system

## Supported Data Sources

### Database Sources
- **MySQL**: Full support for MySQL databases with schema discovery
- **PostgreSQL**: Complete PostgreSQL integration with advanced features
- **SQLite**: File-based SQLite database support
- **MongoDB**: Coming soon (architecture supports it)

### File Sources
- **CSV Files**: Configurable delimiters, headers, encoding
- **Excel Files**: Multiple sheets support with automatic type inference
- **JSON Files**: Array-based JSON data import

### API Sources
- **REST APIs**: HTTP/HTTPS endpoints with authentication support
- **Authentication Types**: Bearer token, API key, basic auth

## Architecture

### Database Schema

The import system uses isolated database tables:

```sql
-- Import configuration storage
model ImportConfiguration {
  id                    String                @id @default(cuid())
  name                  String
  description           String?
  sourceType            ImportSourceType
  connectionConfig      Json                  // Connection details
  targetEntity          String                // Target entity type
  fieldMappings         Json                  // Field mapping configuration
  relationshipMappings  Json                  // Relationship mappings
  validationRules       Json                  // Validation rules
  transformRules        Json                  // Transformation rules
  isActive              Boolean               @default(true)
  createdBy             String                // User ID as string
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  executions            ImportExecution[]
}

-- Import execution tracking
model ImportExecution {
  id                  String              @id @default(cuid())
  configurationId     String
  status              ImportStatus
  totalRecords        Int                 @default(0)
  processedRecords    Int                 @default(0)
  successfulRecords   Int                 @default(0)
  failedRecords       Int                 @default(0)
  startedAt           DateTime?
  completedAt         DateTime?
  executedBy          String              // User ID as string
  createdAt           DateTime            @default(now())
  configuration       ImportConfiguration @relation(fields: [configurationId], references: [id], onDelete: Cascade)
  logs                ImportExecutionLog[]
}

-- Execution logging
model ImportExecutionLog {
  id            String            @id @default(cuid())
  executionId   String
  level         LogLevel
  message       String
  details       String?           // JSON string for additional data
  recordIndex   Int?              // Optional record reference
  timestamp     DateTime          @default(now())
  execution     ImportExecution   @relation(fields: [executionId], references: [id], onDelete: Cascade)
}
```

### Key Components

#### 1. Connection Manager (`/src/lib/import/ConnectionManager.ts`)
- Handles connections to all supported data sources
- Provides schema discovery and data type inference
- Includes connection testing and validation
- Supports both synchronous and asynchronous operations

#### 2. Import Execution Engine (`/src/lib/import/ImportExecutionEngine.ts`)
- Core processing engine for data imports
- Handles data transformation and validation
- Provides real-time progress tracking
- Supports dry-run mode for testing
- Comprehensive error handling and logging

#### 3. Field Mapping System (`/src/components/import/FieldMappingEditor.tsx`)
- Visual interface for mapping source to target fields
- Supports complex transformations and validations
- Real-time validation feedback
- Drag-and-drop interface (planned)

#### 4. Joined Table Configuration (`/src/components/import/ManualRelationshipEditor.tsx`)
- **Multi-table join support**: Create virtual tables by joining multiple source tables
- **Visual join diagram**: Interactive representation of table relationships
- **Field selection interface**: Choose specific fields from each table with expand/collapse UI
- **Real-time join preview**: Execute actual database joins with live data preview
- **Multiple join types**: INNER, LEFT, RIGHT, FULL OUTER joins with explanations
- **Join condition editor**: Define complex join conditions between tables
- **Field aliasing**: Custom field names for joined results
- **Search and filtering**: Filter preview data in real-time
- **Database-level execution**: Uses ConnectionManager.executeJoinQuery() for accurate joins

#### 5. API Layer
- RESTful endpoints for all import operations
- Proper permission checking and validation
- Real-time execution monitoring
- Export capabilities for logs and results

## Features

### 1. Dynamic Field Mapping

The system provides a sophisticated field mapping interface that allows:

#### Basic Mapping
- Direct field-to-field mapping
- Default value assignment
- Required field validation
- Type compatibility checking

#### Transformations
- **Static Values**: Set fixed values for fields
- **Functions**: Apply built-in transformation functions
  - `toLowerCase`, `toUpperCase`, `trim`
  - `parseInt`, `parseFloat`
  - `formatDate`, `formatCurrency`
  - `slugify` for URL-safe strings
- **Lookup Tables**: Map values using key-value pairs
- **Concatenation**: Combine multiple source fields
- **Split**: Extract parts of source fields
- **Formatting**: Date and number formatting

#### Validation Rules
- **Required**: Field must have a value
- **Length**: Minimum and maximum length validation
- **Pattern**: Regular expression validation
- **Range**: Numeric range validation
- **Enum**: Value must be in allowed list
- **Custom**: Custom validation functions

### 2. Real-time Execution Monitoring

The execution monitoring system provides:

#### Progress Tracking
- Real-time progress updates
- Estimated time remaining
- Success/failure rates
- Record processing counts

#### Detailed Logging
- Multiple log levels (DEBUG, INFO, WARN, ERROR)
- Record-level error tracking
- Structured log details
- Export capabilities

#### Performance Metrics
- Processing speed (records/second)
- Success rates
- Error analysis
- Duration tracking

### 3. Joined Table Configuration

The import system supports creating virtual tables by joining multiple source tables together, enabling complex data relationships and consolidated imports.

#### Creating Joined Tables

1. **Multi-Table Selection**
   - Choose a primary table as the base for the join
   - Add additional tables to join with the primary table
   - Support for unlimited number of joined tables

2. **Join Configuration**
   - **Join Types**: Choose from INNER, LEFT, RIGHT, or FULL OUTER joins
   - **Visual Explanations**: Each join type includes explanation and use cases
   - **Join Conditions**: Define how tables relate to each other
   - **Table Aliases**: Optional aliases for joined tables to avoid naming conflicts

3. **Field Selection Interface**
   - **Collapsible Sections**: All field sections start collapsed by default for clean UI
   - **Selection Counters**: Shows "X / Y" selected fields for each table
   - **Interactive Headers**: Click to expand/collapse field lists
   - **Primary Table**: Clearly marked with special styling and "Primary" badge
   - **Join Key Indicators**: Fields used in join conditions are marked with "JOIN KEY" badge
   - **Bulk Actions**: "Select All" and "Clear All" buttons for quick field management

4. **Real-Time Join Preview**
   - **Live Data Preview**: Execute actual database joins with real data
   - **Sample Configuration**: Choose number of preview records (3, 5, 10, 20)
   - **Search and Filter**: Real-time filtering across all preview data
   - **Join Explanation**: Shows generated SQL and execution plan
   - **Matching Summary**: Displays matched vs unmatched records
   - **Performance Metrics**: Shows join execution details

5. **Database-Level Execution**
   - Uses `ConnectionManager.executeJoinQuery()` for accurate SQL joins
   - Supports all database types (MySQL, PostgreSQL, SQLite)
   - Proper handling of field selection in SQL generation
   - Fallback to mock joins if database connection fails

#### Join Preview API

New endpoint `/api/import/join-preview` provides:
- Real database join execution
- Field selection support
- Search parameter filtering
- Configurable result limits
- Error handling with graceful fallbacks

#### Field Selection Features

- **Granular Control**: Select individual fields from each table
- **Alias Support**: Automatic aliasing for joined table fields
- **Performance Optimization**: Only selected fields are included in final query
- **Visual Feedback**: Clear indication of selected vs available fields
- **Persistence**: Selected fields are saved with joined table configuration

### 4. Permission Integration

The import system is fully integrated with the ABAC permission system:

#### Permission Actions
- `imports:view` - View import configurations and executions
- `imports:create` - Create and edit configurations
- `imports:edit` - Modify existing configurations
- `imports:execute` - Run import executions
- `imports:delete` - Delete configurations

#### Security Features
- User isolation of configurations
- Audit trail for all operations
- Secure credential storage
- Permission-based UI rendering

## Usage Guide

### Creating an Import Configuration

1. **Navigate to Import Management**
   ```
   /import → New Import Configuration
   ```

2. **Basic Information**
   - Provide configuration name and description
   - Select source type
   - Choose target entity

3. **Source Configuration**
   - Configure connection details based on source type
   - Test connection to verify settings
   - Review discovered schema

4. **Field Mapping**
   - Map source fields to target entity fields
   - Configure transformations as needed
   - Set up validation rules
   - Review mapping summary

5. **Save and Activate**
   - Review complete configuration
   - Save and activate for execution

### Running an Import

1. **Execute Import**
   ```typescript
   // From configuration list
   <Button onClick={() => handleExecuteImport(config.id)}>
     Execute
   </Button>
   
   // API call
   const response = await fetch(`/api/import/configurations/${id}/execute`, {
     method: 'POST',
     body: JSON.stringify({ 
       dryRun: false,
       preview: false 
     })
   });
   ```

2. **Monitor Progress**
   - Real-time status updates
   - Progress indicators
   - Live log streaming
   - Performance metrics

3. **Review Results**
   - Execution summary
   - Error analysis
   - Success metrics
   - Detailed logs

### API Usage

#### Test Connection
```typescript
POST /api/import/test-connection
{
  "type": "DATABASE_MYSQL",
  "host": "localhost",
  "database": "source_db",
  "username": "user",
  "password": "pass"
}
```

#### Create Configuration
```typescript
POST /api/import/configurations
{
  "name": "User Import",
  "sourceType": "FILE_CSV",
  "connectionConfig": {
    "type": "FILE_CSV",
    "filePath": "/data/users.csv",
    "hasHeaders": true
  },
  "targetEntity": "User",
  "fieldMappings": [
    {
      "sourceField": "email",
      "targetField": "email",
      "required": true,
      "validation": [
        {
          "type": "pattern",
          "pattern": "^[^@]+@[^@]+\\.[^@]+$",
          "message": "Invalid email format"
        }
      ]
    }
  ]
}
```

#### Execute Import
```typescript
POST /api/import/configurations/{id}/execute
{
  "dryRun": false,
  "preview": false,
  "maxRecords": 1000
}
```

#### Monitor Execution
```typescript
GET /api/import/executions/{id}
GET /api/import/executions/{id}/logs?level=ERROR
```

#### Execute Join Preview
```typescript
POST /api/import/join-preview
{
  "connectionConfig": {
    "type": "DATABASE_MYSQL",
    "host": "localhost",
    "database": "source_db",
    "username": "user",
    "password": "pass"
  },
  "primaryTable": "users",
  "joinedTables": [
    {
      "tableName": "user_profiles",
      "joinType": "left",
      "joinConditions": [
        {
          "id": "cond-1",
          "sourceField": "id",
          "targetField": "user_id",
          "operator": "="
        }
      ],
      "alias": "profile"
    }
  ],
  "selectedFields": [
    {
      "tableName": "users",
      "fieldName": "email"
    },
    {
      "tableName": "users", 
      "fieldName": "name"
    },
    {
      "tableName": "user_profiles",
      "fieldName": "bio",
      "alias": "profile.bio"
    }
  ],
  "limit": 20,
  "search": "john"
}
```

## Data Type Mapping

### Source to Target Type Inference

The system automatically infers data types from source data:

| Source Type | Target Type | Notes |
|-------------|-------------|-------|
| VARCHAR/TEXT | string | Default string handling |
| INT/INTEGER | number | Numeric values |
| DECIMAL/FLOAT | number | Floating point numbers |
| BOOLEAN/BIT | boolean | Boolean values |
| DATE | date | Date-only values |
| DATETIME/TIMESTAMP | datetime | Date and time |
| JSON/JSONB | json | JSON objects |
| BLOB/BINARY | binary | Binary data |

### Type Conversion

Automatic type conversion is attempted when types don't match:

```typescript
// String to Number
"123" → 123
"123.45" → 123.45

// String to Boolean
"true" → true
"false" → false
"1" → true
"0" → false

// String to Date
"2024-01-15" → Date(2024-01-15)
"2024-01-15T10:30:00Z" → DateTime(2024-01-15T10:30:00Z)
```

## Error Handling

The system provides comprehensive error handling at multiple levels:

### Connection Errors
- Invalid credentials
- Network timeouts
- Schema access issues
- File not found errors

### Data Processing Errors
- Type conversion failures
- Validation rule violations
- Required field missing
- Constraint violations

### System Errors
- Database connection issues
- Permission violations
- Configuration errors
- Resource limitations

Each error is logged with:
- Error level (WARN/ERROR)
- Record index (if applicable)
- Detailed error message
- Stack trace (in details)
- Suggested resolution

## Performance Considerations

### Batch Processing
- Records are processed in batches for optimal performance
- Configurable batch sizes based on source type
- Memory usage optimization

### Connection Pooling
- Database connections are properly managed
- Connection reuse for multiple operations
- Automatic cleanup and timeout handling

### Progress Tracking
- Efficient progress updates every N records
- Minimal performance impact
- Real-time UI updates

### Large Dataset Handling
- Streaming processing for large files
- Memory-efficient record processing
- Automatic garbage collection

## Troubleshooting

### Common Issues

#### Connection Failures
1. Verify credentials and network connectivity
2. Check firewall settings
3. Validate SSL/TLS configuration
4. Test with minimal configuration

#### Mapping Errors
1. Review source schema discovery
2. Check data type compatibility
3. Validate transformation functions
4. Test with preview mode

#### Execution Failures
1. Check execution logs for details
2. Verify target entity permissions
3. Review validation rule conflicts
4. Test with dry-run mode first

#### Joined Table Issues
1. **Join Preview Failures**
   - Verify database connection is active
   - Check join conditions match existing data
   - Validate field names exist in source tables
   - Test with smaller sample sizes first

2. **No Join Results**
   - Review join type selection (try LEFT join for testing)
   - Verify join condition field types match
   - Check for null values in join key fields
   - Use search/filter to find matching records

3. **Performance Issues**
   - Reduce preview record count
   - Index join key fields in source database
   - Limit selected fields to essential ones only
   - Consider simpler join conditions

### Debug Mode

Enable debug logging for detailed troubleshooting:

```typescript
// In configuration
{
  "debugMode": true,
  "logLevel": "DEBUG"
}
```

This will provide:
- Detailed connection information
- Raw data samples
- Transformation steps
- Performance metrics

## Future Enhancements

### Planned Features
- **MongoDB Support**: Full NoSQL database integration
- **XML File Support**: Parse and import XML data
- **GraphQL APIs**: Support for GraphQL endpoints
- **Scheduled Imports**: Cron-based automatic imports
- **Data Deduplication**: Automatic duplicate detection
- **Advanced Relationships**: Complex relationship mapping
- **Incremental Imports**: Delta-based updates
- **Data Lineage**: Track data origin and transformations

### Performance Improvements
- **Parallel Processing**: Multi-threaded execution
- **Queue System**: Background job processing
- **Caching Layer**: Configuration and schema caching
- **Compression**: Data compression for large transfers

## Integration Points

### Permission System
- Uses `PermissionService` for all access control
- Supports account-level permissions
- Integration with role templates

### User Management
- Creator tracking for all configurations
- Execution history per user
- User preference storage

### Audit System
- All operations are logged
- Configuration changes tracked
- Execution audit trail

### Notification System (Planned)
- Import completion notifications
- Error alerts
- Progress updates

## API Reference

### Endpoints

#### Configurations
- `GET /api/import/configurations` - List configurations
- `POST /api/import/configurations` - Create configuration
- `GET /api/import/configurations/{id}` - Get configuration
- `PUT /api/import/configurations/{id}` - Update configuration
- `DELETE /api/import/configurations/{id}` - Delete configuration

#### Execution
- `POST /api/import/configurations/{id}/execute` - Execute import
- `GET /api/import/configurations/{id}/execute` - Get execution status
- `GET /api/import/executions/{id}` - Get execution details
- `POST /api/import/executions/{id}` - Cancel execution

#### Logs
- `GET /api/import/executions/{id}/logs` - Get execution logs
- `GET /api/import/executions/{id}/logs/export` - Export logs

#### Schema
- `POST /api/import/test-connection` - Test connection
- `GET /api/import/schema/entities` - Get target entities
- `GET /api/import/schema/fields?entity=User` - Get entity fields

#### Joined Tables
- `POST /api/import/join-preview` - Execute real database join preview
- `POST /api/import/table-preview` - Get sample data from individual tables

### Data Models

See the TypeScript definitions in `/src/lib/import/types.ts` for complete data models and interfaces.

## Security Considerations

### Data Protection
- Connection credentials are encrypted in storage
- Temporary data is cleaned up after processing
- No sensitive data in logs (configurable)

### Access Control
- All operations require appropriate permissions
- User isolation of configurations and executions
- Audit trail for compliance

### Network Security
- SSL/TLS support for all external connections
- Configurable connection timeouts
- Proper error handling without data leakage

The Import System provides a powerful, flexible, and secure solution for data integration needs within Service Vault, while maintaining complete isolation from existing business data and full integration with the application's security model.