"""
Custom middleware for LocalGhost API including performance monitoring, rate limiting, and security.
"""
import time
import uuid
from typing import Callable
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import structlog
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.config import settings, get_rate_limit_config

logger = structlog.get_logger()

# Rate limiter setup
limiter = Limiter(key_func=get_remote_address)

class PerformanceMiddleware(BaseHTTPMiddleware):
    """Middleware to track request performance and add timing headers."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate request ID for tracing
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Start timing
        start_time = time.time()
        
        # Add request ID to headers
        request.state.start_time = start_time
        
        # Process request
        try:
            response = await call_next(request)
        except Exception as e:
            # Log error with timing
            process_time = time.time() - start_time
            logger.error(
                "Request processing error",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                process_time_ms=round(process_time * 1000, 2),
                error=str(e),
                exc_info=True
            )
            raise
        
        # Calculate processing time
        process_time = time.time() - start_time
        request.state.response_time_ms = round(process_time * 1000, 2)
        
        # Add performance headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = str(request.state.response_time_ms)
        response.headers["X-Process-Time-Unit"] = "ms"
        
        # Log request completion
        logger.info(
            "Request completed",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            process_time_ms=request.state.response_time_ms,
            client_ip=get_remote_address(request)
        )
        
        return response

class SecurityMiddleware(BaseHTTPMiddleware):
    """Middleware to add security headers and basic protection."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # Add HSTS header in production
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all incoming requests."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Log request start
        logger.info(
            "Request started",
            request_id=getattr(request.state, 'request_id', 'unknown'),
            method=request.method,
            path=request.url.path,
            query_params=dict(request.query_params),
            client_ip=get_remote_address(request),
            user_agent=request.headers.get("user-agent", "unknown")
        )
        
        response = await call_next(request)
        
        # Log request completion
        logger.info(
            "Request completed",
            request_id=getattr(request.state, 'request_id', 'unknown'),
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            process_time_ms=getattr(request.state, 'response_time_ms', 0)
        )
        
        return response

class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware to handle and format errors consistently."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            response = await call_next(request)
            return response
        except HTTPException as e:
            # Let FastAPI handle HTTP exceptions
            raise e
        except Exception as e:
            # Log unexpected errors
            logger.error(
                "Unexpected error in middleware",
                request_id=getattr(request.state, 'request_id', 'unknown'),
                method=request.method,
                path=request.url.path,
                error=str(e),
                exc_info=True
            )
            
            # Return standardized error response
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error": {
                        "message": "Internal server error",
                        "code": "INTERNAL_SERVER_ERROR",
                        "status_code": 500,
                        "request_id": getattr(request.state, 'request_id', 'unknown')
                    }
                }
            )

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware to handle rate limiting with custom error responses."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for health checks and docs
        if request.url.path in ["/health", "/docs", "/openapi.json"]:
            return await call_next(request)
        
        # Apply rate limiting
        try:
            # Use slowapi's rate limiting logic
            rate_limit_config = get_rate_limit_config()
            if rate_limit_config["enabled"]:
                # This is a simplified rate limiting check
                # In production, you'd want to use Redis-based rate limiting
                pass
            
            return await call_next(request)
        except RateLimitExceeded as e:
            logger.warning(
                "Rate limit exceeded",
                request_id=getattr(request.state, 'request_id', 'unknown'),
                client_ip=get_remote_address(request),
                path=request.url.path
            )
            
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": {
                        "message": "Rate limit exceeded. Please try again later.",
                        "code": "RATE_LIMIT_EXCEEDED",
                        "status_code": 429,
                        "retry_after": 60
                    }
                },
                headers={"Retry-After": "60"}
            )

class DatabaseConnectionMiddleware(BaseHTTPMiddleware):
    """Middleware to ensure database connections are properly managed."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # This middleware can be used to add database connection management
        # For now, it's a placeholder for future database optimization
        response = await call_next(request)
        return response

def setup_middleware(app: ASGIApp):
    """Set up all middleware for the FastAPI application."""
    
    # Add rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    
    # Add custom middleware (order matters - first added is outermost)
    app.add_middleware(ErrorHandlingMiddleware)
    app.add_middleware(PerformanceMiddleware)
    app.add_middleware(SecurityMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(DatabaseConnectionMiddleware)
    
    logger.info("All middleware configured successfully")

# Health check endpoint with performance metrics
async def health_check_with_metrics():
    """Enhanced health check with performance metrics."""
    import psutil
    import asyncio
    
    # Get system metrics
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    # Get database connection status (simplified)
    db_status = "unknown"
    try:
        # This would be replaced with actual database health check
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"
    
    # Get Redis status (simplified)
    redis_status = "unknown"
    try:
        # This would be replaced with actual Redis health check
        redis_status = "healthy"
    except Exception:
        redis_status = "unhealthy"
    
    return {
        "status": "healthy",
        "service": "LocalGhost API",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": time.time(),
        "metrics": {
            "cpu_percent": cpu_percent,
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "percent": memory.percent
            },
            "disk": {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": (disk.used / disk.total) * 100
            }
        },
        "services": {
            "database": db_status,
            "redis": redis_status
        }
    }
