import os
import re
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from bson import ObjectId
from flask import Flask, g, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient, ReturnDocument
from pymongo.errors import DuplicateKeyError, PyMongoError
from werkzeug.security import check_password_hash, generate_password_hash


app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": os.getenv("FRONTEND_ORIGIN", "http://localhost:8080")}})

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongodb:27017/library")
JWT_SECRET = os.getenv("JWT_SECRET", "local-development-change-me")
if JWT_SECRET == "local-development-change-me" and os.getenv("APP_ENV") == "production":
    raise RuntimeError("JWT_SECRET must be set outside local development")

mongo = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = mongo.get_default_database()
users = db.users
books = db.books
transactions = db.transactions

DEFAULT_BOOKS = [
    {"title": "The Hobbit", "author": "J.R.R. Tolkien", "category": "Fantasy", "coverImage": "https://covers.openlibrary.org/b/title/The%20Hobbit-M.jpg", "price": 12.99, "totalQuantity": 5},
    {"title": "Pride and Prejudice", "author": "Jane Austen", "category": "Classic", "coverImage": "https://covers.openlibrary.org/b/title/Pride%20and%20Prejudice-M.jpg", "price": 9.50, "totalQuantity": 4},
    {"title": "The Pragmatic Programmer", "author": "Andrew Hunt and David Thomas", "category": "Technology", "coverImage": "https://covers.openlibrary.org/b/title/The%20Pragmatic%20Programmer-M.jpg", "price": 39.99, "totalQuantity": 3},
    {"title": "Dune", "author": "Frank Herbert", "category": "Science Fiction", "coverImage": "https://covers.openlibrary.org/b/title/Dune-M.jpg", "price": 14.25, "totalQuantity": 6},
]


def public_book(book):
    return {
        "id": str(book["_id"]),
        "title": book["title"],
        "author": book["author"],
        "category": book["category"],
        "coverImage": book.get("coverImage", ""),
        "price": book["price"],
        "totalQuantity": book["totalQuantity"],
        "availableQuantity": book["availableQuantity"],
    }


def seed_catalogue():
    if books.estimated_document_count() == 0:
        books.insert_many([
            {**book, "availableQuantity": book["totalQuantity"], "createdAt": datetime.now(timezone.utc)}
            for book in DEFAULT_BOOKS
        ])
    users.create_index("email", unique=True)
    transactions.create_index([("userId", 1), ("createdAt", -1)])


def api_error(message, status):
    return jsonify({"error": message}), status


def require_auth(handler):
    @wraps(handler)
    def wrapped(*args, **kwargs):
        value = request.headers.get("Authorization", "")
        if not value.startswith("Bearer "):
            return api_error("Please log in to continue.", 401)
        try:
            payload = jwt.decode(value[7:], JWT_SECRET, algorithms=["HS256"])
            g.user_id = ObjectId(payload["sub"])
        except (jwt.InvalidTokenError, KeyError, TypeError):
            return api_error("Your session has expired. Please log in again.", 401)
        return handler(*args, **kwargs)
    return wrapped


@app.get("/api/health")
def health():
    try:
        mongo.admin.command("ping")
        return jsonify({"status": "ok", "database": "connected"})
    except PyMongoError:
        return api_error("Database is unavailable.", 503)


@app.post("/api/auth/register")
def register():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    if not name or len(name) > 100:
        return api_error("Enter your name (up to 100 characters).", 400)
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        return api_error("Enter a valid email address.", 400)
    if len(password) < 8:
        return api_error("Password must contain at least 8 characters.", 400)
    try:
        result = users.insert_one({
            "name": name,
            "email": email,
            "passwordHash": generate_password_hash(password),
            "createdAt": datetime.now(timezone.utc),
        })
    except DuplicateKeyError:
        return api_error("An account with that email already exists.", 409)
    return jsonify({"message": "Account created. You can now log in.", "userId": str(result.inserted_id)}), 201


@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    user = users.find_one({"email": email})
    if not user or not check_password_hash(user["passwordHash"], password):
        return api_error("Email or password is incorrect.", 401)
    token = jwt.encode(
        {"sub": str(user["_id"]), "exp": datetime.now(timezone.utc) + timedelta(hours=12)},
        JWT_SECRET,
        algorithm="HS256",
    )
    return jsonify({"token": token, "user": {"id": str(user["_id"]), "name": user["name"], "email": user["email"]}})


@app.post("/api/auth/logout")
@require_auth
def logout():
    # Tokens are stateless; the frontend discards its token on logout.
    return jsonify({"message": "Logged out."})


@app.get("/api/books")
def list_books():
    query = {}
    category = request.args.get("category", "").strip()
    search = request.args.get("search", "").strip()
    if category:
        query["category"] = {"$regex": re.escape(category), "$options": "i"}
    if search:
        term = {"$regex": re.escape(search), "$options": "i"}
        query["$or"] = [{"title": term}, {"author": term}, {"category": term}]
    return jsonify([public_book(book) for book in books.find(query).sort("title", 1)])


@app.get("/api/categories")
def list_categories():
    return jsonify(sorted(books.distinct("category")))


def transact(book_id, action):
    if not ObjectId.is_valid(book_id):
        return api_error("Book not found.", 404)
    inventory_change = {"availableQuantity": -1}
    if action == "purchase":
        inventory_change["totalQuantity"] = -1
    book = books.find_one_and_update(
        {"_id": ObjectId(book_id), "availableQuantity": {"$gt": 0}},
        {"$inc": inventory_change},
        return_document=ReturnDocument.AFTER,
    )
    if not book:
        if not books.find_one({"_id": ObjectId(book_id)}):
            return api_error("Book not found.", 404)
        return api_error("This book is currently unavailable.", 409)
    now = datetime.now(timezone.utc)
    result = transactions.insert_one({
        "userId": g.user_id,
        "bookId": book["_id"],
        "bookTitle": book["title"],
        "type": action,
        "status": "active" if action == "borrow" else "completed",
        "createdAt": now,
        "returnedAt": None,
    })
    return jsonify({"message": "Borrow recorded." if action == "borrow" else "Purchase recorded. No payment was processed.", "transactionId": str(result.inserted_id), "book": public_book(book)}), 201


@app.post("/api/books/<book_id>/borrow")
@require_auth
def borrow(book_id):
    return transact(book_id, "borrow")


@app.post("/api/books/<book_id>/buy")
@require_auth
def buy(book_id):
    return transact(book_id, "purchase")


@app.get("/api/loans")
@require_auth
def list_loans():
    records = transactions.find({"userId": g.user_id, "type": "borrow"}).sort("createdAt", -1)
    return jsonify([{
        "id": str(item["_id"]),
        "bookId": str(item["bookId"]),
        "bookTitle": item["bookTitle"],
        "status": item["status"],
        "createdAt": item["createdAt"].isoformat(),
        "returnedAt": item["returnedAt"].isoformat() if item.get("returnedAt") else None,
    } for item in records])


@app.post("/api/loans/<loan_id>/return")
@require_auth
def return_book(loan_id):
    if not ObjectId.is_valid(loan_id):
        return api_error("Loan not found.", 404)
    now = datetime.now(timezone.utc)
    loan = transactions.find_one_and_update(
        {"_id": ObjectId(loan_id), "userId": g.user_id, "type": "borrow", "status": "active"},
        {"$set": {"status": "returned", "returnedAt": now}},
        return_document=ReturnDocument.AFTER,
    )
    if not loan:
        return api_error("Active loan not found.", 404)
    books.update_one({"_id": loan["bookId"]}, {"$inc": {"availableQuantity": 1}})
    return jsonify({"message": "Book returned."})


@app.get("/api/purchases")
@require_auth
def list_purchases():
    records = transactions.find({"userId": g.user_id, "type": "purchase"}).sort("createdAt", -1)
    return jsonify([{"id": str(item["_id"]), "bookTitle": item["bookTitle"], "createdAt": item["createdAt"].isoformat()} for item in records])


@app.errorhandler(PyMongoError)
def database_error(error):
    app.logger.exception("MongoDB request failed: %s", error)
    return api_error("The database request could not be completed. Please try again.", 503)


with app.app_context():
    try:
        mongo.admin.command("ping")
        seed_catalogue()
    except PyMongoError:
        app.logger.warning("MongoDB is not ready; catalogue seeding will happen on the next startup.")
