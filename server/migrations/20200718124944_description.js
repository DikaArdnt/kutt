export async function up(knex) {
	const hasDescription = await knex.schema.hasColumn('links', 'description');
	if (!hasDescription) {
		await knex.schema.alterTable('links', table => {
			table.string('description');
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
