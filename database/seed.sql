-- Sample bilingual survey. Only inserted when the surveys table is empty.

DO $$
DECLARE
  sid INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM surveys) THEN
    RAISE NOTICE 'surveys table is not empty, skipping seed';
    RETURN;
  END IF;

  INSERT INTO surveys (title, description, is_active)
  VALUES (
    '{"en": "Customer Satisfaction Survey", "km": "ការស្ទង់មតិពេញចិត្តរបស់អតិថិជន"}',
    '{"en": "Help us improve our service. It only takes 2 minutes.", "km": "សូមជួយយើងកែលម្អសេវាកម្ម។ ចំណាយពេលតែ ២ នាទីប៉ុណ្ណោះ។"}',
    TRUE
  )
  RETURNING id INTO sid;

  INSERT INTO questions (survey_id, text, type, options, is_required, position) VALUES
  (
    sid,
    '{"en": "Which of our services have you used?", "km": "តើអ្នកបានប្រើសេវាកម្មណាខ្លះរបស់យើង?"}',
    'checkbox',
    '[
      {"id": "svc_delivery", "label": {"en": "Delivery", "km": "ការដឹកជញ្ជូន"}},
      {"id": "svc_pickup",   "label": {"en": "In-store pickup", "km": "មកយកនៅហាង"}},
      {"id": "svc_online",   "label": {"en": "Online ordering", "km": "ការកុម្ម៉ង់តាមអនឡាញ"}},
      {"id": "svc_support",  "label": {"en": "Customer support", "km": "សេវាជំនួយអតិថិជន"}}
    ]',
    TRUE,
    0
  ),
  (
    sid,
    '{"en": "How satisfied are you overall?", "km": "តើអ្នកពេញចិត្តប៉ុណ្ណាជារួម?"}',
    'radio',
    '[
      {"id": "sat_5", "label": {"en": "Very satisfied", "km": "ពេញចិត្តខ្លាំង"}},
      {"id": "sat_4", "label": {"en": "Satisfied", "km": "ពេញចិត្ត"}},
      {"id": "sat_3", "label": {"en": "Neutral", "km": "ធម្មតា"}},
      {"id": "sat_2", "label": {"en": "Dissatisfied", "km": "មិនពេញចិត្ត"}},
      {"id": "sat_1", "label": {"en": "Very dissatisfied", "km": "មិនពេញចិត្តខ្លាំង"}}
    ]',
    TRUE,
    1
  ),
  (
    sid,
    '{"en": "What should we improve?", "km": "តើយើងគួរកែលម្អអ្វីខ្លះ?"}',
    'checkbox',
    '[
      {"id": "imp_price",   "label": {"en": "Price", "km": "តម្លៃ"}},
      {"id": "imp_speed",   "label": {"en": "Speed", "km": "ល្បឿន"}},
      {"id": "imp_quality", "label": {"en": "Product quality", "km": "គុណភាពផលិតផល"}},
      {"id": "imp_staff",   "label": {"en": "Staff friendliness", "km": "ភាពរួសរាយរបស់បុគ្គលិក"}}
    ]',
    FALSE,
    2
  ),
  (
    sid,
    '{"en": "Any other comments?", "km": "មានមតិយោបល់ផ្សេងទៀតទេ?"}',
    'paragraph',
    '[]',
    FALSE,
    3
  );

  RAISE NOTICE 'Seeded survey %', sid;
END $$;
