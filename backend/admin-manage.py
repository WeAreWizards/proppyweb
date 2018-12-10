#!/usr/bin/env python
import os

from admin.setup import create_app
from flask_script import Manager, Server

app = create_app(os.getenv('FLASK_CONFIG') or 'default')
manager = Manager(app)

manager.add_command("runserver", Server(host="0.0.0.0", port=7777))

if __name__ == '__main__':
    manager.run()
