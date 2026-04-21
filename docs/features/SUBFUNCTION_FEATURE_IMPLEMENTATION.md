# Dynamic Subfunction Selection - Implementation Guide

## Backend Implementation ✅ COMPLETED

### Files Created/Modified:

**New Entities:**
1. `src/subfunctions/subfunction.entity.ts`
2. `src/user-subfunctions/user-subfunction.entity.ts`

**New Modules:**
3. `src/subfunctions/subfunctions.module.ts`
4. `src/subfunctions/subfunctions.service.ts`
5. `src/subfunctions/subfunctions.controller.ts`
6. `src/user-subfunctions/user-subfunctions.module.ts`

**DTOs:**
7. `src/users/dto/create-user.dto.ts`
8. `src/users/dto/update-user.dto.ts`

**Modified Files:**
9. `src/app.module.ts` - Added Subfunctions and UserSubfunctions modules
10. `src/users/user.entity.ts` - Added OneToMany relationship to userSubfunctions
11. `src/users/users.service.ts` - Added subfunction assignment logic
12. `src/users/users.controller.ts` - Updated to use DTOs with Swagger decorators
13. `src/users/users.module.ts` - Added UserSubfunction repository

---

## Remaining Steps:

### 1. Seed Subfunctions Data

Add to `src/database/seed.service.ts`:

```typescript
import { Subfunction } from '../subfunctions/subfunction.entity';

// In constructor, add:
@InjectRepository(Subfunction)
private subfunctionRepository: Repository<Subfunction>,

// Add method:
private async seedSubfunctions() {
  const subfunctions = [
    // Delivery subfunctions
    { name: 'SGINTL', function: 'Delivery', displayOrder: 1 },
    { name: 'VR', function: 'Delivery', displayOrder: 2 },
    { name: 'PMO', function: 'Delivery', displayOrder: 3 },
    
    // Sales subfunctions
    { name: 'BDE', function: 'Sales', displayOrder: 1 },
    { name: 'Sales', function: 'Sales', displayOrder: 2 },
    { name: 'MR', function: 'Sales', displayOrder: 3 },
    { name: 'Marketing', function: 'Sales', displayOrder: 4 },
    
    // Support subfunctions
    { name: 'Human Resources', function: 'Support', displayOrder: 1 },
    { name: 'Talent Acquisition', function: 'Support', displayOrder: 2 },
    { name: 'Accounts', function: 'Support', displayOrder: 3 },
    { name: 'IT Networking', function: 'Support', displayOrder: 4 },
  ];

  for (const data of subfunctions) {
    const exists = await this.subfunctionRepository.findOne({ where: { name: data.name } });
    if (!exists) {
      await this.subfunctionRepository.save(this.subfunctionRepository.create(data));
      this.logger.log(`✓ Created subfunction: ${data.name}`);
    }
  }
}

// In seedAll(), add after seedRoles():
await this.seedSubfunctions();
```

### 2. Update seed.module.ts

```typescript
import { Subfunction } from '../subfunctions/subfunction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      //... existing entities
      Subfunction,
    ]),
  ],
  //...
})
```

### 3. Create Frontend API Client

Add to `rrf-portal-nextjs/lib/api/subfunctionsApi.js`:

```javascript
import { api } from './apiConfig';

export const subfunctionsApi = {
  getAll: async () => {
    return api.get('/subfunctions');
  },
  
  getByFunction: async (functionName) => {
    return api.get(`/subfunctions?function=${functionName}`);
  },
};
```

### 4. Update Frontend User Form

File: `rrf-portal-nextjs/app/admin/users/page.jsx`

Add state and fetch subfunctions:

```jsx
const [subfunctions, setSubfunctions] = useState([])
const [selectedRole, setSelectedRole] = useState(null)

// Fetch subfunctions on mount
useEffect(() => {
  const fetchSubfunctions = async () => {
    try {
      const res = await fetch('/api/subfunctions', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setSubfunctions(data.data || [])
    } catch (error) {
      console.error('Failed to fetch subfunctions:', error)
    }
  }
  fetchSubfunctions()
}, [])

// In Create Modal Form, add after role selection:
<Form.Item
  noStyle
  shouldUpdate={(prevValues, currentValues) => 
    prevValues.roleId !== currentValues.roleId
  }
>
  {({ getFieldValue }) => {
    const roleId = getFieldValue('roleId')
    const selectedRole = roles.find(r => r.id === roleId)
    const isApprover = selectedRole?.roleCode === 'APPROVER'
    
    if (!isApprover) return null
    
    return (
      <Form.Item
        name="subfunctionIds"
        label={
          <span>
            Subfunctions <span className="text-red-500">*</span>
          </span>
        }
        rules={[
          { 
            required: true, 
            message: 'Select at least one subfunction for APPROVER role',
            type: 'array',
            min: 1,
          }
        ]}
      >
        <Checkbox.Group style={{ width: '100%' }}>
          <div className="grid grid-cols-2 gap-2">
            {subfunctions.map(sf => (
              <Checkbox key={sf.id} value={sf.id}>
                {sf.name}
              </Checkbox>
            ))}
          </div>
        </Checkbox.Group>
      </Form.Item>
    )
  }}
</Form.Item>
```

Add same to Edit Modal.

### 5. RRF Filtering for Approvers (Optional Enhancement)

Modify `src/rrf/rrf.service.ts` in `getPendingApprovals()`:

```typescript
async getPendingApprovals(userId?: number): Promise<Rrf[]> {
  if (!userId) {
    // Admin view - all pending
    return await this.rrfRepository.find({
      where: { status: RrfStatus.PENDING },
      relations: ['createdBy', 'approvers', 'approvers.user'],
      order: { submittedAt: 'DESC' },
    });
  }
  
  // Approver view - filter by assigned subfunctions
  const userSubfunctions = await this.dataSource
    .getRepository(UserSubfunction)
    .find({ where: { userId }, relations: ['subfunction'] });
    
  const subfunctionNames = userSubfunctions.map(us => us.subfunction.name);
  
  return await this.rrfRepository
    .createQueryBuilder('rrf')
    .leftJoinAndSelect('rrf.createdBy', 'createdBy')
    .leftJoinAndSelect('rrf.approvers', 'approvers')
    .leftJoinAndSelect('approvers.user', 'approverUser')    
    .where('rrf.status = :status', { status: RrfStatus.PENDING })
    .andWhere('rrf.subFunction IN (:...subfunctions)', { 
      subfunctions: subfunctionNames.length > 0 ? subfunctionNames : [''] 
    })
    .orderBy('rrf.submittedAt', 'DESC')
    .getMany();
}
```

Update controller to pass userId:

```typescript
@Get('pending-approvals')
async getPendingApprovals(@CurrentUser() user: AuthUser) {
  const rrfs = await this.rrfService.getPendingApprovals(user.id);
  return { success: true, data: rrfs };
}
```

---

## Testing Checklist:

- [ ] Run backend: `npm run start:dev`
- [ ] Seed database: `POST http://localhost:4000/seed`
- [ ] Test GET /subfunctions - should return 11 subfunctions
- [ ] Create approver user with subfunctions via Admin panel
- [ ] Verify validation: Creating APPROVER without subfunctions fails
- [ ] Create other role without subfunctions - should succeed
- [ ] Update user role to APPROVER - should require subfunctions
- [ ] Frontend: Subfunction field appears only for APPROVER role
- [ ] Frontend: Multi-select checkboxes work correctly
- [ ] Test RRF filtering (if implemented) - approver sees only their subfunctions

---

## API Endpoints Added:

- `GET /subfunctions` - List all active subfunctions
- `GET /subfunctions?function=Delivery` - Filter by function
- `POST /users` - Enhanced with subfunctionIds validation
- `PUT /users/:id` - Enhanced with subfunction management

---

## Database Schema:

```sql
-- New tables created automatically by TypeORM

CREATE TABLE subfunctions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  function VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_subfunctions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  subfunction_id INTEGER REFERENCES subfunctions(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, subfunction_id)
);
```

---

## Notes:

✅ All business logic preserved  
✅ RBAC not modified  
✅ Backward compatible (non-APPROVER roles unaffected)  
✅ Validation at service layer  
✅ Clean separation of concerns  
✅ Swagger documentation included  
