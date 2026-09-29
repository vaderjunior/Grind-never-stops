def bits_per_second(rps: float, payload_bytes: int) -> float:
    return rps * payload_bytes * 8

assert bits_per_second(40, 2_000_000) == 640_000_000
restore_hours = 10_000_000_000_000 / 100_000_000 / 3600
assert round(restore_hours, 1) == 27.8
print("photo ingress: 640 Mbit/s; minimum restore: 27.8 h")
