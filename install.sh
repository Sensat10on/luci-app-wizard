#!/bin/sh
set -eu

BASE="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

install -d /www/luci-static/resources/view/quickstart
install -d /usr/share/luci/menu.d
install -d /usr/share/rpcd/acl.d
install -d /etc/config

install -m 0644 "$BASE/htdocs/luci-static/resources/view/quickstart/wizard.js" /www/luci-static/resources/view/quickstart/wizard.js
install -m 0644 "$BASE/htdocs/luci-static/resources/view/quickstart/wizard.css" /www/luci-static/resources/view/quickstart/wizard.css
install -m 0644 "$BASE/root/usr/share/luci/menu.d/luci-app-wizard.json" /usr/share/luci/menu.d/luci-app-wizard.json
install -m 0644 "$BASE/root/usr/share/rpcd/acl.d/luci-app-wizard.json" /usr/share/rpcd/acl.d/luci-app-wizard.json
# Remove obsolete registrations when upgrading from the original name.
rm -f /usr/share/luci/menu.d/luci-app-lucistart.json /usr/share/rpcd/acl.d/luci-app-lucistart.json

if [ ! -e /etc/config/lucistart ]; then
  install -m 0600 "$BASE/root/etc/config/lucistart" /etc/config/lucistart
fi

find /tmp -maxdepth 1 -type f -name 'luci-indexcache*' -exec rm -f '{}' ';'
rm -rf /tmp/luci-modulecache
/etc/init.d/rpcd restart
/etc/init.d/uhttpd restart

echo "Luci Start installed: /cgi-bin/luci/admin/lucistart"
