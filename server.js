const { createServer } = require('http');
const { parseUrl } = require('next/dist/shared/lib/router/utils/parse-url');
const next = require('next');
const { initSocketIO } = require('./lib/socket/server');

const dev = process.env.NODE_ENV !== 'production';
const quiet = process.env.QUIET_LOGS === '1' || !dev;
const hostname = process.env.HOST || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parseUrl(req.url || '/');
      await handle(req, res, parsedUrl);
    } catch (err) {
      if (!quiet) console.error(err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  initSocketIO(server);

  server.listen(port, hostname, () => {
    if (!quiet) {
      console.log(`> Pokoje Czatu ready on http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}`);
    }
  });
});
