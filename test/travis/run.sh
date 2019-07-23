#!/usr/bin/env sh

cd /mnt/evstore
echo "evpasswd" |foxx run -u evuser -P -D evdb /evstore runTests \
"{\"files\": $EVTEST_FILES, \"reporter\": \"suite\"}" \
|./test/travis/parseResult.js
