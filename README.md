# redis-server

[![NPM version](https://badge.fury.io/js/redis-server.svg)](http://badge.fury.io/js/redis-server)
[![Build Status](https://travis-ci.org/BrandonZacharie/node-redis-server.svg?branch=master)](https://travis-ci.org/BrandonZacharie/node-redis-server)
[![Coverage Status](https://coveralls.io/repos/github/BrandonZacharie/node-redis-server/badge.svg?branch=master)](https://coveralls.io/github/BrandonZacharie/node-redis-server?branch=master)

Start and stop a local Redis server in Node.js like a boss.

## Installation

```npm install redis-server```

## Usage

The constructor exported by this module optionally accepts a single argument;
a number or string that is a port or an object for configuration.

### Basic Example

```JavaScript

const RedisServer = require('redis-server');

// Simply pass the port that you want a Redis server to listen on.
const server = new RedisServer(6379);

server.open((err) => {
  if (err === null) {
    // You may now connect a client to the Redis
    // server bound to `server.port` (e.g. 6379).
  }
});

```

### Configuration

| Property | Type   | Default      | Description
|:---------|:-------|:-------------|:-----------
| bin      | String | redis-server | A path to a Redis server binary.
| conf     | String |              | A path to a Redis server configuration file.
| port     | Number | 6379         | A port to bind a server to.
| slaveof  | String |              | An address of a server to sync with.

A Redis server binary must be available. If you do not have one in $PATH,
provide a path in configuration.

```JavaScript

const server = new RedisServer({
  port: 6379,
  bin: '/opt/local/bin/redis-server'
});

```

You may use a Redis configuration file instead of configuration object
properties that are flags (i.e. `port` and `slaveof`). If `conf` is
provided, no flags will be passed to the binary.

```JavaScript

const server = new RedisServer({
  conf: '/path/to/redis.conf'
});

```

### Methods

For methods that accept `callback`, `callback` will receive an `Error`
as the first argument if a problem is detected; `null`, if not.

#### RedisServer#open()

Attempt to open a Redis server. Returns a `Promise`.

##### Promise style `open()`

``` JavaScript

server.open().then(() => {
  // You may now connect a client to the Redis server bound to `server.port`.
});

```

##### Callback style `open()`

``` JavaScript

server.open((err) => {
  if (err === null) {
    // You may now connect a client to the Redis server bound to `server.port`.
  }
});

```

#### RedisServer#close()

Close the associated Redis server. Returns a `Promise`. NOTE: Disconnect
clients prior to calling this method to avoid receiving connection
errors from clients.

##### Promise style `close()`

``` JavaScript

server.close().then(() => {
  // The associated Redis server is now closed.
});

```

##### Callback style `close()`

``` JavaScript

server.close((err) => {
  // The associated Redis server is now closed.
});

```

### Properties

#### RedisServer#isOpening

Determine if the instance is starting a Redis server; `true` while a
process is spawning until a Redis server starts or errs.

#### RedisServer#isRunning

Determine if the instance is running a Redis server; `true` once a process
has spawned and the contained Redis server is ready to service requests.

#### RedisServer#isClosing

Determine if the instance is closing a Redis server; `true` while a
process is being killed until the contained Redis server closes.

### Events

#### stdout

Emitted when a Redis server prints to stdout.

#### open

Emitted when a Redis server becomes ready to service requests.

#### close

Emitted when a Redis server closes.
