def average_rps(dau: int, actions_each: int, calls_each: int = 1) -> float:
    assert dau >= 0 and actions_each >= 0 and calls_each >= 0
    return dau * actions_each * calls_each / 86_400

browse = average_rps(100_000, 12)
save = average_rps(100_000, 2)
assert round(browse + save, 1) == 16.2
print(f"average={browse + save:.1f}/s peak={(browse + save) * 8:.1f}/s")
# average=16.2/s peak=129.6/s
