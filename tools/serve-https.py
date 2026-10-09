#!/usr/bin/env python3
"""Local HTTPS static server for Sound Therapy Viz (phone mic on LAN).

Browsers block getUserMedia on plain http://LAN-IP. This serves the project
over TLS on 0.0.0.0:8443 with a self-signed cert so phones can grant mic.

Usage (from repo root or anywhere):
  python3 tools/serve-https.py
  python3 tools/serve-https.py --port 8443 --dir .

Then on the phone open https://<LAN-IP>:8443 , accept the certificate warning
once, tap to start. Keep http://localhost:8765 for the laptop (mic OK there).
"""
from __future__ import annotations

import argparse
import http.server
import os
import socket
import ssl
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CERT_DIR = Path(__file__).resolve().parent / "certs"
CERT_FILE = CERT_DIR / "cert.pem"
KEY_FILE = CERT_DIR / "key.pem"
DEFAULT_PORT = 8443


def lan_ips() -> list[str]:
    ips: list[str] = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ips.append(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip not in ips and not ip.startswith("127."):
                ips.append(ip)
    except OSError:
        pass
    return ips or ["192.168.x.x"]


def ensure_cert() -> None:
    CERT_DIR.mkdir(parents=True, exist_ok=True)
    if CERT_FILE.is_file() and KEY_FILE.is_file():
        return
    print("Creating self-signed TLS cert in tools/certs/ ...")
    subprocess.check_call(
        [
            "openssl",
            "req",
            "-x509",
            "-newkey",
            "rsa:2048",
            "-keyout",
            str(KEY_FILE),
            "-out",
            str(CERT_FILE),
            "-days",
            "825",
            "-nodes",
            "-subj",
            "/CN=sound-therapy-viz.local",
            "-addext",
            "subjectAltName=DNS:localhost,IP:127.0.0.1",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.STDOUT,
    )
    print("Cert ready:", CERT_FILE)


def main() -> int:
    ap = argparse.ArgumentParser(description="HTTPS static server for phone mic access")
    ap.add_argument("--port", type=int, default=DEFAULT_PORT)
    ap.add_argument(
        "--dir",
        type=Path,
        default=ROOT,
        help="Directory to serve (default: sound-therapy-viz root)",
    )
    args = ap.parse_args()
    serve_dir = args.dir.resolve()
    if not serve_dir.is_dir():
        print("Not a directory:", serve_dir, file=sys.stderr)
        return 1

    ensure_cert()
    os.chdir(serve_dir)

    handler = http.server.SimpleHTTPRequestHandler
    httpd = http.server.HTTPServer(("0.0.0.0", args.port), handler)
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(certfile=str(CERT_FILE), keyfile=str(KEY_FILE))
    httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)

    ips = lan_ips()
    print()
    print("Sound Therapy Viz - HTTPS server")
    print("  Serving:", serve_dir)
    print("  Bind:   https://0.0.0.0:%d" % args.port)
    print()
    print("Phone (mic works after you accept the cert warning once):")
    for ip in ips:
        print("  https://%s:%d" % (ip, args.port))
    print()
    print("Laptop mic (no cert needed): keep using")
    print("  http://localhost:8765")
    print("  (separate: python3 -m http.server 8765)")
    print()
    print("Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
