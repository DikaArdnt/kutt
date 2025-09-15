import bcrypt from 'bcryptjs';
import passport from 'passport';
import { Strategy as JwtStrategy } from 'passport-jwt';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as LocalAPIKeyStrategy } from 'passport-localapikey-update';

import { AUTH } from './consts.js';
import env from './env.js';
import query from './queries/index.js';

const jwtOptions = {
	jwtFromRequest: req => req.cookies?.token,
	secretOrKey: env.JWT_SECRET,
};

passport.use(
	new JwtStrategy(jwtOptions, async (payload, done) => {
		try {
			// 'sub' used to be the email address
			// this check makes sure to invalidate old JWTs where the sub is still the email address
			if (typeof payload.sub === 'string' || !payload.sub) {
				return done(null, false);
			}
			const user = await query.user.find({ id: payload.sub });
			if (!user) return done(null, false);
			return done(null, user, payload);
		} catch (err) {
			return done(err);
		}
	})
);

const localOptions = {
	usernameField: 'email',
};

passport.use(
	new LocalStrategy(localOptions, async (email, password, done) => {
		try {
			const user = await query.user.find({ email });
			if (!user) {
				return done(null, false);
			}

			if (user && user.auth_via === AUTH.GOOGLE) {
				return done(null, false);
			}

			const isMatch = await bcrypt.compare(password, user.password);
			if (!isMatch) {
				return done(null, false);
			}
			return done(null, user);
		} catch (err) {
			return done(err);
		}
	})
);

const localAPIKeyOptions = {
	apiKeyField: 'apikey',
	apiKeyHeader: 'x-api-key',
};

passport.use(
	new LocalAPIKeyStrategy(localAPIKeyOptions, async (apikey, done) => {
		try {
			const user = await query.user.find({ apikey });
			if (!user) {
				return done(null, false);
			}
			return done(null, user);
		} catch (err) {
			return done(err);
		}
	})
);
