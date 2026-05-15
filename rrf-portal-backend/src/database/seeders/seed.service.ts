import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../roles/role.entity';
import { Module } from '../../modules/module.entity';
import { Permission } from '../../permissions/permission.entity';
import { RolePermission } from '../../role-permissions/role-permission.entity';
import { User } from '../../users/user.entity';
import { RrfFormConfig } from '../../rrf/entities/rrf-form-config.entity';
import { Subfunction } from '../../subfunctions/subfunction.entity';
import { Function } from '../../functions/function.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Module)
    private moduleRepository: Repository<Module>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RrfFormConfig)
    private rrfFormConfigRepository: Repository<RrfFormConfig>,
    @InjectRepository(Subfunction)
    private subfunctionRepository: Repository<Subfunction>,
    @InjectRepository(Function)
    private functionRepository: Repository<Function>,
  ) {}

  async seedAll() {
    try {
      this.logger.log('🌱 Starting database seed...');

      await this.seedRoles();
      await this.seedFunctions();
      await this.seedSubfunctions();
      await this.seedModules();
      await this.seedPermissions();
      await this.seedRolePermissions();
      await this.seedAdminUser();
      await this.seedFormConfigs();

      this.logger.log('✅ Database seed completed successfully!');
    } catch (error) {
      this.logger.error('❌ Database seed failed:', error);
      throw error;
    }
  }

  private async seedRoles() {
    const roles = [
      {
        roleName: 'Admin',
        roleCode: 'ADMIN',
        description: 'System administrator with full access to user management and system configuration',
        priority: 1,
        isActive: true,
      },
      {
        roleName: 'PMO',
        roleCode: 'PMO',
        description: 'PMO team member who manages RRF workflow and coordinates with teams',
        priority: 2,
        isActive: true,
      },
      {
        roleName: 'Approver',
        roleCode: 'APPROVER',
        description: 'Department head or manager who approves/rejects RRFs',
        priority: 3,
        isActive: true,
      },
      {
        roleName: 'Talent Acquisition',
        roleCode: 'HR',
        description: 'HR team member who processes approved RRFs',
        priority: 4,
        isActive: true,
      },
      {
        roleName: 'Hiring Manager',
        roleCode: 'HIRING_MANAGER',
        description: 'Team lead who creates RRFs for staffing needs',
        priority: 5,
        isActive: true,
      },
    ];

    for (const roleData of roles) {
      const existingRole = await this.roleRepository.findOne({
        where: { roleCode: roleData.roleCode },
      });

      if (!existingRole) {
        const role = this.roleRepository.create(roleData);
        await this.roleRepository.save(role);
        this.logger.log(`✓ Created role: ${roleData.roleName}`);
      } else {
        this.logger.log(`⊙ Role already exists: ${roleData.roleName}`);
      }
    }
  }

  private async seedFunctions() {
    const functions = [
      { name: 'Delivery', description: 'Delivery Department', displayOrder: 1 },
      { name: 'Sales', description: 'Sales and Marketing', displayOrder: 2 },
      { name: 'Support', description: 'Support and Operations', displayOrder: 3 },
    ];

    for (const funcData of functions) {
      const exists = await this.functionRepository.findOne({
        where: { name: funcData.name },
      });

      if (!exists) {
        const func = this.functionRepository.create({
          ...funcData,
          isActive: true,
        });
        await this.functionRepository.save(func);
        this.logger.log(`✓ Created function: ${funcData.name}`);
      } else {
        this.logger.log(`⊙ Function already exists: ${funcData.name}`);
      }
    }
  }

  private async seedSubfunctions() {
    const subfunctions = [
      // Delivery subfunctions
      { 
        name: 'SGINTL', 
        function: 'Delivery', 
        description: 'SGINTL Delivery Team',
        displayOrder: 1,
        isActive: true,
      },
      { 
        name: 'VR', 
        function: 'Delivery', 
        description: 'VR Delivery Team',
        displayOrder: 2,
        isActive: true,
      },
      { 
        name: 'PMO', 
        function: 'Delivery', 
        description: 'Project Management Office',
        displayOrder: 3,
        isActive: true,
      },
      
      // Sales subfunctions
      { 
        name: 'BDE', 
        function: 'Sales', 
        description: 'Business Development Executive',
        displayOrder: 1,
        isActive: true,
      },
      { 
        name: 'Sales', 
        function: 'Sales', 
        description: 'Sales Team',
        displayOrder: 2,
        isActive: true,
      },
      { 
        name: 'MR', 
        function: 'Sales', 
        description: 'Marketing Representative',
        displayOrder: 3,
        isActive: true,
      },
      { 
        name: 'Marketing', 
        function: 'Sales', 
        description: 'Marketing Team',
        displayOrder: 4,
        isActive: true,
      },
      
      // Support subfunctions
      { 
        name: 'Human Resources', 
        function: 'Support', 
        description: 'HR Department',
        displayOrder: 1,
        isActive: true,
      },
      { 
        name: 'Talent Acquisition', 
        function: 'Support', 
        description: 'TA Department',
        displayOrder: 2,
        isActive: true,
      },
      { 
        name: 'Accounts', 
        function: 'Support', 
        description: 'Accounts Department',
        displayOrder: 3,
        isActive: true,
      },
      { 
        name: 'IT Networking', 
        function: 'Support', 
        description: 'IT and Networking Support',
        displayOrder: 4,
        isActive: true,
      },
    ];

    for (const subfunctionData of subfunctions) {
      const existingSubfunction = await this.subfunctionRepository.findOne({
        where: { name: subfunctionData.name },
      });

      if (!existingSubfunction) {
        // Find the parent function entity
        const parentFunction = await this.functionRepository.findOne({
          where: { name: subfunctionData.function }
        });

        const subfunction = this.subfunctionRepository.create({
          ...subfunctionData,
          functionEntity: parentFunction, // Link to the actual entity
        });
        await this.subfunctionRepository.save(subfunction);
        this.logger.log(`✓ Created subfunction: ${subfunctionData.name} (${subfunctionData.function})`);
      } else {
        // Even if it exists, ensure the link is there (migration/safety)
        if (!existingSubfunction.functionEntity) {
           const parentFunction = await this.functionRepository.findOne({
            where: { name: subfunctionData.function }
          });
          if (parentFunction) {
            existingSubfunction.functionEntity = parentFunction;
            await this.subfunctionRepository.save(existingSubfunction);
            this.logger.log(`⚡ Linked existing subfunction: ${subfunctionData.name} to ${subfunctionData.function}`);
          }
        }
        this.logger.log(`⊙ Subfunction already exists: ${subfunctionData.name}`);
      }
    }
  }

  private async seedModules() {
    const modules = [
      {
        moduleName: 'Dashboard',
        moduleCode: 'DASHBOARD',
        description: 'Main dashboard with overview and analytics',
        parentModuleId: null,
        routePath: '/dashboard',
        icon: 'dashboard',
        displayOrder: 1,
        isActive: true,
      },
      {
        moduleName: 'Requisition',
        moduleCode: 'RRF',
        description: 'Resource Requisition Form management',
        parentModuleId: null,
        routePath: '/rrf',
        icon: 'file-text',
        displayOrder: 2,
        isActive: true,
      },
      {
        moduleName: 'Approvals',
        moduleCode: 'APPROVALS',
        description: 'Approval workflow management',
        parentModuleId: null,
        routePath: '/approvals',
        icon: 'check-circle',
        displayOrder: 3,
        isActive: true,
      },
      {
        moduleName: 'Roles',
        moduleCode: 'ROLES',
        description: 'Role and permission management',
        parentModuleId: null,
        routePath: '/admin/roles',
        icon: 'shield',
        displayOrder: 4,
        isActive: true,
      },
      {
        moduleName: 'Users',
        moduleCode: 'USERS',
        description: 'User management and administration',
        parentModuleId: null,
        routePath: '/users',
        icon: 'users',
        displayOrder: 5,
        isActive: true,
      },
      {
        moduleName: 'Reports',
        moduleCode: 'REPORTS',
        description: 'Reports and analytics',
        parentModuleId: null,
        routePath: '/reports',
        icon: 'bar-chart',
        displayOrder: 6,
        isActive: true,
      },
      {
        moduleName: 'Settings',
        moduleCode: 'SETTINGS',
        description: 'System settings and configuration',
        parentModuleId: null,
        routePath: '/settings',
        icon: 'settings',
        displayOrder: 7,
        isActive: true,
      },
      {
        moduleName: 'Form Configuration',
        moduleCode: 'FORM_CONFIG',
        description: 'Form fields and dropdown configuration management',
        parentModuleId: null,
        routePath: '/admin/form-config',
        icon: 'form',
        displayOrder: 8,
        isActive: true,
      },
    ];

    for (const moduleData of modules) {
      const existingModule = await this.moduleRepository.findOne({
        where: { moduleCode: moduleData.moduleCode },
      });

      if (!existingModule) {
        const module = this.moduleRepository.create(moduleData);
        await this.moduleRepository.save(module);
        this.logger.log(`✓ Created module: ${moduleData.moduleName}`);
      } else {
        this.logger.log(`⊙ Module already exists: ${moduleData.moduleName}`);
      }
    }
  }

  private async seedPermissions() {
    const modules = await this.moduleRepository.find();

    const permissionsData = [
      // Dashboard Permissions
      {
        moduleCode: 'DASHBOARD',
        permissions: [
          { code: 'READ', name: 'View Dashboard', description: 'View dashboard and analytics' },
        ],
      },
      // RRF Permissions
      {
        moduleCode: 'RRF',
        permissions: [
          { code: 'CREATE', name: 'Create RRF', description: 'Create new resource requisition forms' },
          { code: 'READ', name: 'View RRF', description: 'View resource requisition forms' },
          { code: 'UPDATE', name: 'Update RRF', description: 'Edit resource requisition forms' },
          { code: 'DELETE', name: 'Delete RRF', description: 'Delete resource requisition forms' },
          { code: 'OPEN_FOR_HIRING', name: 'Open for Hiring', description: 'Mark RRF as open for hiring' },
          { code: 'FILL_FROM_BENCH', name: 'Fill from Bench', description: 'Fill position from bench resources' },
          { code: 'CLOSE', name: 'Close RRF', description: 'Close resource requisition forms' },
        ],
      },
      // Approvals Permissions
      {
        moduleCode: 'APPROVALS',
        permissions: [
          { code: 'READ', name: 'View Approvals', description: 'View approval queue' },
          { code: 'APPROVE', name: 'Approve RRF', description: 'Approve resource requisitions' },
          { code: 'REJECT', name: 'Reject RRF', description: 'Reject resource requisitions' },
          { code: 'ON_HOLD', name: 'Put RRF On Hold', description: 'Temporarily pause approval workflow with reason' },
        ],
      },
      // Roles Permissions
      {
        moduleCode: 'ROLES',
        permissions: [
          { code: 'READ', name: 'View Roles', description: 'View roles and permissions' },
          { code: 'UPDATE', name: 'Update Roles', description: 'Modify role permissions' },
        ],
      },
      // Users Permissions
      {
        moduleCode: 'USERS',
        permissions: [
          { code: 'CREATE', name: 'Create User', description: 'Create new users' },
          { code: 'READ', name: 'View Users', description: 'View user list' },
          { code: 'UPDATE', name: 'Update User', description: 'Edit user details' },
          { code: 'DELETE', name: 'Delete User', description: 'Deactivate users' },
        ],
      },
      // Reports Permissions
      {
        moduleCode: 'REPORTS',
        permissions: [
          { code: 'READ', name: 'View Reports', description: 'View reports and analytics' },
          { code: 'EXPORT', name: 'Export Reports', description: 'Export reports to Excel/PDF' },
        ],
      },
      // Settings Permissions
      {
        moduleCode: 'SETTINGS',
        permissions: [
          { code: 'READ', name: 'View Settings', description: 'View system settings' },
          { code: 'UPDATE', name: 'Update Settings', description: 'Modify system configuration' },
        ],
      },
      // Form Configuration Permissions
      {
        moduleCode: 'FORM_CONFIG',
        permissions: [
          { code: 'READ', name: 'View Form Config', description: 'View form field configurations' },
          { code: 'CREATE', name: 'Create Form Config', description: 'Add new form fields and options' },
          { code: 'UPDATE', name: 'Update Form Config', description: 'Edit form fields and options' },
          { code: 'DELETE', name: 'Delete Form Config', description: 'Delete functions, subfunctions, and form options' },
        ],
      },
    ];

    for (const modulePermissions of permissionsData) {
      const module = modules.find((m) => m.moduleCode === modulePermissions.moduleCode);
      if (!module) continue;

      for (const permData of modulePermissions.permissions) {
        const existingPermission = await this.permissionRepository.findOne({
          where: {
            moduleId: module.id,
            permissionCode: permData.code,
          },
        });

        if (!existingPermission) {
          const permission = this.permissionRepository.create({
            moduleId: module.id,
            permissionName: permData.name,
            permissionCode: permData.code,
            description: permData.description,
            isActive: true,
          });
          await this.permissionRepository.save(permission);
          this.logger.log(
            `✓ Created permission: ${modulePermissions.moduleCode}.${permData.code}`,
          );
        }
      }
    }
  }

  private async seedRolePermissions() {
    const roles = await this.roleRepository.find();
    const permissions = await this.permissionRepository.find({ relations: ['module'] });

    const roleMappings = {
      ADMIN: [
        'DASHBOARD.READ',
        'RRF.READ',
        'RRF.CREATE',
        'RRF.UPDATE',
        'RRF.DELETE',
        'RRF.OPEN_FOR_HIRING',
        'RRF.FILL_FROM_BENCH',
        'RRF.CLOSE',
        'APPROVALS.READ',
        'APPROVALS.APPROVE',
        'APPROVALS.REJECT',
        'APPROVALS.ON_HOLD',
        'ROLES.READ',
        'ROLES.UPDATE',
        'USERS.CREATE',
        'USERS.READ',
        'USERS.UPDATE',
        'USERS.DELETE',
        'REPORTS.READ',
        'REPORTS.EXPORT',
        'SETTINGS.READ',
        'SETTINGS.UPDATE',
        'FORM_CONFIG.READ',
        'FORM_CONFIG.CREATE',
        'FORM_CONFIG.UPDATE',
        'FORM_CONFIG.DELETE',
      ],
      PMO: [
        'DASHBOARD.READ',
        'RRF.CREATE',
        'RRF.READ',
        'RRF.UPDATE',
        'RRF.DELETE',
        'RRF.OPEN_FOR_HIRING',
        'RRF.FILL_FROM_BENCH',
        'RRF.CLOSE',
        'APPROVALS.READ',
        'USERS.READ',
        'REPORTS.READ',
        'REPORTS.EXPORT',
        'FORM_CONFIG.READ',
        'FORM_CONFIG.CREATE',
        'FORM_CONFIG.UPDATE',
        'FORM_CONFIG.DELETE',
      ],
      APPROVER: [
        'DASHBOARD.READ',
        'RRF.READ',
        'RRF.UPDATE',
        'APPROVALS.READ',
        'APPROVALS.APPROVE',
        'APPROVALS.REJECT',
        'APPROVALS.ON_HOLD',
        'REPORTS.READ',
      ],
      HR: [
        'DASHBOARD.READ',
        'RRF.READ',
        'RRF.CLOSE',
        'APPROVALS.READ',
        'REPORTS.READ',
        'REPORTS.EXPORT',
      ],
      HIRING_MANAGER: [
        'DASHBOARD.READ',
        'RRF.CREATE',
        'RRF.READ',
        'RRF.UPDATE',
        'USERS.READ',
        'REPORTS.READ',
      ],
    };

    for (const [roleCode, permissionCodes] of Object.entries(roleMappings)) {
      const role = roles.find((r) => r.roleCode === roleCode);
      if (!role) continue;

      for (const permCode of permissionCodes) {
        const [moduleCode, actionCode] = permCode.split('.');
        const permission = permissions.find(
          (p) => p.module.moduleCode === moduleCode && p.permissionCode === actionCode,
        );

        if (!permission) {
          this.logger.warn(`⚠ Permission not found: ${permCode}`);
          continue;
        }

        const existingMapping = await this.rolePermissionRepository.findOne({
          where: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });

        if (!existingMapping) {
          const mapping = this.rolePermissionRepository.create({
            roleId: role.id,
            permissionId: permission.id,
          });
          await this.rolePermissionRepository.save(mapping);
          this.logger.log(`✓ Mapped ${roleCode} → ${permCode}`);
        }
      }
    }
  }

  private async seedAdminUser() {
    const adminUserId = process.env.ADMIN_USER_ID || 'admin';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const adminRole = await this.roleRepository.findOne({
      where: { roleCode: 'ADMIN' },
    });

    if (!adminRole) {
      this.logger.error('❌ ADMIN role not found. Cannot create admin user.');
      return;
    }

    const existingAdmin = await this.userRepository.findOne({
      where: { userId: adminUserId },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const adminUser = this.userRepository.create({
        userId: adminUserId,
        email: adminEmail,
        passwordHash: hashedPassword,
        fullName: 'System Administrator',
        role: adminRole,
        department: 'IT',
        isActive: true,
      });

      await this.userRepository.save(adminUser);
      this.logger.log(`✓ Created admin user: ${adminUserId} (${adminEmail})`);
    } else {
      this.logger.log(`⊙ Admin user already exists: ${adminUserId}`);
    }
  }

  private async seedFormConfigs() {
    this.logger.log('\n🌱 Seeding form configurations...');

    const formConfigs = [
      // ========== STEP 1: REQUISITION DETAILS ==========
      {
        fieldName: 'entity',
        label: 'Entity',
        options: ['DataFortune Inc', 'Techfortune Inc'],
        step: 1,
        section: 'Organization',
        displayOrder: 1,
        isActive: true,
      },
      {
        fieldName: 'function',
        label: 'Function',
        options: ['Delivery', 'Sales', 'Support'],
        step: 1,
        section: 'Organization',
        displayOrder: 2,
        isActive: true,
      },
      {
        fieldName: 'subFunction',
        label: 'Sub Function',
        options: [
          'SGINTL',
          'VR',
          'PMO',
          'BDE',
          'Sales',
          'MR',
          'Marketing',
          'Human Resources',
          'Talent Acquisition',
          'Accounts',
          'IT Networking'
        ],
        step: 1,
        section: 'Organization',
        displayOrder: 3,
        isActive: true,
      },
      {
        fieldName: 'requisitionType',
        label: 'Requisition Type',
        options: ['Billable', 'Non-Billable'],
        step: 1,
        section: 'Request Type',
        displayOrder: 4,
        isActive: true,
      },
      {
        fieldName: 'nonBillableSubType',
        label: 'Non-Billable Sub Type',
        options: ['Bench', 'Pipeline'],
        step: 1,
        section: 'Request Type',
        displayOrder: 5,
        isActive: true,
      },

      // ========== STEP 2: POSITION DETAILS ==========
      {
        fieldName: 'positionType',
        label: 'Position Type',
        options: ['New Position', 'Replacement', 'Additional'],
        step: 2,
        section: 'Position Information',
        displayOrder: 1,
        isActive: true,
      },
      {
        fieldName: 'employmentType',
        label: 'Employment Type',
        options: ['Full-time', 'Part-time', 'Contract'],
        step: 2,
        section: 'Position Information',
        displayOrder: 2,
        isActive: true,
      },
      {
        fieldName: 'priority',
        label: 'Priority',
        options: ['Low', 'Medium', 'High', 'Critical'],
        step: 2,
        section: 'Position Information',
        displayOrder: 3,
        isActive: true,
      },
      {
        fieldName: 'workMode',
        label: 'Work Mode',
        options: ['Remote', 'Hybrid', 'On-site'],
        step: 2,
        section: 'Position Information',
        displayOrder: 4,
        isActive: true,
      },
      {
        fieldName: 'location',
        label: 'Location',
        options: ['Pune', 'Chennai', 'Bengaluru', 'US', 'Other'],
        step: 2,
        section: 'Position Information',
        displayOrder: 5,
        isActive: true,
      },

      // ========== STEP 3: TECHNICAL REQUIREMENTS ==========
      {
        fieldName: 'primaryTechnologies',
        label: 'Primary Technologies',
        options: ['Java', 'Python', 'React', 'Node.js', 'Angular', 'DotNet', 'AWS', 'Azure'],
        step: 3,
        section: 'Core Expertise',
        displayOrder: 1,
        isActive: true,
      },
      {
        fieldName: 'mustHaveSkills',
        label: 'Must Have Skills',
        options: [],
        step: 3,
        section: 'Skillset',
        displayOrder: 2,
        isActive: true,
      },
      {
        fieldName: 'niceToHaveSkills',
        label: 'Nice To Have Skills',
        options: [],
        step: 3,
        section: 'Skillset',
        displayOrder: 3,
        isActive: true,
      },
    ];

    for (const configData of formConfigs) {
      const existingConfig = await this.rrfFormConfigRepository.findOne({
        where: { fieldName: configData.fieldName },
      });

      if (!existingConfig) {
        const config = this.rrfFormConfigRepository.create(configData);
        await this.rrfFormConfigRepository.save(config);
        this.logger.log(`✓ Created form config: ${configData.fieldName} (Step ${configData.step})`);
      } else {
        // Update existing config to add step/section if missing
        let needsUpdate = false;
        if (!existingConfig.step || existingConfig.step !== configData.step) {
          existingConfig.step = configData.step;
          needsUpdate = true;
        }
        if (!existingConfig.section || existingConfig.section !== configData.section) {
          existingConfig.section = configData.section;
          needsUpdate = true;
        }
        if (existingConfig.displayOrder !== configData.displayOrder) {
          existingConfig.displayOrder = configData.displayOrder;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await this.rrfFormConfigRepository.save(existingConfig);
          this.logger.log(`↻ Updated form config: ${configData.fieldName} (Step ${configData.step})`);
        } else {
          this.logger.log(`⊙ Form config already exists: ${configData.fieldName}`);
        }
      }
    }

    this.logger.log('\n📋 Form Configurations Created:');
    this.logger.log('   Step 1 - Requisition Details:');
    this.logger.log('     • Entity, Function, Sub Function');
    this.logger.log('     • Requisition Type, Non-Billable Sub Type');
    this.logger.log('   Step 2 - Position Details:');
    this.logger.log('     • Position Type, Employment Type, Priority');
    this.logger.log('     • Work Mode, Location');
  }
}
