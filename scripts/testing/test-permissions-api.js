#!/usr/bin/env node

/**
 * Quick Test Script for Permissions API
 * 
 * Usage:
 *   node test-permissions-api.js <your-jwt-token>
 * 
 * Or get token first:
 *   node test-permissions-api.js login admin your_password
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function login(userId, password) {
  console.log('🔐 Logging in...');
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Login failed:', data);
      return null;
    }

    console.log('✅ Login successful');
    console.log('📋 User:', data.user?.email);
    console.log('🔑 Token:', data.access_token?.substring(0, 20) + '...');
    return data.access_token;
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return null;
  }
}

async function testPermissionsAPI(token) {
  console.log('\n📡 Testing GET /permissions...');
  console.log('🌐 API URL:', `${API_BASE_URL}/permissions`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/permissions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 Status:', response.status, response.statusText);

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ API Error:', data);
      
      if (response.status === 403) {
        console.error('\n⚠️  403 Forbidden - ADMIN role missing ROLES.UPDATE permission');
        console.error('Fix: Run setup-roles-permissions.sql');
      } else if (response.status === 401) {
        console.error('\n⚠️  401 Unauthorized - Token invalid or expired');
        console.error('Fix: Login again to get fresh token');
      }
      return;
    }

    console.log('✅ API Response:', JSON.stringify(data, null, 2));
    console.log(`\n📋 Total permissions: ${data.data?.length || 0}`);
    
    if (data.data && data.data.length > 0) {
      console.log('\n🎯 Sample permissions:');
      data.data.slice(0, 5).forEach(perm => {
        console.log(`  - ${perm.module.moduleCode}.${perm.permissionCode}: ${perm.permissionName}`);
      });
      
      // Group by module
      const byModule = {};
      data.data.forEach(perm => {
        const module = perm.module.moduleCode;
        if (!byModule[module]) byModule[module] = 0;
        byModule[module]++;
      });
      
      console.log('\n📊 Permissions by module:');
      Object.entries(byModule).forEach(([module, count]) => {
        console.log(`  ${module}: ${count} permissions`);
      });
    } else {
      console.warn('⚠️  No permissions returned - check database');
      console.warn('Run: psql -d rrf_portal -f debug-permissions-api.sql');
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n⚠️  Cannot connect to backend');
      console.error('Fix: Ensure backend is running on port 4000');
      console.error('  cd rrf-portal-backend && npm run start:dev');
    }
  }
}

async function testRolePermissionsAPI(token, roleId = 1) {
  console.log(`\n📡 Testing GET /roles/${roleId}/permissions...`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}/permissions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 Status:', response.status, response.statusText);

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ API Error:', data);
      return;
    }

    console.log('✅ Role permissions:', JSON.stringify(data, null, 2));
    console.log(`\n📋 Role has ${data.data?.length || 0} permissions assigned`);
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Main execution
(async () => {
  console.log('🧪 RRF Portal - Permissions API Test');
  console.log('=====================================\n');

  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage:');
    console.error('  node test-permissions-api.js <jwt-token>');
    console.error('  node test-permissions-api.js login <userId> <password>');
    console.error('\nExample:');
    console.error('  node test-permissions-api.js login admin yourpassword');
    process.exit(1);
  }

  let token;

  if (args[0] === 'login') {
    if (args.length < 3) {
      console.error('❌ Missing credentials');
      console.error('Usage: node test-permissions-api.js login <userId> <password>');
      process.exit(1);
    }
    token = await login(args[1], args[2]);
    if (!token) {
      process.exit(1);
    }
  } else {
    token = args[0];
  }

  // Test endpoints
  await testPermissionsAPI(token);
  await testRolePermissionsAPI(token);

  console.log('\n✅ Test complete\n');
})();
