Package.describe({
  name: 'omega:time-sync',
  version: '0.1.3',
  summary: 'NTP style automatic server-client time synchronization',
  git: 'https://github.com/wojtkowiak/meteor-time-sync',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.4');
  api.use('ecmascript');
  api.use('omega:custom-protocol@=4.0.2');
  api.addFiles('TimeSync.protocol.js');
  api.addFiles('TimeSync.protocol');
  api.addFiles('TimeSync.client.js', 'client');
  api.addFiles('TimeSync.server.js', 'server');
  api.export('TimeSync');

});

Package.onTest(function(api) {
});
