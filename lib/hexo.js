'use strict';

const Hexo = require('hexo');

class DocHexo extends Hexo {
  constructor(base, pluginDir, args) {
    super(base, args);
    this.plugin_dir = pluginDir;
  }
}

module.exports = DocHexo;
