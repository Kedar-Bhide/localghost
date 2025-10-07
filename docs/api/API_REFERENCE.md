# LocalGhost API Reference

## Overview

The LocalGhost API is a RESTful API built with FastAPI that enables peer-to-peer travel connections between travelers and local guides. The API provides endpoints for user authentication, profile management, messaging, itinerary requests, and more.

## Base URL

- **Development**: `http://localhost:8000/api/v1`
- **Production**: `https://api.localghost.com/api/v1`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Authentication endpoints**: 5 requests per 5 minutes per IP
- **General API endpoints**: 100 requests per minute per user
- **File upload endpoints**: 10 requests per minute per user
- **Search endpoints**: 30 requests per minute per user

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit resets

## Error Handling

The API returns standardized error responses:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "status_code": 400,
    "details": {}
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `AUTH_ERROR`: Authentication failed
- `AUTHZ_ERROR`: Authorization failed
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource conflict
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `DATABASE_ERROR`: Database operation failed
- `INTERNAL_SERVER_ERROR`: Internal server error

## Endpoints

### Authentication

#### POST /auth/signup
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "full_name": "John Doe",
  "role": "traveler"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "traveler"
  }
}
```

#### POST /auth/login
Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "traveler"
  }
}
```

#### POST /auth/logout
Logout user (client-side token removal).

**Response:**
```json
{
  "message": "Successfully logged out"
}
```

### User Management

#### GET /users/me
Get current user's profile information.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "traveler",
  "profile_picture_url": "https://example.com/avatar.jpg",
  "bio": "Travel enthusiast",
  "onboarding_completed": true,
  "is_active": true,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

#### PUT /users/me
Update current user's profile information.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "full_name": "John Smith",
  "bio": "Updated bio",
  "profile_picture_url": "https://example.com/new-avatar.jpg"
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Smith",
  "role": "traveler",
  "profile_picture_url": "https://example.com/new-avatar.jpg",
  "bio": "Updated bio",
  "onboarding_completed": true,
  "is_active": true,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T12:00:00Z"
}
```

#### GET /users/{user_id}
Get another user's public profile information.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "uuid",
  "full_name": "Jane Doe",
  "role": "local",
  "profile_picture_url": "https://example.com/avatar.jpg",
  "bio": "Local guide in Paris",
  "created_at": "2023-01-01T00:00:00Z"
}
```

### Local Guides

#### POST /locals/profile
Create or update local guide profile.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "specialties": ["food", "history", "art"],
  "languages": ["English", "French"],
  "response_time_hours": 12,
  "availability_status": "available"
}
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "specialties": ["food", "history", "art"],
  "languages": ["English", "French"],
  "response_time_hours": 12,
  "availability_status": "available",
  "total_conversations": 0,
  "total_completed_itineraries": 0,
  "average_rating": 0.0,
  "is_verified": false,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

#### GET /locals/search
Search for local guides.

**Query Parameters:**
- `q` (string, optional): Search query
- `city` (string, optional): Filter by city
- `country` (string, optional): Filter by country
- `specialties` (array, optional): Filter by specialties
- `languages` (array, optional): Filter by languages
- `limit` (integer, optional): Number of results (default: 20, max: 100)
- `offset` (integer, optional): Number of results to skip (default: 0)

**Response:**
```json
{
  "locals": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "full_name": "Jane Doe",
        "profile_picture_url": "https://example.com/avatar.jpg",
        "bio": "Local guide in Paris"
      },
      "specialties": ["food", "history"],
      "languages": ["English", "French"],
      "response_time_hours": 12,
      "availability_status": "available",
      "average_rating": 4.8,
      "total_completed_itineraries": 25
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

### Messaging

#### GET /chats
Get user's conversations.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (integer, optional): Number of conversations (default: 20)
- `offset` (integer, optional): Number of conversations to skip (default: 0)

**Response:**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "traveler": {
        "id": "uuid",
        "full_name": "John Doe",
        "profile_picture_url": "https://example.com/avatar.jpg"
      },
      "local": {
        "id": "uuid",
        "full_name": "Jane Doe",
        "profile_picture_url": "https://example.com/avatar.jpg"
      },
      "last_message_at": "2023-01-01T12:00:00Z",
      "last_message_content": "Hello!",
      "is_active": true,
      "created_at": "2023-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

#### POST /chats
Start a new conversation.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "local_id": "uuid"
}
```

**Response:**
```json
{
  "id": "uuid",
  "traveler": {
    "id": "uuid",
    "full_name": "John Doe",
    "profile_picture_url": "https://example.com/avatar.jpg"
  },
  "local": {
    "id": "uuid",
    "full_name": "Jane Doe",
    "profile_picture_url": "https://example.com/avatar.jpg"
  },
  "last_message_at": "2023-01-01T00:00:00Z",
  "last_message_content": null,
  "is_active": true,
  "created_at": "2023-01-01T00:00:00Z"
}
```

#### GET /chats/{conversation_id}/messages
Get messages in a conversation.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (integer, optional): Number of messages (default: 50)
- `offset` (integer, optional): Number of messages to skip (default: 0)

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "sender": {
        "id": "uuid",
        "full_name": "John Doe",
        "profile_picture_url": "https://example.com/avatar.jpg"
      },
      "content": "Hello!",
      "message_type": "text",
      "status": "delivered",
      "created_at": "2023-01-01T12:00:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

#### POST /chats/{conversation_id}/messages
Send a message in a conversation.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "content": "Hello!",
  "message_type": "text"
}
```

**Response:**
```json
{
  "id": "uuid",
  "conversation_id": "uuid",
  "sender": {
    "id": "uuid",
    "full_name": "John Doe",
    "profile_picture_url": "https://example.com/avatar.jpg"
  },
  "content": "Hello!",
  "message_type": "text",
  "status": "sent",
  "created_at": "2023-01-01T12:00:00Z"
}
```

### Itinerary Requests

#### GET /itineraries
Get itinerary requests.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `my_requests_only` (boolean, optional): Show only current user's requests (default: false)
- `status` (string, optional): Filter by status
- `destination_city` (string, optional): Filter by destination city
- `destination_country` (string, optional): Filter by destination country
- `limit` (integer, optional): Number of requests (default: 20)
- `offset` (integer, optional): Number of requests to skip (default: 0)

**Response:**
```json
{
  "requests": [
    {
      "id": "uuid",
      "traveler": {
        "id": "uuid",
        "full_name": "John Doe",
        "profile_picture_url": "https://example.com/avatar.jpg"
      },
      "local": {
        "id": "uuid",
        "full_name": "Jane Doe",
        "profile_picture_url": "https://example.com/avatar.jpg"
      },
      "title": "Paris Food Tour",
      "description": "Looking for a local food tour in Paris",
      "destination_city": "Paris",
      "destination_country": "France",
      "start_date": "2023-06-01",
      "end_date": "2023-06-03",
      "budget_min": 100,
      "budget_max": 300,
      "group_size": 2,
      "urgency": "medium",
      "status": "pending",
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

#### POST /itineraries
Create a new itinerary request.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Paris Food Tour",
  "description": "Looking for a local food tour in Paris",
  "destination_city": "Paris",
  "destination_country": "France",
  "start_date": "2023-06-01",
  "end_date": "2023-06-03",
  "budget_min": 100,
  "budget_max": 300,
  "group_size": 2,
  "urgency": "medium"
}
```

**Response:**
```json
{
  "id": "uuid",
  "traveler": {
    "id": "uuid",
    "full_name": "John Doe",
    "profile_picture_url": "https://example.com/avatar.jpg"
  },
  "local": null,
  "title": "Paris Food Tour",
  "description": "Looking for a local food tour in Paris",
  "destination_city": "Paris",
  "destination_country": "France",
  "start_date": "2023-06-01",
  "end_date": "2023-06-03",
  "budget_min": 100,
  "budget_max": 300,
  "group_size": 2,
  "urgency": "medium",
  "status": "pending",
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

### Reviews

#### GET /reviews
Get reviews.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `user_id` (string, optional): Filter by user ID
- `limit` (integer, optional): Number of reviews (default: 20)
- `offset` (integer, optional): Number of reviews to skip (default: 0)

**Response:**
```json
{
  "reviews": [
    {
      "id": "uuid",
      "reviewer": {
        "id": "uuid",
        "full_name": "John Doe",
        "profile_picture_url": "https://example.com/avatar.jpg"
      },
      "reviewee": {
        "id": "uuid",
        "full_name": "Jane Doe",
        "profile_picture_url": "https://example.com/avatar.jpg"
      },
      "rating": 5,
      "title": "Amazing experience!",
      "content": "Jane was an excellent guide. Highly recommended!",
      "communication_rating": 5,
      "knowledge_rating": 5,
      "reliability_rating": 5,
      "value_rating": 5,
      "is_verified": true,
      "created_at": "2023-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

#### POST /reviews
Create a new review.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "reviewee_id": "uuid",
  "proposal_id": "uuid",
  "rating": 5,
  "title": "Amazing experience!",
  "content": "Jane was an excellent guide. Highly recommended!",
  "communication_rating": 5,
  "knowledge_rating": 5,
  "reliability_rating": 5,
  "value_rating": 5
}
```

**Response:**
```json
{
  "id": "uuid",
  "reviewer": {
    "id": "uuid",
    "full_name": "John Doe",
    "profile_picture_url": "https://example.com/avatar.jpg"
  },
  "reviewee": {
    "id": "uuid",
    "full_name": "Jane Doe",
    "profile_picture_url": "https://example.com/avatar.jpg"
  },
  "rating": 5,
  "title": "Amazing experience!",
  "content": "Jane was an excellent guide. Highly recommended!",
  "communication_rating": 5,
  "knowledge_rating": 5,
  "reliability_rating": 5,
  "value_rating": 5,
  "is_verified": false,
  "created_at": "2023-01-01T00:00:00Z"
}
```

### Notifications

#### GET /notifications
Get user notifications.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `unread_only` (boolean, optional): Show only unread notifications (default: false)
- `limit` (integer, optional): Number of notifications (default: 20)
- `offset` (integer, optional): Number of notifications to skip (default: 0)

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "type": "message",
      "title": "New message",
      "content": "You have a new message from Jane Doe",
      "data": {
        "conversation_id": "uuid",
        "sender_id": "uuid"
      },
      "is_read": false,
      "priority": "normal",
      "created_at": "2023-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

#### PUT /notifications/{notification_id}/read
Mark notification as read.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Notification marked as read"
}
```

### Analytics

#### GET /analytics/dashboard
Get user analytics dashboard data.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "user_stats": {
    "total_conversations": 10,
    "total_itinerary_requests": 5,
    "total_reviews_received": 3,
    "average_rating": 4.8
  },
  "recent_activity": [
    {
      "type": "message",
      "description": "New message from Jane Doe",
      "timestamp": "2023-01-01T12:00:00Z"
    }
  ],
  "performance_metrics": {
    "response_time_avg": 2.5,
    "completion_rate": 0.95
  }
}
```

## WebSocket Endpoints

### /ws/chats/{conversation_id}
Real-time messaging WebSocket endpoint.

**Query Parameters:**
- `token` (string, required): JWT authentication token

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/chats/uuid?token=your-jwt-token');
```

**Message Format:**
```json
{
  "type": "message",
  "content": "Hello!",
  "message_type": "text"
}
```

**Response Format:**
```json
{
  "type": "message",
  "id": "uuid",
  "sender": {
    "id": "uuid",
    "full_name": "John Doe"
  },
  "content": "Hello!",
  "message_type": "text",
  "timestamp": "2023-01-01T12:00:00Z"
}
```

## Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict
- `422 Unprocessable Entity`: Validation error
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Pagination

List endpoints support pagination with the following query parameters:

- `limit`: Number of items per page (default: 20, max: 100)
- `offset`: Number of items to skip (default: 0)

Pagination metadata is included in responses:

```json
{
  "data": [...],
  "total": 100,
  "limit": 20,
  "offset": 0,
  "has_more": true
}
```

## Rate Limiting

Rate limits are applied per IP address and per user. When rate limits are exceeded, the API returns a `429 Too Many Requests` status with the following headers:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit resets
- `Retry-After`: Seconds to wait before retrying

## Security

The API implements several security measures:

- JWT authentication with secure token generation
- Rate limiting to prevent abuse
- Input validation and sanitization
- CORS protection
- Security headers (HSTS, XSS protection, etc.)
- SQL injection prevention
- XSS protection

## SDKs and Libraries

Official SDKs are available for:

- JavaScript/TypeScript (Node.js and Browser)
- Python
- PHP
- Ruby

## Support

For API support and questions:

- Email: api-support@localghost.com
- Documentation: https://docs.localghost.com
- Status Page: https://status.localghost.com
