const testDOM = process.env.NODE_ENV === 'test-dom';
const setBrowsers = require('webpack-component/helpers/setBrowsers.js');

module.exports = function(config) {
  config.set({
    files: testDOM ?
      [
        {pattern: 'src/components/**/test-dom.js', watched:true,served:true,included:true},
        {pattern: 'dist/assets/**/*.*', watched:false, served:true, included:false}
      ]:
      [{pattern: 'src/components/**/test.js', watched:true,served:true,included:true}],
    proxies: {
      '/assets/': '/base/dist/assets/'
    },
						
    autoWatch: true,
    singleRun:false,
    failOnEmptyTestSuite:false,
    logLevel: config.LOG_WARN,       
    frameworks: ['jasmine'],
    browsers: setBrowsers,
    reporters: testDOM ? ['mocha','karmaHTML']:['mocha','kjhtml'],

    listenAddress: '0.0.0.0',
    hostname: 'localhost',
    port: 9876,
    retryLimit:0,
    browserDisconnectTimeout: 5000,
    browserNoActivityTimeout: 10000,
    captureTimeout: 60000,
  
    client: {
      captureConsole:false,
      clearContext:false,
      runInParent: false,
      useIframe:true,
      karmaHTML: {
        source: [{src:'dist/index.html', tag:'index'}],
        auto:false
      }
    },

    webpack: require('./webpack.config'),
    preprocessors: {
      'src/components/**/test.js': ['webpack'],
      'src/components/**/test-dom.js': ['webpack']
    },
    webpackMiddleware: {
      noInfo: true,
      stats: 'errors-only'
    },
    mochaReporter: {
      output: 'full'  //full, autowatch, minimal 
    }
  });
};