{
  find . -type f \
    ! -path "*/node_modules/*" \
    ! -path "*/.next/*" \
    ! -path "*/.git/*" \
    ! -path "*/fonts/*" \
    ! -name "CLAUDE.md" \
    ! -name "eslint.config.mjs" \
    ! -name "package-lock.json" \
    ! -name "postcss.config.js" \
    ! -name "*.sh" \
    ! -name "*.env" \
    ! -name "*.css" \
    ! -name "favicon.ico" \
    ! -name "next.config.js" \
    ! -name "SidebarLayout.tsx.bak" \
    ! -name "next.config.ts" \
    ! -name "postcss.config.mjs" \
    ! -name "logo-kabupaten-konawe.png" \
    ! -name "README.md" \
    ! -name "AGENTS.md" \
    ! -name "tsconfig.json" \
    ! -name "next-env.d.ts" \
    | sort | while IFS= read -r f; do

      echo "=== $f ==="
      cat "$f"
      echo
    done
} > ringkasan.txt