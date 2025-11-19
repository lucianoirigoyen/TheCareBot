#!/bin/bash

# ============================================================================
# TheCareBot - Cleanup Analysis Script
# Analyzes what code is used vs unused before deletion
# ============================================================================

echo "🔍 TheCareBot Cleanup Analysis"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Analyze legacy directories
echo "📁 LEGACY DIRECTORIES TO DELETE:"
echo "--------------------------------"

dirs_to_delete=(
    "apps/"
    "thecarebot/"
    "thecarebot-mobile/"
    "docs/"
    "packages/observability/"
)

total_size=0
total_files=0

for dir in "${dirs_to_delete[@]}"; do
    if [ -d "$dir" ]; then
        size=$(du -sh "$dir" 2>/dev/null | cut -f1)
        files=$(find "$dir" -type f 2>/dev/null | wc -l | tr -d ' ')
        echo -e "${RED}❌ $dir${NC} - Size: $size, Files: $files"
        total_files=$((total_files + files))
    fi
done

echo ""
echo "Total files to delete: $total_files"
echo ""

# 2. Check for broken imports in src/app/dashboard
echo "🔍 CHECKING FOR BROKEN IMPORTS:"
echo "--------------------------------"

broken_imports=$(grep -r "from '@/components/medical/medical-dashboard'" src/ 2>/dev/null)
if [ -n "$broken_imports" ]; then
    echo -e "${RED}❌ Found broken import:${NC}"
    echo "$broken_imports"
else
    echo -e "${GREEN}✅ No broken 'medical-dashboard' imports${NC}"
fi

broken_provider=$(grep -r "SessionTimeoutProvider" src/ 2>/dev/null | grep -v "^src/app/dashboard")
if [ -z "$broken_provider" ]; then
    echo -e "${RED}❌ SessionTimeoutProvider only used in broken dashboard page${NC}"
else
    echo -e "${YELLOW}⚠️  SessionTimeoutProvider usage:${NC}"
    echo "$broken_provider"
fi

echo ""

# 3. Check for unused components in src/components
echo "🧩 CHECKING COMPONENT USAGE:"
echo "----------------------------"

# Check if seo components exist and are used
if [ -d "src/components/seo" ]; then
    seo_usage=$(grep -r "from '@/components/seo" src/ 2>/dev/null | grep -v "src/components/seo" | wc -l | tr -d ' ')
    echo "SEO components: $seo_usage usages outside src/components/seo/"
    if [ "$seo_usage" -eq "0" ] || [ "$seo_usage" -eq "1" ]; then
        echo -e "${YELLOW}⚠️  SEO components barely used - consider removing${NC}"
    fi
fi

echo ""

# 4. Check for duplicate code in packages/
echo "📦 CHECKING PACKAGE DUPLICATES:"
echo "-------------------------------"

check_duplicate() {
    local pkg_path=$1
    local src_path=$2
    local name=$3

    if [ -d "$pkg_path" ] && [ -d "$src_path" ]; then
        pkg_files=$(find "$pkg_path" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')
        src_files=$(find "$src_path" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')
        echo -e "${YELLOW}⚠️  $name:${NC}"
        echo "   - packages/$name: $pkg_files files"
        echo "   - src/$name: $src_files files"

        # Check if files are identical
        if [ -f "$pkg_path/chilean-rut.ts" ] && [ -f "$src_path/chilean-rut.ts" ]; then
            if diff -q "$pkg_path/chilean-rut.ts" "$src_path/chilean-rut.ts" > /dev/null 2>&1; then
                echo -e "   ${GREEN}✅ Files are identical - safe to delete packages/$name${NC}"
            else
                echo -e "   ${RED}❌ Files differ - review before deleting${NC}"
            fi
        fi
    fi
}

check_duplicate "packages/validators/rut" "src/validators" "validators"
check_duplicate "packages/types/medical" "src/types" "types"

echo ""

# 5. Check for unused utility files
echo "🛠️  CHECKING UNUSED UTILITIES:"
echo "------------------------------"

utilities=(
    "src/utils/circuit-breaker.ts"
    "src/utils/bulkhead.ts"
    "src/utils/retry.ts"
    "src/middleware/security.ts"
)

for util in "${utilities[@]}"; do
    if [ -f "$util" ]; then
        filename=$(basename "$util" .ts)
        usage=$(grep -r "from.*$filename\|import.*$filename" src/ 2>/dev/null | grep -v "^$util:" | wc -l | tr -d ' ')

        if [ "$usage" -eq "0" ]; then
            echo -e "${YELLOW}⚠️  $util - ${RED}NOT USED (0 imports)${NC}"
        else
            echo -e "${GREEN}✅ $util - Used $usage times${NC}"
        fi
    fi
done

echo ""

# 6. Check for unused schemas/types
echo "📋 CHECKING SCHEMA USAGE:"
echo "-------------------------"

if [ -d "src/schemas" ]; then
    for schema in src/schemas/*.ts; do
        if [ -f "$schema" ]; then
            schema_name=$(basename "$schema" .ts)
            usage=$(grep -r "from.*schemas/$schema_name\|from '@/schemas/$schema_name'" src/ 2>/dev/null | grep -v "^$schema:" | wc -l | tr -d ' ')

            if [ "$usage" -eq "0" ]; then
                echo -e "${YELLOW}⚠️  $schema - ${RED}NOT USED${NC}"
            else
                echo -e "${GREEN}✅ $schema - Used $usage times${NC}"
            fi
        fi
    done
fi

echo ""

# 7. Find orphaned files (no imports)
echo "👻 ORPHANED FILES (NOT IMPORTED ANYWHERE):"
echo "-------------------------------------------"

orphans=0
for file in src/**/*.{ts,tsx}; do
    if [ -f "$file" ]; then
        # Skip pages, layouts, and route files
        if [[ "$file" =~ /page\.tsx$ ]] || [[ "$file" =~ /layout\.tsx$ ]] || [[ "$file" =~ /route\.ts$ ]]; then
            continue
        fi

        filename=$(basename "$file" | sed 's/\..*//')
        imports=$(grep -r "from.*$filename\|import.*$filename" src/ 2>/dev/null | grep -v "^$file:" | wc -l | tr -d ' ')

        if [ "$imports" -eq "0" ]; then
            echo -e "${RED}❌ $file${NC}"
            orphans=$((orphans + 1))
        fi
    fi
done 2>/dev/null

echo ""
echo "Total orphaned files: $orphans"
echo ""

# 8. Summary
echo "📊 CLEANUP SUMMARY:"
echo "==================="
echo -e "${RED}Files to delete: ~$total_files${NC}"
echo -e "${YELLOW}Orphaned files: $orphans${NC}"
echo ""
echo "💡 RECOMMENDED ACTIONS:"
echo "1. Delete legacy directories (apps/, thecarebot/, etc.)"
echo "2. Remove src/app/dashboard/page.tsx (broken imports)"
echo "3. Review and remove orphaned files"
echo "4. Consolidate packages/ into src/"
echo "5. Run 'npm run build' to verify"
echo ""
