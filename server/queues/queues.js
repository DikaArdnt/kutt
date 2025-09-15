import path from 'node:path';

import Queue from 'bull';

import env from '../env.js';
import { __dirname } from '../utils/index.js';

const redis = {
	port: env.REDIS_PORT,
	host: env.REDIS_HOST,
	db: env.REDIS_DB,
	...(env.REDIS_PASSWORD && { password: env.REDIS_PASSWORD }),
};

/**
 * @type {Queue.Queue} visit
 */
export let visit;
if (env.REDIS_ENABLED) {
	visit = new Queue('visit', { redis });
	visit.clean(5000, 'completed');
	visit.process(6, path.resolve(__dirname(import.meta.url), 'visit.js'));
	visit.on('completed', job => job.remove());
	// TODO: handler error
	// visit.on("error", function (error) {
	//   console.log("error");
	// });
} else {
	visit = {
		async add(data) {
			const { default: visitProcessor } = await import('./visit.js');
			visitProcessor({ data }).catch(function (error) {
				console.error('Add visit error: ', error);
			});
		},
	};
}

export default {
	visit,
};
