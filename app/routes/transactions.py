from datetime import datetime
from flask import Blueprint, request, jsonify
from ..models import db, Transaction
from ..auth_utils import require_auth

transactions_bp = Blueprint("transactions", __name__)


def serialize(t):
    return {
        "id": t.id,
        "amount": t.amount,
        "description": t.description,
        "date": t.date.isoformat(),
        "category_id": t.category_id,
    }


@transactions_bp.route("/transactions", methods=["GET"])
@require_auth
def get_transactions():
    query = Transaction.query.filter_by(user_id=request.user.id)

    category_id = request.args.get("category_id")
    if category_id:
        query = query.filter_by(category_id=category_id)

    transactions = query.order_by(Transaction.date.desc()).all()
    return jsonify([serialize(t) for t in transactions]), 200


@transactions_bp.route("/transactions", methods=["POST"])
@require_auth
def create_transaction():
    data = request.get_json() or {}
    amount = data.get("amount")

    if amount is None:
        return jsonify({"error": "amount is required"}), 400

    date_str = data.get("date")
    date = datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else datetime.utcnow().date()

    transaction = Transaction(
        amount=amount,
        description=data.get("description"),
        date=date,
        category_id=data.get("category_id"),
        user_id=request.user.id,
    )
    db.session.add(transaction)
    db.session.commit()

    return jsonify(serialize(transaction)), 201


@transactions_bp.route("/transactions/<int:transaction_id>", methods=["PUT"])
@require_auth
def update_transaction(transaction_id):
    transaction = Transaction.query.filter_by(id=transaction_id, user_id=request.user.id).first()

    if not transaction:
        return jsonify({"error": "transaction not found"}), 404

    data = request.get_json() or {}

    if "amount" in data:
        transaction.amount = data["amount"]
    if "description" in data:
        transaction.description = data["description"]
    if "category_id" in data:
        transaction.category_id = data["category_id"]
    if "date" in data:
        transaction.date = datetime.strptime(data["date"], "%Y-%m-%d").date()

    db.session.commit()
    return jsonify(serialize(transaction)), 200


@transactions_bp.route("/transactions/<int:transaction_id>", methods=["DELETE"])
@require_auth
def delete_transaction(transaction_id):
    transaction = Transaction.query.filter_by(id=transaction_id, user_id=request.user.id).first()

    if not transaction:
        return jsonify({"error": "transaction not found"}), 404

    db.session.delete(transaction)
    db.session.commit()
    return jsonify({"message": "deleted"}), 200