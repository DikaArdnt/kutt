<p align="center"><a href="https://kua.lat" title="kua.lat"><img src="./static/images/favicon-144x144.png" alt="kua.lat"></a></p>

# kua.lat

**KuaLat** is a modern URL shortener with analystics. Create and edit links, manage users, and more.

[https://kua.lat](https://kua.lat)


[![Uptime Status](https://uptime.betterstack.com/status-badges/v2/monitor/1ogaa.svg)](https://status.kua.lat)
[![GitHub license](https://img.shields.io/github/license/thedevs-network/kualat.svg)](https://github.com/DikaArdnt/url-shortener/blob/develop/LICENSE)

## Table of contents

- [Key features](#key-features)
- [Donations and sponsors](#donations-and-sponsors)
- [Setup](#setup)
- [API](#api)
- [Configuration](#configuration)
- [Themes and customizations](#themes-and-customizations)
- [Thanks To](#thanks-to)

## Key features

- Created with self-host in mind:
  - Zero configuration needed
  - Easy setup with no build step
  - Supporting various databases (SQLite, Postgres, MySQL)
  - Ability to disable registration and anonymous links
- Set custom URLs, password, description, and expiration time for links
- View, edit, delete and manage your links
- Private statistics for shortened URLs
- Admin page to manage users and links
- Customizability and themes
- Google OAuth
- RESTful API

## Donations and sponsors

Support the development of KuaLat by making a donation or becoming an sponsor.

[Donate or sponsor →](https://github.com/sponsors/DikaArdnt)

## Setup

The only prerequisite is [Node.js](https://nodejs.org/) (version 20 or above). The default database is SQLite. You can optionally install Posrgres or MySQL/MariaDB for the database or Redis for the cache. 

When you first start the app, you're prompted to create an admin account.

1. Clone this repository or [download the latest zip](https://github.com/DikaArdnt/url-shortener/releases)
2. Install dependencies: `npm install`
3. Intialize database: `npm run migrate`
5. Start the app for development `npm run dev` or production `npm start`

## Docker

Make sure Docker is installed, then you can start the app from the root directory:

```sh
docker compose up
```

Various docker-compose configurations are available. Use `docker compose -f <file_name> up` to start the one you want:

- [`docker-compose.yml`](./docker-compose.yml): Default KuaLat setup. Uses SQLite for the database.
- [`docker-compose.sqlite-redis.yml`](./docker-compose.sqlite-redis.yml): Starts KuaLat with SQLite and Redis.
  - Required envrionment variable: `REDIS_ENABLED`
- [`docker-compose.postgres.yml`](./docker-compose.postgres.yml): Starts KuaLat with Postgres and Redis.
  - Required envrionment variables: `REDIS_ENABLED`, `DB_PASSWORD`, `DB_NAME`, `DB_USER`
- [`docker-compose.mariadb.yml`](./docker-compose.mariadb.yml): Starts KuaLat with MariaDB and Redis.
  - Required envrionment variables: `REDIS_ENABLED`, `DB_PASSWORD`, `DB_NAME`, `DB_USER`, `DB_PORT`

## API

[View API documentation →](https://kua.lat/docs)

## Configuration

The app is configured via environment variables. You can pass environment variables directly or create a `.env` file. View [`.example.env`](./.example.env) file for the list of configurations.

All variables are optional except `JWT_SECRET` which is required on production. 

You can use files for each of the variables by appending `_FILE` to the name of the variable. Example: `JWT_SECRET_FILE=/path/to/secret_file`.

| Variable | Description | Default | Example |
| -------- | ----------- | ------- | ------- |
| `JWT_SECRET` | This is used to sign authentication tokens. Use a **long** **random** string. | - | - |
| `PORT` |  The port to start the app on | `3000` | `8888` |
| `SITE_NAME` |  Name of the website | `KuaLat` | `Your Site` |
| `DEFAULT_DOMAIN` |  The domain address that this app runs on | `localhost:3000` | `yoursite.com` |
| `LINK_LENGTH` | The length of of shortened address | `6` | `5` |
| `LINK_CUSTOM_ALPHABET` | Alphabet used to generate custom addresses. Default value omits o, O, 0, i, I, l, 1, and j to avoid confusion when reading the URL. | (abcd..789) | `abcABC^&*()@` |
| `DISALLOW_REGISTRATION` | Disable registration. Note that if `MAIL_ENABLED` is set to false, then the registration would still be disabled since it relies on emails to sign up users. | `true` | `false` |
| `DISALLOW_ANONYMOUS_LINKS` | Disable anonymous link creation | `true` | `false` |
| `TRUST_PROXY` | If the app is running behind a proxy server like NGINX or Cloudflare and that it should get the IP address from that proxy server. If you're not using a proxy server then set this to false, otherwise users can override their IP address. | `true` | `false` |
| `DB_CLIENT` |  Which database client to use. Supported clients: `pg` or `pg-native` for Postgres, `mysql2` for MySQL or MariaDB, `sqlite3` and `better-sqlite3` for SQLite. NOTE: `pg-native` and `sqlite3` are not installed by default, use `npm` to install them before use. | `better-sqlite3` | `pg` |
| `DB_FILENAME` |  File path for the SQLite database. Only if you use SQLite. | `db/data` | `/var/lib/data` |
| `DB_HOST` | Database connection host. Only if you use Postgres or MySQL. | `localhost` | `your-db-host.com` |
| `DB_PORT` | Database port. Only if you use Postgres or MySQL. | `5432` (Postgres) | `3306` (MySQL) |
| `DB_NAME` | Database name. Only if you use Postgres or MySQL. | `kualat` | `mydb` |
| `DB_USER` | Database user. Only if you use Postgres or MySQL. | `postgres` | `myuser` |
| `DB_PASSWORD` | Database password. Only if you use Postgres or MySQL. | - | `mypassword` |
| `DB_SSL` | Whether use SSL for the database connection. Only if you use Postgres or MySQL. | `false` | `true` |
| `DB_POOL_MIN` | Minimum number of database connection pools. Only if you use Postgres or MySQL. | `0` | `2` |
| `DB_POOL_MAX` | Maximum number of database connection pools. Only if you use Postgres or MySQL. | `10` | `5` |
| `REDIS_ENABLED` | Whether to use Redis for cache | `false` | `true` |
| `REDIS_HOST` | Redis connection host | `127.0.0.1` | `your-redis-host.com` |
| `REDIS_PORT` | Redis port | `6379` | `6379` |
| `REDIS_PASSWORD` | Redis passowrd | - | `mypassword` |
| `REDIS_DB` | Redis database number, between 0 and 15. | `0` | `1` |
| `SERVER_IP_ADDRESS` | The IP address shown to the user on the setting's page. It's only for display purposes and has no other use. | - | `1.2.3.4` |
| `SERVER_CNAME_ADDRESS` | The subdomain shown to the user on the setting's page. It's only for display purposes and has no other use. | - | `custom.yoursite.com` |
| `CUSTOM_DOMAIN_USE_HTTPS` | Use https for links with custom domain. It's on you to generate SSL certificates for those domains manually—at least on this version for now. | `false` | `true` |
| `ENABLE_RATE_LIMIT` | Enable rate limitting for some API routes. If Redis is enabled uses Redis, otherwise, uses memory. | `false` | `true` |
| `MAIL_ENABLED` | Enable emails, which are used for signup, verifying or changing email address, resetting password, and sending reports. If is disabled, all these functionalities will be disabled too. | `false` | `true` | 
| `MAIL_HOST` | Email server host | - | `your-mail-server.com` |
| `MAIL_PORT` | Email server port | `587` | `465` (SSL) | 
| `MAIL_USER` | Email server user | - | `myuser` | 
| `MAIL_PASSWORD` | Email server password for the user | - | `mypassword` | 
| `MAIL_FROM` | Email address to send the user from | - | `example@yoursite.com` | 
| `MAIL_SECURE` | Whether use SSL for the email server connection | `false` | `true` | 
| `G_AUTH_ENABLED` | Whether to enable Google OAuth authentication | `false` | `true` |
| `G_AUTH_CLIENT_ID` | Google OAuth client ID | - | `your-google-client-id` |
| `G_AUTH_CLIENT_SECRET` | Google OAuth client secret | - | `your-google-client-secret` |
| `G_AUTH_PROJECT_ID` | Google Cloud project ID | - | `your-project-id` |
| `REPORT_EMAIL` | The email address that will receive submitted reports | - | `example@yoursite.com` | 
| `CONTACT_EMAIL` | The support email address to show on the app | - | `example@yoursite.com` | 

## Themes and customizations

You can add styles, change images, or render custom HTML. Place your content inside the [`/custom`](./custom) folder according to below instructions.

#### How it works:

The structure of the custom folder is like this:

```
custom/
├─ css/
│  ├─ custom1.css
│  ├─ custom2.css
│  ├─ ...
├─ images/
│  ├─ logo.png
│  ├─ favicon.ico
│  ├─ ...
├─ views/
│  ├─ partials/
│  │  ├─ footer.hbs
│  ├─ 404.hbs
│  ├─ ...
```

- **css**: Put your CSS style files here.
  - You can put as many style files as you want: `custom1.css`, `custom2.css`, etc.
  - If you name your style file `styles.css`, it will replace KuaLat's original `styles.css` file.
  - Each file will be accessible by `<your-site.com>/css/<file>.css`
- **images**: Put your images here.
  - Name them just like the files inside the [`/static/images/`](./static/images) folder to replace KuaLat's original images.
  - Each image will be accessible by `<your-site.com>/images/<image>.<image-format>`
- **views**: Custom HTML templates to render.
  - It should follow the same file naming and folder structure as [`/server/views`](./server/views)
  - Although we try to keep the original file names unchanged, be aware that new changes on KuaLat might break your custom views.

#### Usage with Docker:

If you're building the image locally, then the `/custom` folder should already be included in your app.

If you're pulling the official image, make sure `/kualat/custom` volume is mounted or you have access to it. [View Docker compose example →](https://github.com/DikaArdnt/url-shortener/blob/main/docker-compose.yml#L7)

Then, move your files to that volume. You can do it with this Docker command:

```sh
docker cp <path-to-custom-folder> <kualat-container-name>:/kualat
```

For example:

```sh
docker cp custom kualat-server-1:/kualat
```

Make sure to restart the kualat server container after copying files or making changes.

## Thanks To
- [Thedevs-Network](https://github.com/thedevs-network/kutt) - Original creator of Kutt
- [Node.js](https://nodejs.org) - For runtime environment
- [Express](https://expressjs.com) - For web server
- [Knex.js](https://knexjs.org) - For database ORM