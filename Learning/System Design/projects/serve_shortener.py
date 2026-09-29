"""Optional P1 loopback HTTP harness. Run from repository root: python projects/serve_shortener.py."""
import argparse
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from pathlib import Path
import sys
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent / "reference"))
from shortener import Shortener, Cache


def make_server(path, port=4311):
    cache = Cache()

    class Handler(BaseHTTPRequestHandler):
        def respond(self, status, payload):
            value = json.dumps(payload).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(value)))
            self.end_headers()
            self.wfile.write(value)

        def do_POST(self):
            if self.path != "/links":
                return self.respond(404, {"error": "unknown route"})
            if self.headers.get("Origin") and urlparse(self.headers["Origin"]).hostname not in ("localhost", "127.0.0.1"):
                return self.respond(403, {"error": "local clients only"})
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 1 <= length <= 8192:
                    raise ValueError("body must be 1..8192 bytes")
                payload = json.loads(self.rfile.read(length))
                service = Shortener(path, cache=cache)
                try:
                    code = service.create(payload["url"], payload.get("ttl"))
                finally:
                    service.close()
                self.respond(201, {"code": code, "redirect": f"/{code}"})
            except (ValueError, KeyError, TypeError) as error:
                self.respond(400, {"error": str(error)})

        def do_GET(self):
            code = self.path.lstrip("/")
            service = Shortener(path, cache=cache)
            try:
                destination = service.resolve(code)
                self.send_response(302)
                self.send_header("Location", destination)
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
            except KeyError:
                self.respond(404, {"error": "unknown or expired code"})
            finally:
                service.close()

        def log_message(self, *_args):
            pass

    return HTTPServer(("127.0.0.1", port), Handler)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=4311)
    parser.add_argument("--data", default=str(Path(__file__).parent / "data" / "shortener.sqlite"))
    args = parser.parse_args()
    Path(args.data).parent.mkdir(parents=True, exist_ok=True)
    server = make_server(args.data, args.port)
    print(f"Teaching shortener: http://127.0.0.1:{args.port} (Ctrl+C stops)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
