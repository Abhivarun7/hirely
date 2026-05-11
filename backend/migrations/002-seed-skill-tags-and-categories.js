/* eslint-disable @typescript-eslint/no-explicit-any */

module.exports = {
  async up(db: any) {
    // Seed skill tags
    const skillTags = [
      // Programming
      { name: 'JavaScript', slug: 'javascript', category: 'Programming' },
      { name: 'TypeScript', slug: 'typescript', category: 'Programming' },
      { name: 'Python', slug: 'python', category: 'Programming' },
      { name: 'Java', slug: 'java', category: 'Programming' },
      { name: 'C++', slug: 'cpp', category: 'Programming' },
      { name: 'Go', slug: 'go', category: 'Programming' },
      { name: 'Rust', slug: 'rust', category: 'Programming' },
      { name: 'Ruby', slug: 'ruby', category: 'Programming' },
      { name: 'PHP', slug: 'php', category: 'Programming' },
      { name: 'Swift', slug: 'swift', category: 'Programming' },
      { name: 'Kotlin', slug: 'kotlin', category: 'Programming' },

      // Web
      { name: 'React', slug: 'react', category: 'Web' },
      { name: 'Vue.js', slug: 'vuejs', category: 'Web' },
      { name: 'Angular', slug: 'angular', category: 'Web' },
      { name: 'Node.js', slug: 'nodejs', category: 'Web' },
      { name: 'Express', slug: 'express', category: 'Web' },
      { name: 'Django', slug: 'django', category: 'Web' },
      { name: 'Flask', slug: 'flask', category: 'Web' },
      { name: 'Spring Boot', slug: 'spring-boot', category: 'Web' },
      { name: 'ASP.NET', slug: 'aspnet', category: 'Web' },

      // Database
      { name: 'SQL', slug: 'sql', category: 'Database' },
      { name: 'MongoDB', slug: 'mongodb', category: 'Database' },
      { name: 'PostgreSQL', slug: 'postgresql', category: 'Database' },
      { name: 'MySQL', slug: 'mysql', category: 'Database' },
      { name: 'Redis', slug: 'redis', category: 'Database' },
      { name: 'Elasticsearch', slug: 'elasticsearch', category: 'Database' },

      // Cloud
      { name: 'AWS', slug: 'aws', category: 'Cloud' },
      { name: 'Azure', slug: 'azure', category: 'Cloud' },
      { name: 'Google Cloud', slug: 'google-cloud', category: 'Cloud' },
      { name: 'Docker', slug: 'docker', category: 'Cloud' },
      { name: 'Kubernetes', slug: 'kubernetes', category: 'Cloud' },
      { name: 'Terraform', slug: 'terraform', category: 'Cloud' },

      // Data
      { name: 'Machine Learning', slug: 'machine-learning', category: 'Data' },
      { name: 'Deep Learning', slug: 'deep-learning', category: 'Data' },
      { name: 'Data Science', slug: 'data-science', category: 'Data' },
      { name: 'Analytics', slug: 'analytics', category: 'Data' },
      { name: 'Tableau', slug: 'tableau', category: 'Data' },
      { name: 'Power BI', slug: 'power-bi', category: 'Data' },

      // Design
      { name: 'UI/UX', slug: 'ui-ux', category: 'Design' },
      { name: 'Figma', slug: 'figma', category: 'Design' },
      { name: 'Adobe XD', slug: 'adobe-xd', category: 'Design' },
      { name: 'Photoshop', slug: 'photoshop', category: 'Design' },
      { name: 'Illustrator', slug: 'illustrator', category: 'Design' },

      // Soft
      { name: 'Communication', slug: 'communication', category: 'Soft' },
      { name: 'Leadership', slug: 'leadership', category: 'Soft' },
      { name: 'Problem Solving', slug: 'problem-solving', category: 'Soft' },
      { name: 'Teamwork', slug: 'teamwork', category: 'Soft' },
      { name: 'Agile', slug: 'agile', category: 'Soft' },
    ];

    const now = new Date();
    const skillTagDocs = skillTags.map((tag) => ({
      ...tag,
      is_active: true,
      created_at: now,
    }));

    await db.collection('skilltags').insertMany(skillTagDocs);

    // Seed job categories
    const jobCategories = [
      { name: 'Software Engineering', slug: 'software-engineering' },
      { name: 'Data Science', slug: 'data-science' },
      { name: 'Design', slug: 'design' },
      { name: 'Marketing', slug: 'marketing' },
      { name: 'Sales', slug: 'sales' },
      { name: 'Customer Support', slug: 'customer-support' },
      { name: 'Human Resources', slug: 'human-resources' },
      { name: 'Finance', slug: 'finance' },
      { name: 'Operations', slug: 'operations' },
      { name: 'Engineering', slug: 'engineering' },
    ];

    const jobCategoryDocs = jobCategories.map((cat) => ({
      ...cat,
      is_active: true,
      created_at: now,
    }));

    await db.collection('jobcategories').insertMany(jobCategoryDocs);
  },

  async down(db: any) {
    await db.collection('skilltags').deleteMany({});
    await db.collection('jobcategories').deleteMany({});
  },
};