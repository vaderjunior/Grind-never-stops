def step(backlog: int, arrivals: int, capacity: int) -> int:
    return max(0, backlog + arrivals - capacity)

backlog = 0
for _ in range(10):
    backlog = step(backlog, 120, 100)
assert backlog == 200
for _ in range(10):
    backlog = step(backlog, 80, 100)
assert backlog == 0
print("peak backlog=200; drained after 10 seconds")
