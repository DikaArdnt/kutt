import cors from 'cors';
import { Router } from 'express';

import env from '../env.js';
import auth from '../handlers/auth.handler.js';
import helpers from '../handlers/helpers.handler.js';
import link from '../handlers/links.handler.js';
import locals from '../handlers/locals.handler.js';
import validators from '../handlers/validators.handler.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.get(
	'/',
	locals.viewTemplate('partials/links/table'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	helpers.parseQuery,
	asyncHandler(link.get)
);

router.get(
	'/admin',
	locals.viewTemplate('partials/admin/links/table'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	asyncHandler(auth.admin),
	helpers.parseQuery,
	locals.adminTable,
	asyncHandler(link.getAdmin)
);

router.post(
	'/',
	cors(),
	locals.viewTemplate('partials/shortener'),
	asyncHandler(auth.apikey),
	asyncHandler(env.DISALLOW_ANONYMOUS_LINKS ? auth.jwt : auth.jwtLoose),
	locals.createLink,
	validators.createLink,
	asyncHandler(helpers.verify),
	asyncHandler(link.create)
);

router.patch(
	'/:id',
	locals.viewTemplate('partials/links/edit'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	locals.editLink,
	validators.editLink,
	asyncHandler(helpers.verify),
	asyncHandler(link.edit)
);

router.patch(
	'/admin/:id',
	locals.viewTemplate('partials/links/edit'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	asyncHandler(auth.admin),
	locals.editLink,
	validators.editLink,
	asyncHandler(helpers.verify),
	asyncHandler(link.editAdmin)
);

router.delete(
	'/:id',
	locals.viewTemplate('partials/links/dialog/delete'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	validators.deleteLink,
	asyncHandler(helpers.verify),
	asyncHandler(link.remove)
);

router.post(
	'/admin/ban/:id',
	locals.viewTemplate('partials/links/dialog/ban'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	asyncHandler(auth.admin),
	validators.banLink,
	asyncHandler(helpers.verify),
	asyncHandler(link.ban)
);

router.post(
	'/admin/unban/:id',
	locals.viewTemplate('partials/links/dialog/unban'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	asyncHandler(auth.admin),
	validators.banLink,
	asyncHandler(helpers.verify),
	asyncHandler(link.unban)
);

router.get(
	'/:id/stats',
	locals.viewTemplate('partials/stats'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	validators.getStats,
	asyncHandler(helpers.verify),
	asyncHandler(link.stats)
);

router.post(
	'/:id/protected',
	locals.viewTemplate('partials/protected/form'),
	locals.protected,
	validators.redirectProtected,
	asyncHandler(helpers.verify),
	asyncHandler(link.redirectProtected)
);

router.post(
	'/report',
	locals.viewTemplate('partials/report/form'),
	auth.featureAccess([env.MAIL_ENABLED]),
	validators.reportLink,
	asyncHandler(helpers.verify),
	asyncHandler(link.report)
);

export default router;
