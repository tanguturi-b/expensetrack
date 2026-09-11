from functools import wraps
from flask import request, jsonify
from .models import User


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "missing or invalid Authorization header"}), 401

        token = auth_header.split(" ", 1)[1]
        user = User.query.filter_by(token=token).first()

        if not user:
            return jsonify({"error": "invalid or expired token"}), 401

        request.user = user
        return f(*args, **kwargs)

    return decorated