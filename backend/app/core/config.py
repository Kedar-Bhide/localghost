"""
Configuration management for LocalGhost API.
"""
import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Application
    APP_NAME: str = "LocalGhost API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = Field(default=False, env="DEBUG")
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    
    # Database
    DATABASE_URL: str = Field(env="DATABASE_URL")
    DATABASE_POOL_SIZE: int = Field(default=10, env="DATABASE_POOL_SIZE")
    DATABASE_MAX_OVERFLOW: int = Field(default=20, env="DATABASE_MAX_OVERFLOW")
    
    # Redis Cache
    REDIS_URL: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")
    CACHE_TTL: int = Field(default=300, env="CACHE_TTL")  # 5 minutes default
    
    # Security
    SECRET_KEY: str = Field(env="SECRET_KEY")
    ACCESS_TOKEN_EXPIRE_HOURS: int = Field(default=24, env="ACCESS_TOKEN_EXPIRE_HOURS")
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, env="REFRESH_TOKEN_EXPIRE_DAYS")
    ALGORITHM: str = Field(default="HS256", env="ALGORITHM")
    
    # CORS
    ALLOWED_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "https://trylocalghost.vercel.app"],
        env="ALLOWED_ORIGINS"
    )
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = Field(default=True, env="RATE_LIMIT_ENABLED")
    RATE_LIMIT_REQUESTS: int = Field(default=100, env="RATE_LIMIT_REQUESTS")
    RATE_LIMIT_WINDOW: int = Field(default=60, env="RATE_LIMIT_WINDOW")  # seconds
    
    # File Upload
    MAX_FILE_SIZE: int = Field(default=10 * 1024 * 1024, env="MAX_FILE_SIZE")  # 10MB
    ALLOWED_FILE_TYPES: List[str] = Field(
        default=["image/jpeg", "image/png", "image/webp"],
        env="ALLOWED_FILE_TYPES"
    )
    
    # Email (for notifications)
    SMTP_HOST: Optional[str] = Field(default=None, env="SMTP_HOST")
    SMTP_PORT: int = Field(default=587, env="SMTP_PORT")
    SMTP_USERNAME: Optional[str] = Field(default=None, env="SMTP_USERNAME")
    SMTP_PASSWORD: Optional[str] = Field(default=None, env="SMTP_PASSWORD")
    SMTP_USE_TLS: bool = Field(default=True, env="SMTP_USE_TLS")
    
    # Monitoring
    SENTRY_DSN: Optional[str] = Field(default=None, env="SENTRY_DSN")
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    
    # Performance
    QUERY_TIMEOUT: int = Field(default=30, env="QUERY_TIMEOUT")  # seconds
    MAX_CONCURRENT_REQUESTS: int = Field(default=100, env="MAX_CONCURRENT_REQUESTS")
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = Field(default=20, env="DEFAULT_PAGE_SIZE")
    MAX_PAGE_SIZE: int = Field(default=100, env="MAX_PAGE_SIZE")
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Global settings instance
settings = Settings()

# Environment-specific configurations
def get_database_config():
    """Get database configuration based on environment."""
    return {
        "url": settings.DATABASE_URL,
        "pool_size": settings.DATABASE_POOL_SIZE,
        "max_overflow": settings.DATABASE_MAX_OVERFLOW,
        "pool_timeout": 30,
        "pool_recycle": 3600,
        "echo": settings.DEBUG,
    }

def get_redis_config():
    """Get Redis configuration."""
    return {
        "url": settings.REDIS_URL,
        "max_connections": 20,
        "retry_on_timeout": True,
        "socket_timeout": 5,
        "socket_connect_timeout": 5,
    }

def get_cors_config():
    """Get CORS configuration."""
    return {
        "allow_origins": settings.ALLOWED_ORIGINS,
        "allow_credentials": True,
        "allow_methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        "allow_headers": ["*"],
    }

def get_rate_limit_config():
    """Get rate limiting configuration."""
    return {
        "enabled": settings.RATE_LIMIT_ENABLED,
        "requests": settings.RATE_LIMIT_REQUESTS,
        "window": settings.RATE_LIMIT_WINDOW,
    }
