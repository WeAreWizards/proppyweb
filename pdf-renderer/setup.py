from setuptools import setup, find_packages

setup(
    name='proppy-pdf-renderer',
    version='1.0',
    author='We Are Wizards',
    author_email='team@wearewizards.io',
    py_modules=['renderer'],
    data_files=[('electron-app', ['electron-app/main.js', 'electron-app/package.json'])],
)
