/* eslint-disable @typescript-eslint/no-explicit-any */

module.exports = {
  async up(db: any) {
    // Text indexes on jobs for full-text search
    await db.collection('jobs').createIndex(
      { title: 'text', description: 'text', responsibilities: 'text', requirements: 'text' },
      { name: 'jobs_text_search', background: true }
    );

    // 2dsphere index on company_branches.location
    await db.collection('company_branches').createIndex(
      { location: '2dsphere' },
      { name: 'company_branches_location_2dsphere', background: true }
    );

    // 2dsphere index on jobs.locations.geo
    await db.collection('jobs').createIndex(
      { 'locations.geo': '2dsphere' },
      { name: 'jobs_locations_geo_2dsphere', background: true }
    );

    // Compound indexes
    await db.collection('applications').createIndex(
      { job_id: 1, seeker_id: 1 },
      { name: 'applications_job_seeker_unique', unique: true, background: true }
    );

    await db.collection('savedjobs').createIndex(
      { seeker_id: 1, job_id: 1 },
      { name: 'savedjobs_seeker_job_unique', unique: true, background: true }
    );

    await db.collection('seekerskills').createIndex(
      { seeker_id: 1, skill_tag_id: 1 },
      { name: 'seekerskills_seeker_skill_unique', unique: true, background: true }
    );

    await db.collection('jobskills').createIndex(
      { job_id: 1, skill_tag_id: 1 },
      { name: 'jobskills_job_skill_unique', unique: true, background: true }
    );

    // TTL index on refresh_tokens (expires_at)
    await db.collection('refreshtokens').createIndex(
      { expires_at: 1 },
      { name: 'refreshtokens_ttl_expires', expireAfterSeconds: 0, background: true }
    );

    // Index on audit_logs (created_at: -1)
    await db.collection('auditlogs').createIndex(
      { created_at: -1 },
      { name: 'auditlogs_created_at_desc', background: true }
    );

    // Index on audit_logs (entity_type: 1, entity_id: 1)
    await db.collection('auditlogs').createIndex(
      { entity_type: 1, entity_id: 1 },
      { name: 'auditlogs_entity_type_id', background: true }
    );
  },

  async down(db: any) {
    // Drop text index on jobs
    await db.collection('jobs').dropIndex('jobs_text_search');

    // Drop 2dsphere index on company_branches.location
    await db.collection('company_branches').dropIndex('company_branches_location_2dsphere');

    // Drop 2dsphere index on jobs.locations.geo
    await db.collection('jobs').dropIndex('jobs_locations_geo_2dsphere');

    // Drop compound indexes
    await db.collection('applications').dropIndex('applications_job_seeker_unique');
    await db.collection('savedjobs').dropIndex('savedjobs_seeker_job_unique');
    await db.collection('seekerskills').dropIndex('seekerskills_seeker_skill_unique');
    await db.collection('jobskills').dropIndex('jobskills_job_skill_unique');

    // Drop TTL index on refresh_tokens
    await db.collection('refreshtokens').dropIndex('refreshtokens_ttl_expires');

    // Drop audit_logs indexes
    await db.collection('auditlogs').dropIndex('auditlogs_created_at_desc');
    await db.collection('auditlogs').dropIndex('auditlogs_entity_type_id');
  },
};