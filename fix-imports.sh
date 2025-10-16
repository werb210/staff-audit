#!/bin/bash

# Fix shared design system import paths in all files
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|"../../../../../shared/design-system/ui/\([^"]*\)"|"@/components/ui/\1"|g'
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|"../../../../shared/design-system/ui/\([^"]*\)"|"@/components/ui/\1"|g'
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|"../../../shared/design-system/ui/\([^"]*\)"|"@/components/ui/\1"|g'
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|"../../shared/design-system/ui/\([^"]*\)"|"@/components/ui/\1"|g'
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|"../shared/design-system/ui/\([^"]*\)"|"@/components/ui/\1"|g'

# Fix layout imports
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|"../../../../../shared/design-system/layout/\([^"]*\)"|"@/components/\1"|g'
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|"../../../../shared/design-system/layout/\([^"]*\)"|"@/components/\1"|g'
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|"../../../shared/design-system/layout/\([^"]*\)"|"@/components/\1"|g'
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|"../../shared/design-system/layout/\([^"]*\)"|"@/components/\1"|g'
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|"../shared/design-system/layout/\([^"]*\)"|"@/components/\1"|g'

echo "Import paths fixed"