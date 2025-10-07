"""
Security utilities and middleware for LocalGhost API.
"""
import re
import hashlib
import secrets
from typing import Optional, List, Dict, Any
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from app.core.config import settings
import structlog

logger = structlog.get_logger()

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security headers
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
}

class SecurityValidator:
    """Input validation and sanitization utilities."""
    
    # Common attack patterns
    SQL_INJECTION_PATTERNS = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)",
        r"(\b(OR|AND)\s+\d+\s*=\s*\d+)",
        r"(\b(OR|AND)\s+'.*'\s*=\s*'.*')",
        r"(--|#|\/\*|\*\/)",
        r"(\b(UNION|UNION ALL)\b)",
    ]
    
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"on\w+\s*=",
        r"<iframe[^>]*>.*?</iframe>",
        r"<object[^>]*>.*?</object>",
        r"<embed[^>]*>.*?</embed>",
    ]
    
    @classmethod
    def validate_email(cls, email: str) -> bool:
        """Validate email format and security."""
        if not email or len(email) > 254:
            return False
        
        # Basic email regex
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            return False
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'\.{2,}',  # Multiple consecutive dots
            r'@.*@',    # Multiple @ symbols
            r'\.@',     # Dot before @
            r'@\.',     # @ before dot
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, email):
                return False
        
        return True
    
    @classmethod
    def validate_password(cls, password: str) -> Dict[str, Any]:
        """Validate password strength and security."""
        if not password:
            return {"valid": False, "message": "Password is required"}
        
        if len(password) < 8:
            return {"valid": False, "message": "Password must be at least 8 characters long"}
        
        if len(password) > 128:
            return {"valid": False, "message": "Password must be less than 128 characters"}
        
        # Check for common weak patterns
        weak_patterns = [
            r'^[0-9]+$',  # Only numbers
            r'^[a-zA-Z]+$',  # Only letters
            r'^[^a-zA-Z0-9]+$',  # Only special characters
            r'(.)\1{3,}',  # Repeated characters
        ]
        
        for pattern in weak_patterns:
            if re.match(pattern, password):
                return {"valid": False, "message": "Password is too weak"}
        
        # Check for common passwords
        common_passwords = [
            "password", "123456", "123456789", "qwerty", "abc123",
            "password123", "admin", "letmein", "welcome", "monkey"
        ]
        
        if password.lower() in common_passwords:
            return {"valid": False, "message": "Password is too common"}
        
        return {"valid": True, "message": "Password is valid"}
    
    @classmethod
    def sanitize_string(cls, input_string: str, max_length: int = 1000) -> str:
        """Sanitize string input to prevent XSS and injection attacks."""
        if not input_string:
            return ""
        
        # Truncate if too long
        if len(input_string) > max_length:
            input_string = input_string[:max_length]
        
        # Remove null bytes
        input_string = input_string.replace('\x00', '')
        
        # Check for XSS patterns
        for pattern in cls.XSS_PATTERNS:
            if re.search(pattern, input_string, re.IGNORECASE):
                logger.warning("XSS pattern detected in input", pattern=pattern, input=input_string[:100])
                return ""
        
        # Check for SQL injection patterns
        for pattern in cls.SQL_INJECTION_PATTERNS:
            if re.search(pattern, input_string, re.IGNORECASE):
                logger.warning("SQL injection pattern detected in input", pattern=pattern, input=input_string[:100])
                return ""
        
        return input_string.strip()
    
    @classmethod
    def validate_uuid(cls, uuid_string: str) -> bool:
        """Validate UUID format."""
        uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        return bool(re.match(uuid_pattern, uuid_string, re.IGNORECASE))
    
    @classmethod
    def validate_file_upload(cls, filename: str, content_type: str, file_size: int) -> Dict[str, Any]:
        """Validate file upload security."""
        # Check file size
        if file_size > settings.MAX_FILE_SIZE:
            return {
                "valid": False,
                "message": f"File size exceeds maximum allowed size of {settings.MAX_FILE_SIZE} bytes"
            }
        
        # Check file extension
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
        file_extension = filename.lower().split('.')[-1] if '.' in filename else ''
        
        if f'.{file_extension}' not in allowed_extensions:
            return {
                "valid": False,
                "message": f"File type .{file_extension} is not allowed"
            }
        
        # Check MIME type
        if content_type not in settings.ALLOWED_FILE_TYPES:
            return {
                "valid": False,
                "message": f"Content type {content_type} is not allowed"
            }
        
        # Check for suspicious filename patterns
        suspicious_patterns = [
            r'\.\.',  # Directory traversal
            r'[<>:"|?*]',  # Invalid filename characters
            r'^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$',  # Windows reserved names
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, filename, re.IGNORECASE):
                return {
                    "valid": False,
                    "message": "Filename contains invalid characters or patterns"
                }
        
        return {"valid": True, "message": "File upload is valid"}

class RateLimiter:
    """Simple in-memory rate limiter."""
    
    def __init__(self):
        self.requests: Dict[str, List[float]] = {}
    
    def is_allowed(self, key: str, limit: int, window: int) -> bool:
        """Check if request is allowed based on rate limit."""
        now = time.time()
        
        # Clean old requests
        if key in self.requests:
            self.requests[key] = [
                req_time for req_time in self.requests[key]
                if now - req_time < window
            ]
        else:
            self.requests[key] = []
        
        # Check if under limit
        if len(self.requests[key]) >= limit:
            return False
        
        # Add current request
        self.requests[key].append(now)
        return True

# Global rate limiter instance
rate_limiter = RateLimiter()

def get_client_ip(request: Request) -> str:
    """Get client IP address from request."""
    # Check for forwarded headers first
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback to direct connection
    if request.client:
        return request.client.host
    
    return "unknown"

def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash."""
    return pwd_context.verify(plain_password, hashed_password)

def generate_secure_token(length: int = 32) -> str:
    """Generate cryptographically secure random token."""
    return secrets.token_urlsafe(length)

def generate_csrf_token() -> str:
    """Generate CSRF token."""
    return secrets.token_urlsafe(32)

def validate_csrf_token(token: str, session_token: str) -> bool:
    """Validate CSRF token."""
    return secrets.compare_digest(token, session_token)

def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe storage."""
    # Remove path components
    filename = filename.split('/')[-1].split('\\')[-1]
    
    # Remove or replace dangerous characters
    filename = re.sub(r'[<>:"|?*]', '_', filename)
    
    # Limit length
    if len(filename) > 255:
        name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
        filename = name[:255-len(ext)-1] + ('.' + ext if ext else '')
    
    return filename

def check_rate_limit(request: Request, limit: int = 100, window: int = 60) -> bool:
    """Check if request should be rate limited."""
    client_ip = get_client_ip(request)
    return rate_limiter.is_allowed(client_ip, limit, window)

def validate_request_headers(request: Request) -> bool:
    """Validate request headers for security."""
    # Check for suspicious headers
    suspicious_headers = [
        'X-Forwarded-Host',
        'X-Original-URL',
        'X-Rewrite-URL',
    ]
    
    for header in suspicious_headers:
        if header in request.headers:
            logger.warning("Suspicious header detected", header=header, value=request.headers[header])
            return False
    
    return True

def get_security_headers() -> Dict[str, str]:
    """Get security headers for response."""
    headers = SECURITY_HEADERS.copy()
    
    # Add HSTS in production
    if settings.ENVIRONMENT == "production":
        headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    
    return headers