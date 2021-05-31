#!/usr/bin/env sh

cd /mnt/evstore
echo "evpasswd" | foxx run -u evuser -P -D evdb /evstore runTests \
  "{\"files\": ${FILES//"/\\"/}, \"reporter\": \"suite\", \"grep\": \"$GREP\"}" |
  node ./test/actions/parseResult.js
