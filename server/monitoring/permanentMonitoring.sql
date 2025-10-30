-- 💾 PERMANENT MONITORING QUERY
-- Surfaces applications with zero documents for immediate attention
-- Run as admin query or cron job

SELECT 
    applications.id as application_id,
    applications.legal_business_file_name,
    applications.contact_email,
    applications.created_at,
    COUNT(documents.id) as document_count,
    CASE 
        WHEN COUNT(documents.id) = 0 THEN '🚨 ZERO DOCUMENTS' 
        ELSE '✅ HAS DOCUMENTS'
    END as status
FROM applications
LEFT JOIN documents ON documents.application_id = applications.id
WHERE applications.created_at > NOW() - INTERVAL '24 hours'
GROUP BY applications.id, applications.legal_business_file_name, applications.contact_email, applications.created_at
HAVING COUNT(documents.id) = 0
ORDER BY applications.created_at DESC;