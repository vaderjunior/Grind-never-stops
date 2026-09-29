"""Portable relational checks; not PostgreSQL isolation or planner verification."""
import sqlite3
import unittest


class RelationalTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:", isolation_level=None)
        self.addCleanup(self.db.close)
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript("""
        CREATE TABLE items (
          department_id INTEGER NOT NULL, item_id INTEGER NOT NULL,
          barcode TEXT NOT NULL, description TEXT NOT NULL,
          PRIMARY KEY(department_id,item_id), UNIQUE(department_id,barcode)
        );
        CREATE TABLE loans (
          department_id INTEGER NOT NULL, loan_id INTEGER NOT NULL,
          item_id INTEGER NOT NULL, borrower_id INTEGER NOT NULL,
          opened_at TEXT NOT NULL, returned_at TEXT,
          PRIMARY KEY(department_id,loan_id),
          FOREIGN KEY(department_id,item_id) REFERENCES items(department_id,item_id)
        );
        CREATE UNIQUE INDEX one_active_loan_per_item
        ON loans(department_id,item_id) WHERE returned_at IS NULL;
        CREATE TABLE inventory (
          sku TEXT PRIMARY KEY, available INTEGER NOT NULL CHECK(available>=0)
        );
        CREATE TABLE reservations (
          id TEXT PRIMARY KEY, sku TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity>0)
        );
        CREATE TABLE notes (id INTEGER PRIMARY KEY,body TEXT NOT NULL,version INTEGER NOT NULL);
        INSERT INTO items VALUES(1,42,'BAR42','Camera');
        INSERT INTO inventory VALUES('CAM',1);
        INSERT INTO notes VALUES(1,'before',3);
        """)

    def test_foreign_key_carries_department_scope(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO loans VALUES(2,1,42,9,'2026-01-01',NULL)")

    def test_unique_barcode_and_department_scope(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO items VALUES(1,99,'BAR42','Other')")
        self.db.execute("INSERT INTO items VALUES(2,99,'BAR42','Allowed local name')")

    def test_one_active_loan_but_many_historical_loans(self):
        self.db.execute("INSERT INTO loans VALUES(1,1,42,9,'2026-01-01',NULL)")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO loans VALUES(1,2,42,10,'2026-01-02',NULL)")
        self.db.execute("UPDATE loans SET returned_at='2026-01-03' WHERE loan_id=1")
        self.db.execute("INSERT INTO loans VALUES(1,2,42,10,'2026-01-04',NULL)")
        self.assertEqual(self.db.execute("SELECT count(*) FROM loans").fetchone()[0],2)

    def test_failure_rolls_back_stock_and_reservation(self):
        self.db.execute("BEGIN")
        try:
            self.db.execute("UPDATE inventory SET available=available-1 WHERE sku='CAM' AND available>=1")
            self.db.execute("INSERT INTO reservations VALUES('r1','CAM',1)")
            raise RuntimeError("injected failure before commit")
        except RuntimeError:
            self.db.execute("ROLLBACK")
        self.assertEqual(self.db.execute("SELECT available FROM inventory").fetchone()[0],1)
        self.assertEqual(self.db.execute("SELECT count(*) FROM reservations").fetchone()[0],0)

    def test_conditional_stock_update_stops_second_acceptance(self):
        first=self.db.execute("UPDATE inventory SET available=available-1 WHERE sku='CAM' AND available>=1").rowcount
        second=self.db.execute("UPDATE inventory SET available=available-1 WHERE sku='CAM' AND available>=1").rowcount
        self.assertEqual((first,second),(1,0))
        self.assertEqual(self.db.execute("SELECT available FROM inventory").fetchone()[0],0)

    def test_version_condition_rejects_stale_edit(self):
        sql="UPDATE notes SET body=?,version=version+1 WHERE id=1 AND version=?"
        self.assertEqual(self.db.execute(sql,('A',3)).rowcount,1)
        self.assertEqual(self.db.execute(sql,('B',3)).rowcount,0)
        self.assertEqual(self.db.execute("SELECT body,version FROM notes").fetchone(),('A',4))

    def test_composite_cursor_and_index_plan(self):
        self.db.executescript("""
        CREATE TABLE entries(tenant_id INTEGER NOT NULL,created_at INTEGER NOT NULL,id INTEGER PRIMARY KEY,title TEXT);
        CREATE INDEX entries_by_tenant_time ON entries(tenant_id,created_at DESC,id DESC);
        """)
        self.db.executemany("INSERT INTO entries VALUES(?,?,?,?)",[(7,10,9,'a'),(7,10,7,'b'),(7,9,8,'c'),(7,8,4,'d'),(8,10,10,'private')])
        sql="SELECT id FROM entries WHERE tenant_id=? AND (created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT 2"
        self.assertEqual(self.db.execute(sql,(7,10,10,7)).fetchall(),[(8,),(4,)])
        plan=self.db.execute("EXPLAIN QUERY PLAN "+sql,(7,10,10,7)).fetchall()
        self.assertTrue(any('entries_by_tenant_time' in row[3] for row in plan),plan)


if __name__ == '__main__':
    print('SQLite version:',sqlite3.sqlite_version)
    unittest.main(verbosity=2)
