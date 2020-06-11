FROM ubuntu:18.04

MAINTAINER Elagin Anton

# Обновление списка пакетов
RUN apt-get -y update

#
# Установка postgresql
#
ENV PGVER 10
RUN apt-get install -y postgresql-$PGVER

# Run the rest of the commands as the ``postgres`` user created by the ``postgres-$PGVER`` package when it was ``apt-get installed``
USER postgres

# Create a PostgreSQL role named ``docker`` with ``docker`` as the password and
# then create a database `docker` owned by the ``docker`` role.
RUN /etc/init.d/postgresql start &&\
    psql --command "CREATE USER docker WITH SUPERUSER PASSWORD 'docker';" &&\
    createdb -O docker docker &&\
    /etc/init.d/postgresql stop

# Adjust PostgreSQL configuration so that remote connections to the
# database are possible.
RUN echo "host all  all    0.0.0.0/0  md5" >> /etc/postgresql/$PGVER/main/pg_hba.conf

# And add ``listen_addresses`` to ``/etc/postgresql/$PGVER/main/postgresql.conf``
RUN echo "listen_addresses='*'" >> /etc/postgresql/$PGVER/main/postgresql.conf

# Expose the PostgreSQL port
EXPOSE 5432

# Add VOLUMEs to allow backup of config, logs and databases
VOLUME  ["/etc/postgresql", "/var/log/postgresql", "/var/lib/postgresql"]

# Back to the root user
USER root

#
# Сборка проекта
#

RUN apt-get install -y curl
RUN curl —silent —location https://deb.nodesource.com/setup_8.x | bash -
RUN apt-get install -y nodejs
RUN apt-get install -y build-essential

COPY . /src
WORKDIR /src

RUN npm install

# Объявлем порт сервера
EXPOSE 5000

# Запускаем, инициализируем базу данных, запускаем приложение
ENV PGPASSWORD docker
CMD service postgresql start && psql -h localhost -U docker -d docker -f ./db/query.sql && npm start