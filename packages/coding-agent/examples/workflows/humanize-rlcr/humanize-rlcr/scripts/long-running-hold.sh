delay="${OMH_LONG_RUNNING_HOLD_SECONDS:-300}"
case "$delay" in
	'' | *[!0-9]*) delay=300 ;;
esac

if [ "$delay" -gt 0 ]; then
	sleep "$delay"
fi

printf '{"summary":"long-running hold tick completed","data":{"delaySeconds":%s}}\n' "$delay"
