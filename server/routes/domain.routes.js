import { Router } from 'express';

import auth from '../handlers/auth.handler.js';
import domains from '../handlers/domains.handler.js';
import helpers from '../handlers/helpers.handler.js';
import locals from '../handlers/locals.handler.js';
import validators from '../handlers/validators.handler.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.get(
	'/admin',
	locals.viewTemplate('partials/admin/domains/table'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	asyncHandler(auth.admin),
	helpers.parseQuery,
	locals.adminTable,
	asyncHandler(domains.getAdmin)
);

router.post(
	'/',
	locals.viewTemplate('partials/settings/domain/add_form'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	validators.addDomain,
	asyncHandler(helpers.verify),
	asyncHandler(domains.add)
);

router.post(
	'/admin',
	locals.viewTemplate('partials/admin/dialog/add_domain'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	asyncHandler(auth.admin),
	validators.addDomainAdmin,
	asyncHandler(helpers.verify),
	asyncHandler(domains.addAdmin)
);

router.delete(
	'/:id',
	locals.viewTemplate('partials/settings/domain/delete'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	validators.removeDomain,
	asyncHandler(helpers.verify),
	asyncHandler(domains.remove)
);

router.delete(
	'/admin/:id',
	locals.viewTemplate('partials/admin/dialog/delete_domain'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	asyncHandler(auth.admin),
	validators.removeDomainAdmin,
	asyncHandler(helpers.verify),
	asyncHandler(domains.removeAdmin)
);

router.post(
	'/admin/ban/:id',
	locals.viewTemplate('partials/admin/dialog/ban_domain'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	asyncHandler(auth.admin),
	validators.banDomain,
	asyncHandler(helpers.verify),
	asyncHandler(domains.ban)
);

router.post(
	'/admin/unban/:id',
	locals.viewTemplate('partials/admin/dialog/unban_domain'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	asyncHandler(auth.admin),
	validators.banDomain,
	asyncHandler(helpers.verify),
	asyncHandler(domains.unban)
);

export default router;
