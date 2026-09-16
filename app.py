from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    session,
    jsonify,
    flash
)

import sqlite3
from functools import wraps
from datetime import datetime


app = Flask(__name__)

# Secret key for sessions
app.secret_key = "team_tracker_secret_key_2026"

DATABASE = "team.db"


# =========================================================
# DATABASE
# =========================================================

def get_db_connection():
    conn = sqlite3.connect(DATABASE)

    conn.row_factory = sqlite3.Row

    return conn


def init_db():

    conn = get_db_connection()

    # -------------------------
    # Users table
    # -------------------------

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            username TEXT UNIQUE NOT NULL,

            password TEXT NOT NULL,

            name TEXT NOT NULL,

            role TEXT NOT NULL,

            status TEXT NOT NULL DEFAULT 'available',

            last_updated TEXT
        )
    """)

    # -------------------------
    # Check if users exist
    # -------------------------

    count = conn.execute(
        "SELECT COUNT(*) FROM users"
    ).fetchone()[0]

    # -------------------------
    # Insert sample users
    # -------------------------

    if count == 0:

        users = [

            (
                "admin",
                "admin123",
                "Admin User",
                "admin",
                "available",
                datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            ),

            (
                "ananya",
                "user123",
                "Ananya",
                "member",
                "available",
                datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            ),

            (
                "rahul",
                "user123",
                "Rahul",
                "member",
                "busy",
                datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            ),

            (
                "priya",
                "user123",
                "Priya",
                "member",
                "meeting",
                datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            ),

            (
                "arjun",
                "user123",
                "Arjun",
                "member",
                "available",
                datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            ),

            (
                "sneha",
                "user123",
                "Sneha",
                "member",
                "leave",
                datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            ),

            (
                "kiran",
                "user123",
                "Kiran",
                "member",
                "unavailable",
                datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            )
        ]

        conn.executemany("""
            INSERT INTO users
            (
                username,
                password,
                name,
                role,
                status,
                last_updated
            )

            VALUES (?, ?, ?, ?, ?, ?)
        """, users)

    conn.commit()

    conn.close()


# =========================================================
# LOGIN PROTECTION
# =========================================================

def login_required(function):

    @wraps(function)
    def decorated_function(*args, **kwargs):

        if "user_id" not in session:

            return redirect(
                url_for("login")
            )

        return function(*args, **kwargs)

    return decorated_function


def admin_required(function):

    @wraps(function)
    def decorated_function(*args, **kwargs):

        if "user_id" not in session:

            return redirect(
                url_for("login")
            )

        if session.get("role") != "admin":

            flash(
                "Admin access required.",
                "error"
            )

            return redirect(
                url_for("dashboard")
            )

        return function(*args, **kwargs)

    return decorated_function


# =========================================================
# LOGIN
# =========================================================

@app.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        username = request.form.get(
            "username",
            ""
        ).strip()

        password = request.form.get(
            "password",
            ""
        )

        conn = get_db_connection()

        user = conn.execute("""
            SELECT *
            FROM users
            WHERE username = ?
            AND password = ?
        """, (
            username,
            password
        )).fetchone()

        conn.close()

        if user:

            session["user_id"] = user["id"]

            session["username"] = user["username"]

            session["name"] = user["name"]

            session["role"] = user["role"]

            return redirect(
                url_for("dashboard")
            )

        flash(
            "Invalid username or password.",
            "error"
        )

    return render_template(
        "login.html"
    )


# =========================================================
# LOGOUT
# =========================================================

@app.route("/logout")
def logout():

    session.clear()

    return redirect(
        url_for("login")
    )


# =========================================================
# DASHBOARD
# =========================================================

@app.route("/")
def home():

    if "user_id" not in session:

        return redirect(
            url_for("login")
        )

    return redirect(
        url_for("dashboard")
    )


@app.route("/dashboard")
@login_required
def dashboard():

    return render_template(
        "dashboard.html"
    )


# =========================================================
# USER MANAGEMENT
# =========================================================

@app.route("/users")
@admin_required
def users():

    conn = get_db_connection()

    users = conn.execute("""
        SELECT *
        FROM users
        ORDER BY name
    """).fetchall()

    conn.close()

    return render_template(
        "users.html",
        users=users
    )


# =========================================================
# ADD USER
# =========================================================

@app.route("/users/add", methods=["POST"])
@admin_required
def add_user():

    username = request.form.get(
        "username",
        ""
    ).strip()

    password = request.form.get(
        "password",
        ""
    )

    name = request.form.get(
        "name",
        ""
    ).strip()

    role = request.form.get(
        "role",
        "member"
    )

    if not username or not password or not name:

        flash(
            "Please fill in all required fields.",
            "error"
        )

        return redirect(
            url_for("users")
        )

    conn = get_db_connection()

    try:

        conn.execute("""
            INSERT INTO users
            (
                username,
                password,
                name,
                role,
                status,
                last_updated
            )

            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            username,
            password,
            name,
            role,
            "available",
            datetime.now().strftime(
                "%Y-%m-%d %H:%M:%S"
            )
        ))

        conn.commit()

        flash(
            "Team member added successfully.",
            "success"
        )

    except sqlite3.IntegrityError:

        flash(
            "Username already exists.",
            "error"
        )

    conn.close()

    return redirect(
        url_for("users")
    )


# =========================================================
# EDIT USER PAGE
# =========================================================

@app.route("/users/edit/<int:user_id>")
@admin_required
def edit_user(user_id):

    conn = get_db_connection()

    user = conn.execute("""
        SELECT *
        FROM users
        WHERE id = ?
    """, (user_id,)).fetchone()

    conn.close()

    if user is None:

        flash(
            "User not found.",
            "error"
        )

        return redirect(
            url_for("users")
        )

    return render_template(
        "edit_user.html",
        user=user
    )


# =========================================================
# UPDATE USER
# =========================================================

@app.route(
    "/users/update/<int:user_id>",
    methods=["POST"]
)
@admin_required
def update_user(user_id):

    name = request.form.get(
        "name",
        ""
    ).strip()

    username = request.form.get(
        "username",
        ""
    ).strip()

    role = request.form.get(
        "role",
        "member"
    )

    password = request.form.get(
        "password",
        ""
    )

    conn = get_db_connection()

    try:

        if password:

            conn.execute("""
                UPDATE users

                SET
                    name = ?,
                    username = ?,
                    role = ?,
                    password = ?

                WHERE id = ?
            """, (
                name,
                username,
                role,
                password,
                user_id
            ))

        else:

            conn.execute("""
                UPDATE users

                SET
                    name = ?,
                    username = ?,
                    role = ?

                WHERE id = ?
            """, (
                name,
                username,
                role,
                user_id
            ))

        conn.commit()

        flash(
            "User updated successfully.",
            "success"
        )

    except sqlite3.IntegrityError:

        flash(
            "Username already exists.",
            "error"
        )

    conn.close()

    return redirect(
        url_for("users")
    )


# =========================================================
# DELETE USER
# =========================================================

@app.route(
    "/users/delete/<int:user_id>",
    methods=["POST"]
)
@admin_required
def delete_user(user_id):

    # Don't allow admin to delete their own account

    if user_id == session.get("user_id"):

        flash(
            "You cannot delete your own account.",
            "error"
        )

        return redirect(
            url_for("users")
        )

    conn = get_db_connection()

    conn.execute("""
        DELETE FROM users
        WHERE id = ?
    """, (user_id,))

    conn.commit()

    conn.close()

    flash(
        "User deleted successfully.",
        "success"
    )

    return redirect(
        url_for("users")
    )


# =========================================================
# API - GET USERS
# =========================================================

@app.route(
    "/api/users",
    methods=["GET"]
)
@login_required
def api_users():

    conn = get_db_connection()

    users = conn.execute("""
        SELECT
            id,
            username,
            name,
            role,
            status,
            last_updated
        FROM users
        ORDER BY name
    """).fetchall()

    conn.close()

    return jsonify([
        dict(user)
        for user in users
    ])


# =========================================================
# API - UPDATE STATUS
# =========================================================

@app.route(
    "/api/users/<int:user_id>/status",
    methods=["PUT"]
)
@login_required
def update_status(user_id):

    data = request.get_json()

    new_status = data.get(
        "status"
    )

    allowed_statuses = [
        "available",
        "busy",
        "meeting",
        "leave",
        "unavailable"
    ]

    if new_status not in allowed_statuses:

        return jsonify({
            "success": False,
            "message": "Invalid status."
        }), 400


    # Members can only update their own status

    if (
        session.get("role") != "admin"
        and session.get("user_id") != user_id
    ):

        return jsonify({
            "success": False,
            "message": "You can only change your own status."
        }), 403


    current_time = datetime.now().strftime(
        "%Y-%m-%d %H:%M:%S"
    )

    conn = get_db_connection()

    user = conn.execute("""
        SELECT *
        FROM users
        WHERE id = ?
    """, (user_id,)).fetchone()


    if user is None:

        conn.close()

        return jsonify({
            "success": False,
            "message": "User not found."
        }), 404


    conn.execute("""
        UPDATE users

        SET
            status = ?,
            last_updated = ?

        WHERE id = ?
    """, (
        new_status,
        current_time,
        user_id
    ))

    conn.commit()

    updated_user = conn.execute("""
        SELECT
            id,
            username,
            name,
            role,
            status,
            last_updated

        FROM users

        WHERE id = ?
    """, (user_id,)).fetchone()

    conn.close()

    return jsonify({
        "success": True,
        "message": "Status updated successfully.",
        "user": dict(updated_user)
    })


# =========================================================
# START APPLICATION
# =========================================================

if __name__ == "__main__":

    init_db()

    app.run(
        debug=True
    )