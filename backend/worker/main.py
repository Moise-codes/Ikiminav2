"""Worker entrypoint."""

from __future__ import annotations

from worker.outbox import OutboxWorker

if __name__ == "__main__":
    import asyncio

    asyncio.run(OutboxWorker().run())
