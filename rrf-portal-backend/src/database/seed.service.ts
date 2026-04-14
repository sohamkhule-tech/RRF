import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../roles/role.entity';
import { Module } from '../modules/module.entity';
import { Permission } from '../permissions/permission.entity';
import { RolePermission } from '../role-permissions/role-permission.entity';
import { User } from '../users/user.entity';
import { Rrf, RrfStatus, Priority, EmploymentType } from '../rrf/entities/rrf.entity';
import { RrfApprover, ApprovalLevel, ApprovalStatus } from '../rrf/entities/rrf-approver.entity';
import { RrfFormConfig } from '../rrf/entities/rrf-form-config.entity';
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
    @InjectRepository(Rrf)
    private rrfRepository: Repository<Rrf>,
    @InjectRepository(RrfApprover)
    private rrfApproverRepository: Repository<RrfApprover>,
    @InjectRepository(RrfFormConfig)
    private rrfFormConfigRepository: Repository<RrfFormConfig>,
  ) {}

  async seedAll() {
    try {
      this.logger.log('🌱 Starting database seed...');

      // 1. Seed Roles
      await this.seedRoles();

      // 2. Seed Modules
      await this.seedModules();

      // 3. Seed Permissions
      await this.seedPermissions();

      // 4. Map Role-Permissions
      await this.seedRolePermissions();

      // 5. Seed Demo Users
      await this.seedUsers();

      // 6. Seed Sample RRFs
      await this.seedRrfs();

      // 7. Seed Form Configurations
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
        roleName: 'HR Team',
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
        moduleName: 'Users',
        moduleCode: 'USERS',
        description: 'User management and administration',
        parentModuleId: null,
        routePath: '/users',
        icon: 'users',
        displayOrder: 4,
        isActive: true,
      },
      {
        moduleName: 'Reports',
        moduleCode: 'REPORTS',
        description: 'Reports and analytics',
        parentModuleId: null,
        routePath: '/reports',
        icon: 'bar-chart',
        displayOrder: 5,
        isActive: true,
      },
      {
        moduleName: 'Settings',
        moduleCode: 'SETTINGS',
        description: 'System settings and configuration',
        parentModuleId: null,
        routePath: '/settings',
        icon: 'settings',
        displayOrder: 6,
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
    // Get all modules
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
        ],
      },
      // Approvals Permissions
      {
        moduleCode: 'APPROVALS',
        permissions: [
          { code: 'READ', name: 'View Approvals', description: 'View approval queue' },
          { code: 'APPROVE', name: 'Approve RRF', description: 'Approve resource requisitions' },
          { code: 'REJECT', name: 'Reject RRF', description: 'Reject resource requisitions' },
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
    const modules = await this.moduleRepository.find();
    const permissions = await this.permissionRepository.find({ relations: ['module'] });

    // Define role-permission mappings
    const roleMappings = {
      ADMIN: [
        // Admin: Full access to Users, Settings, Dashboard, Reports (NO business operations)
        'DASHBOARD.READ',
        'USERS.CREATE',
        'USERS.READ',
        'USERS.UPDATE',
        'USERS.DELETE',
        'REPORTS.READ',
        'REPORTS.EXPORT',
        'SETTINGS.READ',
        'SETTINGS.UPDATE',
      ],
      PMO: [
        // PMO: Manage RRF workflow, view approvals, read-only users
        'DASHBOARD.READ',
        'RRF.CREATE',
        'RRF.READ',
        'RRF.UPDATE',
        'RRF.DELETE',
        'APPROVALS.READ',
        'USERS.READ',
        'REPORTS.READ',
        'REPORTS.EXPORT',
      ],
      APPROVER: [
        // Approver: View and approve/reject RRFs
        'DASHBOARD.READ',
        'RRF.READ',
        'APPROVALS.READ',
        'APPROVALS.APPROVE',
        'APPROVALS.REJECT',
        'REPORTS.READ',
      ],
      HR: [
        // HR: View approved RRFs, basic dashboard
        'DASHBOARD.READ',
        'RRF.READ',
        'APPROVALS.READ',
        'REPORTS.READ',
        'REPORTS.EXPORT',
      ],
      HIRING_MANAGER: [
        // Hiring Manager: Create and view their own RRFs
        'DASHBOARD.READ',
        'RRF.CREATE',
        'RRF.READ',
        'RRF.UPDATE',
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

  private async seedUsers() {
    const roles = await this.roleRepository.find();

    const users = [
      {
        userId: 'admin001',
        email: 'admin@company.com',
        password: 'admin123',
        fullName: 'System Admin',
        roleCode: 'ADMIN',
        department: 'IT',
        phone: '+91-9876543210',
      },
      {
        userId: 'pmo001',
        email: 'priya.sharma@company.com',
        password: 'pmo123',
        fullName: 'Priya Sharma',
        roleCode: 'PMO',
        department: 'PMO',
        phone: '+91-9876543211',
      },
      {
        userId: 'app001',
        email: 'sarah.miller@company.com',
        password: 'app123',
        fullName: 'Sarah Miller',
        roleCode: 'APPROVER',
        department: 'Engineering',
        phone: '+91-9876543212',
      },
      {
        userId: 'hr001',
        email: 'mike.johnson@company.com',
        password: 'hr123',
        fullName: 'Mike Johnson',
        roleCode: 'HR',
        department: 'Human Resources',
        phone: '+91-9876543213',
      },
      {
        userId: 'hm001',
        email: 'john.doe@company.com',
        password: 'hm123',
        fullName: 'John Doe',
        roleCode: 'HIRING_MANAGER',
        department: 'Engineering',
        phone: '+91-9876543214',
      },
    ];

    for (const userData of users) {
      const role = roles.find((r) => r.roleCode === userData.roleCode);
      if (!role) continue;

      const existingUser = await this.userRepository.findOne({
        where: { userId: userData.userId },
      });

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        const user = this.userRepository.create({
          userId: userData.userId,
          email: userData.email,
          passwordHash: hashedPassword,
          fullName: userData.fullName,
          role: role,
          department: userData.department,
          phone: userData.phone,
          isActive: true,
        });

        await this.userRepository.save(user);
        this.logger.log(
          `✓ Created user: ${userData.userId} (${userData.fullName}) - ${userData.roleCode}`,
        );
      } else {
        this.logger.log(`⊙ User already exists: ${userData.userId}`);
      }
    }

    this.logger.log('\n📋 Demo Users Created:');
    this.logger.log('   Admin:          admin001 / admin123');
    this.logger.log('   PMO:            pmo001 / pmo123');
    this.logger.log('   Approver:       app001 / app123');
    this.logger.log('   HR:             hr001 / hr123');
    this.logger.log('   Hiring Manager: hm001 / hm123');
  }

  private async seedRrfs() {
    this.logger.log('\n🌱 Seeding sample RRFs...');

    // Get users for relationships
    const hiringManager = await this.userRepository.findOne({ where: { userId: 'hm001' } });
    const approver = await this.userRepository.findOne({ where: { userId: 'app001' } });
    const pmo = await this.userRepository.findOne({ where: { userId: 'pmo001' } });
    const hr = await this.userRepository.findOne({ where: { userId: 'hr001' } });

    if (!hiringManager || !approver) {
      this.logger.warn('⚠ Cannot seed RRFs: Required users not found');
      return;
    }

    const rrfsData = [
      {
        rrfNumber: 'RRF-001',
        positionTitle: 'Senior Backend Developer',
        department: 'Engineering',
        projectName: 'Banking Platform',
        headcount: 2,
        priority: Priority.HIGH,
        status: RrfStatus.PENDING,
        jobDescription: 'Develop and maintain backend services for our banking platform. Work with microservices architecture and cloud infrastructure.',
        requiredSkills: 'Node.js, NestJS, TypeScript, PostgreSQL, Docker, Kubernetes',
        preferredSkills: 'AWS, Redis, Kafka, GraphQL',
        experienceMin: 5,
        experienceMax: 8,
        budgetMin: 1500000,
        budgetMax: 2000000,
        employmentType: EmploymentType.FULL_TIME,
        location: 'Bangalore, India',
        urgencyReason: 'Critical project deadline - Q2 2026 launch',
        createdById: hiringManager.id,
        submittedAt: new Date('2024-03-15'),
      },
      {
        rrfNumber: 'RRF-002',
        positionTitle: 'Frontend React Developer',
        department: 'Engineering',
        projectName: 'Customer Portal',
        headcount: 1,
        priority: Priority.MEDIUM,
        status: RrfStatus.APPROVED,
        jobDescription: 'Build responsive and user-friendly frontend interfaces using React.js and modern UI frameworks.',
        requiredSkills: 'React, TypeScript, Redux, CSS, HTML5',
        preferredSkills: 'Next.js, Tailwind CSS, Jest, Cypress',
        experienceMin: 3,
        experienceMax: 6,
        budgetMin: 1000000,
        budgetMax: 1500000,
        employmentType: EmploymentType.FULL_TIME,
        location: 'Bangalore, India',
        createdById: hiringManager.id,
        submittedAt: new Date('2024-03-10'),
        approvedAt: new Date('2024-03-12'),
        assignedToHrId: hr?.id,
      },
      {
        rrfNumber: 'RRF-003',
        positionTitle: 'DevOps Engineer',
        department: 'Infrastructure',
        projectName: 'Cloud Migration',
        headcount: 1,
        priority: Priority.HIGH,
        status: RrfStatus.DRAFT,
        jobDescription: 'Manage and optimize cloud infrastructure, CI/CD pipelines, and deployment automation.',
        requiredSkills: 'AWS, Docker, Kubernetes, Terraform, Jenkins',
        preferredSkills: 'GitLab CI, Ansible, Monitoring tools',
        experienceMin: 4,
        experienceMax: 7,
        budgetMin: 1200000,
        budgetMax: 1800000,
        employmentType: EmploymentType.FULL_TIME,
        location: 'Bangalore, India',
        createdById: hiringManager.id,
      },
      {
        rrfNumber: 'RRF-004',
        positionTitle: 'QA Automation Engineer',
        department: 'Quality Assurance',
        projectName: 'Testing Framework',
        headcount: 2,
        priority: Priority.MEDIUM,
        status: RrfStatus.ON_HOLD,
        jobDescription: 'Design and implement automated testing frameworks for web and mobile applications.',
        requiredSkills: 'Selenium, Cypress, Jest, API Testing, CI/CD',
        preferredSkills: 'Playwright, K6, Performance testing',
        experienceMin: 3,
        experienceMax: 5,
        budgetMin: 800000,
        budgetMax: 1200000,
        employmentType: EmploymentType.FULL_TIME,
        location: 'Remote',
        createdById: hiringManager.id,
        submittedAt: new Date('2024-03-08'),
      },
      {
        rrfNumber: 'RRF-005',
        positionTitle: 'UI/UX Designer',
        department: 'Design',
        projectName: 'Product Redesign',
        headcount: 1,
        priority: Priority.LOW,
        status: RrfStatus.CLOSED,
        jobDescription: 'Create intuitive and visually appealing user interfaces. Conduct user research and usability testing.',
        requiredSkills: 'Figma, Adobe XD, User Research, Prototyping',
        preferredSkills: 'Sketch, InVision, Animation',
        experienceMin: 2,
        experienceMax: 5,
        budgetMin: 700000,
        budgetMax: 1100000,
        employmentType: EmploymentType.CONTRACT,
        location: 'Bangalore, India',
        createdById: hiringManager.id,
        submittedAt: new Date('2024-02-20'),
        approvedAt: new Date('2024-02-25'),
        closedAt: new Date('2024-03-10'),
        assignedToHrId: hr?.id,
      },
    ];

    for (const rrfData of rrfsData) {
      const existingRrf = await this.rrfRepository.findOne({
        where: { rrfNumber: rrfData.rrfNumber },
      });

      if (!existingRrf) {
        const rrf = this.rrfRepository.create(rrfData);
        const savedRrf = await this.rrfRepository.save(rrf);

        // Add approvers for non-draft RRFs
        if (rrfData.status !== RrfStatus.DRAFT) {
          const approverData = this.rrfApproverRepository.create({
            rrfId: savedRrf.id,
            userId: approver.id,
            approvalLevel: ApprovalLevel.L1,
            approvalOrder: 1,
            approvalStatus:
              rrfData.status === RrfStatus.APPROVED
                ? ApprovalStatus.APPROVED
                : rrfData.status === RrfStatus.PENDING
                ? ApprovalStatus.PENDING
                : ApprovalStatus.REJECTED,
            isMandatory: true,
            approvedAt: rrfData.status === RrfStatus.APPROVED ? rrfData.approvedAt : null,
            comments:
              rrfData.status === RrfStatus.APPROVED ? 'Approved - Good candidate profile needed' : null,
          });
          await this.rrfApproverRepository.save(approverData);
        }

        this.logger.log(
          `✓ Created RRF: ${rrfData.rrfNumber} - ${rrfData.positionTitle} (${rrfData.status})`,
        );
      } else {
        this.logger.log(`⊙ RRF already exists: ${rrfData.rrfNumber}`);
      }
    }

    this.logger.log('\n📋 Sample RRFs Created:');
    this.logger.log('   RRF-001: Senior Backend Developer (Pending)');
    this.logger.log('   RRF-002: Frontend React Developer (Approved)');
    this.logger.log('   RRF-003: DevOps Engineer (Draft)');
    this.logger.log('   RRF-004: QA Automation Engineer (On Hold)');
    this.logger.log('   RRF-005: UI/UX Designer (Closed)');
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
