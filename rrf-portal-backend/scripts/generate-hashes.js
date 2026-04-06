const bcrypt = require('bcrypt');

async function generateHashes() {
  const passwords = {
    'Hiring Manager (hm123)': 'hm123',
    'PMO (pmo123)': 'pmo123',
    'Approver (app123)': 'app123',
    'HR (hr123)': 'hr123',
  };

  console.log('Generating password hashes...\n');

  for (const [label, password] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`${label}:`);
    console.log(`  Password: ${password}`);
    console.log(`  Hash: ${hash}`);
    console.log('');
  }
}

generateHashes();
