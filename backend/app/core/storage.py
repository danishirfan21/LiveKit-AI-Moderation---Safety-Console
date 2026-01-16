"""In-memory storage for application data."""
from typing import TypeVar, Generic
from datetime import datetime
import asyncio

T = TypeVar("T")


class InMemoryStore(Generic[T]):
    """Generic in-memory key-value store."""

    def __init__(self):
        self._data: dict[str, T] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> T | None:
        """Get item by key."""
        return self._data.get(key)

    async def get_all(self) -> list[T]:
        """Get all items."""
        return list(self._data.values())

    async def set(self, key: str, value: T) -> None:
        """Set item by key."""
        async with self._lock:
            self._data[key] = value

    async def delete(self, key: str) -> bool:
        """Delete item by key. Returns True if item existed."""
        async with self._lock:
            if key in self._data:
                del self._data[key]
                return True
            return False

    async def exists(self, key: str) -> bool:
        """Check if key exists."""
        return key in self._data

    async def count(self) -> int:
        """Get total count of items."""
        return len(self._data)

    async def clear(self) -> None:
        """Clear all items."""
        async with self._lock:
            self._data.clear()


class AppendOnlyStore(Generic[T]):
    """Append-only store for audit logs and similar data."""

    def __init__(self):
        self._data: list[T] = []
        self._lock = asyncio.Lock()

    async def append(self, item: T) -> int:
        """Append item and return its index."""
        async with self._lock:
            self._data.append(item)
            return len(self._data) - 1

    async def get_all(self) -> list[T]:
        """Get all items."""
        return list(self._data)

    async def get_range(self, start: int = 0, limit: int = 50) -> list[T]:
        """Get a range of items with pagination."""
        return self._data[start:start + limit]

    async def get_recent(self, limit: int = 50) -> list[T]:
        """Get most recent items (newest first)."""
        return list(reversed(self._data[-limit:]))

    async def count(self) -> int:
        """Get total count of items."""
        return len(self._data)

    async def clear(self) -> None:
        """Clear all items."""
        async with self._lock:
            self._data.clear()


# Application storage instances
from app.models.room import Room
from app.models.participant import Participant
from app.models.moderation import ModerationDecision
from app.models.policy import Policy
from app.models.audit import AuditLogEntry

# Key-value stores
rooms_store: InMemoryStore[Room] = InMemoryStore()
participants_store: InMemoryStore[Participant] = InMemoryStore()
decisions_store: InMemoryStore[ModerationDecision] = InMemoryStore()
policies_store: InMemoryStore[Policy] = InMemoryStore()

# Append-only store for audit logs
audit_store: AppendOnlyStore[AuditLogEntry] = AppendOnlyStore()


async def initialize_default_policies() -> None:
    """Initialize default policy configurations."""
    from app.models.policy import Policy, PolicyCategory

    default_policies = [
        Policy(
            policy_id="policy-harassment",
            name="Harassment",
            category=PolicyCategory.HARASSMENT,
            description="Content that harasses, intimidates, or bullies individuals",
            warn_threshold=0.5,
            mute_threshold=0.7,
            flag_threshold=0.85,
            enabled=True,
        ),
        Policy(
            policy_id="policy-hate-speech",
            name="Hate Speech",
            category=PolicyCategory.HATE_SPEECH,
            description="Content that promotes hatred against protected groups",
            warn_threshold=0.4,
            mute_threshold=0.6,
            flag_threshold=0.75,
            enabled=True,
        ),
        Policy(
            policy_id="policy-spam",
            name="Spam",
            category=PolicyCategory.SPAM,
            description="Repetitive, promotional, or unsolicited content",
            warn_threshold=0.6,
            mute_threshold=0.8,
            flag_threshold=0.9,
            enabled=True,
        ),
        Policy(
            policy_id="policy-violence",
            name="Violence",
            category=PolicyCategory.VIOLENCE,
            description="Content that promotes or glorifies violence",
            warn_threshold=0.4,
            mute_threshold=0.6,
            flag_threshold=0.75,
            enabled=True,
        ),
        Policy(
            policy_id="policy-adult-content",
            name="Adult Content",
            category=PolicyCategory.ADULT_CONTENT,
            description="Sexually explicit or mature content",
            warn_threshold=0.5,
            mute_threshold=0.7,
            flag_threshold=0.85,
            enabled=True,
        ),
    ]

    for policy in default_policies:
        await policies_store.set(policy.policy_id, policy)
