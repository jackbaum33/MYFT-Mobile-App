from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, User

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
CORS(app)

@app.before_first_request
def create_tables():
    db.create_all()

@app.route('/api/users/<username>', methods=['PUT'])
def update_user(username):
    data = request.json
    user = User.query.get(username)
    if not user:
        user = User(username=username)
    user.display_name = data.get('displayName', user.display_name)
    user.points = data.get('points', user.points or 0)
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict())

@app.route('/api/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([u.to_dict() for u in users])

if __name__ == '__main__':
    app.run(debug=True)
