from setuptools import setup, find_packages

setup(
    name='proppy-backend',
    version='1.0',

    author='We Are Wizards',
    author_email='team@wearewizards.io',

    scripts=['manage.py', 'admin-manage.py'],
    packages=find_packages(),
    py_modules=['manage'],

    package_data={
        'migrations': ['alembic.ini', 'script.py.mako', 'versions/*py'],
        'app': ['templates/*.*', 'templates/mails/partials/*.*', 'templates/mails/*.*'],
        'admin': ['templates/*.html', 'templates/admin/*.html', 'static/css/*', 'static/fonts/*', 'static/js/*'],
    },
)
