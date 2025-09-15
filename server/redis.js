import Redis from 'ioredis';

import env from './env.js';

/**
 * @type {import('ioredis').Redis}
 */
export let client;
if (env.REDIS_ENABLED) {
	client = new Redis({
		host: env.REDIS_HOST,
		port: env.REDIS_PORT,
		db: env.REDIS_DB,
		...(env.REDIS_PASSWORD && { password: env.REDIS_PASSWORD }),
	});
}

export const key = {
	link: (address, domain_id) => `l:${address}:${domain_id || ''}`,
	domain: address => `d:${address}`,
	stats: link_id => `s:${link_id}`,
	host: address => `h:${address}`,
	user: idOrKey => `u:${idOrKey}`,
};

export const remove = {
	domain: domain => {
		if (!domain) return;
		return client.del(key.domain(domain.address));
	},
	host: host => {
		if (!host) return;
		return client.del(key.host(host.address));
	},
	link: link => {
		if (!link) return;
		return client.del(key.link(link.address, link.domain_id));
	},
	user: user => {
		if (!user) return;
		return Promise.all([client.del(key.user(user.id)), client.del(key.user(user.apikey))]);
	},
};

export default {
	client,
	key,
	remove,
};
