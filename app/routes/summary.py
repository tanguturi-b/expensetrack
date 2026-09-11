from flask import Blueprint, request, jsonify
from sqlalchemy import func, extract
from ..models import db, Transaction, Category
from ..auth_utils import require_auth

summary_bp = Blueprint("summary", __name__)


@summary_bp.route("/summary", methods=["GET"])
@require_auth
def summary():
    year = request.args.get("year", type=int)
    month = request.args.get("month", type=int)

    query = db.session.query(
        Category.name.label("category"),
        func.sum(Transaction.amount).label("total")
    ).join(Category, Transaction.category_id == Category.id) \
     .filter(Transaction.user_id == request.user.id)

    if year:
        query = query.filter(extract("year", Transaction.date) == year)
    if month:
        query = query.filter(extract("month", Transaction.date) == month)

    results = query.group_by(Category.name).all()

    return jsonify({
        "year": year,
        "month": month,
        "by_category": [{"category": r.category, "total": float(r.total)} for r in results]
    }), 200