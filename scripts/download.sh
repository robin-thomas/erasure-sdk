#!/usr/bin/env bash

VERSION="v1.0.0"
FAILBACK_VERSION="v1.0.0"
ARTIFACT_DIR="artifacts"

download_contracts() {
  [ -d "${ARTIFACT_DIR}" ] || mkdir "${ARTIFACT_DIR}"

  declare -a contracts=(
    'CountdownGriefing'
    'CountdownGriefing_Factory'
    'Erasure_Agreements'
    'Erasure_Posts'
    'Erasure_Users'
    'Feed'
    'Feed_Factory'
    'MockNMR'
    'OneWayGriefing'
    'OneWayGriefing_Factory'
    'Post'
    'Post_Factory'
    'SimpleGriefing'
    'SimpleGriefing_Factory'
  )

  # download all the erasure contracts.
  for file in "${contracts[@]}"; do
    [ -f "${ARTIFACT_DIR}/${file}.json" ] && continue

    github_url="https://github.com/erasureprotocol/erasure-protocol/releases/download/${VERSION}/${file}.json"
    wget -q --show-progress -O "${ARTIFACT_DIR}/${file}.json" "${github_url}"
    if [ $? -ne 0 ]; then
      github_url="https://github.com/erasureprotocol/erasure-protocol/releases/download/${FAILBACK_VERSION}/${file}.json"
      wget -q --show-progress -O "${ARTIFACT_DIR}/${file}.json" "${github_url}"
    fi
  done

  # download INMR contract artifact.
  github_url="https://raw.githubusercontent.com/numerai/contract/066f643afdfb8d591d568d55baed9d48577af316/build/INMR.json"
  [ -f "${ARTIFACT_DIR}/NMR.json" ] || wget -q --show-progress -O "${ARTIFACT_DIR}/NMR.json" "${github_url}"
}

case $1 in
  "contracts") download_contracts;;
esac
