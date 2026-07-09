const routes = require('./routes/publication.routes');
const controller = require('./controller/publication.controller');
const service = require('./service/publication.service');
const repository = require('./repository/publication.repository');

module.exports = {
  routes,
  controller,
  service,
  repository
};
