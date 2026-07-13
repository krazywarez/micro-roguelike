#!/bin/sh
# Byte-budget gate for the 1MB roguelike.
# Usage: tools/check-size.sh [dir]   (dir defaults to the repo's 1mb/)
# Prints a per-file ledger, the total, and percent of budget.
# Exit 1 if the total exceeds 1,048,576 bytes; loud warning above 95%.
set -eu

dir=${1:-$(cd "$(dirname "$0")/.." && pwd)/1mb}
budget=1048576

if [ ! -d "$dir" ]; then
  echo "check-size: no such directory: $dir" >&2
  exit 2
fi

total=0
echo "byte ledger for $dir"
echo "----------------------------------------"
# Newline-separated iteration so paths with spaces survive.
oldifs=$IFS
IFS='
'
for f in $(find "$dir" -type f | sort); do
  bytes=$(wc -c < "$f")
  bytes=$((bytes + 0))
  total=$((total + bytes))
  printf '%10d  %s\n' "$bytes" "${f#"$dir"/}"
done
IFS=$oldifs

# Percent to one decimal place using integer math only.
pct10=$((total * 1000 / budget))
echo "----------------------------------------"
printf '%10d  total (%d.%d%% of %d)\n' "$total" $((pct10 / 10)) $((pct10 % 10)) "$budget"

if [ "$total" -gt "$budget" ]; then
  echo "FAIL: over budget by $((total - budget)) bytes" >&2
  exit 1
fi
if [ "$pct10" -ge 950 ]; then
  echo ""
  echo "!!! WARNING: past 95% of the 1 MiB budget ($((budget - total)) bytes left) !!!"
  echo ""
fi
echo "OK: $((budget - total)) bytes remaining"
