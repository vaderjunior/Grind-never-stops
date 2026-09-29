from math import ceil

def instances(peak_rps: float, safe_rps: float, failed: int = 1) -> int:
    assert peak_rps >= 0 and safe_rps > 0 and failed >= 0
    return ceil(peak_rps / safe_rps) + failed

assert instances(180, 100) == 3
assert instances(180, 200) == 2
print("A: 3 instances; B: 2 instances")
