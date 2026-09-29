"""P4 bounded RFC6455 teaching scaffold: text requests, ping/pong, close; no compression/fragmentation."""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import secrets
import socketserver
import struct
import sys
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent / "reference"))
from chat import Chat, Hub


def encode_frame(payload, opcode=1):
    value = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
    header = bytes([0x80 | opcode, len(value)]) if len(value) < 126 else bytes([0x80 | opcode, 126]) + struct.pack("!H", len(value))
    return header + value


def make_server(path, port=4312):
    chat, hub = Chat(path), Hub()
    chat.hub = hub
    for user in ("alice", "bob"):
        chat.add_member("study", user)
    tokens = {secrets.token_urlsafe(24): user for user in ("alice", "bob")}

    class Handler(socketserver.StreamRequestHandler):
        def exact(self, length):
            value = self.rfile.read(length)
            if len(value) != length:
                raise EOFError()
            return value

        def handle(self):
            self.request.settimeout(30)
            try:
                request = self.rfile.readline(8193)
                if len(request) > 8192:
                    return
                pieces = request.decode("ascii").strip().split()
                if len(pieces) != 3 or pieces[0] != "GET":
                    return
                headers, consumed = {}, len(request)
                while True:
                    line = self.rfile.readline(8193)
                    consumed += len(line)
                    if consumed > 16384 or not line:
                        return
                    if line == b"\r\n":
                        break
                    key, value = line.decode("ascii").split(":", 1)
                    headers[key.lower()] = value.strip()
                parsed = urlparse(pieces[1])
                token = parse_qs(parsed.query).get("token", [""])[0]
                user = tokens.get(token)
                origin = headers.get("origin")
                valid_origin = not origin or urlparse(origin).hostname in ("localhost", "127.0.0.1")
                key = headers.get("sec-websocket-key", "")
                try:
                    valid_key = len(base64.b64decode(key, validate=True)) == 16
                except ValueError:
                    valid_key = False
                if not user or not valid_origin or parsed.path != "/ws":
                    self.wfile.write(b"HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n")
                    return
                if headers.get("upgrade", "").lower() != "websocket" or headers.get("sec-websocket-version") != "13" or not valid_key:
                    self.wfile.write(b"HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n")
                    return
                accept = base64.b64encode(hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest()).decode()
                self.wfile.write(f"HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: {accept}\r\n\r\n".encode())
                while True:
                    first, second = self.exact(2)
                    opcode, masked, length = first & 15, bool(second & 128), second & 127
                    if first & 0x70 or not first & 0x80 or not masked or opcode not in (1, 8, 9, 10):
                        self.wfile.write(encode_frame(struct.pack("!H", 1002), 8))
                        return
                    if length == 126:
                        length = struct.unpack("!H", self.exact(2))[0]
                    elif length == 127:
                        length = struct.unpack("!Q", self.exact(8))[0]
                    if length > 8192 or (opcode >= 8 and length > 125):
                        self.wfile.write(encode_frame(struct.pack("!H", 1009), 8))
                        return
                    mask = self.exact(4)
                    payload = bytes(v ^ mask[i % 4] for i, v in enumerate(self.exact(length)))
                    if opcode == 8:
                        self.wfile.write(encode_frame(b"", 8))
                        return
                    if opcode == 9:
                        self.wfile.write(encode_frame(payload, 10))
                        continue
                    if opcode == 10:
                        continue
                    try:
                        command = json.loads(payload)
                        room = command.get("room", "study")
                        op = command.get("op")
                        if op == "send":
                            result = {"seq": chat.send(room, user, command["key"], command["body"])}
                        elif op == "since":
                            result = {"messages": chat.since(room, user, command.get("cursor", 0))}
                        elif op == "heartbeat":
                            chat.heartbeat(room, user)
                            result = {"online": chat.online(room, user)}
                        else:
                            raise ValueError("op must be send, since, or heartbeat")
                    except (ValueError, KeyError, TypeError, PermissionError) as error:
                        result = {"error": str(error)}
                    self.wfile.write(encode_frame(result))
            except (EOFError, OSError, UnicodeError, ValueError):
                return

    class Server(socketserver.ThreadingTCPServer):
        daemon_threads = True
        allow_reuse_address = True

    server = Server(("127.0.0.1", port), Handler)
    server.tokens, server.chat, server.hub = tokens, chat, hub
    return server


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=4312)
    parser.add_argument("--data", default=str(Path(__file__).parent / "data" / "chat.sqlite"))
    args = parser.parse_args()
    Path(args.data).parent.mkdir(parents=True, exist_ok=True)
    server = make_server(args.data, args.port)
    print("Teaching transport: local test identities only. Ctrl+C stops. Tokens change on restart.")
    for token, user in server.tokens.items():
        print(f"{user}: ws://127.0.0.1:{args.port}/ws?token={token}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
