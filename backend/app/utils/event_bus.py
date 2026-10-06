import asyncio
import json
from typing import Set, Dict, Any


class EventBus:
    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        self._subscribers.discard(q)

    async def publish(self, event_type: str, data: Dict[str, Any]):
        payload = json.dumps({"event": event_type, "data": data})
        dead_queues = []
        for q in self._subscribers:
            try:
                q.put_nowait(payload)
            except Exception:
                dead_queues.append(q)
        for dead in dead_queues:
            self._subscribers.discard(dead)


event_bus = EventBus()
