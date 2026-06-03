"""
嵌入式学习笔记 — 轻量服务器
Python 内置库，无需 pip install

启动: python server.py
访客: http://你的IP:8080
管理: http://你的IP:8080/admin.html
"""

import json
import os
import hashlib
import secrets
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = int(os.environ.get("PORT", 8080))
ADMIN_PASSWORD = os.environ.get("BLOG_ADMIN_PASSWORD", "admin123")
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
TOKENS = set()  # 内存 token 存储

STATIC_EXTENSIONS = {
    ".html", ".css", ".js", ".png", ".jpg", ".jpeg", ".gif",
    ".svg", ".ico", ".woff", ".woff2", ".ttf", ".map", ".json"
}

def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None

def save_json(filename, data):
    path = os.path.join(DATA_DIR, filename)
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def json_response(handler, data, status=200):
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.end_headers()
    handler.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

def check_admin(handler):
    """检查 Bearer token"""
    auth = handler.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        if token in TOKENS:
            return True
    return False

def log_visit(handler):
    """记录访客访问"""
    path = handler.path.split("?")[0]
    # 只记录页面访问，跳过静态资源和 API
    if path.endswith((".css", ".js", ".png", ".jpg", ".svg", ".ico", ".woff", ".woff2", ".map")):
        return
    if path.startswith("/api/"):
        return

    ip = handler.client_address[0]
    ua = handler.headers.get("User-Agent", "")
    # 简化的 UA 解析
    browser = "未知"
    if "Chrome" in ua and "Edg" not in ua: browser = "Chrome"
    elif "Edg" in ua: browser = "Edge"
    elif "Firefox" in ua: browser = "Firefox"
    elif "Safari" in ua and "Chrome" not in ua: browser = "Safari"

    os_type = "未知"
    if "Windows" in ua: os_type = "Windows"
    elif "Mac" in ua: os_type = "macOS"
    elif "Linux" in ua and "Android" not in ua: os_type = "Linux"
    elif "Android" in ua: os_type = "Android"
    elif "iPhone" in ua or "iPad" in ua: os_type = "iOS"

    visits = load_json("visits.json") or []
    visits.append({
        "ip": ip,
        "path": path or "/",
        "browser": browser,
        "os": os_type,
        "time": datetime.now().isoformat()
    })
    # 只保留最近 2000 条
    if len(visits) > 2000:
        visits = visits[-2000:]
    save_json("visits.json", visits)

class BlogHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {args[0]}")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # 记录访客
        log_visit(self)

        # API: 获取所有文章
        if path == "/api/posts":
            posts = load_json("posts.json") or []
            return json_response(self, posts)

        # API: 获取个人信息
        if path == "/api/profile":
            profile = load_json("profile.json") or {}
            return json_response(self, profile)

        # API: 获取访问记录（需认证）
        if path == "/api/visits":
            if not check_admin(self):
                return json_response(self, {"error": "未授权"}, 401)
            visits = load_json("visits.json") or []
            return json_response(self, visits)

        # API: 获取访问统计
        if path == "/api/stats":
            if not check_admin(self):
                return json_response(self, {"error": "未授权"}, 401)
            visits = load_json("visits.json") or []
            posts = load_json("posts.json") or []

            # 统计
            total = len(visits)
            today = datetime.now().strftime("%Y-%m-%d")
            today_visits = [v for v in visits if v["time"].startswith(today)]
            unique_ips = len(set(v["ip"] for v in visits))
            today_ips = len(set(v["ip"] for v in today_visits))
            browsers = {}
            for v in visits:
                b = v["browser"]
                browsers[b] = browsers.get(b, 0) + 1
            pages = {}
            for v in visits:
                p = v["path"]
                pages[p] = pages.get(p, 0) + 1

            return json_response(self, {
                "total": total,
                "today": len(today_visits),
                "unique_ips": unique_ips,
                "today_ips": today_ips,
                "browsers": browsers,
                "pages": pages,
                "posts_count": len(posts),
                "recent": visits[-10:]
            })

        # 静态文件
        return self.serve_static()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # API: 管理员登录
        if path == "/api/admin":
            body = self.read_body()
            try:
                data = json.loads(body)
                if data.get("password") == ADMIN_PASSWORD:
                    token = secrets.token_hex(32)
                    TOKENS.add(token)
                    return json_response(self, {"token": token, "ok": True})
                return json_response(self, {"error": "密码错误"}, 401)
            except json.JSONDecodeError:
                return json_response(self, {"error": "无效的请求"}, 400)

        # API: 创建文章（需认证）
        if path == "/api/posts":
            if not check_admin(self):
                return json_response(self, {"error": "未授权"}, 401)
            body = self.read_body()
            try:
                post = json.loads(body)
                posts = load_json("posts.json") or []
                post["id"] = post.get("id") or int(self.date_time_string().replace(" ", ""))
                posts.insert(0, post)
                save_json("posts.json", posts)
                return json_response(self, post, 201)
            except json.JSONDecodeError:
                return json_response(self, {"error": "无效的 JSON"}, 400)

        return self.serve_static()

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # API: 更新文章
        if path.startswith("/api/posts/") and not check_admin(self):
            return json_response(self, {"error": "未授权"}, 401)

        if path.startswith("/api/posts/"):
            post_id = int(path.split("/")[-1])
            body = self.read_body()
            try:
                data = json.loads(body)
                posts = load_json("posts.json") or []
                for i, p in enumerate(posts):
                    if p["id"] == post_id:
                        posts[i] = {**p, **data, "id": post_id}
                        save_json("posts.json", posts)
                        return json_response(self, posts[i])
                return json_response(self, {"error": "文章不存在"}, 404)
            except json.JSONDecodeError:
                return json_response(self, {"error": "无效的 JSON"}, 400)

        # API: 更新个人信息
        if path == "/api/profile":
            if not check_admin(self):
                return json_response(self, {"error": "未授权"}, 401)
            body = self.read_body()
            try:
                profile = json.loads(body)
                save_json("profile.json", profile)
                return json_response(self, profile)
            except json.JSONDecodeError:
                return json_response(self, {"error": "无效的 JSON"}, 400)

        return json_response(self, {"error": "未找到"}, 404)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/posts/"):
            if not check_admin(self):
                return json_response(self, {"error": "未授权"}, 401)
            post_id = int(path.split("/")[-1])
            posts = load_json("posts.json") or []
            posts = [p for p in posts if p["id"] != post_id]
            save_json("posts.json", posts)
            return json_response(self, {"ok": True})

        return json_response(self, {"error": "未找到"}, 404)

    def serve_static(self):
        """提供静态文件"""
        path = self.path.split("?")[0]
        if path == "/":
            path = "/index.html"

        file_path = os.path.join(os.getcwd(), path.lstrip("/"))

        if os.path.isfile(file_path):
            ext = os.path.splitext(file_path)[1].lower()
            content_types = {
                ".html": "text/html; charset=utf-8",
                ".css": "text/css; charset=utf-8",
                ".js": "application/javascript; charset=utf-8",
                ".json": "application/json; charset=utf-8",
                ".svg": "image/svg+xml",
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".ico": "image/x-icon",
            }
            content_type = content_types.get(ext, "application/octet-stream")

            with open(file_path, "rb") as f:
                data = f.read()

            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", len(data))
            self.end_headers()
            self.wfile.write(data)
        else:
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"<h1>404 Not Found</h1>")

    def read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        return self.rfile.read(length).decode("utf-8") if length > 0 else "{}"


if __name__ == "__main__":
    print(f"""
╔══════════════════════════════════════╗
║     嵌入式学习笔记 — 服务器已启动      ║
╠══════════════════════════════════════╣
║  访客页面: http://localhost:{PORT}     ║
║  管理页面: http://localhost:{PORT}/admin.html ║
║  管理密码: {ADMIN_PASSWORD:<20} ║
║  Ctrl+C 停止服务器                    ║
╚══════════════════════════════════════╝
""")

    server = HTTPServer(("0.0.0.0", PORT), BlogHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
        server.server_close()
