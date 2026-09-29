"""P5 learner skeleton; event IDs and processing offsets are different identities."""
import sqlite3


class Pipeline:
    def __init__(self, path, partitions=4):
        self.db = sqlite3.connect(path, isolation_level=None)
        self.partitions = partitions
        # L109: tables events(unique id, partition, offset), config(partition count).
        # L119: tables totals(projection,account), applied(projection,event_id), checkpoints.

    def ingest(self, event):
        # L109: validate schema; stable account partition; bounded transaction assigns offset.
        # L239: upcast v1 amount / v2 amount_minor_units; reject unsupported schema.
        raise NotImplementedError("P5.1 ingest")

    def consume(self, projection="live", crash_before_checkpoint=False, batch=100):
        # L119: dedupe+projection+checkpoint one transaction per partition.
        # L238: inject crash between projection write and checkpoint, ensure rollback.
        raise NotImplementedError("P5.2/P5.3 projection")

    def replay(self, projection):
        # L238: write a new projection name; do not destroy the active projection.
        raise NotImplementedError("P5.3 replay")

    def reconcile(self, projection="live"):
        # L239: compare sums from original immutable source with derived totals.
        raise NotImplementedError("P5.4 reconcile")

    def close(self):
        self.db.close()
