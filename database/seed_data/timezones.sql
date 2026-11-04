-- Seed Data for Timezones
INSERT INTO timezones (name, utc_offset, region) VALUES
('UTC', '+00:00', 'UTC'),
('America/New_York', '-05:00', 'America'),
('America/Chicago', '-06:00', 'America'),
('America/Denver', '-07:00', 'America'),
('America/Los_Angeles', '-08:00', 'America'),
('America/Phoenix', '-07:00', 'America'),
('Europe/London', '+00:00', 'Europe'),
('Europe/Paris', '+01:00', 'Europe'),
('Europe/Berlin', '+01:00', 'Europe'),
('Europe/Moscow', '+03:00', 'Europe'),
('Asia/Kolkata', '+05:30', 'Asia'),
('Asia/Tokyo', '+09:00', 'Asia'),
('Asia/Shanghai', '+08:00', 'Asia'),
('Asia/Dubai', '+04:00', 'Asia'),
('Asia/Singapore', '+08:00', 'Asia'),
('Australia/Sydney', '+11:00', 'Australia'),
('Pacific/Auckland', '+13:00', 'Pacific');
