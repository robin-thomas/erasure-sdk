#!/usr/bin/env bash

VERSION="v1.3.0"
ARTIFACT_DIR="artifacts"
FALLBACK_VERSION="v1.2.0"

download_contracts() {
  [ -d "${ARTIFACT_DIR}" ] || mkdir "${ARTIFACT_DIR}"

  declare -a contracts=(
    'CountdownGriefing'
    'CountdownGriefingEscrow'
    'CountdownGriefingEscrow_Factory'
    'CountdownGriefing_Factory'
    'Erasure_Agreements'
    'Erasure_Escrows'
    'Erasure_Posts'
    'Erasure_Users'
    'Feed'
    'Feed_Factory'
    'MockNMR'
    'SimpleGriefing'
    'SimpleGriefing_Factory'
  )

  # download all the erasure contracts.
  for file in "${contracts[@]}"; do
    [ -f "${ARTIFACT_DIR}/${file}.json" ] && continue

    github_url="https://github.com/erasureprotocol/erasure-protocol/releases/download/${VERSION}/${file}.json"
    wget -q --show-progress -O "${ARTIFACT_DIR}/${file}.json" "${github_url}"
  done

  # download INMR contract artifact.
  github_url="https://raw.githubusercontent.com/numerai/contract/066f643afdfb8d591d568d55baed9d48577af316/build/INMR.json"
  [ -f "${ARTIFACT_DIR}/NMR.json" ] || wget -q --show-progress -O "${ARTIFACT_DIR}/NMR.json" "${github_url}"
}

case $1 in
  "contracts") download_contracts;;
esac
