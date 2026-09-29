def page(ids: list[int], after: int | None, size: int) -> list[int]:
    ordered = sorted(ids, reverse=True)
    eligible = [item for item in ordered if after is None or item < after]
    return eligible[:size]

first = page([5, 4, 3, 2, 1], None, 2)
second = page([6, 5, 4, 3, 2, 1], first[-1], 2)
assert first == [5, 4] and second == [3, 2]
print(first, second)
