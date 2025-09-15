import { ROLES } from '../consts.js';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
	const hasRole = await knex.schema.hasColumn('users', 'role');
	if (!hasRole) {
		await knex.transaction(async function (trx) {
			await trx.schema.alterTable('users', table => {
				table.enu('role', [ROLES.USER, ROLES.ADMIN, ROLES.PREMIUM]).notNullable().defaultTo(ROLES.USER);
			});
			if (typeof process.env.ADMIN_EMAILS === 'string') {
				const adminEmails = process.env.ADMIN_EMAILS.split(',').map(e => e.trim());
				const adminRoleQuery = trx('users').update('role', ROLES.ADMIN);
				adminEmails.forEach((adminEmail, index) => {
					if (index === 0) {
						adminRoleQuery.where('email', adminEmail);
					} else {
						adminRoleQuery.orWhere('email', adminEmail);
					}
				});
				await adminRoleQuery;
			}
		});
	}
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down() {
	// do nothing
}

export default {
	up,
	down,
};
