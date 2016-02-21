var path = require('path');
var fs = require('fs');
var uf = require('util').format;
var config = require('./settings');

var ServicesCollector = {
  directory: '',
  buildFile: function(prefix, services) {
    var content = "var join = require('path').join;\n";
    services.forEach(function(f) {
      content += uf("require(join(__dirname, '%s', '%s', 'service.js'));\n", config.servicePath, f);
    });
    this.writeToFile(prefix, content);
  },
  writeToFile: function(prefix, content) {
    fs.writeFileSync(path.join(config.publicDir, uf('%s.services.js', prefix)), content);
  }
};

module.exports = ServicesCollector;
