import subprocess
import flask
from slackclient import SlackClient
import json

PREFIX = 'SLACK: '


def _send_message(sc, message):
    try:
        sc.api_call(
            "chat.postMessage",
            channel="#proppy",
            text=message,
            username='proppybot',
            icon_emoji=':robot_face:'
        )
    except Exception as e:
        # swallow all exceptions because this is for fun only
        print("slack sending error.")
        print(e)


def slacklog_run_forever():
    """
    Listens to the journal forever. If you print "SLACK: xxx" to the
    logs (usually via stdout in proppy backend) well just dump that in
    the proppy channel.
    """

    token = flask.current_app.config["SLACK_AUTH_TOKEN"]
    sc = SlackClient(token)
    p = subprocess.Popen(['journalctl', '-n', '0', '-o', 'json', '-f'], stdout=subprocess.PIPE)
    while True:
        entry = json.loads(p.stdout.readline().decode('utf8'))
        message = entry.get('MESSAGE', '')
        if not isinstance(message, str):
            continue
        if message.startswith(PREFIX):
            _send_message(sc, message[len(PREFIX):])
