#!/usr/bin/env bash

VERSION="v1.1.0"
ARTIFACT_DIR="artifacts"

download_contracts() {
  [ -d "${ARTIFACT_DIR}" ] || mkdir "${ARTIFACT_DIR}"

  version=$1

  declare -a contracts=(
    'CountdownGriefing'
    'CountdownGriefing_Factory'
    'Erasure_Agreements'
    'Erasure_Posts'
    'Erasure_Users'
    'Feed'
    'Feed_Factory'
    'MockNMR'
    'Post'
    'Post_Factory'
    'SimpleGriefing'
    'SimpleGriefing_Factory'
  )

  # download all the erasure contracts.
  for key in "${contracts[@]}"; do
    github_url="https://github.com/erasureprotocol/erasure-protocol/releases/download/${version}/${key}.json"
    [ -f "${ARTIFACT_DIR}/${key}.json" ] || wget -q -O "${ARTIFACT_DIR}/${key}.json" "${github_url}"
  done

  # download INMR contract artifact.
  github_url="https://raw.githubusercontent.com/numerai/contract/066f643afdfb8d591d568d55baed9d48577af316/build/INMR.json"
  [ -f "${ARTIFACT_DIR}/NMR.json" ] || wget -q -O "${ARTIFACT_DIR}/NMR.json" "${github_url}"

  # download OneWayGriefing_Factory contract artifact
  if [ "$VERSION" != "v1.0.0" ]; then
    github_url="https://github.com/erasureprotocol/erasure-protocol/releases/download/v1.0.0/OneWayGriefing_Factory.json"
    [ -f "${ARTIFACT_DIR}/OneWayGriefing_Factory.json" ] || wget -q -O "${ARTIFACT_DIR}/OneWayGriefing_Factory.json" "${github_url}"
  fi
}

case $1 in
  "contracts") download_contracts $VERSION;;
esac
