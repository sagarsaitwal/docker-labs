import http.server
import socketserver

PORT = 8080

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/plain")
        self.end_headers()
        self.wfile.write(b"Hello from my own image\n")

with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"serving on {PORT}")
    httpd.serve_forever()

