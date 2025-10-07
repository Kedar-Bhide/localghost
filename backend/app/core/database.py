from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import MetaData, event
import asyncio
import structlog
from app.core.config import settings, get_database_config

logger = structlog.get_logger()

# Get database configuration
db_config = get_database_config()

# Create async engine with optimized settings
engine = create_async_engine(
    db_config["url"],
    pool_size=db_config["pool_size"],
    max_overflow=db_config["max_overflow"],
    pool_timeout=db_config["pool_timeout"],
    pool_recycle=db_config["pool_recycle"],
    pool_pre_ping=True,
    echo=db_config["echo"],
    # Connection arguments for better performance
    connect_args={
        "command_timeout": settings.QUERY_TIMEOUT,
        "server_settings": {
            "application_name": "localghost_api",
            "jit": "off",  # Disable JIT for better performance in some cases
        }
    }
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=True,
    autocommit=False
)

# Base class for all models
class Base(DeclarativeBase):
    metadata = MetaData()

# Database connection event handlers
@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Set database pragmas for better performance."""
    if "postgresql" in str(dbapi_connection):
        with dbapi_connection.cursor() as cursor:
            # Optimize PostgreSQL settings
            cursor.execute("SET default_statistics_target = 100")
            cursor.execute("SET random_page_cost = 1.1")
            cursor.execute("SET effective_cache_size = '1GB'")

# Dependency to get database session with proper error handling
async def get_db() -> AsyncSession:
    """Get database session with proper connection management."""
    session = AsyncSessionLocal()
    try:
        yield session
    except Exception as e:
        logger.error("Database session error", error=str(e), exc_info=True)
        await session.rollback()
        raise
    finally:
        await session.close()

# Database initialization
async def init_db():
    """Initialize database connection and verify connectivity."""
    try:
        # Test database connection
        async with engine.begin() as conn:
            await conn.execute("SELECT 1")
        
        logger.info("Database connection established successfully")
        return True
    except Exception as e:
        logger.error("Failed to initialize database", error=str(e), exc_info=True)
        raise

# Database health check
async def check_db_health() -> dict:
    """Check database health and return status information."""
    try:
        async with AsyncSessionLocal() as session:
            # Test basic query
            result = await session.execute("SELECT 1 as health_check")
            health_check = result.scalar()
            
            # Get connection pool status
            pool = engine.pool
            pool_status = {
                "size": pool.size(),
                "checked_in": pool.checkedin(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
                "invalid": pool.invalid()
            }
            
            return {
                "status": "healthy" if health_check == 1 else "unhealthy",
                "pool_status": pool_status,
                "query_timeout": settings.QUERY_TIMEOUT
            }
    except Exception as e:
        logger.error("Database health check failed", error=str(e))
        return {
            "status": "unhealthy",
            "error": str(e)
        }

# Database cleanup
async def close_db():
    """Close database connections."""
    try:
        await engine.dispose()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error("Error closing database connections", error=str(e))