#!/usr/bin/env bash
set -euo pipefail

retry_npm_view_versions() {
  local name="$1"
  local attempts=3
  local delay=2
  local output=""

  for attempt in $(seq 1 "$attempts"); do
    if output=$(npm view "$name" versions --json 2>/dev/null); then
      printf "%s" "$output"
      return 0
    fi
    sleep "$delay"
  done

  return 1
}

version_exists() {
  local version="$1"
  node -e "const fs=require('fs'); const v=process.argv[1]; const data=JSON.parse(fs.readFileSync(0,'utf8')); const list=Array.isArray(data)?data:[data]; process.exit(list.includes(v)?0:1);" "$version"
}

publish_package() {
  local name="$1"
  local dir="$2"

  echo "---"
  echo "Publishing $name from $dir"

  pushd "$dir" >/dev/null
  local version
  version=$(node -p "require('./package.json').version")
  echo "Version: $version"

  local versions
  if ! versions=$(retry_npm_view_versions "$name"); then
    echo "Failed to query versions for $name. Aborting publish step."
    popd >/dev/null
    return 1
  fi

  if version_exists "$version" <<<"$versions"; then
    echo "$name@$version already published. Skipping."
    popd >/dev/null
    return 0
  fi

  set +e
  local publish_output
  publish_output=$(npm publish --provenance --access public 2>&1)
  local status=$?
  set -e

  if [ "$status" -ne 0 ]; then
    if echo "$publish_output" | grep -q "previously published versions"; then
      echo "$name@$version already published (race). Skipping."
      popd >/dev/null
      return 0
    fi
    echo "$publish_output"
    popd >/dev/null
    return "$status"
  fi

  echo "$publish_output"
  popd >/dev/null
}

publish_package "@jonsoc/util" "packages/util"
publish_package "@jonsoc/env" "packages/env"
publish_package "@jonsoc/sdk" "packages/sdk/js"
publish_package "@jonsoc/script" "packages/script"
publish_package "@jonsoc/plugin" "packages/plugin"
publish_package "@jonsoc/slack" "packages/slack"
publish_package "@jonsoc/convex" "packages/convex"
publish_package "@jonsoc/ui" "packages/ui"
publish_package "@jonsoc/app" "packages/app"
publish_package "@jonsoc/web" "packages/web"
publish_package "@jonsoc/console-resource" "packages/console/resource"
publish_package "@jonsoc/console-app" "packages/console/app"
