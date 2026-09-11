from flask import Blueprint, request, jsonify
from ..models import db, Category
from ..auth_utils import require_auth

categories_bp = Blueprint("categories", __name__)


@categories_bp.route("/categories", methods=["GET"])
@require_auth
def get_categories():
    categories = Category.query.filter_by(user_id=request.user.id).all()
    return jsonify([
        {"id": c.id, "name": c.name} for c in categories
    ]), 200


@categories_bp.route("/categories", methods=["POST"])
@require_auth
def create_category():
    data = request.get_json() or {}
    name = data.get("name")

    if not name:
        return jsonify({"error": "name is required"}), 400

    category = Category(name=name, user_id=request.user.id)
    db.session.add(category)
    db.session.commit()

    return jsonify({"id": category.id, "name": category.name}), 201