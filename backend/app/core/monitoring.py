"""
Monitoring and observability utilities for LocalGhost API.
"""
import time
import psutil
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from fastapi import Request, Response
from app.core.caching import cache_manager
from app.core.database import check_db_health
import structlog

logger = structlog.get_logger()

class MetricsCollector:
    """Collect and store application metrics."""
    
    def __init__(self):
        self.metrics: Dict[str, Any] = {}
        self.start_time = time.time()
    
    def increment_counter(self, name: str, value: int = 1, tags: Optional[Dict[str, str]] = None):
        """Increment a counter metric."""
        key = f"counter:{name}"
        if tags:
            key += ":" + ":".join(f"{k}={v}" for k, v in tags.items())
        
        current = self.metrics.get(key, 0)
        self.metrics[key] = current + value
    
    def set_gauge(self, name: str, value: float, tags: Optional[Dict[str, str]] = None):
        """Set a gauge metric."""
        key = f"gauge:{name}"
        if tags:
            key += ":" + ":".join(f"{k}={v}" for k, v in tags.items())
        
        self.metrics[key] = value
    
    def record_timing(self, name: str, duration: float, tags: Optional[Dict[str, str]] = None):
        """Record a timing metric."""
        key = f"timing:{name}"
        if tags:
            key += ":" + ":".join(f"{k}={v}" for k, v in tags.items())
        
        if key not in self.metrics:
            self.metrics[key] = []
        
        self.metrics[key].append({
            "duration": duration,
            "timestamp": time.time()
        })
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get all collected metrics."""
        return self.metrics.copy()
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get system-level metrics."""
        return {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory": {
                "total": psutil.virtual_memory().total,
                "available": psutil.virtual_memory().available,
                "percent": psutil.virtual_memory().percent,
                "used": psutil.virtual_memory().used
            },
            "disk": {
                "total": psutil.disk_usage('/').total,
                "used": psutil.disk_usage('/').used,
                "free": psutil.disk_usage('/').free,
                "percent": psutil.disk_usage('/').percent
            },
            "uptime": time.time() - self.start_time,
            "timestamp": datetime.utcnow().isoformat()
        }

# Global metrics collector
metrics_collector = MetricsCollector()

class PerformanceMonitor:
    """Monitor API performance and collect metrics."""
    
    @staticmethod
    async def record_request_metrics(request: Request, response: Response, duration: float):
        """Record metrics for a request."""
        # Basic request metrics
        metrics_collector.increment_counter("requests_total", tags={
            "method": request.method,
            "endpoint": request.url.path,
            "status_code": str(response.status_code)
        })
        
        # Response time metrics
        metrics_collector.record_timing("request_duration", duration, tags={
            "method": request.method,
            "endpoint": request.url.path
        })
        
        # Status code metrics
        status_category = f"{response.status_code // 100}xx"
        metrics_collector.increment_counter("requests_by_status", tags={
            "status_category": status_category,
            "status_code": str(response.status_code)
        })
        
        # Error metrics
        if response.status_code >= 400:
            metrics_collector.increment_counter("errors_total", tags={
                "method": request.method,
                "endpoint": request.url.path,
                "status_code": str(response.status_code)
            })
    
    @staticmethod
    async def record_database_metrics(operation: str, duration: float, success: bool):
        """Record database operation metrics."""
        metrics_collector.record_timing("database_operation", duration, tags={
            "operation": operation
        })
        
        metrics_collector.increment_counter("database_operations_total", tags={
            "operation": operation,
            "success": str(success)
        })
    
    @staticmethod
    async def record_cache_metrics(operation: str, hit: bool, duration: float):
        """Record cache operation metrics."""
        metrics_collector.record_timing("cache_operation", duration, tags={
            "operation": operation
        })
        
        metrics_collector.increment_counter("cache_operations_total", tags={
            "operation": operation,
            "hit": str(hit)
        })
    
    @staticmethod
    async def record_business_metrics(event: str, value: int = 1, tags: Optional[Dict[str, str]] = None):
        """Record business-specific metrics."""
        metrics_collector.increment_counter(f"business_{event}", value, tags)

class HealthChecker:
    """Check application health and dependencies."""
    
    @staticmethod
    async def check_application_health() -> Dict[str, Any]:
        """Check overall application health."""
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {}
        }
        
        # Check database
        try:
            db_health = await check_db_health()
            health_status["checks"]["database"] = db_health
            if db_health.get("status") != "healthy":
                health_status["status"] = "unhealthy"
        except Exception as e:
            health_status["checks"]["database"] = {
                "status": "unhealthy",
                "error": str(e)
            }
            health_status["status"] = "unhealthy"
        
        # Check Redis cache
        try:
            if await cache_manager.ping():
                health_status["checks"]["redis"] = {"status": "healthy"}
            else:
                health_status["checks"]["redis"] = {"status": "unhealthy"}
                health_status["status"] = "unhealthy"
        except Exception as e:
            health_status["checks"]["redis"] = {
                "status": "unhealthy",
                "error": str(e)
            }
            health_status["status"] = "unhealthy"
        
        # Check system resources
        try:
            system_metrics = metrics_collector.get_system_metrics()
            health_status["checks"]["system"] = {
                "status": "healthy",
                "cpu_percent": system_metrics["cpu_percent"],
                "memory_percent": system_metrics["memory"]["percent"],
                "disk_percent": system_metrics["disk"]["percent"]
            }
            
            # Check if resources are too high
            if (system_metrics["cpu_percent"] > 90 or 
                system_metrics["memory"]["percent"] > 90 or 
                system_metrics["disk"]["percent"] > 90):
                health_status["status"] = "degraded"
        except Exception as e:
            health_status["checks"]["system"] = {
                "status": "unhealthy",
                "error": str(e)
            }
            health_status["status"] = "unhealthy"
        
        return health_status
    
    @staticmethod
    async def check_detailed_health() -> Dict[str, Any]:
        """Check detailed health with more information."""
        health_status = await HealthChecker.check_application_health()
        
        # Add detailed metrics
        health_status["metrics"] = {
            "system": metrics_collector.get_system_metrics(),
            "application": metrics_collector.get_metrics()
        }
        
        # Add uptime information
        health_status["uptime"] = {
            "start_time": datetime.fromtimestamp(metrics_collector.start_time).isoformat(),
            "duration_seconds": time.time() - metrics_collector.start_time
        }
        
        return health_status

class AlertManager:
    """Manage alerts and notifications for monitoring."""
    
    def __init__(self):
        self.alert_rules = []
        self.alert_history = []
    
    def add_alert_rule(self, name: str, condition, severity: str = "warning"):
        """Add an alert rule."""
        self.alert_rules.append({
            "name": name,
            "condition": condition,
            "severity": severity,
            "enabled": True
        })
    
    async def check_alerts(self) -> list:
        """Check all alert rules and return triggered alerts."""
        triggered_alerts = []
        
        for rule in self.alert_rules:
            if not rule["enabled"]:
                continue
            
            try:
                if await rule["condition"]():
                    alert = {
                        "name": rule["name"],
                        "severity": rule["severity"],
                        "timestamp": datetime.utcnow().isoformat(),
                        "message": f"Alert triggered: {rule['name']}"
                    }
                    triggered_alerts.append(alert)
                    self.alert_history.append(alert)
            except Exception as e:
                logger.error("Error checking alert rule", rule=rule["name"], error=str(e))
        
        return triggered_alerts
    
    def get_alert_history(self, limit: int = 100) -> list:
        """Get recent alert history."""
        return self.alert_history[-limit:]

# Global instances
health_checker = HealthChecker()
alert_manager = AlertManager()

# Set up default alert rules
def setup_default_alerts():
    """Set up default alert rules."""
    
    # High CPU usage alert
    alert_manager.add_alert_rule(
        "high_cpu_usage",
        lambda: metrics_collector.get_system_metrics()["cpu_percent"] > 80,
        "warning"
    )
    
    # High memory usage alert
    alert_manager.add_alert_rule(
        "high_memory_usage",
        lambda: metrics_collector.get_system_metrics()["memory"]["percent"] > 85,
        "warning"
    )
    
    # High disk usage alert
    alert_manager.add_alert_rule(
        "high_disk_usage",
        lambda: metrics_collector.get_system_metrics()["disk"]["percent"] > 90,
        "critical"
    )
    
    # High error rate alert
    def check_error_rate():
        metrics = metrics_collector.get_metrics()
        total_requests = sum(
            v for k, v in metrics.items() 
            if k.startswith("counter:requests_total")
        )
        total_errors = sum(
            v for k, v in metrics.items() 
            if k.startswith("counter:errors_total")
        )
        
        if total_requests > 0:
            error_rate = total_errors / total_requests
            return error_rate > 0.1  # 10% error rate
        return False
    
    alert_manager.add_alert_rule(
        "high_error_rate",
        check_error_rate,
        "critical"
    )

# Initialize default alerts
setup_default_alerts()

class LoggingConfig:
    """Configure structured logging for monitoring."""
    
    @staticmethod
    def setup_logging():
        """Set up structured logging configuration."""
        import logging
        import sys
        
        # Configure root logger
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.StreamHandler(sys.stdout),
                logging.FileHandler('app.log')
            ]
        )
        
        # Configure structlog
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

# Initialize logging
LoggingConfig.setup_logging()

# Monitoring endpoints
async def get_health_status() -> Dict[str, Any]:
    """Get application health status."""
    return await health_checker.check_application_health()

async def get_detailed_health() -> Dict[str, Any]:
    """Get detailed health status with metrics."""
    return await health_checker.check_detailed_health()

async def get_metrics() -> Dict[str, Any]:
    """Get application metrics."""
    return {
        "system": metrics_collector.get_system_metrics(),
        "application": metrics_collector.get_metrics(),
        "timestamp": datetime.utcnow().isoformat()
    }

async def get_alerts() -> list:
    """Get current alerts."""
    return await alert_manager.check_alerts()

async def get_alert_history(limit: int = 100) -> list:
    """Get alert history."""
    return alert_manager.get_alert_history(limit)
