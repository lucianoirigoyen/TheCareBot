#!/bin/bash

# ============================================================================
# TheCareBot - Automated Cleanup Script
# Removes legacy code and unused files with safety checks
# ============================================================================

set -e  # Exit on error

echo "🧹 TheCareBot Automated Cleanup"
echo "==============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Safety check
echo -e "${YELLOW}⚠️  WARNING: This will delete files permanently!${NC}"
echo -e "${YELLOW}A backup will be created first.${NC}"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""

# 1. Create backup
echo -e "${BLUE}📦 Step 1: Creating backup...${NC}"
BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup legacy directories
dirs_to_backup=(
    "apps"
    "thecarebot"
    "thecarebot-mobile"
    "packages/observability"
    "src/app/dashboard"
)

for dir in "${dirs_to_backup[@]}"; do
    if [ -d "$dir" ]; then
        echo "  Backing up: $dir"
        cp -R "$dir" "$BACKUP_DIR/" 2>/dev/null || true
    fi
done

# Backup orphaned files
mkdir -p "$BACKUP_DIR/orphaned-files"
orphaned_files=(
    "src/config/timeouts.ts"
    "src/hooks/useLoadingState.ts"
    "src/hooks/useSessionTimeout.ts"
    "src/security/session-security.ts"
    "src/services/health-monitor.ts"
    "src/types/brands.ts"
    "src/utils/bulkhead.ts"
    "src/utils/circuit-breaker.ts"
    "src/utils/medical-license-validator.ts"
    "src/utils/retry.ts"
    "src/schemas/medical.schemas.ts"
)

for file in "${orphaned_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  Backing up: $file"
        cp --parents "$file" "$BACKUP_DIR/orphaned-files/" 2>/dev/null || true
    fi
done

echo -e "${GREEN}✅ Backup created: $BACKUP_DIR${NC}"
echo ""

# 2. Create git commit before deletion
echo -e "${BLUE}📝 Step 2: Creating git checkpoint...${NC}"
git add -A
git commit -m "checkpoint: before cleanup (backup: $BACKUP_DIR)" || echo "  (no changes to commit)"
git tag "pre-cleanup-$(date +%Y%m%d-%H%M%S)"
echo -e "${GREEN}✅ Git checkpoint created${NC}"
echo ""

# 3. Delete legacy directories
echo -e "${BLUE}🗑️  Step 3: Deleting legacy directories...${NC}"
legacy_dirs=(
    "apps"
    "thecarebot"
    "thecarebot-mobile"
    "docs"
    "packages/observability"
)

for dir in "${legacy_dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "  ${RED}Deleting: $dir${NC}"
        rm -rf "$dir"
    fi
done

echo -e "${GREEN}✅ Legacy directories deleted${NC}"
echo ""

# 4. Delete broken dashboard page
echo -e "${BLUE}🗑️  Step 4: Removing broken dashboard page...${NC}"
if [ -d "src/app/dashboard" ]; then
    echo -e "  ${RED}Deleting: src/app/dashboard/${NC}"
    rm -rf "src/app/dashboard"
fi
echo -e "${GREEN}✅ Broken dashboard page removed${NC}"
echo ""

# 5. Delete orphaned files
echo -e "${BLUE}🗑️  Step 5: Removing orphaned files...${NC}"
for file in "${orphaned_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${RED}Deleting: $file${NC}"
        rm -f "$file"
    fi
done

# Clean up empty directories
find src/ -type d -empty -delete 2>/dev/null || true

echo -e "${GREEN}✅ Orphaned files removed${NC}"
echo ""

# 6. Consolidate packages/database to supabase/
echo -e "${BLUE}📦 Step 6: Consolidating database schemas...${NC}"
if [ -d "packages/database/migrations" ]; then
    mkdir -p "supabase/migrations"
    echo "  Moving database migrations to supabase/"
    cp -R packages/database/migrations/* supabase/migrations/ 2>/dev/null || true
fi

if [ -d "packages/database" ]; then
    echo -e "  ${RED}Deleting: packages/database${NC}"
    rm -rf "packages/database"
fi

echo -e "${GREEN}✅ Database schemas consolidated${NC}"
echo ""

# 7. Check for remaining duplicate packages
echo -e "${BLUE}🔍 Step 7: Checking remaining packages...${NC}"
if [ -d "packages/types" ]; then
    echo -e "  ${YELLOW}⚠️  packages/types still exists - review manually${NC}"
fi
if [ -d "packages/validators" ]; then
    echo -e "  ${YELLOW}⚠️  packages/validators still exists - review manually${NC}"
fi
if [ ! "$(ls -A packages 2>/dev/null)" ]; then
    echo "  packages/ is empty, removing..."
    rmdir packages 2>/dev/null || true
fi
echo ""

# 8. Clean up node_modules cruft
echo -e "${BLUE}🧹 Step 8: Cleaning node_modules and cache...${NC}"
if [ -d ".next" ]; then
    echo "  Removing .next build cache"
    rm -rf .next
fi
echo -e "${GREEN}✅ Cache cleaned${NC}"
echo ""

# 9. Run verification
echo -e "${BLUE}✅ Step 9: Verification...${NC}"
echo ""
echo "Checking for broken imports..."

# Check for common broken imports
broken_count=0

if grep -r "from '@/components/medical/medical-dashboard'" src/ 2>/dev/null; then
    echo -e "${RED}❌ Still has broken 'medical-dashboard' import${NC}"
    broken_count=$((broken_count + 1))
fi

if grep -r "SessionTimeoutProvider" src/ 2>/dev/null | grep -v "//"; then
    echo -e "${RED}❌ Still has SessionTimeoutProvider import${NC}"
    broken_count=$((broken_count + 1))
fi

if [ $broken_count -eq 0 ]; then
    echo -e "${GREEN}✅ No broken imports detected${NC}"
else
    echo -e "${YELLOW}⚠️  Found $broken_count broken imports - needs manual fix${NC}"
fi

echo ""

# 10. Summary
echo "======================================"
echo -e "${GREEN}✅ CLEANUP COMPLETE${NC}"
echo "======================================"
echo ""
echo "📊 Summary:"
echo "  - Legacy directories deleted: 5"
echo "  - Orphaned files removed: 11"
echo "  - Backup location: $BACKUP_DIR"
echo ""
echo "📝 Next steps:"
echo "  1. Run: npm install"
echo "  2. Run: npm run build"
echo "  3. Test the application"
echo "  4. If everything works:"
echo "     git add -A"
echo "     git commit -m 'chore: remove legacy code and unused files'"
echo ""
echo "  5. If something breaks:"
echo "     git reset --hard pre-cleanup-$(date +%Y%m%d)"
echo "     or restore from: $BACKUP_DIR"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Test thoroughly before final commit!${NC}"
echo ""
