import {Router} from 'express';

import env from '../env.js';
import auth from '../handlers/auth.handler.js';
import helpers from '../handlers/helpers.handler.js';
import locals from '../handlers/locals.handler.js';
import renders from '../handlers/renders.handler.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

// pages
router.get('/', asyncHandler(auth.jwtLoosePage), asyncHandler(helpers.adminSetup), asyncHandler(locals.user), asyncHandler(renders.homepage));

router.get('/login', asyncHandler(auth.jwtLoosePage), asyncHandler(helpers.adminSetup), asyncHandler(renders.login));

router.get('/logout', asyncHandler(renders.logout));

router.get('/create-admin', asyncHandler(renders.createAdmin));

router.get('/404', asyncHandler(auth.jwtLoosePage), asyncHandler(locals.user), asyncHandler(renders.notFound));

router.get('/settings', asyncHandler(auth.jwtPage), asyncHandler(locals.user), asyncHandler(renders.settings));

router.get('/admin', asyncHandler(auth.jwtPage), asyncHandler(auth.admin), asyncHandler(locals.user), asyncHandler(renders.admin));

router.get('/stats', asyncHandler(auth.jwtPage), asyncHandler(locals.user), asyncHandler(renders.stats));

router.get('/banned', asyncHandler(auth.jwtLoosePage), asyncHandler(locals.user), asyncHandler(renders.banned));

router.get('/report', asyncHandler(auth.jwtLoosePage), asyncHandler(locals.user), asyncHandler(renders.report));

router.get(
	'/reset-password',
	auth.featureAccessPage([env.MAIL_ENABLED]),
	asyncHandler(auth.jwtLoosePage),
	asyncHandler(locals.user),
	asyncHandler(renders.resetPassword)
);

router.get(
	'/reset-password/:resetPasswordToken',
	asyncHandler(auth.jwtLoosePage),
	asyncHandler(locals.user),
	asyncHandler(renders.resetPasswordSetNewPassword)
);

router.get(
	'/verify-email/:changeEmailToken',
	asyncHandler(auth.changeEmail),
	asyncHandler(auth.jwtLoosePage),
	asyncHandler(locals.user),
	asyncHandler(renders.verifyChangeEmail)
);

router.get(
	'/verify/:verificationToken',
	asyncHandler(auth.verify),
	asyncHandler(auth.jwtLoosePage),
	asyncHandler(locals.user),
	asyncHandler(renders.verify)
);

router.get('/terms', asyncHandler(auth.jwtLoosePage), asyncHandler(locals.user), asyncHandler(renders.terms));
// partial renders
router.get('/confirm-link-delete', locals.noLayout, asyncHandler(auth.jwt), asyncHandler(renders.confirmLinkDelete));

router.get(
	'/confirm-link-ban',
	locals.noLayout,
	locals.viewTemplate('partials/links/dialog/message'),
	asyncHandler(auth.jwt),
	asyncHandler(auth.admin),
	asyncHandler(renders.confirmLinkBan)
);

router.get(
	'/confirm-link-unban',
	locals.noLayout,
	locals.viewTemplate('partials/links/dialog/message'),
	asyncHandler(auth.jwt),
	asyncHandler(auth.admin),
	asyncHandler(renders.confirmLinkUnban)
);

router.get('/confirm-user-delete', locals.noLayout, asyncHandler(auth.jwt), asyncHandler(auth.admin), asyncHandler(renders.confirmUserDelete));

router.get('/confirm-user-ban', locals.noLayout, asyncHandler(auth.jwt), asyncHandler(auth.admin), asyncHandler(renders.confirmUserBan));

router.get('/confirm-user-unban', locals.noLayout, asyncHandler(auth.jwt), asyncHandler(auth.admin), asyncHandler(renders.confirmUserUnban));

router.get('/create-user', locals.noLayout, asyncHandler(auth.jwt), asyncHandler(auth.admin), asyncHandler(renders.createUser));

router.get('/update-user', locals.noLayout, asyncHandler(auth.jwt), asyncHandler(auth.admin), asyncHandler(renders.updateUser));

router.get('/add-domain', locals.noLayout, asyncHandler(auth.jwt), asyncHandler(auth.admin), asyncHandler(renders.addDomainAdmin));

router.get('/confirm-domain-ban', locals.noLayout, asyncHandler(auth.jwt), asyncHandler(auth.admin), asyncHandler(renders.confirmDomainBan));

router.get('/confirm-domain-unban', locals.noLayout, asyncHandler(auth.jwt), asyncHandler(auth.admin), asyncHandler(renders.confirmDomainUnban));

router.get(
	'/confirm-domain-delete-admin',
	locals.noLayout,
	asyncHandler(auth.jwt),
	asyncHandler(auth.admin),
	asyncHandler(renders.confirmDomainDeleteAdmin)
);

router.get('/link/edit/:id', locals.noLayout, asyncHandler(auth.jwt), asyncHandler(renders.linkEdit));

router.get('/admin/link/edit/:id', locals.noLayout, asyncHandler(auth.jwt), asyncHandler(auth.admin), asyncHandler(renders.linkEditAdmin));

router.get('/add-domain-form', locals.noLayout, asyncHandler(auth.jwt), asyncHandler(renders.addDomainForm));

router.get(
	'/confirm-domain-delete',
	locals.noLayout,
	locals.viewTemplate('partials/settings/domain/delete'),
	asyncHandler(auth.jwt),
	asyncHandler(renders.confirmDomainDelete)
);

router.get('/get-report-email', locals.noLayout, locals.viewTemplate('partials/report/email'), asyncHandler(renders.getReportEmail));

router.get('/get-support-email', locals.noLayout, locals.viewTemplate('partials/support_email'), asyncHandler(renders.getSupportEmail));

export default router;
