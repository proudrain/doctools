'use strict';

const os = require('os');
const path = require('path');
const fs = require('mz/fs');
const { existsSync } = require('fs');
const mkdirp = require('mz-modules/mkdirp');
const runscript = require('runscript');
const debug = require('debug')('jsdoc');
const getLoadUnits = require('egg-utils').getLoadUnits;

const PATH = process.env.PATH;
const tmp = path.join(os.tmpdir(), 'jsdoc');

module.exports = function* ({ baseDir, target }) {
  const config = yield getConfig({ baseDir });
  yield runscript(`jsdoc -c ${config} -d ${target} -r`, {
    env: {
      PATH: `${path.join(__dirname, '../node_modules/.bin')}:${PATH}`,
    },
  });
};

class Source extends Set {
  constructor({ baseDir }) {
    super();

    this.baseDir = baseDir;
    const loadUnits = getLoadUnits({ framework: baseDir });

    for (const unit of loadUnits) {
      // 剔除 loadUnit lib 目录下的 plugin，防止其加载两次
      if (unit.type === 'plugin' &&
        loadUnits.some(u => unit.path.startsWith(u.path))) {
        continue;
      }
      this.add(path.join(unit.path, 'app'));
      this.add(path.join(unit.path, 'config'));
      this.add(path.join(unit.path, 'app.js'));
      this.add(path.join(unit.path, 'agent.js'));
      // 加载插件外 loadUnit 下的 lib 目录
      unit.type !== 'plugin' && this.add(path.join(unit.path, 'lib'));
      try {
        const entry = require.resolve(unit.path);
        this.add(entry);
      } catch (_) {
        // nothing
      }
    }

    this.add(path.join(this.baseDir, 'node_modules/egg-core/index.js'));
    this.add(path.join(this.baseDir, 'node_modules/egg-core/lib'));

    // this.add(path.join(this.baseDir, 'node_modules/egg-logger/index.js'));
    // this.add(path.join(this.baseDir, 'node_modules/egg-logger/lib'));
  }

  add(file) {
    if (existsSync(file)) {
      debug('add %s', file);
      super.add(file);
    }
  }
}

function* getConfig({ baseDir }) {
  yield mkdirp(tmp);

  const configPath = path.join(tmp, 'jsdoc.json');
  const packagePath = path.join(tmp, 'package.json');
  yield fs.writeFile(packagePath, '{"name": "jsdoc"}');

  const source = new Source({ baseDir });
  const config = {
    plugins: [ 'plugins/markdown' ],
    markdown: {
      tags: [ '@example' ],
    },
    source: {
      include: [ ...source ],
      // excludePattern: 'node_modules',
    },
    opts: {
      recurse: true,
      template: path.join(__dirname, 'jsdoc_template'),
    },
    templates: {
      default: {
        outputSourceFiles: true,
      },
    },
  };
  yield fs.writeFile(configPath, JSON.stringify(config));
  return configPath;
}
