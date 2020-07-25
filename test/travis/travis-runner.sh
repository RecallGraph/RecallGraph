#!/usr/bin/env bash

# send the long living command to background
docker exec arangodb /mnt/evstore/test/travis/run.sh &

# Constants
pid=$!
RED='\033[0;31m'
minutes=0
limit=120

while kill -0 ${pid} >/dev/null 2>&1; do
  echo -n -e " \b" # never leave evidences!

  if [[ ${minutes} == ${limit} ]]; then
    echo -e "\n"
    echo -e "${RED}Test has reached a ${minutes} minutes timeout limit"
    exit 1
  fi

  minutes=$((minutes+1))

  sleep 60
done

exit $(wait ${pid})