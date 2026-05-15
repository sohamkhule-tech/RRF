-- Add missing RRF workflow permissions
-- Fixes: RRF.OPEN_FOR_HIRING, RRF.FILL_FROM_BENCH, RRF.CLOSE

-- Run this script as Administrator:
-- docker exec -it rrf-postgres psql -U postgres -d rrf_portal -f /path/to/this/file.sql

BEGIN;

-- Get RRF module ID
DO $$
DECLARE
    v_rrf_module_id INTEGER;
    v_permission_id INTEGER;
    v_pmo_role_id INTEGER;
    v_hr_role_id INTEGER;
BEGIN
    -- Get RRF module
    SELECT id INTO v_rrf_module_id FROM modules WHERE "moduleCode" = 'RRF';
    
    IF v_rrf_module_id IS NULL THEN
        RAISE EXCEPTION 'RRF module not found';
    END IF;
    
    RAISE NOTICE 'RRF Module ID: %', v_rrf_module_id;
    
    -- Get PMO and HR role IDs
    SELECT id INTO v_pmo_role_id FROM roles WHERE "roleCode" = 'PMO';
    SELECT id INTO v_hr_role_id FROM roles WHERE "roleCode" = 'HR';
    
    RAISE NOTICE 'PMO Role ID: %, HR Role ID: %', v_pmo_role_id, v_hr_role_id;
    
    -- ==========================================
    -- 1. Add OPEN_FOR_HIRING permission
    -- ==========================================
    INSERT INTO permissions ("moduleId", "permissionName", "permissionCode", "description", "isActive")
    VALUES (v_rrf_module_id, 'Open for Hiring', 'OPEN_FOR_HIRING', 'Mark RRF as open for hiring', true)
    ON CONFLICT ("moduleId", "permissionCode") DO NOTHING
    RETURNING id INTO v_permission_id;
    
    IF v_permission_id IS NOT NULL THEN
        RAISE NOTICE '✓ Created permission: RRF.OPEN_FOR_HIRING (ID: %)', v_permission_id;
    ELSE
        SELECT id INTO v_permission_id FROM permissions 
        WHERE "moduleId" = v_rrf_module_id AND "permissionCode" = 'OPEN_FOR_HIRING';
        RAISE NOTICE '⊙ Permission already exists: RRF.OPEN_FOR_HIRING (ID: %)', v_permission_id;
    END IF;
    
    -- Assign to PMO
    INSERT INTO role_permissions ("roleId", "permissionId")
    VALUES (v_pmo_role_id, v_permission_id)
    ON CONFLICT ("roleId", "permissionId") DO NOTHING;
    RAISE NOTICE '✓ Assigned RRF.OPEN_FOR_HIRING to PMO';
    
    -- ==========================================
    -- 2. Add FILL_FROM_BENCH permission
    -- ==========================================
    INSERT INTO permissions ("moduleId", "permissionName", "permissionCode", "description", "isActive")
    VALUES (v_rrf_module_id, 'Fill from Bench', 'FILL_FROM_BENCH', 'Fill position from bench resources', true)
    ON CONFLICT ("moduleId", "permissionCode") DO NOTHING
    RETURNING id INTO v_permission_id;
    
    IF v_permission_id IS NOT NULL THEN
        RAISE NOTICE '✓ Created permission: RRF.FILL_FROM_BENCH (ID: %)', v_permission_id;
    ELSE
        SELECT id INTO v_permission_id FROM permissions 
        WHERE "moduleId" = v_rrf_module_id AND "permissionCode" = 'FILL_FROM_BENCH';
        RAISE NOTICE '⊙ Permission already exists: RRF.FILL_FROM_BENCH (ID: %)', v_permission_id;
    END IF;
    
    -- Assign to PMO
    INSERT INTO role_permissions ("roleId", "permissionId")
    VALUES (v_pmo_role_id, v_permission_id)
    ON CONFLICT ("roleId", "permissionId") DO NOTHING;
    RAISE NOTICE '✓ Assigned RRF.FILL_FROM_BENCH to PMO';
    
    -- ==========================================
    -- 3. Add CLOSE permission
    -- ==========================================
    INSERT INTO permissions ("moduleId", "permissionName", "permissionCode", "description", "isActive")
    VALUES (v_rrf_module_id, 'Close RRF', 'CLOSE', 'Close resource requisition forms', true)
    ON CONFLICT ("moduleId", "permissionCode") DO NOTHING
    RETURNING id INTO v_permission_id;
    
    IF v_permission_id IS NOT NULL THEN
        RAISE NOTICE '✓ Created permission: RRF.CLOSE (ID: %)', v_permission_id;
    ELSE
        SELECT id INTO v_permission_id FROM permissions 
        WHERE "moduleId" = v_rrf_module_id AND "permissionCode" = 'CLOSE';
        RAISE NOTICE '⊙ Permission already exists: RRF.CLOSE (ID: %)', v_permission_id;
    END IF;
    
    -- Assign to PMO
    INSERT INTO role_permissions ("roleId", "permissionId")
    VALUES (v_pmo_role_id, v_permission_id)
    ON CONFLICT ("roleId", "permissionId") DO NOTHING;
    RAISE NOTICE '✓ Assigned RRF.CLOSE to PMO';
    
    -- Assign to HR
    INSERT INTO role_permissions ("roleId", "permissionId")
    VALUES (v_hr_role_id, v_permission_id)
    ON CONFLICT ("roleId", "permissionId") DO NOTHING;
    RAISE NOTICE '✓ Assigned RRF.CLOSE to HR';
    
END $$;

COMMIT;

-- Verify all RRF permissions
SELECT 
    r."roleName",
    r."roleCode",
    m."moduleName",
    m."moduleCode",
    p."permissionName",
    p."permissionCode"
FROM role_permissions rp
JOIN roles r ON rp."roleId" = r.id
JOIN permissions p ON rp."permissionId" = p.id
JOIN modules m ON p."moduleId" = m.id
WHERE m."moduleCode" = 'RRF'
ORDER BY r."roleCode", p."permissionCode";
