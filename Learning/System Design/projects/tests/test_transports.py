import base64
import json
from pathlib import Path
import secrets
import socket
import struct
import sys
import tempfile
import threading
import unittest
import urllib.request
import urllib.error

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from serve_chat import make_server as make_chat
from serve_shortener import make_server as make_shortener


class Transports(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)

    def run_server(self, factory, name):
        server = factory(str(Path(self.temp.name) / name), 0)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(lambda: (server.shutdown(), server.server_close(), thread.join(2)))
        return server

    def test_http_create_and_redirect_without_following_external_destination(self):
        server = self.run_server(make_shortener, "short.sqlite")
        base = f"http://127.0.0.1:{server.server_address[1]}"
        request = urllib.request.Request(base + "/links", data=b'{"url":"https://example.com/target"}', headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(request) as response:
            code = json.load(response)["code"]
            self.assertEqual(response.status, 201)
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *_args, **_kwargs):
                return None
        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.build_opener(NoRedirect).open(base + "/" + code)
        self.assertEqual(error.exception.code, 302)
        self.assertEqual(error.exception.headers["Location"], "https://example.com/target")
        error.exception.close()

    def test_real_masked_websocket_send_reconnect_and_auth(self):
        server = self.run_server(make_chat, "chat.sqlite")
        token = next(iter(server.tokens))
        def connect(auth):
            sock = socket.create_connection(server.server_address, timeout=3)
            reader = sock.makefile("rb")
            key = base64.b64encode(secrets.token_bytes(16)).decode()
            sock.sendall(f"GET /ws?token={auth} HTTP/1.1\r\nHost: 127.0.0.1\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: {key}\r\n\r\n".encode())
            status = reader.readline()
            while reader.readline() != b"\r\n":
                pass
            return sock, reader, status
        def call(sock, reader, payload):
            value, mask = json.dumps(payload).encode(), secrets.token_bytes(4)
            self.assertLess(len(value), 126)
            sock.sendall(bytes([0x81, 0x80 | len(value)]) + mask + bytes(v ^ mask[i % 4] for i, v in enumerate(value)))
            _, length = reader.read(2)
            if length == 126:
                length = struct.unpack("!H", reader.read(2))[0]
            return json.loads(reader.read(length))
        sock, reader, status = connect(token)
        self.assertIn(b"101", status)
        self.assertEqual(call(sock, reader, {"op": "send", "key": "one", "body": "hello"})["seq"], 1)
        reader.close(); sock.close()
        sock, reader, status = connect(token)
        self.assertEqual(call(sock, reader, {"op": "since", "cursor": 0})["messages"][0]["body"], "hello")
        reader.close(); sock.close()
        sock, reader, status = connect("wrong")
        self.assertIn(b"403", status)
        reader.close(); sock.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
