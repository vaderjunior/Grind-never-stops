"""P4 learner skeleton; projects/serve_chat.py supplies the local WebSocket transport."""
import time


class Hub:
    def __init__(self):
        self.subscribers, self.available = [], True

    def publish(self, room, seq):
        if self.available:
            for subscriber in list(self.subscribers):
                subscriber(room, seq)


class Chat:
    def __init__(self, path, clock=time.time, hub=None):
        self.path, self.clock, self.hub = path, clock, hub
        # L173: SQL tables members, rooms(next_seq), messages. Unique(room,user,client_key).
        # Use separate explicitly closed connections per worker/thread.

    def add_member(self, room, user):
        # Administrative setup only; never expose membership changes as a user command.
        raise NotImplementedError("P4.1 membership setup")

    def send(self, room, user, key, body):
        # L173: authorize, check idempotency, assign ordered seq, commit, THEN publish hint.
        raise NotImplementedError("P4.1 durable append")

    def since(self, room, user, cursor=0, limit=100):
        # L174: authorized stable keyset query seq > cursor ORDER BY seq LIMIT ?.
        raise NotImplementedError("P4.2 reconnect")

    def heartbeat(self, room, user, ttl=30):
        # L188: authorize, persist expiry; never use presence to grant access.
        raise NotImplementedError("P4.3 presence lease")

    def online(self, room, user):
        # L188: authorized query; expiry <= now is offline.
        raise NotImplementedError("P4.3 presence read")
