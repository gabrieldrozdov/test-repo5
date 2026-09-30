// reads the content the cms writes and lays one page down in public, with the admin and uploads
// copied beside it. no dependencies, so there is nothing to install before building
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'public');

function readJson(file) {
	return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// every entry is its own file in the folder, the way a decap folder collection saves them
function readEntries() {
	let folder = path.join(ROOT, 'content', 'entries');
	return fs.readdirSync(folder)
		.filter(file => file.endsWith('.json'))
		.map(file => ({slug: file.replace(/\.json$/, ''), ...readJson(path.join(folder, file))}))
		.sort((a, b) => String(b.Date).localeCompare(String(a.Date)));
}

function escapeHtml(text) {
	return String(text == null ? '' : text)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

// just enough markdown for the test: paragraphs, links, notes typed inline, and the figure the
// custom button writes as a paragraph of its own
const FIGURE_PATTERN = /^\{\{\s*figure:\s*(.+?)\s*(?:\|\s*([\s\S]*?))?\s*\}\}$/;
function paragraphs(text) {
	return String(text || '').split(/\n{2,}/).filter(part => part.trim()).map(part => {
		let figure = part.trim().match(FIGURE_PATTERN);
		if (figure) {
			return `<figure><img src="${escapeHtml(figure[1])}" alt="" width="300"><figcaption>${escapeHtml(figure[2] || '')}</figcaption></figure>`;
		}
		let html = escapeHtml(part.trim())
			.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
			.replace(/\{\{\s*note:\s*(.*?)\s*\}\}/g, '<small>[note: $1]</small>')
			.replace(/\n/g, '<br>');
		return `<p>${html}</p>`;
	}).join('\n');
}

function entryHtml(entry) {
	let image = entry.Image ? `<img src="${escapeHtml(entry.Image)}" alt="" width="300">` : '';
	return `<article id="${escapeHtml(entry.slug)}">
<h3>${escapeHtml(entry.Title)}</h3>
<p><time>${escapeHtml(entry.Date)}</time></p>
${image}
${paragraphs(entry.Body)}
</article>`;
}

function pageHtml(about, entries) {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Turbo test</title>
</head>
<body>
<h1>Turbo test</h1>
<p><a href="/admin/">Open the CMS</a></p>

<h2>${escapeHtml(about.Title)}</h2>
${paragraphs(about.Body)}

<h2>Sign up</h2>
<!-- a plain form: it posts to worker.js, which saves the address and answers with a page of its own.
the hidden field is a trap only bots fill in -->
<form method="POST" action="/signup">
<p hidden><label>Leave this empty: <input name="company" tabindex="-1" autocomplete="off"></label></p>
<label>Email <input type="email" name="email" required autocomplete="email"></label>
<button type="submit">Sign up</button>
</form>

<h2>Entries</h2>
${entries.map(entryHtml).join('\n\n')}

<p><small>Built ${new Date().toISOString()}</small></p>
</body>
</html>
`;
}

// file by file rather than fs.cpSync, which some mounted and synced folders refuse
function copyFolder(from, to) {
	if (!fs.existsSync(from)) {
		return;
	}
	fs.mkdirSync(to, {recursive: true});
	for (let item of fs.readdirSync(from, {withFileTypes: true})) {
		let source = path.join(from, item.name);
		let target = path.join(to, item.name);
		if (item.isDirectory()) {
			copyFolder(source, target);
		} else {
			fs.copyFileSync(source, target);
		}
	}
}

// public is thrown away and made again each time, so nothing stale is left in it
fs.rmSync(OUT, {recursive: true, force: true});
fs.mkdirSync(OUT, {recursive: true});
let entries = readEntries();
fs.writeFileSync(path.join(OUT, 'index.html'), pageHtml(readJson(path.join(ROOT, 'content', 'about.json')), entries));
copyFolder(path.join(ROOT, 'admin'), path.join(OUT, 'admin'));
copyFolder(path.join(ROOT, 'uploads'), path.join(OUT, 'uploads'));
console.log(`${entries.length} entries built into public`);
