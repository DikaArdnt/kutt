import { join, dirname } from 'node:path';
import { promises, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import api from './api.js';

const Template = (output, { api, title, redoc }) =>
	promises.writeFile(
		output,
		`<DOCTYPE html>
<html>
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<meta http-equiv="X-UA-Compatible" content="ie=edge" />
		<title>${title}</title>
	</head>
	<body>
		<redoc spec-url="${api}" />
		<script src="${redoc}"></script>
	</body>
</html>
`
	);
const Api = output => promises.writeFile(output, JSON.stringify(api));
const Redoc = output =>
	promises.copyFile(join(dirname(fileURLToPath(import.meta.resolve('redoc'))), 'redoc.standalone.js'), output);

const out = join('..', '..', 'static', 'docs');
const apiFile = 'api.json';
const redocFile = 'redoc.js';

// Ensure output directory exists
if (!existsSync(out)) {
	await promises.mkdir(out, { recursive: true });
}

await Promise.all([
	Api(join(out, apiFile)),
	Redoc(join(out, redocFile)),
	Template(join(out, 'index.html'), {
		api: apiFile,
		title: api.info.title,
		redoc: redocFile,
	}),
]);
