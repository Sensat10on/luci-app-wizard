#!/usr/bin/env bash
set -euo pipefail

SDK_URL="${SDK_URL:-https://downloads.openwrt.org/releases/25.12.0/targets/ramips/mt7621/openwrt-sdk-25.12.0-ramips-mt7621_gcc-14.3.0_musl.Linux-x86_64.tar.zst}"
SDK_DIR="${SDK_DIR:-openwrt-sdk-25.12.0-ramips-mt7621_gcc-14.3.0_musl.Linux-x86_64}"
VERSION="${VERSION:-0.1.0-r1}"
ARCH="${ARCH:-mipsel_24kc}"
OUT_DIR="${OUT_DIR:-dist}"
ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

if [ ! -x "$SDK_DIR/staging_dir/host/bin/apk" ]; then
  curl -fsSL "$SDK_URL" | tar --use-compress-program=unzstd -x
fi

PKG_ROOT="$(mktemp -d)"
trap 'rm -rf "$PKG_ROOT"' EXIT
mkdir -p "$PKG_ROOT/www" "$PKG_ROOT/etc/config" \
  "$PKG_ROOT/usr/share/luci/menu.d" "$PKG_ROOT/usr/share/rpcd/acl.d" "$OUT_DIR"
cp -a "$ROOT_DIR/htdocs/luci-static" "$PKG_ROOT/www/"
cp "$ROOT_DIR/root/etc/config/lucistart" "$PKG_ROOT/etc/config/"
cp "$ROOT_DIR/root/usr/share/luci/menu.d/luci-app-wizard.json" "$PKG_ROOT/usr/share/luci/menu.d/"
cp "$ROOT_DIR/root/usr/share/rpcd/acl.d/luci-app-wizard.json" "$PKG_ROOT/usr/share/rpcd/acl.d/"

"$SDK_DIR/staging_dir/host/bin/apk" mkpkg \
  --info "name:luci-app-wizard" \
  --info "version:$VERSION" \
  --info "description:Quick setup wizard for LuCI" \
  --info "arch:$ARCH" \
  --info "license:MIT" \
  --info "origin:luci-app-wizard" \
  --info "url:https://github.com/Sensat10on/luci-app-wizard" \
  --info "maintainer:Sensat10on" \
  --info "depends:luci-base" \
  --files "$PKG_ROOT" \
  --output "$OUT_DIR/luci-app-wizard_${VERSION}_${ARCH}.apk"

"$SDK_DIR/staging_dir/host/bin/apk" mkndx \
  --allow-untrusted \
  --output "$OUT_DIR/APKINDEX.tar.gz" \
  "$OUT_DIR/luci-app-wizard_${VERSION}_${ARCH}.apk"
