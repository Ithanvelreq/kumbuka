-- SYNTHETIC DEMO DATA. Not a real person. Lets retrieval look meaningful on first run.
insert into public.patients (id, display_name, pin_check)
values ('demo-noor', 'Noor (synthetic demo patient)', 'noop:demo-noor')
on conflict (id) do nothing;

insert into public.events (patient_id, type, content, source_lang, created_at)
select * from (values
  ('demo-noor', 'symptom_log',
   '{"reported_by":"patient","note_en":"Headache for three days, worse in the afternoon.","confidence":"high","needs_review":false,"review_reason":null,"details":{"synthetic":true,"duration":"3 days"}}'::jsonb,
   'sw', now() - interval '6 days'),
  ('demo-noor', 'symptom_log',
   '{"reported_by":"patient","note_en":"Fever at night since yesterday, feels tired.","confidence":"medium","needs_review":false,"review_reason":null,"details":{"synthetic":true,"duration":"since yesterday"}}'::jsonb,
   'sw', now() - interval '3 days'),
  ('demo-noor', 'symptom_log',
   '{"reported_by":"patient","note_en":"Something about the stomach, rest unclear.","confidence":"low","needs_review":true,"review_reason":"Low transcription confidence","details":{"synthetic":true}}'::jsonb,
   'sw', now() - interval '1 day')
) as seed(patient_id, type, content, source_lang, created_at)
where not exists (select 1 from public.events where patient_id = 'demo-noor');
