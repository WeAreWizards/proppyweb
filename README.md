# Proppy Web

Bring your proposals into the 21st century!™

Licensed under [EUPL 1.2](https://joinup.ec.europa.eu/collection/eupl/eupl-text-11-12), a copyleft open-source license.

## This repository

This contains both the frontend (React/mobx in TypeScript) and the backend (flask) in their respective folders.

Both backend and frontend have their own README detailing how to run them.


PDF rendering requires another server running.

All settings are found in `app/config.py` but are supposed to be set via environment variables.


## 3rd party service
The backend needs AWS access for image upload and Mailjet to send emails.

If you want to run it for your own use,  you will also need to disable subscriptions.

If you want to use Zapier hooks, you will need to create your own Zapier app and
use the code from the `zapier` directory.

