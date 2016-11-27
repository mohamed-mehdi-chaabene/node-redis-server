'use strict';

/**
 * Represents configuration options for `RedisServer`.
 * @typedef {Object} Config
 * @property {(Number|String)} [port=6379]
 * @property {String} [bin='redis-server']
 * @property {String} [conf=null]
 */

/**
 * A function invoked when an operation (i.e. `open()`) completes.
 * @typedef {Function} RedisServer~callback
 */

const childprocess = require('child_process');
const events = require('events');
const keyRE = /(port:\s+\d+)|(pid:\s+\d+)|(already\s+in\s+use)|(not\s+listen)|error|denied/ig;
const strRE = / /ig;

/**
 * Start and stop a Redis server like a boss.
 * @class
 */
module.exports = class RedisServer extends events.EventEmitter {
  /**
   * Construct a new `RedisServer`.
   * @argument {(Number|Config)} [configOrPort]
   */
  constructor(configOrPort) {
    super();
    /**
     * Configuration options.
     * @private
     * @type {Config}
     */
    this.config = {
      bin: 'redis-server',
      conf: null,
      port: 6379,
      slaveof: null,
    };

    /**
     * The current process ID.
     * @private
     * @type {Number}
     */
    this.pid = null;

    /**
     * The port the Redis server is currently bound to.
     * @private
     * @type {Number}
     */
    this.port = null;

    /**
     * The current process.
     * @private
     * @type {Object}
     */
    this.process = null;

    /**
     * Determine if the instance is closing a Redis server; true while a process
     * is being killed until the contained Redis server closes.
     * @type {Boolean}
     */
    this.isClosing = false;

    /**
     * Determine if the instance is starting a Redis server; true while a
     * process is spawning until a Redis server starts or errs.
     * @type {Boolean}
     */
    this.isRunning = false;

    /**
     * Determine if the instance is running a Redis server; true once a process
     * has spawned and the contained Redis server is ready to service requests.
     * @type {Boolean}
     */
    this.isOpening = false;

    if (configOrPort == null) {
      return;
    }

    if (typeof configOrPort === 'number') {
      this.config.port = configOrPort;

      return;
    }

    if (typeof configOrPort !== 'object') {
      return;
    }

    if (configOrPort.conf != null) {
      this.config.conf = configOrPort.conf;

      return;
    }

    if (configOrPort.slaveof != null) {
      this.config.slaveof = configOrPort.slaveof;
    }

    if (configOrPort.port != null) {
      this.config.port = configOrPort.port;
    }

    if (configOrPort.bin != null) {
      this.config.bin = configOrPort.bin;
    }
  }

  /**
   * Start a redis server.
   * @argument {RedisServer~callback}
   * @return {Promise|Boolean}
   */
  open(callback) {
    const canInvokeCallback = typeof callback === 'function';

    if (this.isOpening || this.process !== null) {
      if (!canInvokeCallback) {
        return Promise.resolve(false);
      }

      callback(null);

      return false;
    }

    const promise = new Promise((resolve, reject) => {
      const flags = [];

      if (this.config.conf === null) {
        flags.push('--port', this.config.port);

        if (this.config.slaveof !== null) {
          flags.push('--slaveof', this.config.slaveof);
        }
      }
      else {
        flags.push(this.config.conf);
      }

      this.process = childprocess.spawn(this.config.bin, flags);
      this.isOpening = true;

      const matchHandler = (value) => {
        const t = value.split(':');
        const k = t[0].replace(strRE, '').toLowerCase();
        const v = t[1];
        let err = null;

        switch (k) {
          case 'alreadyinuse':
            err = new Error('Address already in use');
            err.code = -1;

            break;

          case 'denied':
            err = new Error('Permission denied');
            err.code = -2;

            break;

          case 'error':
          case 'notlisten':
            err = new Error('Invalid port number');
            err.code = -3;

            break;

          case 'pid':
          case 'port':
            this[k] = Number(v);

            if (!(this.port === null || this.pid === null)) {
              this.isRunning = true;

              this.emit('open');

              break;
            }

            return false;

          default:
            return false;
        }

        this.isOpening = false;

        if (canInvokeCallback) {
          callback(err);
        }

        if (err === null) {
          resolve(true);
        }
        else {
          reject(err);
        }

        return true;
      };

      const dataHandler = (value) => {
        const matches = value.toString().match(keyRE);

        if (matches !== null) {
          for (let match of matches) {
            if (matchHandler(match)) {
              this.process.stdout.removeListener('data', dataHandler);

              return;
            }
          }
        }
      };

      this.process.stdout.on('data', dataHandler);
      this.process.on('close', () => {
        this.process = null;
        this.port = null;
        this.pid = null;
        this.isRunning = false;
        this.isClosing = false;

        this.emit('close');
      });
      this.process.stdout.on('data', (data) => {
        this.emit('stdout', data.toString());
      });
      process.on('exit', () => {
        this.close();
      });
    });

    return canInvokeCallback ? true : promise;
  }

  /**
   * Stop a redis server.
   * @argument {RedisServer~callback}
   * @return {Promise|Boolean}
   */
  close(callback) {
    const canInvokeCallback = typeof callback === 'function';

    if (this.isClosing || this.process === null) {
      if (!canInvokeCallback) {
        return Promise.resolve(false);
      }

      callback(null);

      return false;
    }

    const promise = new Promise((resolve) => {
      this.isClosing = true;

      this.process.on('close', () => {
        if (canInvokeCallback) {
          callback(null);
        }
        else {
          resolve(true);
        }
      });

      this.process.kill();
    });

    return canInvokeCallback ? true : promise;
  }
};
