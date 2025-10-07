"""
Monitoring and observability endpoints for LocalGhost API.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from app.core.monitoring import (
    get_health_status,
    get_detailed_health,
    get_metrics,
    get_alerts,
    get_alert_history,
    metrics_collector,
    health_checker
)
from app.core.dependencies import get_current_active_user
from app.models.user import User
import structlog

logger = structlog.get_logger()
router = APIRouter()

@router.get("/health")
async def health_check():
    """Basic health check endpoint."""
    try:
        health_status = await get_health_status()
        return health_status
    except Exception as e:
        logger.error("Health check failed", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Health check failed"
        )

@router.get("/health/detailed")
async def detailed_health_check(current_user: User = Depends(get_current_active_user)):
    """Detailed health check with metrics (requires authentication)."""
    try:
        # Check if user has admin privileges (you might want to add role-based access)
        if current_user.role not in ["admin", "local"]:  # Adjust based on your role system
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for detailed health check"
            )
        
        detailed_health = await get_detailed_health()
        return detailed_health
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Detailed health check failed", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Detailed health check failed"
        )

@router.get("/metrics")
async def get_application_metrics(current_user: User = Depends(get_current_active_user)):
    """Get application metrics (requires authentication)."""
    try:
        # Check if user has admin privileges
        if current_user.role not in ["admin", "local"]:  # Adjust based on your role system
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for metrics access"
            )
        
        metrics = await get_metrics()
        return metrics
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get metrics", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve metrics"
        )

@router.get("/alerts")
async def get_current_alerts(current_user: User = Depends(get_current_active_user)):
    """Get current alerts (requires authentication)."""
    try:
        # Check if user has admin privileges
        if current_user.role not in ["admin", "local"]:  # Adjust based on your role system
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for alerts access"
            )
        
        alerts = await get_alerts()
        return {
            "alerts": alerts,
            "count": len(alerts),
            "timestamp": metrics_collector.get_system_metrics()["timestamp"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get alerts", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve alerts"
        )

@router.get("/alerts/history")
async def get_alerts_history(
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_active_user)
):
    """Get alert history (requires authentication)."""
    try:
        # Check if user has admin privileges
        if current_user.role not in ["admin", "local"]:  # Adjust based on your role system
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for alert history access"
            )
        
        history = await get_alert_history(limit)
        return {
            "alerts": history,
            "count": len(history),
            "limit": limit,
            "timestamp": metrics_collector.get_system_metrics()["timestamp"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get alert history", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve alert history"
        )

@router.get("/status")
async def get_application_status():
    """Get basic application status (public endpoint)."""
    try:
        system_metrics = metrics_collector.get_system_metrics()
        
        return {
            "status": "operational",
            "version": "1.0.0",
            "uptime_seconds": system_metrics["uptime"],
            "timestamp": system_metrics["timestamp"],
            "services": {
                "api": "operational",
                "database": "operational",  # You might want to check this
                "cache": "operational"      # You might want to check this
            }
        }
    except Exception as e:
        logger.error("Failed to get application status", error=str(e), exc_info=True)
        return {
            "status": "degraded",
            "version": "1.0.0",
            "timestamp": metrics_collector.get_system_metrics()["timestamp"],
            "error": "Failed to retrieve status information"
        }

@router.get("/ping")
async def ping():
    """Simple ping endpoint for load balancer health checks."""
    return {"message": "pong", "timestamp": metrics_collector.get_system_metrics()["timestamp"]}

@router.get("/ready")
async def readiness_check():
    """Readiness check for Kubernetes/container orchestration."""
    try:
        health_status = await get_health_status()
        
        if health_status["status"] in ["healthy", "degraded"]:
            return {"status": "ready", "timestamp": health_status["timestamp"]}
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service not ready"
            )
    except Exception as e:
        logger.error("Readiness check failed", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service not ready"
        )

@router.get("/live")
async def liveness_check():
    """Liveness check for Kubernetes/container orchestration."""
    try:
        # Basic liveness check - just verify the application is running
        system_metrics = metrics_collector.get_system_metrics()
        
        return {
            "status": "alive",
            "timestamp": system_metrics["timestamp"],
            "uptime_seconds": system_metrics["uptime"]
        }
    except Exception as e:
        logger.error("Liveness check failed", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Service not alive"
        )
