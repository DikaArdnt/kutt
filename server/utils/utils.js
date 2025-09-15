import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
	addDays,
	differenceInDays,
	differenceInHours,
	differenceInMilliseconds,
	differenceInMonths,
	format,
	subDays,
	subHours,
	subMonths,
} from 'date-fns';
import hbs from 'hbs';
import JWT from 'jsonwebtoken';
import ms from 'ms';
import { customAlphabet } from 'nanoid';

import { ROLES } from '../consts.js';
import env from '../env.js';
import knex from '../knex.js';
import knexUtils from './knex.js';

const nanoid = customAlphabet(env.LINK_CUSTOM_ALPHABET, env.LINK_LENGTH);

export class CustomError extends Error {
	constructor(message, statusCode, data) {
		super(message);
		this.name = this.constructor.name;
		this.statusCode = statusCode ?? 500;
		this.data = data;
	}
}

export const mailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const phoneRegex = /^\+?[1-9]\d{1,14}$/;
export const urlRegex =
	/^(?:(?:(?:https?|ftp|cloudstreamrepo):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u00a1-\uffff][a-z0-9\u00a1-\uffff_-]{0,62})?[a-z0-9\u00a1-\uffff]\.)+(?:[a-z\u00a1-\uffff]{2,}\.?))(?::\d{2,5})?(?:[/?#]\S*)?$/i;

export const charsNeedEscapeInRegExp = '.$*+?()[]{}|^-';
export const customAlphabetEscaped = env.LINK_CUSTOM_ALPHABET.split('')
	.map(c => (charsNeedEscapeInRegExp.includes(c) ? '\\' + c : c))
	.join('');
export const customAlphabetRegex = new RegExp(`^[${customAlphabetEscaped}_-]+$`);
export const customAddressRegex = new RegExp('^[a-zA-Z0-9-_]+$');

export function __filename(pathURL = import.meta, rmPrefix = process.platform !== 'win32') {
	const path = pathURL?.url || pathURL;
	return rmPrefix ? (/file:\/\/\//.test(path) ? fileURLToPath(path) : path) : /file:\/\/\//.test(path) ? path : pathToFileURL(path).href;
}

export function __dirname(pathURL) {
	const dir = __filename(pathURL, true);
	const regex = new RegExp(`${path.sep}$`);
	return regex.test(dir) ? dir : fs.existsSync(dir) && fs.statSync(dir).isDirectory() ? dir.replace(regex, '') : path.dirname(dir);
}

export function isAdmin(user) {
	return user.role === ROLES.ADMIN;
}

export function isPremium(user) {
	return [ROLES.ADMIN, ROLES.PREMIUM].includes(user.role);
}

export function signToken(user) {
	return JWT.sign(
		{
			iss: 'ApiAuth',
			sub: user.id,
			iat: parseInt((new Date().getTime() / 1000).toFixed(0)),
			exp: parseInt((addDays(new Date(), 7).getTime() / 1000).toFixed(0)),
		},
		env.JWT_SECRET
	);
}

export function setToken(res, token) {
	res.cookie('token', token, {
		maxAge: 1000 * 60 * 60 * 24 * 7, // expire after seven days
		httpOnly: true,
		secure: env.isProd,
		domain: env.DEFAULT_DOMAIN,
		priority: 'high',
	});
}

export function deleteCurrentToken(res) {
	res.clearCookie('token', {
		httpOnly: true,
		secure: env.isProd,
		domain: env.DEFAULT_DOMAIN,
		priority: 'high',
	});
}

export async function generateId(query, domain_id) {
	const address = nanoid();
	const link = await query.link.find({ address, domain_id });
	if (link) {
		return generateId(query, domain_id);
	}
	return address;
}

export function addProtocol(url) {
	const hasProtocol = /^(\w+:|\/\/)/.test(url);
	const hasEmail = mailRegex.test(url);
	const hasPhone = phoneRegex.test(url);
	return hasProtocol ? url : hasEmail ? `mailto:${url}` : hasPhone ? `tel:${url}` : `http://${url}`;
}

export function getShortURL(address, domain) {
	const protocol = (env.CUSTOM_DOMAIN_USE_HTTPS || !domain) && !env.isDev ? 'https://' : 'http://';
	const link = `${domain || env.DEFAULT_DOMAIN}/${address}`;
	const url = `${protocol}${link}`;
	return { address, link, url };
}

export function statsObjectToArray(obj) {
	const objToArr = key =>
		Array.from(Object.keys(obj[key]))
			.map(name => ({
				name,
				value: obj[key][name],
			}))
			.sort((a, b) => b.value - a.value);

	return {
		browser: objToArr('browser'),
		os: objToArr('os'),
		country: objToArr('country'),
		referrer: objToArr('referrer'),
	};
}

export function getDifferenceFunction(type) {
	if (type === 'lastDay') return differenceInHours;
	if (type === 'lastWeek') return differenceInDays;
	if (type === 'lastMonth') return differenceInDays;
	if (type === 'lastYear') return differenceInMonths;
	throw new Error('Unknown type.');
}

export function parseDatetime(date) {
	// because postgres and mysql return date, sqlite returns formatted iso 8601 string in utc
	return date instanceof Date ? date : new Date(date + 'Z');
}

export function parseTimestamps(item) {
	return {
		created_at: parseDatetime(item.created_at),
		updated_at: parseDatetime(item.updated_at),
	};
}

export function dateToUTC(date) {
	const dateUTC = date instanceof Date ? date.toISOString() : new Date(date).toISOString();

	// format the utc date in 'YYYY-MM-DD hh:mm:ss' for SQLite
	if (knex.isSQLite) {
		return dateUTC.substring(0, 10) + ' ' + dateUTC.substring(11, 19);
	}

	// mysql doesn't save time in utc, so format the date in local timezone instead
	if (knex.isMySQL) {
		return format(new Date(date), 'yyyy-MM-dd HH:mm:ss');
	}

	// return unformatted utc string for postgres
	return dateUTC;
}

export function getStatsPeriods(now) {
	return [
		['lastDay', subHours(now, 24)],
		['lastWeek', subDays(now, 7)],
		['lastMonth', subDays(now, 30)],
		['lastYear', subMonths(now, 12)],
	];
}

export const preservedURLs = [
	'login',
	'logout',
	'donate',
	'support',
	'privacy-policy',
	'privacy',
	'create-admin',
	'404',
	'settings',
	'stats',
	'signup',
	'banned',
	'report',
	'docs',
	'about',
	'owner',
	'creator',
	'creator-dashboard',
	'creator-dashboard-link',
	'links',
	'reset-password',
	'resetpassword',
	'verify-email',
	'verifyemail',
	'verify',
	'terms',
	'confirm-link-delete',
	'confirm-link-ban',
	'confirm-link-unban',
	'confirm-user-delete',
	'confirm-user-ban',
	'confirm-user-unban',
	'create-user',
	'confirm-domain-delete-admin',
	'confirm-domain-ban',
	'confirm-domain-unban',
	'add-domain-form',
	'confirm-domain-delete',
	'get-report-email',
	'get-support-email',
	'link',
	'admin',
	'url-password',
	'url-info',
	'api',
	'static',
	'images',
	'privacy',
	'protected',
	'css',
	'fonts',
	'libs',
	'pricing',
	'contact',
	'contacts',
	'support',
	'supports',
	'help',
	'helps',
	'faq',
	'faqs',
	'features',
	'feature',
	'hosting',
	'whatsapp',
];

const getIcon = string => {
	const hasURL = domain => new RegExp(`^https?://(www.)?${domain}`, 'i').test(string);
	return /kua\.lat/.test(string)
		? 'https://kua.lat/images/icon.png'
		: /hisoka\.net/.test(string)
		? 'https://cdn.hisoka.net/logo.png?w=100'
		: /dikaardnt\.com/.test(string)
		? 'https://cdn.hisoka.net/avatar-dika.png?w=100'
		: /greyrat\.dev/.test(string)
		? 'https://cdn.hisoka.net/greyrat.jpg?w=100'
		: /^mailto:/.test(string)
		? 'https://cdn.jsdelivr.net/npm/@tabler/icons-png/icons/outline/mail.png'
		: /^tel:/.test(string)
		? 'https://cdn.jsdelivr.net/npm/@tabler/icons-png/icons/outline/phone.png'
		: /^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/i.test(string)
		? 'https://cdn.jsdelivr.net/npm/@tabler/icons-png/icons/outline/mail.png'
		: /whatsapp\.com/i.test(string) || hasURL('wa.me')
		? 'https://cdn.jsdelivr.net/npm/@tabler/icons-png/icons/outline/brand-whatsapp.png'
		: /(fb\.watch|(www\.|web\.|m\.|[a-zA-Z]\.)?facebook\.com)/i.test(string)
		? 'https://cdn.jsdelivr.net/npm/@tabler/icons-png/icons/outline/brand-facebook.png'
		: /twitter\.com/i.test(string) || hasURL('x.com')
		? 'https://cdn.jsdelivr.net/npm/@tabler/icons-png/icons/outline/brand-x.png'
		: /(?:youtu\.be\/|youtube\.com)/i.test(string)
		? 'https://cdn.jsdelivr.net/npm/@tabler/icons-png/icons/outline/brand-youtube.png'
		: hasURL('instagram.com')
		? 'https://cdn.jsdelivr.net/npm/@tabler/icons-png/icons/outline/brand-instagram.png'
		: hasURL('linkedin.com')
		? 'https://cdn.jsdelivr.net/npm/@tabler/icons-png/icons/outline/brand-linkedin.png'
		: /(?:pinterest\.com)/i.test(string) || hasURL('pin.it')
		? 'https://cdn.jsdelivr.net/npm/@tabler/icons-png/icons/outline/brand-pinteres.png'
		: hasURL('vimeo.com')
		? 'https://cdn.jsdelivr.net/npm/@tabler/icons-png/icons/outline/brand-vimeo.png'
		: hasURL('soundcloud.com')
		? 'https://cdn.jsdelivr.net/npm/@tabler/icons-png/icons/outline/brand-soundcloud.png'
		: hasURL('vk.com')
		? 'https://cdn.jsdelivr.net/npm/@tabler/icons-png/icons/outline/brand-vk.png'
		: 'https://cdn.jsdelivr.net/npm/@tabler/icons-png/icons/outline/link.png';
};

export function parseBooleanQuery(query) {
	if (query === 'true' || query === true) return true;
	if (query === 'false' || query === false) return false;
	return undefined;
}

export function getInitStats() {
	return Object.create({
		browser: {
			chrome: 0,
			edge: 0,
			firefox: 0,
			ie: 0,
			opera: 0,
			other: 0,
			safari: 0,
		},
		os: {
			android: 0,
			ios: 0,
			linux: 0,
			macos: 0,
			other: 0,
			windows: 0,
		},
		country: {},
		referrer: {},
	});
}

// format date to relative date
export function getTimeAgo(time = 0) {
	switch (typeof time) {
		case 'number':
			break;
		case 'string':
			time = +new Date(time);
			break;
		case 'object':
			if (time.constructor === Date) time = time.getTime();
			break;
		default:
			time = +new Date();
	}
	let time_formats = [
		[60, 'seconds', 1], // 60
		[120, 'a minute ago', 'in a minute'], // 60*2
		[3600, 'minutes', 60], // 60*60, 60
		[7200, 'an hour ago', 'in an hour'], // 60*60*2
		[86400, 'hours', 3600], // 60*60*24, 60*60
		[172800, 'yesterday', 'tomorrow'], // 60*60*24*2
		[604800, 'days', 86400], // 60*60*24*7, 60*60*24
		[1209600, 'a week ago', 'next week'], // 60*60*24*7*4*2
		[2419200, 'weeks', 604800], // 60*60*24*7*4, 60*60*24*7
		[4838400, 'a month ago', 'next month'], // 60*60*24*7*4*2
		[29030400, 'months', 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
		[58060800, 'a year ago', 'next year'], // 60*60*24*7*4*12*2
		[2903040000, 'years', 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
		[5806080000, 'a century ago', 'in a century'], // 60*60*24*7*4*12*100*2
		[58060800000, 'centuries', 2903040000], // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
	];
	let seconds = (+new Date() - time) / 1000,
		token = 'ago',
		list_choice = 1;

	if (seconds == 0) {
		return 'now';
	}
	if (seconds < 0) {
		seconds = Math.abs(seconds);
		token = 'from now';
		list_choice = 2;
	}
	let i = 0,
		format;
	while ((format = time_formats[i++]))
		if (seconds < format[0]) {
			if (typeof format[2] == 'string') return format[list_choice];
			else return Math.floor(seconds / format[2]) + ' ' + format[1] + ' ' + token;
		}
	return time;
}

export const sanitize = {
	domain: domain => ({
		...domain,
		...parseTimestamps(domain),
		id: domain.uuid,
		banned: !!domain.banned,
		homepage: domain.homepage || env.DEFAULT_DOMAIN,
		uuid: undefined,
		user_id: undefined,
		banned_by_id: undefined,
	}),
	link: link => {
		const timestamps = parseTimestamps(link);
		return {
			...link,
			...timestamps,
			icon: getIcon(link.target),
			banned_by_id: undefined,
			domain_id: undefined,
			user_id: undefined,
			uuid: undefined,
			banned: !!link.banned,
			id: link.uuid,
			password: !!link.password,
			link: getShortURL(link.address, link.domain).url,
		};
	},
	link_html: link => {
		const timestamps = parseTimestamps(link);
		return {
			...link,
			...timestamps,
			icon: getIcon(link.target),
			banned_by_id: undefined,
			domain_id: undefined,
			user_id: undefined,
			uuid: undefined,
			banned: !!link.banned,
			id: link.uuid,
			relative_created_at: getTimeAgo(timestamps.created_at),
			relative_expire_in: link.expire_in && ms(differenceInMilliseconds(parseDatetime(link.expire_in), new Date()), { long: true }),
			password: !!link.password,
			visit_count: link.visit_count.toLocaleString('en-US'),
			link: getShortURL(link.address, link.domain),
		};
	},
	link_admin: link => {
		const timestamps = parseTimestamps(link);
		return {
			...link,
			...timestamps,
			icon: getIcon(link.target),
			domain: link.domain || env.DEFAULT_DOMAIN,
			id: link.uuid,
			relative_created_at: getTimeAgo(timestamps.created_at),
			relative_expire_in: link.expire_in && ms(differenceInMilliseconds(parseDatetime(link.expire_in), new Date()), { long: true }),
			password: !!link.password,
			visit_count: link.visit_count.toLocaleString('en-US'),
			link: getShortURL(link.address, link.domain),
		};
	},
	user_admin: user => {
		const timestamps = parseTimestamps(user);
		return {
			...user,
			...timestamps,
			links_count: (user.links_count ?? 0).toLocaleString('en-US'),
			relative_created_at: getTimeAgo(timestamps.created_at),
			relative_updated_at: getTimeAgo(timestamps.updated_at),
		};
	},
	domain_admin: domain => {
		const timestamps = parseTimestamps(domain);
		return {
			...domain,
			...timestamps,
			links_count: (domain.links_count ?? 0).toLocaleString('en-US'),
			relative_created_at: getTimeAgo(timestamps.created_at),
			relative_updated_at: getTimeAgo(timestamps.updated_at),
		};
	},
};

export function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function removeWww(host = '') {
	return host.replace('www.', '');
}

export function registerHandlebarsHelpers() {
	hbs.registerHelper('gt', (a, b) => a > b);
	hbs.registerHelper('gte', (a, b) => a >= b);
	hbs.registerHelper('lt', (a, b) => a < b);
	hbs.registerHelper('lte', (a, b) => a <= b);
	hbs.registerHelper('eq', (a, b) => a === b);
	hbs.registerHelper('ne', (a, b) => a !== b);
	hbs.registerHelper('length', str => str.length);
	hbs.registerHelper('substring', (str, start, end) => str.substring(start, end));

	hbs.registerHelper('ifEquals', function (arg1, arg2, options) {
		return arg1 === arg2 ? options.fn(this) : options.inverse(this);
	});

	hbs.registerHelper('ifLeastOne', function (...args) {
		const values = args.slice(0, -1);
		const hasValue = values.some(arg => typeof arg !== 'undefined' && arg !== null && arg !== '');
		const options = args[args.length - 1];
		return hasValue ? options.fn(this) : options.inverse(this);
	});

	hbs.registerHelper('json', function (context) {
		return JSON.stringify(context);
	});

	const blocks = {};

	hbs.registerHelper('extend', function (name, context) {
		let block = blocks[name];
		if (!block) {
			block = blocks[name] = [];
		}
		block.push(context.fn(this));
	});

	hbs.registerHelper('block', function (name) {
		const val = (blocks[name] || []).join('\n');
		blocks[name] = [];
		return val;
	});

	hbs.registerPartials(path.join(__dirname(import.meta.url), '../views/partials'), function () {});
	const customPartialsPath = path.join(__dirname(import.meta.url), '../../custom/views/partials');
	const customPartialsExist = fs.existsSync(customPartialsPath);
	if (customPartialsExist) {
		hbs.registerPartials(customPartialsPath, function () {});
	}
}

// grab custom styles file name from the custom/css folder
export const custom_css_file_names = [];
const customCSSPath = path.join(__dirname(import.meta.url), '../../custom/css');
const customCSSExists = fs.existsSync(customCSSPath);
if (customCSSExists) {
	fs.readdir(customCSSPath, function (error, files) {
		if (error) {
			console.warn('Could not read the custom CSS folder:', error);
		} else {
			files.forEach(function (file_name) {
				custom_css_file_names.push(file_name);
			});
		}
	});
}

export function getCustomCSSFileNames() {
	return custom_css_file_names;
}

export default {
	addProtocol,
	customAddressRegex,
	customAlphabetRegex,
	CustomError,
	dateToUTC,
	deleteCurrentToken,
	generateId,
	getCustomCSSFileNames,
	getDifferenceFunction,
	getInitStats,
	getShortURL,
	getStatsPeriods,
	isAdmin,
	parseBooleanQuery,
	parseDatetime,
	parseTimestamps,
	preservedURLs,
	registerHandlebarsHelpers,
	removeWww,
	sanitize,
	setToken,
	signToken,
	sleep,
	statsObjectToArray,
	urlRegex,
	__filename,
	__dirname,
	...knexUtils,
};
