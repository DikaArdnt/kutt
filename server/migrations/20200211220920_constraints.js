import * as models from '../models/index.js';

export async function up(knex) {
	await models.createUserTable(knex);
	await models.createIPTable(knex);
	await models.createDomainTable(knex);
	await models.createHostTable(knex);
	await models.createLinkTable(knex);
	await models.createVisitTable(knex);
}

export async function down() {
	// do nothing
}

export default {
	up,
	down,
};
