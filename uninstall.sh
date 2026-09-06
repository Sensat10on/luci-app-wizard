#!/bin/sh
set -eu

rm -f /www/luci-static/resources/view/quickstart/wizard.js
rm -f /www/luci-static/resources/view/quickstart/wizard.css
rm -f /usr/share/luci/menu.d/luci-app-wizard.json
rm -f /usr/share/rpcd/acl.d/luci-app-wizard.json
find /tmp -maxdepth 1 -type f -name 'luci-indexcache*' -exec rm -f '{}' ';'
rm -rf /tmp/luci-modulecache
/etc/init.d/rpcd restart
/etc/init.d/uhttpd restart

echo "Luci Start removed. /etc/config/lucistart was preserved."
