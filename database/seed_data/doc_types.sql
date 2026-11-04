-- Seed Data for Document Types
INSERT INTO doc_types (name, description, category) VALUES
('Government ID', 'Government-issued ID document', 'identity'),
('Selfie', 'Selfie photo for identity verification', 'identity'),
('Medical License', 'Medical practice license', 'medical'),
('Degree Certificate', 'Medical degree certificate', 'medical'),
('Board Certification', 'Board certification document', 'medical'),
('Profile Photo', 'User profile photo', 'profile'),
('Signature', 'Electronic signature', 'compliance'),
('BAA Document', 'Business Associate Agreement', 'compliance'),
('NDA Document', 'Non-Disclosure Agreement', 'compliance'),
('HIPAA Training', 'HIPAA training certificate', 'compliance');
