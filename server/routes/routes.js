import { Router } from 'express';

import locals from './../handlers/locals.handler.js';
import auth from './auth.routes.js';
import domains from './domain.routes.js';
import health from './health.routes.js';
import link from './link.routes.js';
import oauth from './oauth.routes.js';
import renders from './renders.routes.js';
import user from './user.routes.js';

const renderRouter = Router();

renderRouter.use(renders);

const apiRouter = Router();

apiRouter.use(locals.noLayout);
apiRouter.use('/domains', domains);
apiRouter.use('/health', health);
apiRouter.use('/links', link);
apiRouter.use('/users', user);
apiRouter.use('/auth', auth);

const oauthRouter = Router();

oauthRouter.use(oauth);

export { apiRouter as api };
export { renderRouter as render };
export default {
	api: apiRouter,
	render: renderRouter,
	oauth: oauthRouter,
};
