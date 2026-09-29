import asyncio

async def main() -> None:
    lock = asyncio.Lock()
    counter = 0
    async def increment() -> None:
        nonlocal counter
        async with lock:
            previous = counter
            await asyncio.sleep(0)  # force a scheduling opportunity
            counter = previous + 1
    await asyncio.gather(increment(), increment())
    assert counter == 2
    print("counter=2")

asyncio.run(main())
