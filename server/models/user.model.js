import { AUTH, ROLES } from '../consts.js';

/**
 *
 * @param {import('knex').Knex} knex
 */
export async function createUserTable(knex) {
	const hasTable = await knex.schema.hasTable('users');
	if (!hasTable) {
		await knex.schema.createTable('users', table => {
			table.increments('id').primary();
			table.string('apikey');
			table.boolean('banned').notNullable().defaultTo(false);
			table.integer('banned_by_id').unsigned().references('id').inTable('users');
			table.text('email').unique().notNullable();
			table.enu('role', [ROLES.USER, ROLES.ADMIN, ROLES.PREMIUM]).notNullable().defaultTo(ROLES.USER);
			table.string('password').nullable();
			table.enu('auth_via', [AUTH.GOOGLE, AUTH.VERIFY]).notNullable().defaultTo(AUTH.VERIFY);
			table.string('auth_id').nullable();
			table.dateTime('reset_password_expires');
			table.string('reset_password_token');
			table.dateTime('change_email_expires');
			table.string('change_email_token');
			table.string('change_email_address');
			table.dateTime('verification_expires');
			table.string('verification_token');
			table.boolean('verified').notNullable().defaultTo(false);
			table.timestamps(false, true);
		});
	}
}

export default {
	createUserTable,
};
