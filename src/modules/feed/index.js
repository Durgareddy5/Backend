const routes = require('./routes/feed.routes');
const controller = require('./controller/feed.controller');
const service = require('./service/feed.service');
const repository = require('./repository/feed.repository');

module.exports = {
  routes,
  controller,
  service,
  repository
};
