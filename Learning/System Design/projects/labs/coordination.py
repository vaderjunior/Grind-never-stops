"""L089 deterministic histories. A resource fence and register checker, NOT Raft."""
from dataclasses import dataclass


class FencedRegister:
    def __init__(self):
        self.highest_token, self.value = 0, None

    def write(self, token, value):
        if token < self.highest_token:
            raise PermissionError("stale ownership generation")
        self.highest_token, self.value = token, value


@dataclass(frozen=True)
class Operation:
    kind: str
    start: int
    finish: int
    value: object


def linearizable_register(history, initial=None):
    """Exhaustive small-history search. At most 8 completed operations; no pending ops."""
    if len(history) > 8 or any(o.finish < o.start or o.kind not in ("read", "write") for o in history):
        raise ValueError("use at most eight valid completed register operations")
    def search(remaining, state):
        if not remaining:
            return True
        for i in remaining:
            current = history[i]
            # Another operation finishing BEFORE this starts must come first.
            if any(history[j].finish < current.start for j in remaining if j != i):
                continue
            if current.kind == "read" and current.value != state:
                continue
            next_state = current.value if current.kind == "write" else state
            if search(remaining - {i}, next_state):
                return True
        return False
    return search(set(range(len(history))), initial)


if __name__ == "__main__":
    safe = [Operation("write", 0, 2, "new"), Operation("read", 3, 4, "new")]
    lost = [Operation("write", 0, 2, "new"), Operation("read", 3, 4, "old")]
    assert linearizable_register(safe, "old")
    assert not linearizable_register(lost, "old")
    resource = FencedRegister()
    resource.write(42, "worker B result")
    try:
        resource.write(41, "delayed worker A result")
    except PermissionError:
        pass
    assert resource.value == "worker B result"
    print("Safe history accepted; lost acknowledged write rejected; stale worker fenced.")
