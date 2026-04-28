const axios = require('axios');

async function setupStep3() {
  const token = 'YOUR_AUTH_TOKEN_HERE'; // User needs to provide this or I can try to find a way
  const baseUrl = 'http://localhost:4000';

  const configs = [
    {
      fieldName: 'primaryTechnologies',
      label: 'Primary Technologies',
      options: ['Java', 'Python', 'React', 'Node.js', 'Angular', 'DotNet', 'AWS', 'Azure'],
      step: 3,
      section: 'Core Expertise',
      displayOrder: 1,
      isActive: true,
      type: 'select'
    }
  ];

  for (const config of configs) {
    try {
      await axios.post(`${baseUrl}/rrf/form-config`, config, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`Added ${config.fieldName}`);
    } catch (error) {
      console.error(`Failed to add ${config.fieldName}:`, error.response?.data || error.message);
    }
  }
}

setupStep3();
