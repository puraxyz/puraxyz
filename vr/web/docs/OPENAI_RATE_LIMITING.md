# OpenAI Rate Limiting System

## Overview
This system implements a 24-hour rolling window rate limit for OpenAI API calls, allowing each user 24 requests per day.

## Implementation Details

### Database Schema
The system creates a `openai_usage` table with the following structure:
```sql
CREATE TABLE IF NOT EXISTS openai_usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  endpoint VARCHAR(255),
  INDEX idx_user_created (user_id, created_at)
);
```

### Rate Limiting Logic
- **Daily Limit**: 24 requests per user per 24-hour period
- **Rolling Window**: Uses a 24-hour rolling window (not calendar day)
- **Reset Time**: Each request expires exactly 24 hours after it was made
- **Database Tracking**: All API calls are logged with timestamps

### API Integration
Rate limiting is applied to all OpenAI endpoints:
- `/api/openai/analyze-profile`
- `/api/openai/analyze-analyzer`
- `/api/openai/analyze-profiler`
- `/api/openai/analyze-job-fit`

### Response Format
When rate limit is exceeded, APIs return:
```json
{
  "error": "Daily limit of 24 OpenAI requests exceeded. Try again after [time].",
  "rateLimitExceeded": true,
  "resetTime": "2024-01-01T12:00:00.000Z"
}
```
Status code: `429 Too Many Requests`

### Frontend Handling
All React components have been updated to:
- Display user-friendly rate limit messages
- Show exact reset time when limit is exceeded
- Handle rate limit errors gracefully

### Usage Statistics
Optional usage tracking is available via:
- **API Endpoint**: `/api/openai/usage` - Get current user usage stats
- **React Component**: `OpenAIUsageStats` - Display usage information

### Maintenance
The system includes automatic cleanup:
- `cleanupOldUsageRecords()` function removes records older than 7 days
- Should be called periodically (e.g., via cron job or scheduled function)

## Configuration
Rate limiting parameters can be adjusted in `/src/lib/openai/rateLimiter.ts`:
- `DAILY_LIMIT`: Number of requests per day (default: 24)
- `RATE_LIMIT_WINDOW_HOURS`: Window size in hours (default: 24)

## Error Handling
- Database errors don't block API calls (graceful degradation)
- Errors are logged for monitoring
- Fallback allows requests when rate limiting is unavailable

## Usage Examples

### Check Usage Stats
```javascript
const response = await fetch('/api/openai/usage');
const { usage } = await response.json();
// usage: { used: 5, remaining: 19, resetTime: "..." }
```

### Handle Rate Limit in Components
```javascript
try {
  const response = await fetch('/api/openai/analyze-profile', { ... });
  const data = await response.json();
  
  if (!response.ok && response.status === 429) {
    // Handle rate limit exceeded
    console.log('Rate limit exceeded, reset at:', data.resetTime);
  }
} catch (error) {
  // Handle other errors
}
```