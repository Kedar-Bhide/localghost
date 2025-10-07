from fastapi import APIRouter
from app.api.v1.endpoints import auth, profile, users, locals, chats, chat_websocket, itineraries, itineraries_proposals, reviews, notifications, analytics, monitoring

# Create the main API router for v1
api_router = APIRouter()

# Include authentication routes
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])

# Include profile routes (legacy)
api_router.include_router(profile.router, prefix="/profile", tags=["profile"])

# Include user management routes
api_router.include_router(users.router, prefix="/users", tags=["users"])

# Include local guide routes
api_router.include_router(locals.router, prefix="/locals", tags=["local-guides"])

# Include chat routes
api_router.include_router(chats.router, prefix="/chats", tags=["messaging"])

# Include WebSocket chat routes
api_router.include_router(chat_websocket.router, tags=["websocket"])

# Include itinerary routes
api_router.include_router(itineraries.router, prefix="/itineraries", tags=["itineraries"])
api_router.include_router(itineraries_proposals.router, prefix="/itineraries", tags=["itineraries"])

# Include review routes
api_router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])

# Include notification routes
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])

# Include analytics routes
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])

# Include monitoring routes
api_router.include_router(monitoring.router, prefix="/monitoring", tags=["monitoring"])

@api_router.get("/")
async def api_root():
    return {
        "message": "LocalGhost API v1",
        "status": "ready",
        "endpoints": ["/auth", "/profile", "/users", "/locals", "/chats", "/itineraries", "/reviews", "/notifications", "/analytics", "/monitoring"],
        "websockets": ["/ws/chats/{conversation_id}"]
    }