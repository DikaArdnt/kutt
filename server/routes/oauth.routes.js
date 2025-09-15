import { Router } from 'express';

import env from '../env.js';
import auth from '../handlers/auth.handler.js';
import helpers from '../handlers/helpers.handler.js';
import oauth from '../handlers/oauth.handler.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.get(
	'/google',
	auth.featureAccess([env.G_AUTH_ENABLED]),
	asyncHandler(helpers.verify),
	helpers.rateLimit({ window: 60, limit: 5 }),
	asyncHandler(oauth.google),
);

export default router;