"""
Redis-based caching system for LocalGhost API performance optimization.
"""
import json
import asyncio
from typing import Any, Optional, Union
from datetime import timedelta
import aioredis
from app.core.config import settings
import structlog

logger = structlog.get_logger()

class CacheManager:
    """Redis-based cache manager with connection pooling and error handling."""
    
    def __init__(self):
        self.redis: Optional[aioredis.Redis] = None
        self._connection_pool: Optional[aioredis.ConnectionPool] = None
    
    async def connect(self):
        """Initialize Redis connection."""
        try:
            if not self.redis:
                self._connection_pool = aioredis.ConnectionPool.from_url(
                    settings.REDIS_URL,
                    max_connections=20,
                    retry_on_timeout=True
                )
                self.redis = aioredis.Redis(connection_pool=self._connection_pool)
                
                # Test connection
                await self.redis.ping()
                logger.info("Redis cache connected successfully")
        except Exception as e:
            logger.error("Failed to connect to Redis", error=str(e))
            # Fallback to no caching
            self.redis = None
    
    async def disconnect(self):
        """Close Redis connection."""
        if self.redis:
            await self.redis.close()
            if self._connection_pool:
                await self._connection_pool.disconnect()
            logger.info("Redis cache disconnected")
    
    def _serialize(self, data: Any) -> str:
        """Serialize data for Redis storage."""
        return json.dumps(data, default=str)
    
    def _deserialize(self, data: str) -> Any:
        """Deserialize data from Redis storage."""
        return json.loads(data)
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if not self.redis:
            return None
        
        try:
            value = await self.redis.get(key)
            if value:
                return self._deserialize(value)
            return None
        except Exception as e:
            logger.warning("Cache get error", key=key, error=str(e))
            return None
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        expire: Optional[Union[int, timedelta]] = None
    ) -> bool:
        """Set value in cache with optional expiration."""
        if not self.redis:
            return False
        
        try:
            serialized_value = self._serialize(value)
            if expire:
                if isinstance(expire, timedelta):
                    expire = int(expire.total_seconds())
                await self.redis.setex(key, expire, serialized_value)
            else:
                await self.redis.set(key, serialized_value)
            return True
        except Exception as e:
            logger.warning("Cache set error", key=key, error=str(e))
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        if not self.redis:
            return False
        
        try:
            result = await self.redis.delete(key)
            return bool(result)
        except Exception as e:
            logger.warning("Cache delete error", key=key, error=str(e))
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        if not self.redis:
            return 0
        
        try:
            keys = await self.redis.keys(pattern)
            if keys:
                return await self.redis.delete(*keys)
            return 0
        except Exception as e:
            logger.warning("Cache delete pattern error", pattern=pattern, error=str(e))
            return 0
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        if not self.redis:
            return False
        
        try:
            result = await self.redis.exists(key)
            return bool(result)
        except Exception as e:
            logger.warning("Cache exists error", key=key, error=str(e))
            return False
    
    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment numeric value in cache."""
        if not self.redis:
            return None
        
        try:
            return await self.redis.incrby(key, amount)
        except Exception as e:
            logger.warning("Cache increment error", key=key, error=str(e))
            return None
    
    async def ping(self) -> bool:
        """Test Redis connection."""
        if not self.redis:
            return False
        
        try:
            await self.redis.ping()
            return True
        except Exception as e:
            logger.warning("Cache ping error", error=str(e))
            return False

# Global cache manager instance
cache_manager = CacheManager()

# Cache key generators
def user_cache_key(user_id: str) -> str:
    """Generate cache key for user data."""
    return f"user:{user_id}"

def local_profile_cache_key(user_id: str) -> str:
    """Generate cache key for local profile data."""
    return f"local_profile:{user_id}"

def conversation_cache_key(conversation_id: str) -> str:
    """Generate cache key for conversation data."""
    return f"conversation:{conversation_id}"

def itinerary_request_cache_key(request_id: str) -> str:
    """Generate cache key for itinerary request data."""
    return f"itinerary_request:{request_id}"

def search_cache_key(query: str, filters: dict) -> str:
    """Generate cache key for search results."""
    filter_str = json.dumps(filters, sort_keys=True)
    return f"search:{hash(query + filter_str)}"

def analytics_cache_key(user_id: str, period: str) -> str:
    """Generate cache key for analytics data."""
    return f"analytics:{user_id}:{period}"

# Cache decorators
def cache_result(key_func, expire: int = 300):
    """
    Decorator to cache function results.
    
    Args:
        key_func: Function to generate cache key from function arguments
        expire: Cache expiration time in seconds (default: 5 minutes)
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = key_func(*args, **kwargs)
            
            # Try to get from cache
            cached_result = await cache_manager.get(cache_key)
            if cached_result is not None:
                logger.debug("Cache hit", key=cache_key, function=func.__name__)
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache_manager.set(cache_key, result, expire)
            logger.debug("Cache miss, result cached", key=cache_key, function=func.__name__)
            
            return result
        
        return wrapper
    return decorator

def invalidate_cache_pattern(pattern: str):
    """
    Decorator to invalidate cache entries matching a pattern after function execution.
    
    Args:
        pattern: Redis pattern to match keys for invalidation
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            await cache_manager.delete_pattern(pattern)
            logger.debug("Cache invalidated", pattern=pattern, function=func.__name__)
            return result
        
        return wrapper
    return decorator

# Cache invalidation helpers
async def invalidate_user_cache(user_id: str):
    """Invalidate all cache entries for a user."""
    patterns = [
        f"user:{user_id}",
        f"local_profile:{user_id}",
        f"analytics:{user_id}:*"
    ]
    
    for pattern in patterns:
        await cache_manager.delete_pattern(pattern)

async def invalidate_conversation_cache(conversation_id: str):
    """Invalidate conversation-related cache entries."""
    await cache_manager.delete_pattern(f"conversation:{conversation_id}")

async def invalidate_search_cache():
    """Invalidate all search result caches."""
    await cache_manager.delete_pattern("search:*")

# Cache warming functions
async def warm_user_cache(user_id: str, user_data: dict):
    """Warm cache with user data."""
    await cache_manager.set(user_cache_key(user_id), user_data, expire=1800)  # 30 minutes

async def warm_local_profile_cache(user_id: str, profile_data: dict):
    """Warm cache with local profile data."""
    await cache_manager.set(local_profile_cache_key(user_id), profile_data, expire=1800)  # 30 minutes
