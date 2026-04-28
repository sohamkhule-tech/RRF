/* eslint-disable @typescript-eslint/no-var-requires */
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');

/**
 * High-Compatibility Webpack Config for NestJS 10
 * - Explicitly imports webpack to avoid 'tap' errors
 * - Uses defensive checks for existence of options and plugins
 * - Polling enabled (1000ms)
 */
module.exports = function (options) {
  // If Nest didn't provide options, return empty object (safest fallback)
  if (!options) return {};

  // Clone options if it's an object, otherwise use as-is
  const config = typeof options === 'object' ? { ...options } : options;

  // Ensure arrays exist
  if (!config.plugins) config.plugins = [];
  if (!config.externals) config.externals = [];

  // 1. Filter out bcrypt optional dependencies
  config.plugins.push(
    new webpack.IgnorePlugin({
      resourceRegExp: /^mock-aws-s3$|^aws-sdk$|^nock$/,
    })
  );

  // 2. Keep node_modules external
  config.externals.push(
    nodeExternals({
      allowlist: [/^(?!nest)/],
    })
  );

  // 3. Force Polling for Docker/Windows
  config.watchOptions = {
    poll: 1000,
    aggregateTimeout: 300,
    ignored: /node_modules/,
  };

  return config;
};
