.PHONY : create remove stop start reset-migrations

create:
		docker run --name proppydb -d \
		-e 'POSTGRES_USER=proppy' \
		-e 'POSTGRES_DB=proppy' \
		-p 5432:5432 \
		postgres:9.5.0

		docker run --name proppydb-test -d \
		-e 'POSTGRES_USER=proppy' \
		-e 'POSTGRES_DB=proppy' \
		-p 5433:5432 \
		postgres:9.5.0

		docker run --name proppyes -d \
		-p 9200:9200 \
		elasticsearch:2.3.5

remove:
		docker rm proppydb && docker rm proppydb-test && docker rm proppyes

stop:
		docker stop proppydb && docker stop proppydb-test && docker stop proppyes

start:
		docker start proppydb && docker start proppydb-test && docker start proppyes

recreate: stop remove create start
	sleep 5
	docker exec -i -t  proppydb psql -U proppy -d proppy -c "CREATE EXTENSION citext;"
	python3.5 ./manage.py db upgrade
	python3.5 ./manage.py cool-agency
	python3.5 ./manage.py es_reindex
