# Database Optimization with MCP Servers

Optimize my database queries and improve application performance.

## Use the following MCP servers:

### ⚡ Supabase
- Analyze query performance and bottlenecks
- Suggest indexing improvements
- Review database schema design
- Optimize data relationships

### 🧠 Sequential Thinking
- Analyze data access patterns
- Plan query optimization strategies
- Design caching mechanisms
- Suggest architectural improvements

### 📁 File System
- Review database configuration files
- Check migration scripts
- Analyze data import/export processes
- Examine backup procedures

## Current Database Issues:

**Performance Problems:**
- [List specific slow queries or operations]

**Schema Information:**
```sql
-- Current table structure
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add your current schema here
```

**Slow Queries:**
```sql
-- Example slow query
SELECT * FROM users
WHERE created_at > '2024-01-01'
ORDER BY name;
```

## Optimization Goals:

1. **Query Performance**: Reduce execution time by [target]%
2. **Index Usage**: Optimize index usage and coverage
3. **Connection Pooling**: Improve connection management
4. **Caching Strategy**: Implement effective caching
5. **Data Architecture**: Optimize data relationships

## Expected Deliverables:

1. **Optimized Queries**: Rewrite slow-performing queries
2. **Index Recommendations**: New indexes to create
3. **Schema Changes**: Suggested table modifications
4. **Configuration Updates**: Database settings to adjust
5. **Monitoring Plan**: How to track performance improvements


