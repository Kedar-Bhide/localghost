from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create FastAPI app instance
app = FastAPI(
    title="LocalGhost API",
    version="1.0.0",
    description="A peer-to-peer travel connection platform API"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "LocalGhost API is running!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "LocalGhost API"}