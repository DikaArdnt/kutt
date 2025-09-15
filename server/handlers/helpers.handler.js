import { rateLimit as expressRateLimit } from 'express-rate-limit';
import { validationResult } from 'express-validator';
import { RedisStore as RateLimitRedisStore } from 'rate-limit-redis';

import env from '../env.js';
import query from '../queries/index.js';
import redis from '../redis.js';
import { CustomError } from '../utils/index.js';

// eslint-disable-next-line no-unused-vars
export function error(error, req, res, next) {
	if (!(error instanceof CustomError)) {
		console.error(error);
	} else if (env.isDev) {
		console.error(error.message);
	}

	const message = error instanceof CustomError ? error.message : 'An error occurred. Please try again later.';
	const statusCode = error.statusCode ?? 500;

	if (req.isHTML && req.viewTemplate) {
		res.locals.error = message;
		res.render(req.viewTemplate);
		return;
	}

	if (req.isHTML) {
		res.render('error', { message: message });
		return;
	}

	return res.status(statusCode).json({ error: message });
}

export function verify(req, res, next) {
	const result = validationResult(req);
	if (result.isEmpty()) return next();

	const errors = result.array();
	const error = errors[0].msg;

	res.locals.errors = {};
	errors.forEach(e => {
		const param = e.path || e.value;
		if (res.locals.errors[param]) return;
		res.locals.errors[param] = e.msg;
	});

	throw new CustomError(error, 400);
}

export function parseQuery(req, res, next) {
	if (typeof req.query.limit !== 'undefined' && typeof req.query.limit !== 'string') {
		return res.status(400).json({ error: 'limit query is not valid.' });
	}

	if (typeof req.query.skip !== 'undefined' && typeof req.query.skip !== 'string') {
		return res.status(400).json({ error: 'skip query is not valid.' });
	}

	if (typeof req.query.search !== 'undefined' && typeof req.query.search !== 'string') {
		return res.status(400).json({ error: 'search query is not valid.' });
	}

	const limit = parseInt(req.query.limit) || 10;

	req.context = {
		limit: limit > 50 ? 50 : limit,
		skip: parseInt(req.query.skip) || 0,
	};

	next();
}

export function rateLimit(params) {
	if (!env.ENABLE_RATE_LIMIT) {
		return function (req, res, next) {
			return next();
		};
	}

	let store = undefined;
	if (env.REDIS_ENABLED) {
		store = new RateLimitRedisStore({
			sendCommand: (...args) => redis.client.call(...args),
		});
	}

	return expressRateLimit({
		windowMs: params.window * 1000,
		validate: { trustProxy: false },
		skipSuccessfulRequests: !!params.skipSuccess,
		skipFailedRequests: !!params.skipFailed,
		...(store && { store }),
		limit: function (req) {
			if (params.user && req.user) {
				return params.user;
			}
			return params.limit;
		},
		keyGenerator: function (req) {
			return 'rl:' + req.method + req.baseUrl + req.path + ':' + req.ip;
		},
		requestWasSuccessful: function (req, res) {
			return !res.locals.error && res.statusCode < 400;
		},
		handler: function (req, res, next, options) {
			throw new CustomError(options.message, options.statusCode);
		},
	});
}

// redirect to create admin page if the KuaLat instance is ran for the first time
export async function adminSetup(req, res, next) {
	const isThereAUser = req.user || (await query.user.findAny());
	if (isThereAUser) {
		next();
		return;
	}

	res.redirect('/create-admin');
}

export default {
	adminSetup,
	error,
	parseQuery,
	rateLimit,
	verify,
};
