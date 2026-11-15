#!/usr/bin/env python3
"""
EventSnap Local Development Runner.
Starts a local HTTP server on port 8000 that routes requests into lambda_handler.
"""
import sys
import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Add src to Python module path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from src.router import lambda_handler
from src.utils.logger import logger

PORT = int(os.getenv("PORT", "8000"))


class LambdaRequestHandler(BaseHTTPRequestHandler):
    def _handle(self):
        parsed = urlparse(self.path)
        path = parsed.path
        raw_query = parsed.query
        query_params = {k: v[0] if len(v) == 1 else v for k, v in parse_qs(raw_query).items()}

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else None

        # Build AWS HTTP API v2 compatible event payload
        event = {
            "version": "2.0",
            "routeKey": f"{self.command} {path}",
            "rawPath": path,
            "rawQueryString": raw_query,
            "headers": dict(self.headers),
            "queryStringParameters": query_params,
            "requestContext": {
                "http": {
                    "method": self.command,
                    "path": path,
                    "protocol": "HTTP/1.1",
                    "sourceIp": self.client_address[0],
                    "userAgent": self.headers.get("User-Agent", ""),
                },
                "stage": "$default",
            },
            "body": body,
            "isBase64Encoded": False,
        }

        # Dispatch to Lambda router
        result = lambda_handler(event, None)

        status_code = result.get("statusCode", 200)
        headers = result.get("headers", {})
        response_body = result.get("body", "")

        self.send_response(status_code)
        for h_key, h_val in headers.items():
            self.send_header(h_key, str(h_val))
        self.end_headers()

        if response_body:
            self.wfile.write(response_body.encode("utf-8"))

    def do_GET(self):
        self._handle()

    def do_POST(self):
        self._handle()

    def do_PUT(self):
        self._handle()

    def do_PATCH(self):
        self._handle()

    def do_DELETE(self):
        self._handle()

    def do_OPTIONS(self):
        self._handle()

    def log_message(self, format, *args):
        # Clean logging
        sys.stderr.write(f"[{self.log_date_time_string()}] {format % args}\n")


def main():
    server_address = ("", PORT)
    httpd = HTTPServer(server_address, LambdaRequestHandler)
    print("=" * 60)
    print(f"[*] EventSnap Local Lambda Runner listening on http://localhost:{PORT}")
    print("Press Ctrl+C to stop.")
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()


if __name__ == "__main__":
    main()

