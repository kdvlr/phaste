import asyncio
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.utils.event_bus import event_bus

router = APIRouter(prefix="/api/events", tags=["Events"])


@router.get("")
async def sse_events():
    """Server-Sent Events endpoint providing real-time background status updates."""
    queue = event_bus.subscribe()

    async def event_generator():
        try:
            while True:
                try:
                    # Wait for next event or 15-second heartbeat
                    msg = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {msg}\n\n"
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            event_bus.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
