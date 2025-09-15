import knex from 'knex';

import env from './env.js';

const isSQLite = env.DB_CLIENT === 'sqlite3' || env.DB_CLIENT === 'better-sqlite3';
const isPostgres = env.DB_CLIENT === 'pg' || env.DB_CLIENT === 'pg-native';
const isMySQL = env.DB_CLIENT === 'mysql' || env.DB_CLIENT === 'mysql2';

/**
 * @type {import('knex').Knex}
 */
let db;
if (!db) {
	db = knex({
		client: env.DB_CLIENT,
		connection: {
			...(isSQLite && { filename: env.DB_FILENAME }),
			host: env.DB_HOST,
			port: env.DB_PORT,
			database: env.DB_NAME,
			user: env.DB_USER,
			password: env.DB_PASSWORD,
			ssl: env.DB_SSL,
			pool: {
				min: env.DB_POOL_MIN,
				max: env.DB_POOL_MAX,
			},
		},
		useNullAsDefault: true,
	});
}

db.isPostgres = isPostgres;
db.isSQLite = isSQLite;
db.isMySQL = isMySQL;

export default db;
