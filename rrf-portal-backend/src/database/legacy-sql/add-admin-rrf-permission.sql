-- Add RRF.READ permission to ADMIN role
-- This fixes the 403 error when admin tries to view RRF statistics

-- Find the ADMIN role ID
DO $$
DECLARE
    admin_role_id INTEGER;
    rrf_module_id INTEGER;
    rrf_read_permission_id INTEGER;
    existing_mapping INTEGER;
BEGIN
    -- Get ADMIN role
    SELECT id INTO admin_role_id FROM roles WHERE "roleCode" = 'ADMIN';
    
    IF admin_role_id IS NULL THEN
        RAISE EXCEPTION 'ADMIN role not found';
    END IF;
    
    -- Get RRF module
    SELECT id INTO rrf_module_id FROM modules WHERE "moduleCode" = 'RRF';
    
    IF rrf_module_id IS NULL THEN
        RAISE EXCEPTION 'RRF module not found';
    END IF;
    
    -- Get RRF.READ permission
    SELECT id INTO rrf_read_permission_id 
    FROM permissions 
    WHERE "moduleId" = rrf_module_id 
    AND "permissionCode" = 'READ';
    
    IF rrf_read_permission_id IS NULL THEN
        RAISE EXCEPTION 'RRF.READ permission not found';
    END IF;
    
    -- Check if mapping already exists
    SELECT 1 INTO existing_mapping 
    FROM role_permissions 
    WHERE "roleId" = admin_role_id 
    AND "permissionId" = rrf_read_permission_id;
    
    IF existing_mapping IS NULL THEN
        -- Add the permission
        INSERT INTO role_permissions ("roleId", "permissionId")
        VALUES (admin_role_id, rrf_read_permission_id);
        
        RAISE NOTICE '✅ Successfully added RRF.READ permission to ADMIN role';
    ELSE
        RAISE NOTICE '⚠ RRF.READ permission already exists for ADMIN role';
    END IF;
END $$;

-- Verify the permission was added
SELECT 
    r."roleName",
    r."roleCode",
    m."moduleName",
    p."permissionName",
    p."permissionCode"
FROM role_permissions rp
JOIN roles r ON rp."roleId" = r.id
JOIN permissions p ON rp."permissionId" = p.id
JOIN modules m ON p."moduleId" = m.id
WHERE r."roleCode" = 'ADMIN'
AND m."moduleCode" = 'RRF'
ORDER BY m."moduleName", p."permissionCode";
