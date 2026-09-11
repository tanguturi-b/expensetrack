import os
from flask import Flask
from .models import db
from flask import Flask, render_template


def create_app():
    app = Flask(__name__, static_folder="../static", template_folder="../templates")

    basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    default_db_path = "sqlite:///" + os.path.join(basedir, "expensetrack.db")

    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", default_db_path)
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-change-me")

    db.init_app(app)

    from .routes.auth import auth_bp
    from .routes.categories import categories_bp
    from .routes.transactions import transactions_bp
    from .routes.summary import summary_bp

    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(categories_bp, url_prefix="/api")
    app.register_blueprint(transactions_bp, url_prefix="/api")
    app.register_blueprint(summary_bp, url_prefix="/api")

    @app.route("/api/health")
    def health():
        return {"status": "ok"}

    with app.app_context():
        db.create_all()
    @app.route("/")
    def index():
        return render_template("index.html")

    return app