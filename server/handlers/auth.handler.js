import { randomUUID } from 'node:crypto';

import bcrypt from 'bcryptjs';
import { addMinutes, differenceInDays } from 'date-fns';
import { nanoid } from 'nanoid';
import passport from 'passport';

import { AUTH, ROLES } from '../consts.js';
import env from '../env.js';
import mail from '../mail/index.js';
import query from '../queries/index.js';
import redis from '../redis.js';
import { CustomError, dateToUTC, deleteCurrentToken, isAdmin, isPremium, setToken, signToken } from '../utils/index.js';

function authenticate(type, error, isStrict, redirect) {
	return function auth(req, res, next) {
		if (req.user) return next();

		passport.authenticate(type, (err, user, info) => {
			if (err) return next(err);

			if (req.isHTML && redirect && ((!user && isStrict) || (user && isStrict && !user.verified) || (user && user.banned))) {
				if (redirect === 'page') {
					res.redirect('/logout');
					return;
				}
				if (redirect === 'header') {
					res.setHeader('HX-Redirect', '/logout');
					res.send('NOT_AUTHENTICATED');
					return;
				}
			}

			if (!user && isStrict) {
				throw new CustomError(error, 401);
			}

			if (user && user.banned) {
				throw new CustomError("You're banned from using this website.", 403);
			}

			if (user && isStrict && !user.verified) {
				throw new CustomError('Your email address is not verified. ' + 'Sign up to get the verification link again.', 400);
			}

			if (user) {
				res.locals.isAdmin = isAdmin(user);
				res.locals.isPremium = isPremium(user);
				req.user = {
					...user,
					admin: isAdmin(user),
				};

				// renew token if it's been at least one day since the token has been created
				// only do it for html page requests not api requests
				if (info?.exp && req.isHTML && redirect === 'page') {
					const diff = Math.abs(differenceInDays(new Date(info.exp * 1000), new Date()));
					if (diff < 6) {
						const token = signToken(user);
						deleteCurrentToken(res);
						setToken(res, token);
					}
				}
			}

			return next();
		})(req, res, next);
	};
}

export const local = authenticate('local', 'Login credentials are wrong.', true, null);
export const jwt = authenticate('jwt', 'Unauthorized.', true, 'header');
export const jwtPage = authenticate('jwt', 'Unauthorized.', true, 'page');
export const jwtLoose = authenticate('jwt', 'Unauthorized.', false, 'header');
export const jwtLoosePage = authenticate('jwt', 'Unauthorized.', false, 'page');
export const apikey = authenticate('localapikey', 'API key is not correct.', false, null);

export function admin(req, res, next) {
	if (req.user.admin) return next();
	throw new CustomError('Unauthorized', 401);
}

export async function signup(req, res) {
	const salt = await bcrypt.genSalt(12);
	const password = await bcrypt.hash(req.body.password, salt);

	const user = await query.user.add({ email: req.body.email, password }, req.user);

	await mail.verification(user);

	if (req.isHTML) {
		res.render('partials/auth/verify');
		return;
	}

	return res.status(201).send({ message: 'A verification email has been sent.' });
}

export async function createAdminUser(req, res) {
	const isThereAUser = await query.user.findAny();
	if (isThereAUser) {
		throw new CustomError('Can not create the admin user because a user already exists.', 400);
	}

	const salt = await bcrypt.genSalt(12);
	const password = await bcrypt.hash(req.body.password, salt);

	const user = await query.user.add({
		email: req.body.email,
		password,
		role: ROLES.ADMIN,
		verified: true,
	});

	const token = signToken(user);

	if (req.isHTML) {
		setToken(res, token);
		res.render('partials/auth/welcome');
		return;
	}

	return res.status(201).send({ token });
}

export function login(req, res) {
	const token = signToken(req.user);

	if (req.isHTML) {
		setToken(res, token);
		res.render('partials/auth/welcome');
		return;
	}

	return res.status(200).send({ token });
}

export async function verify(req, res, next) {
	if (!req.params.verificationToken) return next();

	const user = await query.user.update(
		{
			verification_token: req.params.verificationToken,
			verification_expires: ['>', dateToUTC(new Date())],
		},
		{
			verified: true,
			verification_token: null,
			verification_expires: null,
		}
	);

	if (user) {
		const token = signToken(user);
		deleteCurrentToken(res);
		setToken(res, token);
		res.locals.token_verified = true;
		req.cookies.token = token;
	}

	return next();
}

export async function changePassword(req, res) {
	if (req.user.auth_via !== AUTH.VERIFY) {
		const error = 'Sign up with Google. You can\'t change the password.';
		res.locals.error = error;
		throw new CustomError(error, 400);
	}

	const isMatch = await bcrypt.compare(req.body.currentpassword, req.user.password);
	if (!isMatch) {
		const message = 'Current password is not correct.';
		res.locals.errors = { currentpassword: message };
		throw new CustomError(message, 401);
	}

	const salt = await bcrypt.genSalt(12);
	const newpassword = await bcrypt.hash(req.body.newpassword, salt);

	const user = await query.user.update({ id: req.user.id }, { password: newpassword });

	if (!user) {
		throw new CustomError("Couldn't change the password. Try again later.");
	}

	if (req.isHTML) {
		res.setHeader('HX-Trigger-After-Swap', 'resetChangePasswordForm');
		res.render('partials/settings/change_password', {
			success: 'Password has been changed.',
		});
		return;
	}

	return res.status(200).send({ message: 'Your password has been changed successfully.' });
}

export async function generateApiKey(req, res) {
	const apikey = nanoid(40);

	if (env.REDIS_ENABLED) {
		redis.remove.user(req.user);
	}

	const user = await query.user.update({ id: req.user.id }, { apikey });

	if (!user) {
		throw new CustomError("Couldn't generate API key. Please try again later.");
	}

	if (req.isHTML) {
		res.render('partials/settings/apikey', {
			user: { apikey },
		});
		return;
	}

	return res.status(201).send({ apikey });
}

export async function resetPassword(req, res) {
	const exists = await query.user.find({ email: req.body.email });

	if (!exists) {
		const error = 'Email address does not exist.';
		res.locals.error = error;
		throw new CustomError(error, 404);
	}

	if (exists.auth_via === AUTH.GOOGLE) {
		const error = 'Sign up with Google. You can\'t change the password.';
		res.locals.error = error;
		throw new CustomError(error, 400);
	}

	const user = await query.user.update(
		{ email: req.body.email },
		{
			reset_password_token: randomUUID(),
			reset_password_expires: dateToUTC(addMinutes(new Date(), 30)),
		}
	);

	if (user) {
		mail.resetPasswordToken(user).catch(error => {
			console.error('Send reset-password token email error:\n', error);
		});
	}

	if (req.isHTML) {
		res.render('partials/reset_password/request_form', {
			message: 'If the email address exists, a reset password email will be sent to it.',
		});
		return;
	}

	return res.status(200).send({
		message: 'If email address exists, a reset password email has been sent.',
	});
}

export async function newPassword(req, res) {
	const { reset_password_token } = req.body;

	const salt = await bcrypt.genSalt(12);
	const password = await bcrypt.hash(req.body.new_password, salt);

	const user = await query.user.update(
		{
			reset_password_token,
			reset_password_expires: ['>', dateToUTC(new Date())],
		},
		{
			reset_password_expires: null,
			reset_password_token: null,
			password,
		}
	);

	if (!user) {
		throw new CustomError('Could not set the password. Please try again later.');
	}

	res.render('partials/reset_password/new_password_success');
}

export async function changeEmailRequest(req, res) {
	const { email, password } = req.body;

	if (req.user.auth_via === AUTH.GOOGLE) {
		const error = 'Sign up with Google. You can\'t change the email.';
		res.locals.error = error;
		throw new CustomError(error, 400);
	}

	const isMatch = await bcrypt.compare(password, req.user.password);

	if (!isMatch) {
		const error = 'Password is not correct.';
		res.locals.errors = { password: error };
		throw new CustomError(error, 401);
	}

	const user = await query.user.find({ email });

	if (user) {
		const error = "Can't use this email address.";
		res.locals.errors = { email: error };
		throw new CustomError(error, 400);
	}

	const updatedUser = await query.user.update(
		{ id: req.user.id },
		{
			change_email_address: email,
			change_email_token: randomUUID(),
			change_email_expires: dateToUTC(addMinutes(new Date(), 30)),
		}
	);

	if (updatedUser) {
		await mail.changeEmail({ ...updatedUser, email });
	}

	const message = 'A verification link has been sent to the requested email address.';

	if (req.isHTML) {
		res.setHeader('HX-Trigger-After-Swap', 'resetChangeEmailForm');
		res.render('partials/settings/change_email', {
			success: message,
		});
		return;
	}

	return res.status(200).send({ message });
}

export async function changeEmail(req, res, next) {
	const changeEmailToken = req.params.changeEmailToken;

	if (changeEmailToken) {
		const foundUser = await query.user.find({
			change_email_token: changeEmailToken,
			change_email_expires: ['>', dateToUTC(new Date())],
		});

		if (!foundUser) return next();

		const user = await query.user.update(
			{ id: foundUser.id },
			{
				change_email_token: null,
				change_email_expires: null,
				change_email_address: null,
				email: foundUser.change_email_address,
			}
		);

		if (user) {
			const token = signToken(user);
			deleteCurrentToken(res);
			setToken(res, token);
			res.locals.token_verified = true;
			req.cookies.token = token;
		}
	}
	return next();
}

export function featureAccess(features, redirect) {
	return function (req, res, next) {
		for (let i = 0; i < features.length; ++i) {
			if (!features[i]) {
				if (redirect) {
					return res.redirect('/');
				} else {
					throw new CustomError('Request is not allowed.', 400);
				}
			}
		}
		next();
	};
}

export function featureAccessPage(features) {
	return featureAccess(features, true);
}

export default {
	admin,
	apikey,
	changeEmail,
	changeEmailRequest,
	changePassword,
	createAdminUser,
	featureAccess,
	featureAccessPage,
	generateApiKey,
	jwt,
	jwtLoose,
	jwtLoosePage,
	jwtPage,
	local,
	login,
	newPassword,
	resetPassword,
	signup,
	verify,
};
