#!/usr/bin/env sh

cd /mnt/evstore
echo ${EVPASSWD} |foxx run -u evuser -P -D evdb /evstore runTests \
"{\"files\": $EVTEST_FILES, \"reporter\": \"stream\"}" \
|./test/travis/parseResult.js
