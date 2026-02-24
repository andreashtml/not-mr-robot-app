const express = require('express');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const app = express();
const postsDir = path.join(__dirname, 'posts');

if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function slugify(title) {
  return title
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\-\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/\-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getTitleFromMarkdown(md) {
  const lines = md.split(/\r?\n/);
  for (let line of lines) {
    const t = line.trim();
    if (t.startsWith('#')) return t.replace(/^#+\s*/, '');
  }
  return null;
}

app.get('/', (req, res) => {
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
  const posts = files.map(f => {
    const full = path.join(postsDir, f);
    const md = fs.readFileSync(full, 'utf8');
    const title = getTitleFromMarkdown(md) || f.replace(/\.md$/, '');
    const slug = f.replace(/\.md$/, '');
    const mtime = fs.statSync(full).mtimeMs;
    return { title, slug, mtime };
  }).sort((a,b)=> b.mtime - a.mtime);

  const listItems = posts.map(p => `<li><a href="/post/${p.slug}">${p.title}</a></li>`).join('\n');
  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Not Mr.Robot App — Posts</title>
  <link rel="stylesheet" href="/style.css">
  </head>
<body>
  <main class="container">
    <h1>Not Mr.Robot App</h1>
    <p><a href="/new" class="button">New Post</a></p>
    <ul>
      ${listItems}
    </ul>
  </main>
</body>
</html>`);
});

app.get('/post/:slug', (req, res) => {
  const slug = req.params.slug;
  const file = path.join(postsDir, slug + '.md');
  if (!fs.existsSync(file)) return res.status(404).send('Post not found');
  const md = fs.readFileSync(file, 'utf8');
  const html = marked(md);
  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${slug}</title>
  <link rel="stylesheet" href="/style.css">
  </head>
<body>
  <main class="container">
    <p><a href="/">← Back</a> • <a href="/new">New Post</a></p>
    <article class="post">${html}</article>
  </main>
</body>
</html>`);
});

app.get('/new', (req, res) => {
  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New Post</title>
  <link rel="stylesheet" href="/style.css">
  </head>
<body>
  <main class="container">
    <h1>New Post</h1>
    <form method="post" action="/new">
      <label>Title<br><input name="title" required></label>
      <label>Content (Markdown)<br><textarea name="content" rows="12" required></textarea></label>
      <p><button type="submit" class="button">Create</button> <a href="/">Cancel</a></p>
    </form>
  </main>
</body>
</html>`);
});

app.post('/new', (req, res) => {
  const title = (req.body.title || 'untitled').toString();
  let content = (req.body.content || '').toString();
  const slugBase = slugify(title) || 'post';
  let filename = slugBase + '.md';
  let filepath = path.join(postsDir, filename);
  if (fs.existsSync(filepath)) {
    const ts = Date.now();
    filename = `${slugBase}-${ts}.md`;
    filepath = path.join(postsDir, filename);
  }
  if (!/^#+\s+/m.test(content)) {
    content = `# ${title}\n\n` + content;
  }
  fs.writeFileSync(filepath, content, 'utf8');
  const slug = filename.replace(/\.md$/, '');
  res.redirect(`/post/${slug}`);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Not Mr.Robot App running on http://localhost:${port}`));
