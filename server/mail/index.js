import fs from 'node:fs';
import path from 'node:path';

import nodemailer from 'nodemailer';

import env from '../env.js';
import { __dirname, CustomError } from '../utils/index.js';
import { changeEmailText, resetMailText, verifyMailText } from './text.js';

const mailConfig = {
	host: env.MAIL_HOST,
	port: env.MAIL_PORT,
	secure: env.MAIL_SECURE,
	auth: env.MAIL_USER
		? {
				user: env.MAIL_USER,
				pass: env.MAIL_PASSWORD,
		  }
		: undefined,
};

const transporter = nodemailer.createTransport(mailConfig);

// Read email templates
const resetEmailTemplatePath = path.join(__dirname(import.meta.url), 'template-reset.html');
const verifyEmailTemplatePath = path.join(__dirname(import.meta.url), 'template-verify.html');
const changeEmailTemplatePath = path.join(__dirname(import.meta.url), 'template-change-email.html');

let resetEmailTemplate, verifyEmailTemplate, changeEmailTemplate;

// only read email templates if email is enabled
if (env.MAIL_ENABLED) {
	resetEmailTemplate = fs
		.readFileSync(resetEmailTemplatePath, { encoding: 'utf-8' })
		.replace(/{{domain}}/gm, env.DEFAULT_DOMAIN)
		.replace(/{{site_name}}/gm, env.SITE_NAME);
	verifyEmailTemplate = fs
		.readFileSync(verifyEmailTemplatePath, { encoding: 'utf-8' })
		.replace(/{{domain}}/gm, env.DEFAULT_DOMAIN)
		.replace(/{{site_name}}/gm, env.SITE_NAME);
	changeEmailTemplate = fs
		.readFileSync(changeEmailTemplatePath, { encoding: 'utf-8' })
		.replace(/{{domain}}/gm, env.DEFAULT_DOMAIN)
		.replace(/{{site_name}}/gm, env.SITE_NAME);
}

export async function verification(user) {
	if (!env.MAIL_ENABLED) {
		throw new Error('Attempting to send verification email but email is not enabled.');
	}

	const mail = await transporter.sendMail({
		from: env.MAIL_FROM || env.MAIL_USER,
		to: user.email,
		subject: 'Verify your account',
		text: verifyMailText
			.replace(/{{verification}}/gim, user.verification_token)
			.replace(/{{domain}}/gm, env.DEFAULT_DOMAIN)
			.replace(/{{site_name}}/gm, env.SITE_NAME),
		html: verifyEmailTemplate
			.replace(/{{verification}}/gim, user.verification_token)
			.replace(/{{domain}}/gm, env.DEFAULT_DOMAIN)
			.replace(/{{site_name}}/gm, env.SITE_NAME),
	});

	if (!mail.accepted.length) {
		throw new CustomError("Couldn't send verification email. Try again later.");
	}
}

export async function changeEmail(user) {
	if (!env.MAIL_ENABLED) {
		throw new Error('Attempting to send change email token but email is not enabled.');
	}

	const mail = await transporter.sendMail({
		from: env.MAIL_FROM || env.MAIL_USER,
		to: user.change_email_address,
		subject: 'Verify your new email address',
		text: changeEmailText
			.replace(/{{verification}}/gim, user.change_email_token)
			.replace(/{{domain}}/gm, env.DEFAULT_DOMAIN)
			.replace(/{{site_name}}/gm, env.SITE_NAME),
		html: changeEmailTemplate
			.replace(/{{verification}}/gim, user.change_email_token)
			.replace(/{{domain}}/gm, env.DEFAULT_DOMAIN)
			.replace(/{{site_name}}/gm, env.SITE_NAME),
	});

	if (!mail.accepted.length) {
		throw new CustomError("Couldn't send verification email. Try again later.");
	}
}

export async function resetPasswordToken(user) {
	if (!env.MAIL_ENABLED) {
		throw new Error('Attempting to send reset password email but email is not enabled.');
	}

	const mail = await transporter.sendMail({
		from: env.MAIL_FROM || env.MAIL_USER,
		to: user.email,
		subject: 'Reset your password',
		text: resetMailText.replace(/{{resetpassword}}/gm, user.reset_password_token).replace(/{{domain}}/gm, env.DEFAULT_DOMAIN),
		html: resetEmailTemplate.replace(/{{resetpassword}}/gm, user.reset_password_token).replace(/{{domain}}/gm, env.DEFAULT_DOMAIN),
	});

	if (!mail.accepted.length) {
		throw new CustomError("Couldn't send reset password email. Try again later.");
	}
}

export async function sendReportEmail(link) {
	if (!env.MAIL_ENABLED) {
		throw new Error('Attempting to send report email but email is not enabled.');
	}

	const mail = await transporter.sendMail({
		from: env.MAIL_FROM || env.MAIL_USER,
		to: env.REPORT_EMAIL,
		subject: '[REPORT] Abuse or Spam Report for ' + env.DEFAULT_DOMAIN,
		text: `A user has submitted a report. You can view it at ${link}`,
		html: `<p>A user has submitted a report. You can view it <a href="${link}">${link}</a>.</p>`,
	});

	if (!mail.accepted.length) {
		throw new CustomError("Couldn't submit the report. Try again later.");
	}
}

export default {
	changeEmail,
	verification,
	resetPasswordToken,
	sendReportEmail,
};
