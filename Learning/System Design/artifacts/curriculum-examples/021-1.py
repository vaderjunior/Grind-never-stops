import asyncio

async def fetch(label: str) -> str:
    print(label, "start")
    await asyncio.sleep(0.01)
    print(label, "ready")
    return label

async def main() -> None:
    results = await asyncio.gather(fetch("A"), fetch("B"))
    assert results == ["A", "B"]
    print("both complete")

asyncio.run(main())
