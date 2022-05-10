const request = require('@chen-cli-dev/request');

module.exports = function() {
  return request({
    url: '/project',
  });
};