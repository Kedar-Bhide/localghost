# LocalGhost - Complete Database Schema

*Comprehensive database design for MVP with scalability and feature completeness. Designed for PostgreSQL with optional Supabase integration.*

---

## 1. Core User Management

### profiles
*Extends Supabase auth.users with application-specific data*
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role_enum NOT NULL DEFAULT 'traveler',
  full_name TEXT NOT NULL,
  bio TEXT,
  profile_picture_url TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE user_role_enum AS ENUM ('traveler', 'local');
```

### local_profiles
*Additional data specific to locals*
```sql
CREATE TABLE local_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  specialties TEXT[], -- ['coffee_expert', 'hiking_guide', 'nightlife']
  languages TEXT[] DEFAULT ARRAY['en'], -- ['en', 'es', 'fr']
  response_time_hours INTEGER DEFAULT 24,
  availability_status availability_enum DEFAULT 'available',
  total_conversations INTEGER DEFAULT 0,
  total_completed_itineraries INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE availability_enum AS ENUM ('available', 'busy', 'away', 'offline');
```

### user_locations
*Flexible location system supporting multiple locations per user*
```sql
CREATE TABLE user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  country_code TEXT NOT NULL, -- ISO country code
  coordinates POINT, -- PostGIS for geographic queries
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_locations_coordinates ON user_locations USING GIST(coordinates);
CREATE INDEX idx_user_locations_user_id ON user_locations(user_id);
```

---

## 2. Enhanced Chat System

### conversations
*Groups messages into conversations between users*
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traveler_id UUID NOT NULL REFERENCES profiles(id),
  local_id UUID NOT NULL REFERENCES profiles(id),
  status conversation_status_enum DEFAULT 'active',
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_conversation UNIQUE(traveler_id, local_id),
  CONSTRAINT different_users CHECK (traveler_id != local_id)
);

CREATE TYPE conversation_status_enum AS ENUM ('active', 'archived', 'blocked', 'deleted');
```

### messages
*Individual messages within conversations*
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  message_type message_type_enum DEFAULT 'text',
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE message_type_enum AS ENUM ('text', 'image', 'location', 'system');

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
```

---

## 3. Itinerary Request System

### itinerary_requests
*Custom itinerary requests from travelers to locals*
```sql
CREATE TABLE itinerary_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traveler_id UUID NOT NULL REFERENCES profiles(id),
  local_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  group_size INTEGER DEFAULT 1,
  preferences TEXT[], -- ['family_friendly', 'outdoor', 'cultural']
  special_requirements TEXT,
  status request_status_enum DEFAULT 'pending',
  estimated_delivery DATE,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_dates CHECK (start_date <= end_date),
  CONSTRAINT future_dates CHECK (start_date >= CURRENT_DATE),
  CONSTRAINT valid_group_size CHECK (group_size > 0)
);

CREATE TYPE request_status_enum AS ENUM (
  'pending', 'accepted', 'in_progress', 'completed', 'declined', 'cancelled'
);
```

### itinerary_proposals
*Local's response/proposal for itinerary requests*
```sql
CREATE TABLE itinerary_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES itinerary_requests(id) ON DELETE CASCADE,
  content JSONB NOT NULL, -- Structured itinerary data
  notes TEXT,
  delivery_date DATE,
  revision_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Pre-made Content System

### itinerary_templates
*Pre-made itineraries that locals can share*
```sql
CREATE TABLE itinerary_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  duration_days INTEGER NOT NULL,
  content JSONB NOT NULL,
  tags TEXT[],
  is_public BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Reviews & Rating System

### reviews
*Reviews with enhanced metadata*
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traveler_id UUID NOT NULL REFERENCES profiles(id),
  local_id UUID NOT NULL REFERENCES profiles(id),
  request_id UUID REFERENCES itinerary_requests(id), -- Optional: links to specific request
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  helpful_votes INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE, -- Verified interaction
  response_from_local TEXT, -- Local can respond to reviews
  response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_review UNIQUE(traveler_id, local_id, request_id)
);
```

---

## 6. Notification System

### notifications
*In-app and push notifications*
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type_enum NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  reference_id UUID, -- Links to related object
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  is_pushed BOOLEAN DEFAULT FALSE, -- Sent as push notification
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE notification_type_enum AS ENUM (
  'new_message', 'itinerary_request', 'request_accepted', 'request_completed',
  'new_review'
);

CREATE INDEX idx_notifications_user_id_unread ON notifications(user_id) WHERE is_read = FALSE;
```

---

## 7. Search & Discovery

### search_preferences
*User search and matching preferences*
```sql
CREATE TABLE search_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  preferred_languages TEXT[],
  preferred_age_range INT4RANGE,
  max_response_time_hours INTEGER,
  preferred_specialties TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### search_history
*Track user searches for recommendations*
```sql
CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query TEXT,
  location TEXT,
  filters JSONB,
  result_count INTEGER,
  clicked_profile_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. Database-Specific Features (PostgreSQL/Supabase)

### Row Level Security (RLS) Policies
*Optional: For Supabase deployment*
```sql
-- Enable RLS on all tables (Supabase)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- ... (enable for all tables)

-- Example policies (Supabase auth.uid())
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles  
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = traveler_id OR auth.uid() = local_id);
```

### Database Functions
```sql
-- Update conversation message count
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET message_count = message_count + 1,
      last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_count
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_message_count();
```

### Real-time Subscriptions
*Optional: For Supabase deployment*
```sql
-- Enable real-time for specific tables (Supabase)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
```

---

## 9. Indexes for Performance

```sql
-- User and location indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_active ON profiles(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_local_profiles_availability ON local_profiles(availability_status);
CREATE INDEX idx_user_locations_city_country ON user_locations(city, country);

-- Chat system indexes  
CREATE INDEX idx_conversations_participants ON conversations(traveler_id, local_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_unread ON messages(conversation_id) WHERE is_read = FALSE;

-- Search and discovery
CREATE INDEX idx_itinerary_requests_location_dates ON itinerary_requests(start_date, end_date);
CREATE INDEX idx_reviews_rating ON reviews(local_id, rating);

-- Full-text search
CREATE INDEX idx_profiles_search ON profiles USING gin(to_tsvector('english', full_name || ' ' || COALESCE(bio, '')));
CREATE INDEX idx_itinerary_templates_search ON itinerary_templates USING gin(to_tsvector('english', title || ' ' || description));
```

---

## 10. Migration Strategy

### Phase 1: Core MVP Tables
1. `profiles`, `local_profiles`, `user_locations`
2. `conversations`, `messages`
3. `itinerary_requests`, `itinerary_proposals`
4. Basic RLS policies

### Phase 2: Enhanced Features
1. `reviews`, `notifications`
2. `search_preferences`, `search_history`
3. `itinerary_templates`
4. Real-time subscriptions (if using Supabase)

### Phase 3: Advanced Features
1. Full-text search indexes
2. Advanced triggers and functions
3. Performance optimizations
4. Analytics and reporting tables

---

## 11. Security Considerations

### Data Protection
- All PII encrypted at rest
- Email addresses hashed for search
- API keys stored securely
- Regular security audits

### Access Control
- RLS enforces user data isolation (if using Supabase)
- API rate limiting at application level
- Input validation at database and application level
- Audit trails for sensitive operations

---

## 12. Scalability Features

### Database Optimization
- Partitioning for large tables (messages, search_history)
- Connection pooling (PgBouncer or Supabase)
- Read replicas for search queries
- Archived data retention policies

### Performance Monitoring
- Query performance tracking
- Index usage monitoring
- Connection monitoring
- Regular backup and recovery testing

---

*This schema provides a robust foundation for LocalGhost MVP while maintaining scalability for future growth. Compatible with PostgreSQL and optimized for use with either custom backend or Supabase.*