# Proppy backend

## Requirements
Current python version used is 3.5

Dependencies are stored in .txt files in the requirements folder.


## Commands
```
$ python manage.py test
$ python manage.py runserver
$ python manage.py list_routes
$ python manage.py db
```

For the db command, check the help provided.

## Test agency

Create an agency with the credentials `me@cool-agency.com` and `password`:

```
$ python manage.py cool-agency
```


## Databases
2 are needed, check the Makefile for details.

CITEXT extension for docker:

```
$ sudo docker exec -i -t  proppydb psql -U proppy -d proppy
proppy=# CREATE EXTENSION citext;
```


## Mailjet

```
d10 = int(time.time() - 1e6)
mailjet.openinformation.get_many({"FromTS": d10}).json()
mailjet.clickstatistics.get_many({"FromTS": d10}).json()
```


## Create chargebee subscription

Webhooks don't work locally so we have to create subscriptions by hand in the shell:

(get the id from https://proppy-test.chargebee.com/subscriptions)

```
from datetime import datetime
from app.setup import db
sub = ChargebeeSubscription(
    id="HtZEwTgPtIsy3P1Pec",
    plan_id="small",
    status="in_trial",
    company_id=1,
    trial_start=datetime.utcnow(),
    trial_end=datetime.utcnow(),
    created_at=datetime.utcnow(),
)
db.session.add(sub)
db.session.commit()
```

Subscription id can be found on https://proppy-test.chargebee.com/subscriptions

To receive test webhooks try this:

```
ssh -R 0.0.0.0:8080:127.0.0.01:7777 root@wearewizards.io
```


### Geolocation
We geolocate ips for proposal analytics using GeoLite2.
In production, the database is downloaded via Nix and is ignored in tests.
The database should be present in localhost, be it downloaded manually or via Nix.
It needs to be put at the same place as this README (`backend/`).

The database can be downloaded at http://dev.maxmind.com/geoip/geoip2/geolite2/ (the City db).
It seems they update the DB every month so the checksum should change everymonth but the URL stays the same.

## Stripe

Adding a fake stripe integration so we can test rendering etc:

```
./manage.py shell
s = StripeIntegration(company_id=50, access_token="sk_test_akPtu7KdE1ggeIlkhd6HJzAs", livemode=False, refresh_token="rt_A7ZygobqikYdZcZ6Ifu2f6uqaFDllPJefIG8TwUz0VsNicld", scope="read_write", stripe_publishable_key="pk_test_19GN1jMrLxQP772HJmtppH0P", stripe_user_id="acct_17gaeXCLeVQfrKa0", token_type="bearer")
from app.setup import create_app, db
db.session.add(s)
db.session.commit()
```
