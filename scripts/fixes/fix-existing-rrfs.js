/**
 * Utility script to assign approvers to existing RRFs
 * Run this once to fix RRFs that were created before the auto-assign feature
 */

const API_URL = 'http://localhost:4000';

// You need to get a valid JWT token from an admin/user with RRF.UPDATE permission
// Login first, then copy the token from localStorage or the network tab
const TOKEN = 'YOUR_JWT_TOKEN_HERE';

async function fixRRF(rrfId) {
  try {
    const response = await fetch(`${API_URL}/rrf/${rrfId}/assign-approvers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✓ Fixed RRF #${rrfId}: ${data.message}`);
      return true;
    } else {
      console.log(`✗ Failed to fix RRF #${rrfId}: ${data.message}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Error fixing RRF #${rrfId}:`, error.message);
    return false;
  }
}

async function fixAllPendingRRFs() {
  try {
    console.log('Fetching all RRFs...\n');

    const response = await fetch(`${API_URL}/rrf?status=pending`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!result.success || !result.data) {
      console.error('Failed to fetch RRFs:', result.message);
      return;
    }

    const pendingRRFs = result.data;
    console.log(`Found ${pendingRRFs.length} pending RRFs\n`);

    let fixed = 0;
    let failed = 0;

    for (const rrf of pendingRRFs) {
      const hasApprovers = rrf.approvers && rrf.approvers.length > 0;
      
      if (!hasApprovers) {
        console.log(`RRF-${rrf.rrfNumber} (ID: ${rrf.id}) - No approvers, fixing...`);
        const success = await fixRRF(rrf.id);
        if (success) {
          fixed++;
        } else {
          failed++;
        }
      } else {
        console.log(`RRF-${rrf.rrfNumber} (ID: ${rrf.id}) - Already has approvers, skipping`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`Summary:`);
    console.log(`  Total Pending RRFs: ${pendingRRFs.length}`);
    console.log(`  Fixed: ${fixed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Already had approvers: ${pendingRRFs.length - fixed - failed}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Instructions
console.log('='.repeat(70));
console.log('Fix Existing RRFs - Approver Assignment Script');
console.log('='.repeat(70));
console.log('\nIMPORTANT: Update the TOKEN variable in this script first!');
console.log('\nHow to get the token:');
console.log('1. Open http://localhost:3000 in your browser');
console.log('2. Login as a user with RRF.UPDATE permission');
console.log('3. Open Developer Tools (F12) > Console');
console.log('4. Type: localStorage.getItem("token")');
console.log('5. Copy the token and paste it in this script\n');
console.log('Then run this script with: node fix-existing-rrfs.js\n');
console.log('='.repeat(70) + '\n');

if (TOKEN === 'YOUR_JWT_TOKEN_HERE') {
  console.log('❌ Please update the TOKEN variable first!\n');
  process.exit(1);
}

// Run the fix
fixAllPendingRRFs();
