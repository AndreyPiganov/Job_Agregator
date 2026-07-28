up:
	docker-compose up -d

down:
	docker-compose down -v

logs:
	docker-compose logs -f

restart:
	docker-compose restart

build:
	docker-compose build