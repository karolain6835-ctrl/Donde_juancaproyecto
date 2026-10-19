const fs = require('node:fs');
const path = require('node:path');
const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('expo/config-plugins');

const resourceName = 'dondejuanca_network_security';
function networkSecurityXml(localHttp) {
  return `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors><certificates src="system" /></trust-anchors>
  </base-config>${localHttp ? '\n  <domain-config cleartextTrafficPermitted="true">\n    <domain includeSubdomains="false">192.168.2.232</domain>\n  </domain-config>' : ''}
</network-security-config>
`;
}
function applyManifest(manifest) {
  const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  app.$['android:usesCleartextTraffic'] = 'false';
  app.$['android:networkSecurityConfig'] = `@xml/${resourceName}`;
  return manifest;
}
function withNetworkSecurity(config, { localHttp = false } = {}) {
  config = withAndroidManifest(config, mod => {
    mod.modResults = applyManifest(mod.modResults);
    return mod;
  });
  return withDangerousMod(config, ['android', async mod => {
    const directory = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/xml');
    await fs.promises.mkdir(directory, { recursive: true });
    await fs.promises.writeFile(path.join(directory, `${resourceName}.xml`), networkSecurityXml(localHttp));
    return mod;
  }]);
}
module.exports = withNetworkSecurity;
module.exports.networkSecurityXml = networkSecurityXml;
module.exports.applyManifest = applyManifest;
