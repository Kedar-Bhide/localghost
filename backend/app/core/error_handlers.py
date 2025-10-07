"""
Comprehensive error handling middleware and utilities for LocalGhost API.
"""
import logging
import traceback
from typing import Union
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from pydantic import ValidationError
import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

class LocalGhostException(Exception):
    """Base exception for LocalGhost application."""
    def __init__(self, message: str, error_code: str = None, status_code: int = 500):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        super().__init__(self.message)

class ValidationException(LocalGhostException):
    """Raised when input validation fails."""
    def __init__(self, message: str, field: str = None):
        super().__init__(message, "VALIDATION_ERROR", 400)
        self.field = field

class AuthenticationException(LocalGhostException):
    """Raised when authentication fails."""
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, "AUTH_ERROR", 401)

class AuthorizationException(LocalGhostException):
    """Raised when authorization fails."""
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, "AUTHZ_ERROR", 403)

class ResourceNotFoundException(LocalGhostException):
    """Raised when a requested resource is not found."""
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, "NOT_FOUND", 404)

class ConflictException(LocalGhostException):
    """Raised when there's a conflict with the current state."""
    def __init__(self, message: str = "Resource conflict"):
        super().__init__(message, "CONFLICT", 409)

class RateLimitException(LocalGhostException):
    """Raised when rate limit is exceeded."""
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(message, "RATE_LIMIT", 429)

class DatabaseException(LocalGhostException):
    """Raised when database operations fail."""
    def __init__(self, message: str = "Database operation failed"):
        super().__init__(message, "DATABASE_ERROR", 500)

class ExternalServiceException(LocalGhostException):
    """Raised when external service calls fail."""
    def __init__(self, message: str = "External service error"):
        super().__init__(message, "EXTERNAL_SERVICE_ERROR", 502)

def create_error_response(
    status_code: int,
    message: str,
    error_code: str = None,
    details: dict = None
) -> JSONResponse:
    """Create a standardized error response."""
    error_data = {
        "error": {
            "message": message,
            "code": error_code or "UNKNOWN_ERROR",
            "status_code": status_code
        }
    }
    
    if details:
        error_data["error"]["details"] = details
    
    return JSONResponse(
        status_code=status_code,
        content=error_data
    )

async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle FastAPI HTTP exceptions."""
    logger.warning(
        "HTTP exception occurred",
        status_code=exc.status_code,
        detail=exc.detail,
        path=request.url.path,
        method=request.method
    )
    
    return create_error_response(
        status_code=exc.status_code,
        message=str(exc.detail),
        error_code="HTTP_ERROR"
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle Pydantic validation errors."""
    logger.warning(
        "Validation error occurred",
        errors=exc.errors(),
        path=request.url.path,
        method=request.method
    )
    
    # Format validation errors for better client experience
    formatted_errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"])
        formatted_errors.append({
            "field": field,
            "message": error["msg"],
            "type": error["type"]
        })
    
    return create_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        message="Validation failed",
        error_code="VALIDATION_ERROR",
        details={"validation_errors": formatted_errors}
    )

async def localghost_exception_handler(request: Request, exc: LocalGhostException) -> JSONResponse:
    """Handle custom LocalGhost exceptions."""
    logger.error(
        "LocalGhost exception occurred",
        error_code=exc.error_code,
        message=exc.message,
        status_code=exc.status_code,
        path=request.url.path,
        method=request.method
    )
    
    return create_error_response(
        status_code=exc.status_code,
        message=exc.message,
        error_code=exc.error_code
    )

async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """Handle SQLAlchemy database exceptions."""
    logger.error(
        "Database error occurred",
        error_type=type(exc).__name__,
        error_message=str(exc),
        path=request.url.path,
        method=request.method,
        exc_info=True
    )
    
    # Handle specific database errors
    if isinstance(exc, IntegrityError):
        return create_error_response(
            status_code=status.HTTP_409_CONFLICT,
            message="Database integrity constraint violation",
            error_code="DATABASE_INTEGRITY_ERROR"
        )
    
    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message="Database operation failed",
        error_code="DATABASE_ERROR"
    )

async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    logger.error(
        "Unexpected error occurred",
        error_type=type(exc).__name__,
        error_message=str(exc),
        path=request.url.path,
        method=request.method,
        exc_info=True
    )
    
    # Don't expose internal error details in production
    message = "An unexpected error occurred"
    if request.app.debug:
        message = f"{type(exc).__name__}: {str(exc)}"
    
    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message=message,
        error_code="INTERNAL_SERVER_ERROR"
    )

def setup_error_handlers(app):
    """Register all error handlers with the FastAPI app."""
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(LocalGhostException, localghost_exception_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)

def log_request_info(request: Request):
    """Log request information for debugging."""
    logger.info(
        "Request received",
        method=request.method,
        path=request.url.path,
        query_params=dict(request.query_params),
        client_ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )

def log_response_info(request: Request, response: JSONResponse):
    """Log response information for debugging."""
    logger.info(
        "Response sent",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        response_time_ms=getattr(request.state, 'response_time_ms', None)
    )
