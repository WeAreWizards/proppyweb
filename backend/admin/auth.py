import flask
from flask.ext import login

login_manager = login.LoginManager()


"""
The oauth2_proxy sends headers like these:

X-Forwarded-Email: tehunger@gmail.com
X-Forwarded-For: 86.129.169.230, 127.0.0.1
X-Forwarded-Proto: https
X-Forwarded-User: tehunger
"""
@login_manager.request_loader
def load_user_from_request(request):
    user = request.headers.get("X-Forwarded-Email")

    if not flask.current_app.config["AUTH_REQUIRED"]:
        return None

    if user is not None:
        return user

    raise Exception("unknown user")
