const { createApp } = require('./app');
const { config } = require('./config');

const app = createApp();

app.listen(config.port, '127.0.0.1', () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on :${config.port} (${config.nodeEnv})`);
});
