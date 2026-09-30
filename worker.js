// every page and upload is a file in public and never reaches this. the one thing that does is the
// signup form, which posts to /signup. the address is saved in the signups database, and if a
// resend key has been set up, a notification is emailed to you as well
const TABLE = 'CREATE TABLE IF NOT EXISTS signups (email TEXT, created TEXT)';

export default {
	async fetch(request, env, ctx) {
		let url = new URL(request.url);
		if (url.pathname != '/signup' || request.method != 'POST') {
			return new Response('Not found', {status: 404});
		}

		let form = await request.formData();
		// the honeypot: a person never sees the company field, so anything in it came from a bot. it is
		// told everything went fine, so it has no reason to try again
		if (form.get('company')) {
			return page('Thanks for signing up!');
		}
		let email = String(form.get('email') || '').trim();
		if (!email.includes('@') || email.length > 320) {
			return page('That doesn’t look like an email address.', 400);
		}

		// the table is made the first time anyone signs up, so there is nothing to set up by hand
		let created = new Date().toISOString();
		await env.SIGNUPS.prepare(TABLE).run();
		await env.SIGNUPS.prepare('INSERT INTO signups (email, created) VALUES (?, ?)').bind(email, created).run();

		// the email goes out after the reply, so the visitor never waits on it, and a failed email never
		// loses a signup that has already been saved
		if (env.RESEND_API_KEY && env.NOTIFY_TO) {
			ctx.waitUntil(notify(env, email, created));
		} else {
			console.log('notification skipped:', env.RESEND_API_KEY ? 'no NOTIFY_TO' : 'no RESEND_API_KEY secret on this worker');
		}

		return page('Thanks for signing up!');
	}
};

// resend's shared address can send without a domain of your own, but only to the email address
// the resend account was made with, which is all a notification to yourself needs
async function notify(env, email, created) {
	let response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${env.RESEND_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: env.NOTIFY_FROM || 'Signups <onboarding@resend.dev>',
			to: [env.NOTIFY_TO],
			subject: `New signup: ${email}`,
			text: `${email} signed up on ${created}.`
		})
	});
	if (!response.ok) {
		console.log('notification failed', response.status, await response.text());
	} else {
		console.log('notification sent to', env.NOTIFY_TO);
	}
}

// a bare page to land on after sending the form, with a way back
function page(message, status = 200) {
	let html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Signup</title></head>
<body>
<p>${message}</p>
<p><a href="/">Back to the site</a></p>
</body>
</html>`;
	return new Response(html, {status, headers: {'Content-Type': 'text/html; charset=utf-8'}});
}
