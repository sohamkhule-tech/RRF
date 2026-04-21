-- ============================================
-- Migration: Add Job Descriptions Table
-- Purpose: Store prefilled job descriptions for RRF creation
-- Date: April 21, 2026
-- ============================================

-- Create job_descriptions table
CREATE TABLE IF NOT EXISTS job_descriptions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_by_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_job_description_created_by FOREIGN KEY (created_by_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_descriptions_title ON job_descriptions(title);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_created_by ON job_descriptions(created_by_id);

-- Insert sample job descriptions
INSERT INTO job_descriptions (title, description, created_by_id) VALUES
(
    'React Developer - Senior',
    '<h3>Job Overview</h3><p>We are seeking an experienced Senior React Developer to join our dynamic frontend team. You will be responsible for building high-performance, scalable web applications using modern React ecosystem.</p><h3>Key Responsibilities</h3><ul><li>Develop and maintain React-based web applications</li><li>Collaborate with UX/UI designers to implement pixel-perfect interfaces</li><li>Write clean, maintainable, and testable code</li><li>Participate in code reviews and mentor junior developers</li><li>Optimize applications for maximum speed and scalability</li></ul><h3>Required Qualifications</h3><ul><li>5+ years of experience in frontend development</li><li>3+ years of hands-on experience with React.js</li><li>Strong proficiency in JavaScript ES6+, TypeScript</li><li>Experience with state management (Redux, Context API, Zustand)</li><li>Familiarity with modern build tools (Webpack, Vite)</li><li>Strong understanding of RESTful APIs and GraphQL</li></ul>',
    1
),
(
    'Node.js Backend Developer',
    '<h3>Position Summary</h3><p>Join our backend engineering team as a Node.js Developer. You will architect and build scalable microservices and APIs that power our platform.</p><h3>Responsibilities</h3><ul><li>Design and develop RESTful APIs and microservices</li><li>Implement authentication and authorization mechanisms</li><li>Optimize database queries and application performance</li><li>Write comprehensive unit and integration tests</li><li>Deploy and maintain applications in cloud environments</li></ul><h3>Requirements</h3><ul><li>4+ years of backend development experience</li><li>Strong proficiency in Node.js and Express.js/NestJS</li><li>Experience with SQL (PostgreSQL, MySQL) and NoSQL databases</li><li>Familiarity with Docker and Kubernetes</li><li>Understanding of microservices architecture</li><li>Experience with CI/CD pipelines</li></ul>',
    1
),
(
    'Full Stack Developer - MERN',
    '<h3>About the Role</h3><p>We are looking for a versatile Full Stack Developer proficient in the MERN stack to build end-to-end solutions for our clients.</p><h3>What You''ll Do</h3><ul><li>Develop frontend using React.js and Material-UI/Ant Design</li><li>Build backend services using Node.js and Express</li><li>Design and implement MongoDB schemas</li><li>Integrate third-party APIs and services</li><li>Ensure responsive design and cross-browser compatibility</li></ul><h3>Qualifications</h3><ul><li>3+ years of full stack development experience</li><li>Expertise in MongoDB, Express.js, React.js, Node.js</li><li>Experience with Next.js is a plus</li><li>Strong understanding of RESTful API design</li><li>Experience with Git and version control</li><li>Excellent problem-solving skills</li></ul>',
    1
),
(
    'DevOps Engineer',
    '<h3>Role Description</h3><p>Seeking a skilled DevOps Engineer to streamline our development operations, automate deployments, and maintain infrastructure.</p><h3>Key Duties</h3><ul><li>Design and implement CI/CD pipelines</li><li>Manage cloud infrastructure (AWS/Azure/GCP)</li><li>Automate deployment processes</li><li>Monitor system performance and troubleshoot issues</li><li>Implement security best practices</li></ul><h3>Required Skills</h3><ul><li>3+ years of DevOps experience</li><li>Proficiency with Docker and Kubernetes</li><li>Experience with Jenkins, GitLab CI, or GitHub Actions</li><li>Strong knowledge of Linux administration</li><li>Familiarity with Infrastructure as Code (Terraform, Ansible)</li><li>Scripting skills in Bash, Python, or PowerShell</li></ul>',
    1
),
(
    'QA Automation Engineer',
    '<h3>Position Overview</h3><p>Join our Quality Assurance team to build and maintain automated testing frameworks that ensure our software meets the highest quality standards.</p><h3>Responsibilities</h3><ul><li>Design and develop automated test scripts</li><li>Implement continuous testing in CI/CD pipelines</li><li>Perform functional, regression, and performance testing</li><li>Identify, document, and track bugs</li><li>Collaborate with development teams to improve quality</li></ul><h3>Requirements</h3><ul><li>4+ years of QA automation experience</li><li>Proficiency with Selenium, Cypress, or Playwright</li><li>Experience with API testing tools (Postman, RestAssured)</li><li>Knowledge of testing frameworks (Jest, Mocha, JUnit)</li><li>Understanding of Agile methodologies</li><li>Strong analytical and problem-solving skills</li></ul>',
    1
);

-- Verification query
SELECT id, title, LEFT(description, 50) as description_preview, created_at 
FROM job_descriptions 
ORDER BY created_at DESC;

COMMENT ON TABLE job_descriptions IS 'Stores prefilled job descriptions for RRF creation';
COMMENT ON COLUMN job_descriptions.title IS 'Short descriptive title for the job description';
COMMENT ON COLUMN job_descriptions.description IS 'Full HTML formatted job description';
COMMENT ON COLUMN job_descriptions.created_by_id IS 'User who created this template';
