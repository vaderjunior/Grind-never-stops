from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "labs"))
from coordination import FencedRegister, Operation, linearizable_register


class Coordination(unittest.TestCase):
    def test_fence_rejects_delayed_owner(self):
        r=FencedRegister();r.write(42, "new")
        with self.assertRaises(PermissionError):r.write(41, "stale")
        self.assertEqual(r.value, "new")

    def test_completed_write_cannot_disappear(self):
        self.assertFalse(linearizable_register([Operation("write",0,2,1),Operation("read",3,4,0)],0))

    def test_overlapping_read_may_precede_write(self):
        self.assertTrue(linearizable_register([Operation("write",0,4,1),Operation("read",1,2,0)],0))

    def test_one_shared_explanation_required(self):
        history=[Operation("write",0,2,1),Operation("read",3,4,1),Operation("read",5,6,0)]
        self.assertFalse(linearizable_register(history,0))
