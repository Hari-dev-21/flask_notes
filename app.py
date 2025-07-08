from flask import Flask, jsonify, request, render_template, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from datetime import datetime, timedelta, timezone
from functools import wraps
import jwt
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///database.db"
app.config['SECRET_KEY'] = os.environ.get("SECRET_KEY", "dev_secret")

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)

# ---------------------------------- MODELS ---------------------------------- #

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), nullable=False, unique=True)
    password = db.Column(db.String(128), nullable=False)
    notes = db.relationship("Crud", backref="user", lazy=True)

class Crud(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String(300), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))




@app.route("/")
def index():
    return render_template("index.html")

@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)    

# ----------------------------- JWT Utilities ----------------------------- #

def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(minutes=30)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"error": "Token is missing!"}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return f(current_user, *args, **kwargs)
    return decorated

# ---------------------------------- ROUTES ---------------------------------- #

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "hello"})

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 409

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    user = User(username=username, password=hashed_password)
    db.session.add(user)
    db.session.commit()

    token = generate_token(user.id)
    return jsonify({"message": "Registered successfully", "token": token}), 201

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    user = User.query.filter_by(username=username).first()
    if user and bcrypt.check_password_hash(user.password, password):
        token = generate_token(user.id)
        return jsonify({"message": "Login successful", "token": token}), 200
    return jsonify({"error": "Invalid username or password"}), 401

# ---------------------------------- CRUD ---------------------------------- #

@app.route("/api/create", methods=["POST"])
@token_required
def api_create(current_user):
    data = request.get_json()
    content = data.get("content")
    if not content:
        return jsonify({"error": "empty content"}), 400
    note = Crud(content=content, user_id=current_user.id)
    db.session.add(note)
    db.session.commit()
    return jsonify({"message": "note successfully created"}), 201

@app.route("/api/show", methods=["GET"])
@token_required
def api_show(current_user):
    notes = Crud.query.filter_by(user_id=current_user.id).all()
    result = [{"id": note.id, "content": note.content} for note in notes]
    return jsonify(result), 200

@app.route("/api/show/<int:id>", methods=["GET"])
@token_required
def api_show_one(current_user, id):
    note = Crud.query.get_or_404(id)
    if note.user_id != current_user.id:
        return jsonify({"error": "unauthorized access"}), 403
    return jsonify({"id": note.id, "content": note.content}), 200

@app.route("/api/update/<int:id>", methods=["PUT"])
@token_required
def api_update(current_user, id):
    note = Crud.query.get_or_404(id)
    if note.user_id != current_user.id:
        return jsonify({"error": "unauthorized access"}), 403
    data = request.get_json()
    content = data.get("content")
    if not content:
        return jsonify({"error": "Content cannot be empty"}), 400
    note.content = content
    db.session.commit()
    return jsonify({"message": "updated successfully"}), 200

@app.route("/api/delete/<int:id>", methods=["DELETE"])
@token_required
def api_delete(current_user, id):
    note = Crud.query.get_or_404(id)
    if note.user_id != current_user.id:
        return jsonify({"error": "unauthorized access"}), 403
    db.session.delete(note)
    db.session.commit()
    return jsonify({"message": "note deleted successfully"}), 200




# ---------------------------------- MAIN ---------------------------------- #

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
