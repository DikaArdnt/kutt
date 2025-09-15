import bcrypt from 'bcryptjs';

import { ROLES } from '../consts.js';
import mail from '../mail/index.js';
import query from '../queries/index.js';
import { CustomError, deleteCurrentToken, parseBooleanQuery, sanitize } from '../utils/index.js';

export async function get(req, res) {
	const domains = await query.domain.get({ user_id: req.user.id });

	const data = {
		apikey: req.user.apikey,
		email: req.user.email,
		domains: domains.map(sanitize.domain),
	};

	return res.status(200).send(data);
}

export async function remove(req, res) {
	await query.user.remove(req.user);

	if (req.isHTML) {
		deleteCurrentToken(res);
		res.setHeader('HX-Trigger-After-Swap', 'redirectToHomepage');
		res.render('partials/settings/delete_account', {
			success: 'Account has been deleted. Logging out...',
		});
		return;
	}

	return res.status(200).send('OK');
}

export async function removeByAdmin(req, res) {
	const user = await query.user.find({ id: req.params.id });

	if (!user) {
		const message = 'Could not find the user.';
		if (req.isHTML) {
			return res.render('partials/admin/dialog/message', {
				layout: false,
				message,
			});
		} else {
			return res.status(400).send({ message });
		}
	}

	// can't remove the main admin
	const ADMIN_EMAILS = process.env.ADMIN_EMAILS.split(',').map(email => email.trim());
	if (user.role === ROLES.ADMIN && ADMIN_EMAILS.includes(user.email)) {
		throw new CustomError("Can't remove the main admin.", 400);
	}

	await query.user.remove(user);

	if (req.isHTML) {
		res.setHeader('HX-Reswap', 'outerHTML');
		res.setHeader('HX-Trigger', 'reloadMainTable');
		res.render('partials/admin/dialog/delete_user_success', {
			email: user.email,
		});
		return;
	}

	return res.status(200).send({ message: 'User has been deleted successfully.' });
}

export async function getAdmin(req, res) {
	const { limit, skip } = req.context;
	const { role, search } = req.query;
	const verified = parseBooleanQuery(req.query.verified);
	const banned = parseBooleanQuery(req.query.banned);
	const domains = parseBooleanQuery(req.query.domains);
	const links = parseBooleanQuery(req.query.links);

	const match = {
		...(role && { role }),
		...(verified !== undefined && { verified }),
		...(banned !== undefined && { banned }),
	};

	const [data, total] = await Promise.all([
		query.user.getAdmin(match, { limit, search, domains, links, skip }),
		query.user.totalAdmin(match, { search, domains, links }),
	]);

	const users = data.map(sanitize.user_admin);

	if (req.isHTML) {
		res.render('partials/admin/users/table', {
			total,
			total_formatted: total.toLocaleString('en-US'),
			limit,
			skip,
			users,
		});
		return;
	}

	return res.send({
		total,
		limit,
		skip,
		data: users,
	});
}

export async function ban(req, res) {
	const { id } = req.params;

	const update = {
		banned_by_id: req.user.id,
		banned: true,
	};

	// 1. check if user exists
	const user = await query.user.find({ id });

	if (!user) {
		throw new CustomError('No user has been found.', 400);
	}

	if (user.banned) {
		throw new CustomError('User has been banned already.', 400);
	}

	// can't ban the main admin
	const ADMIN_EMAILS = process.env.ADMIN_EMAILS.split(',').map(email => email.trim());
	if (user.role === ROLES.ADMIN && ADMIN_EMAILS.includes(user.email)) {
		throw new CustomError("Can't ban the main admin.", 400);
	}

	const tasks = [];

	// 2. ban user
	tasks.push(query.user.update({ id }, update));

	// 3. ban user links
	if (req.body.links) {
		tasks.push(query.link.update({ user_id: id }, update));
	}

	// 4. ban user domains
	if (req.body.domains) {
		tasks.push(query.domain.update({ user_id: id }, update));
	}

	// 5. wait for all tasks to finish
	await Promise.all(tasks).catch(() => {
		throw new CustomError("Couldn't ban entries.");
	});

	// 6. send response
	if (req.isHTML) {
		res.setHeader('HX-Reswap', 'outerHTML');
		res.setHeader('HX-Trigger', 'reloadMainTable');
		res.render('partials/admin/dialog/ban_user_success', {
			email: user.email,
		});
		return;
	}

	return res.status(200).send({ message: 'Banned user successfully.' });
}

export async function unban(req, res) {
	const { id } = req.params;

	const update = {
		banned_by_id: req.user.id,
		banned: false,
	};

	// 1. check if user exists
	const user = await query.user.find({ id });

	if (!user) {
		throw new CustomError('No user has been found.', 400);
	}

	if (!user.banned) {
		throw new CustomError("User hasn't been banned yet", 400);
	}

	const tasks = [];

	// 2. ban user
	tasks.push(query.user.update({ id }, update));

	// 3. ban user links
	if (req.body.links) {
		tasks.push(query.link.update({ user_id: id }, update));
	}

	// 4. ban user domains
	if (req.body.domains) {
		tasks.push(query.domain.update({ user_id: id }, update));
	}

	// 5. wait for all tasks to finish
	await Promise.all(tasks).catch(() => {
		throw new CustomError("Couldn't unban entries.");
	});

	// 6. send response
	if (req.isHTML) {
		res.setHeader('HX-Reswap', 'outerHTML');
		res.setHeader('HX-Trigger', 'reloadMainTable');
		res.render('partials/admin/dialog/unban_user_success', {
			email: user.email,
		});
		return;
	}

	return res.status(200).send({ message: 'Unbanned user successfully.' });
}

export async function create(req, res) {
	const salt = await bcrypt.genSalt(12);
	req.body.password = await bcrypt.hash(req.body.password, salt);

	const user = await query.user.create(req.body);

	if (req.body.verification_email && !user.banned && !user.verified) {
		await mail.verification(user);
	}

	if (req.isHTML) {
		res.setHeader('HX-Trigger', 'reloadMainTable');
		res.render('partials/admin/dialog/create_user_success', {
			email: user.email,
		});
		return;
	}

	return res.status(201).send({ message: 'The user has been created successfully.' });
}

export async function update(req, res) {
	if (req.body.password) {
		const salt = await bcrypt.genSalt(12);
		req.body.password = await bcrypt.hash(req.body.password, salt);
	} else {
		delete req.body.password;
	}

	const user = await query.user.find({ id: req.body.id });
	if (!user) {
		throw new CustomError('No user has been found.', 400);
	}

	// can't change the main admin
	const ADMIN_EMAILS = process.env.ADMIN_EMAILS.split(',').map(email => email.trim());
	if (req.body.role !== user.role && user.role === ROLES.ADMIN && ADMIN_EMAILS.includes(user.email)) {
		throw new CustomError("Can't change the main admin.", 400);
	}

	await query.user.update({ id: user.id }, req.body);

	if (req.isHTML) {
		res.setHeader('HX-Trigger', 'reloadMainTable');
		res.render('partials/admin/dialog/update_user_success', {
			email: user.email,
		});
		return;
	}

	return res.status(201).send({ message: 'The user has been update successfully.' });
}

export default {
	ban,
	create,
	get,
	getAdmin,
	remove,
	removeByAdmin,
	unban,
	update,
};
