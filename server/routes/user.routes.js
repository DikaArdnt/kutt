import { Router } from 'express';

import auth from '../handlers/auth.handler.js';
import helpers from '../handlers/helpers.handler.js';
import locals from '../handlers/locals.handler.js';
import user from '../handlers/users.handler.js';
import validators from '../handlers/validators.handler.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(auth.apikey), asyncHandler(auth.jwt), asyncHandler(user.get));

router.get(
	'/admin',
	locals.viewTemplate('partials/admin/users/table'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	asyncHandler(auth.admin),
	helpers.parseQuery,
	locals.adminTable,
	asyncHandler(user.getAdmin)
);

router.post(
	'/admin',
	locals.viewTemplate('partials/admin/dialog/create_user'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	asyncHandler(auth.admin),
	validators.createUser,
	asyncHandler(helpers.verify),
	asyncHandler(user.create)
);

router.patch(
	'/admin',
	locals.viewTemplate('partials/admin/dialog/update_user'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	asyncHandler(auth.admin),
	validators.updateUser,
	asyncHandler(helpers.verify),
	asyncHandler(user.update)
);

router.post(
	'/delete',
	locals.viewTemplate('partials/settings/delete_account'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	validators.deleteUser,
	asyncHandler(helpers.verify),
	asyncHandler(user.remove)
);

router.delete(
	'/admin/:id',
	locals.viewTemplate('partials/admin/dialog/delete_user'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	asyncHandler(auth.admin),
	validators.deleteUserByAdmin,
	asyncHandler(helpers.verify),
	asyncHandler(user.removeByAdmin)
);

router.post(
	'/admin/ban/:id',
	locals.viewTemplate('partials/admin/dialog/ban_user'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	asyncHandler(auth.admin),
	validators.banUser,
	asyncHandler(helpers.verify),
	asyncHandler(user.ban)
);

router.post(
	'/admin/unban/:id',
	locals.viewTemplate('partials/admin/dialog/unban_user'),
	asyncHandler(auth.apikey),
	asyncHandler(auth.jwt),
	asyncHandler(auth.admin),
	validators.banUser,
	asyncHandler(helpers.verify),
	asyncHandler(user.unban)
);

export default router;
