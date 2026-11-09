-- Run ONCE on an existing MySQL database before deploying the new backend if DB_DDL_AUTO=validate.
-- Hibernate update/create profiles add this column automatically; do not run ALTER twice.
ALTER TABLE criteria ADD COLUMN display_order INT NULL;

-- Historical insertion timestamps were not stored. Use a stable baseline for existing criteria.
-- Newly added criteria append to the end; owners can adjust the order before scoring opens.
UPDATE criteria c
JOIN (SELECT criterion_id, ROW_NUMBER() OVER (PARTITION BY competition_id ORDER BY criterion_id) AS position_no
      FROM criteria) ordered ON ordered.criterion_id = c.criterion_id
SET c.display_order = ordered.position_no
WHERE c.display_order IS NULL;
