"""WebSocket handler for real-time updates."""
import asyncio
import json
from datetime import datetime
from typing import Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections and broadcasts."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        """Accept and store a new WebSocket connection."""
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection."""
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

    async def broadcast(self, event_type: str, data: Any) -> None:
        """Broadcast an event to all connected clients."""
        if not self.active_connections:
            return

        message = json.dumps({
            "type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        }, default=str)

        disconnected = []

        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)

        # Clean up disconnected clients
        for conn in disconnected:
            await self.disconnect(conn)

    async def send_personal(self, websocket: WebSocket, event_type: str, data: Any) -> None:
        """Send a message to a specific client."""
        message = json.dumps({
            "type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        }, default=str)

        try:
            await websocket.send_text(message)
        except Exception:
            await self.disconnect(websocket)


# Global connection manager instance
manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await manager.connect(websocket)

    try:
        # Send initial connection confirmation
        await manager.send_personal(
            websocket,
            "connection:established",
            {"message": "Connected to LiveKit Moderation Console"}
        )

        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for messages (ping/pong or commands)
                data = await websocket.receive_text()

                # Parse and handle client messages
                try:
                    message = json.loads(data)
                    msg_type = message.get("type", "")

                    if msg_type == "ping":
                        await manager.send_personal(websocket, "pong", {})
                    elif msg_type == "subscribe":
                        # Could implement channel subscriptions here
                        await manager.send_personal(
                            websocket,
                            "subscribed",
                            {"channels": message.get("channels", [])}
                        )
                except json.JSONDecodeError:
                    pass

            except WebSocketDisconnect:
                break

    finally:
        await manager.disconnect(websocket)


# Helper functions for broadcasting events
async def broadcast_room_update(room_data: dict) -> None:
    """Broadcast room state update."""
    await manager.broadcast("room:update", room_data)


async def broadcast_participant_update(participant_data: dict) -> None:
    """Broadcast participant state update."""
    await manager.broadcast("participant:update", participant_data)


async def broadcast_moderation_decision(decision_data: dict) -> None:
    """Broadcast new moderation decision."""
    await manager.broadcast("moderation:decision", decision_data)


async def broadcast_audit_entry(audit_data: dict) -> None:
    """Broadcast new audit log entry."""
    await manager.broadcast("audit:entry", audit_data)
