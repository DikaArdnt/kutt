import query from './queries/index.js';
import { dateToUTC } from './utils/index.js';

// check and delete links 30 secoonds
setInterval(function () {
	query.link.batchRemove({ expire_in: ['<', dateToUTC(new Date())] }).catch();
}, 30_000);
