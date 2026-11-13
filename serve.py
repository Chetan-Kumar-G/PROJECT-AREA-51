"""Local dev server for the Ghosts of Exploration site.

Usage:  python serve.py            (then open http://localhost:5173)
Serves the ./site folder with caching disabled so edits show up immediately.
"""
import http.server
import functools
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "site")


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as httpd:
        print(f"Serving {ROOT} at http://localhost:{PORT}")
        httpd.serve_forever()
