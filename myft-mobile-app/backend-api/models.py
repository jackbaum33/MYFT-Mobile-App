from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    username = db.Column(db.String(80), primary_key=True)
    display_name = db.Column(db.String(120))
    points = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            "username": self.username,
            "displayName": self.display_name,
            "points": self.points
        }
