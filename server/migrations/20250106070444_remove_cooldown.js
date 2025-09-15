export async function up(knex) {
	const hasCooldowns = await knex.schema.hasColumn('users', 'cooldowns');
	if (hasCooldowns) {
		await knex.schema.alterTable('users', table => {
			table.dropColumn('cooldowns');
		});
	}
	const hasCooldown = await knex.schema.hasColumn('users', 'cooldown');
	if (hasCooldown) {
		await knex.schema.alterTable('users', table => {
			table.dropColumn('cooldown');
		});
	}
	const hasMaliciousAttempts = await knex.schema.hasColumn('users', 'malicious_attempts');
	if (hasMaliciousAttempts) {
		await knex.schema.alterTable('users', table => {
			table.dropColumn('malicious_attempts');
		});
	}
}

export async function down() {
	// do nothing
}

export default {
	up,
	down,
};
