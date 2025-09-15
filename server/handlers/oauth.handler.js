import { OAuth2Client } from 'google-auth-library';

import { AUTH } from '../consts.js';
import env from '../env.js';
import query from '../queries/index.js';
import { CustomError, isAdmin, setToken, signToken } from '../utils/index.js';

/**
 * @type {import('google-auth-library').OAuth2Client}
 */
let oAuth2Client;
let authorizationUrl;

export async function getGoogleClient() {
	if (!oAuth2Client) {
		oAuth2Client = new OAuth2Client(env.G_AUTH_CLIENT_ID, env.G_AUTH_CLIENT_SECRET, 'https://' + env.DEFAULT_DOMAIN + '/oauth/google');
	}

	if (!authorizationUrl) {
		authorizationUrl = oAuth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
			include_granted_scopes: true,
			prompt: 'consent',
		});
	}

	return { oAuth2Client, authorizationUrl };
}

export async function google(req, res, next) {
	try {
		const { code, error } = req.query;

		if (error === 'access_denied') {
			res.redirect('/login');
			return;
		}

		const { oAuth2Client, authorizationUrl } = await getGoogleClient();

		if (code) {
			const r = await oAuth2Client.getToken(code);
			oAuth2Client.setCredentials(r.tokens);

			const tokenInfo = await oAuth2Client.getTokenInfo(oAuth2Client.credentials.access_token);

			let user = await query.user.find({ email: tokenInfo.email });
			if (!user) {
				user = await query.user.add({ email: tokenInfo.email, verified: true, auth_via: AUTH.GOOGLE, auth_id: tokenInfo.user_id }, req.user);
			}

			if (!user.verified) {
				user = await query.user.update({ id: user.id }, { verified: true, auth_via: AUTH.GOOGLE, auth_id: tokenInfo.user_id }, req.user);
			}

			if (user) {
				res.locals.isAdmin = isAdmin(user);

				req.user = {
					...user,
					admin: isAdmin(user),
				};

				const token = signToken(user);

				if (req.isHTML) {
					setToken(res, token);
					res.render('partials/auth/welcome');
					return;
				}

				return res.status(200).send({ token });
			}
		} else {
			res.redirect(authorizationUrl);
			return;
		}

		return next();
	} catch {
		const error = 'Google authentication failed.';
		res.locals.error = error;
		throw new CustomError(error, 400);
	}
}

export default {
	google,
	getGoogleClient,
};
