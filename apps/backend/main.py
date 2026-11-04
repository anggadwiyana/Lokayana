"""
main.py — Entry point Lokayana AI Backend
=========================================
FastAPI application dengan CORS middleware untuk akses dari mobile app.
Menjalankan uvicorn di host 0.0.0.0 port 8000.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router

# ---------------------------------------------------------------------------
# Inisialisasi Aplikasi
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Lokayana AI Backend",
    description=(
        "Backend API untuk Lokayana AI — Sistem rekomendasi wisata Bali "
        "dengan algoritma A* TSP dan analisis kemiripan berbasis AI."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS Middleware — izinkan semua origin agar mobile app bisa mengakses
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Izinkan semua origin (mobile, web, emulator)
    allow_credentials=True,
    allow_methods=["*"],       # GET, POST, PUT, DELETE, OPTIONS, dll.
    allow_headers=["*"],       # Izinkan semua header
)

# ---------------------------------------------------------------------------
# Include Router
# ---------------------------------------------------------------------------

app.include_router(router)

# ---------------------------------------------------------------------------
# Root Endpoint
# ---------------------------------------------------------------------------


@app.get("/", tags=["Info"])
async def root() -> dict:
    """
    Root endpoint — info singkat tentang service Lokayana AI.

    Returns:
        dict: Informasi nama service, versi, dan deskripsi singkat.
    """
    return {
        "service": "Lokayana AI Backend",
        "version": "1.0.0",
        "description": (
            "Sistem rekomendasi destinasi wisata Bali dengan A* TSP "
            "dan analisis kemiripan berbasis AI."
        ),
        "docs": "/docs",
        "health": "/api/health",
    }


# ---------------------------------------------------------------------------
# Entry Point — jalankan dengan uvicorn saat file dieksekusi langsung
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
