import { ROLES } from '../consts.js';
import env from '../env.js';
import query from '../queries/index.js';
import redis from '../redis.js';
import { CustomError, isPremium, parseBooleanQuery, sanitize } from '../utils/index.js';

export async function add(req, res) {
	const { address, homepage } = req.body;

	const user = await query.user.find({ id: req.user.id });
	if (!isPremium(user.role)) {
		const total = await query.domain.totalAdmin({ user_id: req.user.id });
		if (total >= 1) {
			throw new CustomError('Your plan does not allow you to add more domains.', 403);
		}
	}

	const domain = await query.domain.add({
		address,
		homepage,
		user_id: req.user.id,
	});

	if (req.isHTML) {
		const domains = (await query.domain.get({ user_id: req.user.id })).map(sanitize.domain);
		res.setHeader('HX-Reswap', 'none');
		res.render('partials/settings/domain/table', {
			domains,
		});
		return;
	}

	return res.status(200).send(sanitize.domain(domain));
}

export async function addAdmin(req, res) {
	const { address, banned, homepage } = req.body;

	const domain = await query.domain.add({
		address,
		homepage,
		banned,
		...(banned && { banned_by_id: req.user.id }),
	});

	if (req.isHTML) {
		res.setHeader('HX-Trigger', 'reloadMainTable');
		res.render('partials/admin/dialog/add_domain_success', {
			address: domain.address,
		});
		return;
	}

	return res.status(200).send({ message: 'The domain has been added successfully.' });
}

export async function remove(req, res) {
	const domain = await query.domain.find({
		uuid: req.params.id,
		user_id: req.user.id,
	});

	if (!domain) {
		throw new CustomError('Could not delete the domain.', 400);
	}

	const [updatedDomain] = await query.domain.update({ id: domain.id }, { user_id: null });

	if (!updatedDomain) {
		throw new CustomError('Could not delete the domain.', 500);
	}

	if (env.REDIS_ENABLED) {
		redis.remove.domain(updatedDomain);
	}

	if (req.isHTML) {
		const domains = (await query.domain.get({ user_id: req.user.id })).map(sanitize.domain);
		res.setHeader('HX-Reswap', 'outerHTML');
		res.render('partials/settings/domain/delete_success', {
			domains,
			address: domain.address,
		});
		return;
	}

	return res.status(200).send({ message: 'Domain deleted successfully' });
}

export async function removeAdmin(req, res) {
	const id = req.params.id;
	const links = req.query.links;

	const domain = await query.domain.find({ id });

	if (!domain) {
		throw new CustomError('Could not find the domain.', 400);
	}

	if (links) {
		await query.link.batchRemove({ domain_id: id });
	}

	await query.domain.remove(domain);

	if (req.isHTML) {
		res.setHeader('HX-Reswap', 'outerHTML');
		res.setHeader('HX-Trigger', 'reloadMainTable');
		res.render('partials/admin/dialog/delete_domain_success', {
			address: domain.address,
		});
		return;
	}

	return res.status(200).send({ message: 'Domain deleted successfully' });
}

export async function getAdmin(req, res) {
	const { limit, skip } = req.context;
	const search = req.query.search;
	const user = req.query.user;
	const banned = parseBooleanQuery(req.query.banned);
	const owner = parseBooleanQuery(req.query.owner);
	const links = parseBooleanQuery(req.query.links);

	const match = {
		...(banned !== undefined && { banned }),
		...(owner !== undefined && { user_id: [owner ? 'is not' : 'is', null] }),
	};

	const [data, total] = await Promise.all([
		query.domain.getAdmin(match, { limit, search, user, links, skip }),
		query.domain.totalAdmin(match, { search, user, links }),
	]);

	const domains = data.map(sanitize.domain_admin);

	if (req.isHTML) {
		res.render('partials/admin/domains/table', {
			total,
			total_formatted: total.toLocaleString('en-US'),
			limit,
			skip,
			table_domains: domains,
		});
		return;
	}

	return res.send({
		total,
		limit,
		skip,
		data: domains,
	});
}

export async function ban(req, res) {
	const { id } = req.params;

	const update = {
		banned_by_id: req.user.id,
		banned: true,
	};

	// 1. check if domain exists
	const domain = await query.domain.find({ id });

	if (!domain) {
		throw new CustomError('No domain has been found.', 400);
	}

	if (domain.banned) {
		throw new CustomError('Domain has been banned already.', 400);
	}

	// check if user link main admin, and if so, don't allow to ban it
	if (domain.user_id) {
		const user = await query.user.find({ id: domain.user_id });
		const ADMIN_EMAILS = process.env.ADMIN_EMAILS.split(',').map(email => email.trim());
		if (user.role === ROLES.ADMIN && ADMIN_EMAILS.includes(user.email)) {
			throw new CustomError("Can't ban the main admin.", 400);
		}
	}

	const tasks = [];

	// 2. ban domain
	tasks.push(query.domain.update({ id }, update));

	// 3. ban user
	if (req.body.user && domain.user_id) {
		tasks.push(query.user.update({ id: domain.user_id }, update));
	}

	// 4. ban links
	if (req.body.links) {
		tasks.push(query.link.update({ domain_id: id }, update));
	}

	// 5. wait for all tasks to finish
	await Promise.all(tasks).catch(() => {
		throw new CustomError("Couldn't ban entries.");
	});

	// 6. send response
	if (req.isHTML) {
		res.setHeader('HX-Reswap', 'outerHTML');
		res.setHeader('HX-Trigger', 'reloadMainTable');
		res.render('partials/admin/dialog/ban_domain_success', {
			address: domain.address,
		});
		return;
	}

	return res.status(200).send({ message: 'Banned domain successfully.' });
}

export async function unban(req, res) {
	const { id } = req.params;

	const update = {
		banned_by_id: req.user.id,
		banned: false,
	};

	// 1. check if domain exists
	const domain = await query.domain.find({ id });

	if (!domain) {
		throw new CustomError('No domain has been found.', 400);
	}

	if (!domain.banned) {
		throw new CustomError('Domain hasn\t been banned yet.', 400);
	}

	const tasks = [];

	// 2. unban domain
	tasks.push(query.domain.update({ id }, update));

	// 3. unban user
	if (req.body.user && domain.user_id) {
		tasks.push(query.user.update({ id: domain.user_id }, update));
	}

	// 4. ban links
	if (req.body.links) {
		tasks.push(query.link.update({ domain_id: id }, update));
	}

	// 5. wait for all tasks to finish
	await Promise.all(tasks).catch(() => {
		throw new CustomError("Couldn't unban entries.");
	});

	// 6. send response
	if (req.isHTML) {
		res.setHeader('HX-Reswap', 'outerHTML');
		res.setHeader('HX-Trigger', 'reloadMainTable');
		res.render('partials/admin/dialog/unban_domain_success', {
			address: domain.address,
		});
		return;
	}

	return res.status(200).send({ message: 'Unbanned domain successfully.' });
}

export default {
	add,
	addAdmin,
	ban,
	getAdmin,
	remove,
	removeAdmin,
	unban,
};
