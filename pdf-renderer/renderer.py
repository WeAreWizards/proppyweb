"""
This script renders PDFs for proppy shared proposals.

Assumptions:
* docker running on machine
* working directory is cache directory where rendered PDFs are stored
"""
import logging
import logging.handlers
import os
import re
import flask
import subprocess
import tempfile

from raven.contrib.flask import Sentry

HOME = os.path.expanduser("/var/lib/pdf-render-cache/")

app = flask.Flask(__name__)
sentry = Sentry(app, dsn=os.environ['SENTRY_DSN'])
app.debug = True

logging.basicConfig(level=logging.INFO)
logging.getLogger().addHandler(logging.handlers.SysLogHandler(address='/run/systemd/journal/dev-log'))

def command(share_id, version, log_path):
    return [
        "xvfb-run", "-a", "-e", log_path, "--", "electron", ".",
        "https://app.proppy.io/p/{}/{}".format(share_id, version),
    ]

def cache_name(share_id, version, signed):
    return '{}-{}-{}'.format(share_id, version, signed)

@app.route("/api/render-pdf/<path:share_id>/<int:version>/<signed>")
def render(share_id, version, signed):
    assert re.match('^[A-Z0-9]{9}$', share_id), "invalid share_id"
    assert signed in ['u', 's'], "signed must be 'u' or 's'"

    title = flask.request.args.get("title", "Untitled")

    cached_name = cache_name(share_id, version, signed)
    out_path = os.path.join(HOME, cached_name)

    logging.info("Request for  %s", cached_name)
    send = lambda: flask.send_file(out_path, attachment_filename="{}.pdf".format(title), as_attachment=True)

    if os.path.exists(out_path):
        logging.info("Serving from cache  %s", out_path)
        return send()

    c = command(share_id, version, "{}.log".format(out_path))
    logging.info("Rendering  %s", cached_name)
    logging.info("  %s: calling ", c)
    logging.info("  %s: pwd ", os.getcwd())

    # xvfb sometimes doesn't clean up its lock file so we run in a
    # temp dir that's always deleted.
    out = subprocess.check_output(c)

    with open(os.path.join(out_path), 'wb') as f:
        f.write(out)

    return send()
