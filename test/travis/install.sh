#!/usr/bin/env ash

cd /mnt/evstore
echo ${EVPASSWD} |foxx install -u evuser -P -D evdb /evstore
