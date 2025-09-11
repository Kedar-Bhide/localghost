# LocalGhost - Complete UX Specification

*A comprehensive guide for MVP development including UI flows, API endpoints, and technical considerations.*

---

## 1. Global UI Guidelines

- **Design Language**: Modern, Airbnb-inspired interface
- **Navigation**: Fixed navbar with Home | Search | Messages | Profile
- **Footer**: Optional (minimal approach for MVP)
- **Responsive**: Mobile-first design approach

---

## 2. Pages, Flows & Complete Endpoint Mapping

### A. Landing Page (Home)
**UI Components:**
- Hero section with value proposition
- Call-to-action buttons
- "Get Started" → Login/Signup flow
- "Explore Locals" → Search page

**Endpoints:**
- No backend calls on initial load
- Navigation handled client-side

---

### B. Sign Up / Login Page
**UI Components:**
- Tabbed interface (Login/Signup)
- Role selection radio buttons (Traveler/Local)
- Email/password fields
- Social login options (future enhancement)

**Endpoints:**
```
POST /auth/signup
  Body: { email, password, role, firstName, lastName }
  Response: { user, token, expiresAt }

POST /auth/login
  Body: { email, password }
  Response: { user, token, expiresAt }

POST /auth/logout
  Headers: { Authorization: Bearer <token> }
  Response: { message: "Logged out successfully" }

GET /users/{id}
  Headers: { Authorization: Bearer <token> }
  Response: { user profile data }
```

**Error Handling:**
- Invalid credentials: 401 with user-friendly message
- Validation errors: 400 with field-specific errors
- Server errors: 500 with fallback UI

---

### C. Traveler Flow – Search Page
**UI Components:**
- Search bar with location autocomplete
- Tag filter chips (cafes, hikes, culture, nightlife, etc.)
- Grid/list view of local profiles
- Pagination controls
- Empty state for no results

**Endpoints:**
```
GET /locals?location={city}&tags={tag1,tag2}&page={n}&limit={20}
  Response: { 
    locals: [...], 
    pagination: { page, limit, total, hasNext },
    filters: { location, tags }
  }

GET /locals/{id}
  Response: { local profile with full details }
```

**Edge Cases & Error Handling:**
- Empty results: Show encouraging message with search tips
- Invalid location: Suggest alternatives or show global results
- Network errors: Retry mechanism with offline indicator
- Slow searches: Loading states with skeleton UI

---

### D. Local Profile Page
**UI Components:**
- Profile header (photo, name, rating)
- Bio section with rich text
- Interest tags as badges
- Action buttons: "Start Chat", "Request Itinerary"
- Reviews/testimonials section (future)

**Endpoints:**
```
GET /locals/{id}
  Response: { local profile, stats, availability }

POST /chats/
  Body: { localId, initialMessage? }
  Response: { chatId, threadUrl }

POST /itineraries/
  Body: { localId, title, dates, preferences, notes }
  Response: { itineraryId, status: "pending" }
```

---

### E. Chat Page
**UI Components:**
- Sidebar: conversation list with search
- Main area: message thread with typing indicators
- Message composer with attachment support
- Message limit indicator (after 3rd message)
- Payment prompt overlay (after 5th message)

**Endpoints:**
```
GET /chats/
  Headers: { Authorization: Bearer <token> }
  Response: { chats: [{ id, participants, lastMessage, unreadCount }] }

GET /chats/{id}
  Response: { chat details, participants, metadata }

GET /chats/{id}/messages?page={n}&limit={50}
  Response: { 
    messages: [...], 
    pagination: {...},
    messageCount: number,
    hasReachedLimit: boolean 
  }

POST /chats/{id}/messages
  Body: { content, type: "text|image|location" }
  Response: { message, messageCount }

# Real-time endpoints
WS /chats/{id}/live
  Events: message_sent, message_read, typing_start, typing_stop
```

**Business Logic:**
- Unlimited messaging for MVP
- Real-time updates via WebSocket
- Message read receipts
- Typing indicators

---

### F. Itinerary Request Page
**UI Components:**
- Multi-step form wizard
- Date range picker
- Preference tags selector
- Rich text area for special requests
- Budget range slider (optional)

**Endpoints:**
```
POST /itineraries/
  Body: { 
    localId, 
    title, 
    startDate, 
    endDate, 
    preferences: [tags], 
    notes,
    budget?: { min, max, currency }
  }
  Response: { itinerary with status: "pending" }

GET /itineraries/{id}
  Response: { full itinerary details }

PATCH /itineraries/{id}
  Body: { status: "pending|accepted|in_progress|completed|declined" }
  Response: { updated itinerary }

POST /itineraries/{id}/proposals
  Body: { content, estimatedCost?, deliveryDate }
  Response: { proposal details }
```

**Enhanced Status Flow:**
- `pending` → Local hasn't responded
- `accepted` → Local agreed to work on it  
- `in_progress` → Local actively creating itinerary
- `completed` → Itinerary delivered
- `declined` → Local declined the request

---

### G. Messages Page (Global Chat List)
**UI Components:**
- Search bar for filtering conversations
- Chat previews with unread indicators
- Filter tabs: All, Active, Archived
- Infinite scroll for chat history

**Endpoints:**
```
GET /chats/?filter={all|active|archived}&search={query}
  Response: { chats with preview data }

PATCH /chats/{id}
  Body: { status: "archived|active" }
  Response: { updated chat }
```

---

### H. Profile Page

#### Traveler View
**UI Components:**
- Profile header (edit mode toggle)
- Stats: chats started, itineraries requested
- Tabs: "My Conversations", "My Requests", "Account Settings"

**Endpoints:**
```
GET /users/{id}
  Response: { profile, stats, preferences }

PATCH /users/{id}
  Body: { firstName?, lastName?, bio?, avatar? }
  Response: { updated user }

GET /itineraries/?role=traveler
  Response: { user's itinerary requests }
```

#### Local View
**UI Components:**
- Profile management with preview mode
- Expertise tags editor
- Availability calendar
- Performance metrics dashboard
- Tabs: "Profile", "Conversations", "Requests", "Settings"

**Endpoints:**
```
PATCH /locals/{id}
  Body: { 
    tags?, 
    bio?, 
    specialties?, 
    availability?
  }
  Response: { updated local profile }

GET /itineraries/?role=local
  Response: { itineraries assigned to this local }

GET /locals/{id}/stats
  Response: { 
    totalChats, 
    completedItineraries, 
    rating, 
    responseTime 
  }
```

---

## 3. Complete User Journeys

### 1. Traveler Discovery & Connection
```
Home → Search (GET /locals) → Apply Filters → 
Local Profile (GET /locals/{id}) → 
[Start Chat (POST /chats/) OR Request Itinerary (POST /itineraries/)] →
Chat/Request Management
```

### 2. Local Onboarding & Setup
```
Signup (POST /auth/signup) → 
Profile Setup (PATCH /users/{id}, PATCH /locals/{id}) → 
Tag Selection → Availability Setup → 
Live in Search Results (GET /locals)
```

### 3. Enhanced Chat Flow
```
Local Profile → Start Chat (POST /chats/) → 
Exchange Messages (WebSocket) → 
Real-time conversation with read receipts
```

### 4. Complete Itinerary Workflow
```
Traveler Request (POST /itineraries/) → 
Local Notification → Local Review (GET /itineraries/{id}) → 
Accept/Decline (PATCH /itineraries/{id}) → 
If Accepted: In Progress → Delivery → Completion
```

---

## 4. Technical Considerations & Error Handling

### Authentication & Security
- JWT tokens with refresh mechanism
- Rate limiting on auth endpoints
- Password strength validation
- Account verification via email

### Data Validation Patterns
```javascript
// Example validation schema
{
  email: "Valid email format required",
  password: "Minimum 8 characters, 1 uppercase, 1 number",
  location: "Valid city/country format",
  tags: "Array of predefined tag IDs",
  dates: "Future dates only, start < end"
}
```

### Error Response Format
```json
{
  "error": true,
  "message": "User-friendly error message",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "Specific field error"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Real-time Features
- WebSocket connections for live chat
- Server-sent events for notifications
- Optimistic UI updates with rollback
- Connection retry logic

### Performance Considerations
- Image optimization and CDN
- API response caching
- Infinite scroll pagination
- Lazy loading for heavy components

---

## 5. Future Enhancements

### Phase 2 Features
- Video/voice calling integration
- Advanced itinerary collaboration
- Payment processing integration
- Review and rating system
- Group travel support

### Future Enhancements
- Advanced matching algorithms
- Video/voice calling integration
- Mobile app development
- Multi-language support

---

## 6. Implementation Priority

### MVP Core (Week 1-4)
1. Authentication system
2. Basic profile management
3. Search and discovery
4. Simple messaging

### MVP Complete (Week 5-8)
1. Real-time chat with limits
2. Itinerary request system
3. Enhanced error handling
4. Mobile responsive design

### Post-MVP (Week 9+)
1. Payment integration
2. Advanced matching algorithms
3. Performance optimizations
4. Analytics and insights

---

*This specification serves as the single source of truth for LocalGhost MVP development. All implementation decisions should align with these guidelines to ensure consistent user experience and technical architecture.*