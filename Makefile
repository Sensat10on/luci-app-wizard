include $(TOPDIR)/rules.mk

LUCI_TITLE:=Luci Start guided setup wizard
LUCI_DEPENDS:=+luci-base +rpcd
LUCI_PKGARCH:=all

PKG_MAINTAINER:=Codex
PKG_LICENSE:=MIT

include ../../luci.mk

