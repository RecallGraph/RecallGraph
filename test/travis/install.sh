#!/usr/bin/env sh

cd /mnt/evstore
echo "evpasswd" |foxx install -u evuser -P -D evdb /evstore
