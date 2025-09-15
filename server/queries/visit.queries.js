import { isAfter } from 'date-fns';

import env from '../env.js';
import knex from '../knex.js';
import redis from '../redis.js';
import { dateToUTC, getDifferenceFunction, getInitStats, getStatsPeriods, knexUtils, parseDatetime, statsObjectToArray } from '../utils/index.js';

export function normalizeMatch(match) {
	const newMatch = { ...match };

	if (newMatch.user_id) {
		newMatch['visits.user_id'] = newMatch.user_id;
		delete newMatch.user_id;
	}

	return newMatch;
}

export async function add(params) {
	const data = {
		...params,
		country: params.country.toLowerCase(),
		referrer: params.referrer.toLowerCase(),
	};

	const nowUTC = new Date().toISOString();
	const truncatedNow = nowUTC.substring(0, 10) + ' ' + nowUTC.substring(11, 14) + '00:00';

	return knex.transaction(async trx => {
		// Create a subquery first that truncates the
		const subquery = trx('visits')
			.select('visits.*')
			.select({
				created_at_hours: knexUtils(trx).truncatedTimestamp('created_at', 'hour'),
			})
			.where({ link_id: data.link_id })
			.as('subquery');

		const visit = await trx.select('*').from(subquery).where('created_at_hours', '=', truncatedNow).forUpdate().first();

		if (visit) {
			const countries = typeof visit.countries === 'string' ? JSON.parse(visit.countries) : visit.countries;
			const referrers = typeof visit.referrers === 'string' ? JSON.parse(visit.referrers) : visit.referrers;
			await trx('visits')
				.where({ id: visit.id })
				.increment(`br_${data.browser}`, 1)
				.increment(`os_${data.os}`, 1)
				.increment('total', 1)
				.update({
					updated_at: dateToUTC(new Date()),
					countries: JSON.stringify({
						...countries,
						[data.country]: (countries[data.country] ?? 0) + 1,
					}),
					referrers: JSON.stringify({
						...referrers,
						[data.referrer]: (referrers[data.referrer] ?? 0) + 1,
					}),
				});
		} else {
			// This must also happen in the transaction to avoid concurrency
			await trx('visits').insert({
				[`br_${data.browser}`]: 1,
				countries: { [data.country]: 1 },
				referrers: { [data.referrer]: 1 },
				[`os_${data.os}`]: 1,
				total: 1,
				link_id: data.link_id,
				user_id: data.user_id,
			});
		}

		return visit;
	});
}

export async function find(match) {
	if (match.link_id && env.REDIS_ENABLED) {
		const key = redis.key.stats(match.link_id);
		const cached = await redis.client.get(key);
		if (cached) return JSON.parse(cached);
	}

	const stats = {
		lastDay: {
			stats: getInitStats(),
			views: new Array(24).fill(0),
			total: 0,
		},
		lastWeek: {
			stats: getInitStats(),
			views: new Array(7).fill(0),
			total: 0,
		},
		lastMonth: {
			stats: getInitStats(),
			views: new Array(30).fill(0),
			total: 0,
		},
		lastYear: {
			stats: getInitStats(),
			views: new Array(12).fill(0),
			total: 0,
		},
	};

	const visitsStream = knex('visits').where(match).stream();
	const now = new Date();

	const periods = getStatsPeriods(now);

	for await (const visit of visitsStream) {
		periods.forEach(([type, fromDate]) => {
			const isIncluded = isAfter(parseDatetime(visit.created_at), fromDate);
			if (!isIncluded) return;
			const diffFunction = getDifferenceFunction(type);
			const diff = diffFunction(now, parseDatetime(visit.created_at));
			const index = stats[type].views.length - diff - 1;
			const period = stats[type].stats;
			const countries = typeof visit.countries === 'string' ? JSON.parse(visit.countries) : visit.countries;
			const referrers = typeof visit.referrers === 'string' ? JSON.parse(visit.referrers) : visit.referrers;
			stats[type].stats = {
				browser: {
					chrome: period.browser.chrome + visit.br_chrome,
					edge: period.browser.edge + visit.br_edge,
					firefox: period.browser.firefox + visit.br_firefox,
					ie: period.browser.ie + visit.br_ie,
					opera: period.browser.opera + visit.br_opera,
					other: period.browser.other + visit.br_other,
					safari: period.browser.safari + visit.br_safari,
				},
				os: {
					android: period.os.android + visit.os_android,
					ios: period.os.ios + visit.os_ios,
					linux: period.os.linux + visit.os_linux,
					macos: period.os.macos + visit.os_macos,
					other: period.os.other + visit.os_other,
					windows: period.os.windows + visit.os_windows,
				},
				country: {
					...period.country,
					...Object.entries(countries).reduce(
						(obj, [country, count]) => ({
							...obj,
							[country]: (period.country[country] || 0) + count,
						}),
						{}
					),
				},
				referrer: {
					...period.referrer,
					...Object.entries(referrers).reduce(
						(obj, [referrer, count]) => ({
							...obj,
							[referrer]: (period.referrer[referrer] || 0) + count,
						}),
						{}
					),
				},
			};
			stats[type].views[index] += visit.total;
			stats[type].total += visit.total;
		});
	}

	const response = {
		lastYear: {
			stats: statsObjectToArray(stats.lastYear.stats),
			views: stats.lastYear.views,
			total: stats.lastYear.total,
		},
		lastDay: {
			stats: statsObjectToArray(stats.lastDay.stats),
			views: stats.lastDay.views,
			total: stats.lastDay.total,
		},
		lastMonth: {
			stats: statsObjectToArray(stats.lastMonth.stats),
			views: stats.lastMonth.views,
			total: stats.lastMonth.total,
		},
		lastWeek: {
			stats: statsObjectToArray(stats.lastWeek.stats),
			views: stats.lastWeek.views,
			total: stats.lastWeek.total,
		},
		updatedAt: new Date(),
	};

	if (match.link_id && env.REDIS_ENABLED) {
		const key = redis.key.stats(match.link_id);
		redis.client.set(key, JSON.stringify(response), 'EX', 60);
	}

	return response;
}

export async function totalAdmin(match, params) {
	const query = knex('visits');

	Object.entries(normalizeMatch(match)).forEach(([key, value]) => {
		query.andWhere(key, ...(Array.isArray(value) ? value : [value]));
	});

	if (params?.user) {
		const id = parseInt(params?.user);
		if (Number.isNaN(id)) {
			query.andWhereRaw('LOWER(users.email) LIKE LOWER(?)', ['%' + params.user + '%']);
		} else {
			query.andWhere('visits.user_id', params.user);
		}
	}

	query.leftJoin('users', 'visits.user_id', 'users.id');
	query.count('* as count');

	const [{ count }] = await query;

	return typeof count === 'number' ? count : parseInt(count);
}

export default {
	add,
	find,
	normalizeMatch,
	totalAdmin,
};
