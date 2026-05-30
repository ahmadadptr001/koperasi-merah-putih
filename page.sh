{
  find app -name "page.tsx" | sort | while IFS= read -r f; do
    route="${f#app}"
    route="${route%/page.tsx}"

    if [ -z "$route" ]; then
      route="/"
    else
      route="/${route#/}"
    fi

    echo "=== $f ==="
    echo "Route: $route"
    cat "$f"
    echo
  done
} | clip