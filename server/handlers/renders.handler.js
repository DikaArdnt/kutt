import { ROLES } from '../consts.js';
import env from '../env.js';
import knex from '../knex.js';
import query from '../queries/index.js';
import { CustomError, dateToUTC, deleteCurrentToken, getShortURL, sanitize, sleep } from '../utils/index.js';

/**
 *
 * PAGES
 *
 **/

export async function homepage(req, res) {
	if (env.DISALLOW_ANONYMOUS_LINKS && !req.user) {
		res.redirect('/login');
		return;
	}
	res.locals.custom_meta = ['name="robots" content="index, follow"'];
	res.render('homepage', {
		title: 'Free modern URL shortener',
	});
}

export async function login(req, res) {
	if (req.user) {
		res.redirect('/');
		return;
	}

	res.render('login', {
		title: 'Log in or sign up',
	});
}

export function logout(req, res) {
	deleteCurrentToken(res);
	res.render('logout', {
		title: 'Logging out..',
	});
}

export async function createAdmin(req, res) {
	const isThereAUser = await query.user.findAny();
	if (isThereAUser) {
		res.redirect('/login');
		return;
	}
	res.locals.custom_meta = ['name="robots" content="noindex, nofollow"'];
	res.render('create_admin', {
		title: 'Create admin account',
	});
}

export function notFound(req, res) {
	res.status(404).render('404', { title: '404 - Not found' });
}

export async function settings(req, res) {
	res.locals.custom_meta = ['name="robots" content="noindex"'];
	res.render('settings', {
		title: 'Settings',
		links_count: await query.link.totalAdmin({ user_id: req.user.id }),
		domains_count: await query.domain.totalAdmin({ user_id: req.user.id }),
		visits_count: (await knex('visits').where({ user_id: req.user.id }).select('total')).reduce((acc, visit) => acc + visit.total, 0),
	});
}

export function admin(req, res) {
	res.locals.custom_meta = ['name="robots" content="noindex"'];
	res.render('admin', {
		title: 'Admin',
	});
}

export function stats(req, res) {
	res.render('stats', {
		title: 'Stats',
	});
}

export async function banned(req, res) {
	res.locals.custom_meta = ['name="robots" content="noindex"'];
	res.render('banned', {
		title: 'Banned link',
	});
}

export async function report(req, res) {
	if (!env.REPORT_EMAIL) {
		res.redirect('/');
		return;
	}
	res.render('report', {
		title: 'Report abuse',
	});
}

export async function resetPassword(req, res) {
	res.locals.custom_meta = ['name="robots" content="noindex"'];
	res.render('reset_password', {
		title: 'Reset password',
	});
}

export async function resetPasswordSetNewPassword(req, res) {
	const reset_password_token = req.params.resetPasswordToken;

	if (reset_password_token) {
		const user = await query.user.find({
			reset_password_token,
			reset_password_expires: ['>', dateToUTC(new Date())],
		});
		if (user) {
			res.locals.token_verified = true;
		}
	}

	res.render('reset_password_set_new_password', {
		title: 'Reset password',
		...(res.locals.token_verified && { reset_password_token }),
	});
}

export async function verifyChangeEmail(req, res) {
	res.locals.custom_meta = ['name="robots" content="noindex"'];
	res.render('verify_change_email', {
		title: 'Verifying email',
	});
}

export async function verify(req, res) {
	res.locals.custom_meta = ['name="robots" content="noindex"'];
	res.render('verify', {
		title: 'Verify',
	});
}

export async function terms(req, res) {
	res.render('terms', {
		title: 'Terms of Service',
	});
}

/**
 *
 * PARTIALS
 *
 **/

export async function confirmLinkDelete(req, res) {
	const link = await query.link.find({
		uuid: req.query.id,
		...(!req.user.admin && { user_id: req.user.id }),
	});
	if (!link) {
		return res.render('partials/links/dialog/message', {
			layout: false,
			message: 'Could not find the link.',
		});
	}
	res.render('partials/links/dialog/delete', {
		layout: false,
		link: getShortURL(link.address, link.domain).link,
		id: link.uuid,
	});
}

export async function confirmLinkBan(req, res) {
	const link = await query.link.find({
		uuid: req.query.id,
		...(!req.user.admin && { user_id: req.user.id }),
	});
	if (!link) {
		return res.render('partials/links/dialog/message', {
			message: 'Could not find the link.',
		});
	}
	res.render('partials/links/dialog/ban', {
		link: getShortURL(link.address, link.domain).link,
		id: link.uuid,
	});
}

export async function confirmLinkUnban(req, res) {
	const link = await query.link.find({
		uuid: req.query.id,
		...(!req.user.admin && { user_id: req.user.id }),
	});
	if (!link) {
		return res.render('partials/links/dialog/message', {
			message: 'Could not find the link.',
		});
	}
	res.render('partials/links/dialog/unban', {
		link: getShortURL(link.address, link.domain).link,
		id: link.uuid,
		banned: Boolean(link.banned),
	});
}

export async function confirmUserDelete(req, res) {
	const user = await query.user.find({ id: req.query.id });
	if (!user) {
		return res.render('partials/admin/dialog/message', {
			layout: false,
			message: 'Could not find the user.',
		});
	}
	res.render('partials/admin/dialog/delete_user', {
		layout: false,
		email: user.email,
		id: user.id,
	});
}

export async function confirmUserBan(req, res) {
	const user = await query.user.find({ id: req.query.id });
	if (!user) {
		return res.render('partials/admin/dialog/message', {
			layout: false,
			message: 'Could not find the user.',
		});
	}
	res.render('partials/admin/dialog/ban_user', {
		layout: false,
		email: user.email,
		id: user.id,
	});
}

export async function confirmUserUnban(req, res) {
	const user = await query.user.find({ id: req.query.id });
	if (!user) {
		return res.render('partials/admin/dialog/message', {
			layout: false,
			message: 'Could not find the user.',
		});
	}
	res.render('partials/admin/dialog/unban_user', {
		layout: false,
		email: user.email,
		id: user.id,
	});
}

export async function createUser(req, res) {
	res.render('partials/admin/dialog/create_user', {
		layout: false,
	});
}

export async function updateUser(req, res) {
	const user = await query.user.find({ id: req.query.id });
	if (!user) {
		return res.render('partials/admin/dialog/message', {
			layout: false,
			message: 'Could not find the user.',
		});
	}
	res.render('partials/admin/dialog/update_user', {
		layout: false,
		...user,
		ROLES,
	});
}

export async function addDomainAdmin(req, res) {
	res.render('partials/admin/dialog/add_domain', {
		layout: false,
	});
}

export async function addDomainForm(req, res) {
	res.render('partials/settings/domain/add_form');
}

export async function confirmDomainDelete(req, res) {
	const domain = await query.domain.find({
		uuid: req.query.id,
		user_id: req.user.id,
	});
	if (!domain) {
		throw new CustomError('Could not find the domain.', 400);
	}
	res.render('partials/settings/domain/delete', {
		...sanitize.domain(domain),
	});
}

export async function confirmDomainBan(req, res) {
	const domain = await query.domain.find({
		id: req.query.id,
	});
	if (!domain) {
		throw new CustomError('Could not find the domain.', 400);
	}
	const hasUser = !!domain.user_id;
	const hasLink = await query.link.find({ domain_id: domain.id });
	res.render('partials/admin/dialog/ban_domain', {
		id: domain.id,
		address: domain.address,
		hasUser,
		hasLink,
	});
}

export async function confirmDomainUnban(req, res) {
	const domain = await query.domain.find({
		id: req.query.id,
	});
	if (!domain) {
		throw new CustomError('Could not find the domain.', 400);
	}
	const hasUser = !!domain.user_id;
	const hasLink = await query.link.find({ domain_id: domain.id });
	res.render('partials/admin/dialog/unban_domain', {
		id: domain.id,
		address: domain.address,
		hasUser,
		hasLink,
	});
}

export async function confirmDomainDeleteAdmin(req, res) {
	const domain = await query.domain.find({
		id: req.query.id,
	});
	if (!domain) {
		throw new CustomError('Could not find the domain.', 400);
	}
	const hasLink = await query.link.find({ domain_id: domain.id });
	res.render('partials/admin/dialog/delete_domain', {
		id: domain.id,
		address: domain.address,
		hasLink,
	});
}

export async function getReportEmail(req, res) {
	if (!env.REPORT_EMAIL) {
		throw new CustomError('No report email is available.', 400);
	}
	res.render('partials/report/email', {
		report_email_address: env.REPORT_EMAIL.replace('@', '[at]'),
	});
}

export async function getSupportEmail(req, res) {
	if (!env.CONTACT_EMAIL) {
		throw new CustomError('No support email is available.', 400);
	}
	await sleep(500);
	res.render('partials/support_email', {
		email: env.CONTACT_EMAIL,
	});
}

export async function linkEdit(req, res) {
	const link = await query.link.find({
		uuid: req.params.id,
		...(!req.user.admin && { user_id: req.user.id }),
	});
	res.render('partials/links/edit', {
		...(link && sanitize.link_html(link)),
		domain: link.domain || env.DEFAULT_DOMAIN,
	});
}

export async function linkEditAdmin(req, res) {
	const link = await query.link.find({
		uuid: req.params.id,
	});
	res.render('partials/admin/links/edit', {
		...(link && sanitize.link_html(link)),
		domain: link.domain || env.DEFAULT_DOMAIN,
	});
}

export default {
	addDomainAdmin,
	addDomainForm,
	admin,
	banned,
	confirmDomainBan,
	confirmDomainDelete,
	confirmDomainDeleteAdmin,
	confirmDomainUnban,
	confirmLinkBan,
	confirmLinkUnban,
	confirmLinkDelete,
	confirmUserBan,
	confirmUserDelete,
	confirmUserUnban,
	createAdmin,
	createUser,
	getReportEmail,
	getSupportEmail,
	homepage,
	linkEdit,
	linkEditAdmin,
	login,
	logout,
	notFound,
	report,
	resetPassword,
	resetPasswordSetNewPassword,
	settings,
	stats,
	terms,
	updateUser,
	verifyChangeEmail,
	verify,
};
