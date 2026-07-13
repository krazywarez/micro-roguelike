#!/bin/sh
# Single verification entry point for the 1MB roguelike:
# size budget gate + headless solver sweep.
# Usage: tools/check.sh [seedCount]   (seedCount defaults to 200)
set -eu

root=$(cd "$(dirname "$0")/.." && pwd)

"$root/tools/check-size.sh"
echo ""
node "$root/tools/validate.js" "${1:-200}"
echo ""
echo "check: all gates passed"
