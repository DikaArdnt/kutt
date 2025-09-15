import path from 'node:path';

import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import passport from 'passport';

import env from './env.js';
import helpers from './handlers/helpers.handler.js';
import links from './handlers/links.handler.js';
import locals from './handlers/locals.handler.js';
import renders from './handlers/renders.handler.js';
import routes from './routes/index.js';
import asyncHandler from './utils/asyncHandler.js';
import { __dirname, registerHandlebarsHelpers } from './utils/index.js';

// run the cron jobs
// the app might be running in cluster mode (multiple instances) so run the cron job only on one cluster (the first one)
// NODE_APP_INSTANCE variable is added by pm2 automatically, if you're using something else to cluster your app, then make sure to set this variable
if (env.NODE_APP_INSTANCE === 0) {
	await import('./cron.js');
}

// intialize passport authentication library
await import('./passport.js');

// create express app
const app = express();

// this tells the express app that it's running behind a proxy server
// and thus it should get the IP address from the proxy server
if (env.TRUST_PROXY) {
	app.set('trust proxy', true);
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve static
app.use('/images', express.static('custom/images'));
app.use('/css', express.static('custom/css', { extensions: ['css'] }));
app.use(express.static('static'));

app.use(passport.initialize());
app.use(locals.isHTML);
app.use(locals.config);

// template engine / serve html
app.set('view engine', 'hbs');
app.set('views', [path.join(process.cwd(), 'custom/views'), path.join(__dirname(import.meta.url), 'views')]);
registerHandlebarsHelpers();

// if is custom domain, redirect to the set homepage
app.use(asyncHandler(links.redirectCustomDomainHomepage));

// render html pages
app.use('/', routes.render);

// handle oauth requests
app.use('/oauth', routes.oauth);

// handle api requests
app.use('/api/v2', routes.api);
app.use('/api', routes.api);

// finally, redirect the short link to the target
app.get('/:id', asyncHandler(links.redirect));

// 404 pages that don't exist
app.use(renders.notFound);

// handle errors coming from above routes
app.use(helpers.error);

app.listen(env.PORT, () => {
	console.log(`> Ready on http://localhost:${env.PORT}`);
});
