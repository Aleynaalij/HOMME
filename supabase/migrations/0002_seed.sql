-- Services (from Tash's theCut profile)
insert into public.services (name, price_cents, duration_min, price_is_starting, is_addon, sort_order) values
  ('Haircut',                  4500, 30, false, false, 1),
  ('Haircut & Beard Trim',     6000, 45, false, false, 2),
  ('Precision Haircut',        6500, 45, false, false, 3),
  ('Kids Haircut (under 13)',  3500, 30, false, false, 4),
  ('Shape Up',                 3500, 30, false, false, 5),
  ('Shape Up & Beard Trim',    5000, 30, false, false, 6),
  ('Beard Trim',               2500, 20, false, false, 7),
  ('Hair Wash',                1500, 15, false, true,  8),
  ('Hot Oil Treatment',        1500, 15, false, true,  9),
  ('Eyebrows',                 1500, 15, false, true, 10),
  ('Hair Designs',             1500, 15, true,  true, 11);

-- Hours: Sun 10-4, Sat 9-6, closed weekdays
insert into public.business_hours (weekday, is_open, open_time, close_time) values
  (0, true,  '10:00', '16:00'),
  (1, false, null, null),
  (2, false, null, null),
  (3, false, null, null),
  (4, false, null, null),
  (5, false, null, null),
  (6, true,  '09:00', '18:00');

-- Reviews imported from theCut
insert into public.reviews (author_name, rating, body, published, created_at) values
  ('Pook P', 5, null, true, now() - interval '3 days'),
  ('Tony Twitty', 5, null, true, now() - interval '7 days'),
  ('Joseph Threatt', 5, 'It was a great experience!', true, now() - interval '8 days'),
  ('Alexis Jones', 5, null, true, now() - interval '21 days'),
  ('Karsen Batiste', 5, null, true, now() - interval '22 days'),
  ('Eboni Thornton', 5, null, true, now() - interval '28 days'),
  ('Moe Gray', 5, 'Tash is the truth with her clippers! Clean and professional always.', true, now() - interval '33 days'),
  ('Pat A', 5, null, true, now() - interval '35 days'),
  ('Reginald Baker', 5, null, true, now() - interval '38 days'),
  ('Kemia Kirby', 5, null, true, now() - interval '60 days'),
  ('Nicole Robinson', 5, 'I couldn''t ask for a better cut or service. Professional, prompt, comfortable space, and set up, plus good vibes. Master of the craft for sure. 10 out of 10, I definitely recommend.', true, now() - interval '62 days'),
  ('Eric Thompson', 5, null, true, now() - interval '64 days'),
  ('Mike Quinn', 5, null, true, now() - interval '66 days'),
  ('Thomas', 5, 'Tash exhibited exemplary professionalism and meticulous attention to detail during our initial service engagement. I communicated to her that this caliber of service is precisely what has been absent.', true, now() - interval '90 days'),
  ('Edmund Sam', 5, null, true, now() - interval '92 days'),
  ('Kendall Leach', 5, null, true, now() - interval '94 days'),
  ('Mike Simms', 5, null, true, now() - interval '96 days'),
  ('Daniel Marsans', 5, null, true, now() - interval '120 days'),
  ('Trai Jones', 5, null, true, now() - interval '121 days'),
  ('Derrell Jones', 5, null, true, now() - interval '122 days'),
  ('Brandon Beard', 5, null, true, now() - interval '123 days'),
  ('Asia Morrison', 5, 'Tash always gets it right for my two teen boys who come in for cuts. They used to rarely like getting their hair cut until I found Tash. We always leave her chair satisfied.', true, now() - interval '124 days'),
  ('Max James', 5, null, true, now() - interval '125 days'),
  ('Andrea Brower', 5, 'Tash is the best barber in the DMV! She''s been cutting my son''s hair for the past 6yrs. She''s always on time and it''s always clean.', true, now() - interval '126 days'),
  ('Ed Ellis', 5, 'Tash always does a great job with my haircuts. I switched barbers IMMEDIATELY after using her service.', true, now() - interval '127 days'),
  ('Marvin McGill', 5, null, true, now() - interval '128 days');
