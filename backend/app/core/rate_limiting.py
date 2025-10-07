"""
Advanced rate limiting implementation using Redis.
"""
import time
import json
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, status
from app.core.caching import cache_manager
from app.core.config import settings
import structlog

logger = structlog.get_logger()

class RateLimiter:
    """Redis-based rate limiter with multiple strategies."""
    
    def __init__(self):
        self.default_limit = settings.RATE_LIMIT_REQUESTS
        self.default_window = settings.RATE_LIMIT_WINDOW
    
    async def is_allowed(
        self,
        key: str,
        limit: Optional[int] = None,
        window: Optional[int] = None,
        strategy: str = "sliding_window"
    ) -> Dict[str, Any]:
        """
        Check if request is allowed based on rate limit.
        
        Args:
            key: Unique identifier for the rate limit (e.g., user_id, ip_address)
            limit: Maximum number of requests allowed
            window: Time window in seconds
            strategy: Rate limiting strategy ("sliding_window", "fixed_window", "token_bucket")
        
        Returns:
            Dict with allowed status and rate limit info
        """
        limit = limit or self.default_limit
        window = window or self.default_window
        
        if strategy == "sliding_window":
            return await self._sliding_window(key, limit, window)
        elif strategy == "fixed_window":
            return await self._fixed_window(key, limit, window)
        elif strategy == "token_bucket":
            return await self._token_bucket(key, limit, window)
        else:
            raise ValueError(f"Unknown rate limiting strategy: {strategy}")
    
    async def _sliding_window(self, key: str, limit: int, window: int) -> Dict[str, Any]:
        """Sliding window rate limiting implementation."""
        now = time.time()
        window_start = now - window
        
        # Get current requests
        cache_key = f"rate_limit:sliding:{key}"
        requests_data = await cache_manager.get(cache_key) or []
        
        # Filter requests within the window
        valid_requests = [req_time for req_time in requests_data if req_time > window_start]
        
        # Check if under limit
        if len(valid_requests) >= limit:
            return {
                "allowed": False,
                "limit": limit,
                "remaining": 0,
                "reset_time": min(valid_requests) + window,
                "retry_after": int(min(valid_requests) + window - now)
            }
        
        # Add current request
        valid_requests.append(now)
        
        # Store updated requests
        await cache_manager.set(cache_key, valid_requests, expire=window)
        
        return {
            "allowed": True,
            "limit": limit,
            "remaining": limit - len(valid_requests),
            "reset_time": now + window,
            "retry_after": 0
        }
    
    async def _fixed_window(self, key: str, limit: int, window: int) -> Dict[str, Any]:
        """Fixed window rate limiting implementation."""
        now = time.time()
        window_start = int(now // window) * window
        
        cache_key = f"rate_limit:fixed:{key}:{window_start}"
        
        # Get current count
        current_count = await cache_manager.get(cache_key) or 0
        
        if current_count >= limit:
            return {
                "allowed": False,
                "limit": limit,
                "remaining": 0,
                "reset_time": window_start + window,
                "retry_after": int(window_start + window - now)
            }
        
        # Increment count
        await cache_manager.increment(cache_key, 1)
        await cache_manager.set(cache_key, current_count + 1, expire=window)
        
        return {
            "allowed": True,
            "limit": limit,
            "remaining": limit - (current_count + 1),
            "reset_time": window_start + window,
            "retry_after": 0
        }
    
    async def _token_bucket(self, key: str, limit: int, window: int) -> Dict[str, Any]:
        """Token bucket rate limiting implementation."""
        now = time.time()
        cache_key = f"rate_limit:bucket:{key}"
        
        # Get bucket state
        bucket_data = await cache_manager.get(cache_key) or {
            "tokens": limit,
            "last_refill": now
        }
        
        # Calculate tokens to add based on time passed
        time_passed = now - bucket_data["last_refill"]
        tokens_to_add = min(limit, time_passed * (limit / window))
        
        # Refill bucket
        bucket_data["tokens"] = min(limit, bucket_data["tokens"] + tokens_to_add)
        bucket_data["last_refill"] = now
        
        # Check if request can be processed
        if bucket_data["tokens"] < 1:
            return {
                "allowed": False,
                "limit": limit,
                "remaining": 0,
                "reset_time": now + (1 / (limit / window)),
                "retry_after": int(1 / (limit / window))
            }
        
        # Consume token
        bucket_data["tokens"] -= 1
        
        # Store updated bucket
        await cache_manager.set(cache_key, bucket_data, expire=window * 2)
        
        return {
            "allowed": True,
            "limit": limit,
            "remaining": int(bucket_data["tokens"]),
            "reset_time": now + (1 / (limit / window)),
            "retry_after": 0
        }

# Global rate limiter instance
rate_limiter = RateLimiter()

def get_rate_limit_key(request: Request, user_id: Optional[str] = None) -> str:
    """Generate rate limit key based on request and user."""
    if user_id:
        return f"user:{user_id}"
    
    # Use IP address as fallback
    client_ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    if not client_ip:
        client_ip = request.headers.get("X-Real-IP", "")
    if not client_ip and request.client:
        client_ip = request.client.host
    
    return f"ip:{client_ip}"

async def check_rate_limit(
    request: Request,
    user_id: Optional[str] = None,
    limit: Optional[int] = None,
    window: Optional[int] = None,
    strategy: str = "sliding_window"
) -> Dict[str, Any]:
    """Check rate limit for request."""
    key = get_rate_limit_key(request, user_id)
    return await rate_limiter.is_allowed(key, limit, window, strategy)

def create_rate_limit_response(rate_limit_info: Dict[str, Any]) -> HTTPException:
    """Create HTTP 429 response for rate limit exceeded."""
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail={
            "error": {
                "message": "Rate limit exceeded",
                "code": "RATE_LIMIT_EXCEEDED",
                "status_code": 429,
                "limit": rate_limit_info["limit"],
                "remaining": rate_limit_info["remaining"],
                "reset_time": rate_limit_info["reset_time"],
                "retry_after": rate_limit_info["retry_after"]
            }
        },
        headers={
            "X-RateLimit-Limit": str(rate_limit_info["limit"]),
            "X-RateLimit-Remaining": str(rate_limit_info["remaining"]),
            "X-RateLimit-Reset": str(int(rate_limit_info["reset_time"])),
            "Retry-After": str(rate_limit_info["retry_after"])
        }
    )

# Rate limit decorators for different endpoints
def rate_limit(
    limit: Optional[int] = None,
    window: Optional[int] = None,
    strategy: str = "sliding_window",
    per_user: bool = True
):
    """Decorator for rate limiting endpoints."""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract request and user from function arguments
            request = None
            user = None
            
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                elif hasattr(arg, 'id'):  # User object
                    user = arg
            
            for value in kwargs.values():
                if isinstance(value, Request):
                    request = value
                elif hasattr(value, 'id'):  # User object
                    user = value
            
            if not request:
                # If no request found, skip rate limiting
                return await func(*args, **kwargs)
            
            user_id = str(user.id) if user and per_user else None
            rate_limit_info = await check_rate_limit(request, user_id, limit, window, strategy)
            
            if not rate_limit_info["allowed"]:
                raise create_rate_limit_response(rate_limit_info)
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator

# Predefined rate limits for different endpoint types
AUTH_RATE_LIMIT = rate_limit(limit=5, window=300, strategy="sliding_window", per_user=False)  # 5 per 5 minutes
API_RATE_LIMIT = rate_limit(limit=100, window=60, strategy="sliding_window")  # 100 per minute
UPLOAD_RATE_LIMIT = rate_limit(limit=10, window=60, strategy="sliding_window")  # 10 per minute
SEARCH_RATE_LIMIT = rate_limit(limit=30, window=60, strategy="sliding_window")  # 30 per minute
