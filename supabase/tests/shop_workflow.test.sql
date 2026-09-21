-- Repeatable, local-only pgTAP checks. Every fixture is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

select set_config('test.user_a', gen_random_uuid()::text, true);
select set_config('test.user_b', gen_random_uuid()::text, true);
insert into auth.users (id) values
  (current_setting('test.user_a')::uuid), (current_setting('test.user_b')::uuid);

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);
select set_config('test.shop_a', public.create_initial_shop('RLS test shop A')::text, true);
select is((select count(*) from shops), 1::bigint, 'owner reads own shop');
select is((select role from shop_members), 'owner', 'bootstrap assigns owner to caller');
select throws_ok($$select public.create_initial_shop('duplicate')$$, '23505', null, 'duplicate first shop rejected');
select is((select count(*) from shops), 1::bigint, 'duplicate bootstrap leaves no extra shop');
select throws_ok($$insert into shops(name) values ('bypass')$$, '42501', null, 'direct shop bootstrap denied');
select throws_ok($$update shop_members set role = 'manager'$$, '42501', null, 'membership role cannot be edited by client');
select lives_ok($$insert into customers(shop_id, first_name, last_name) values (current_setting('test.shop_a')::uuid, 'RLS', 'A')$$, 'owner creates own customer');
select set_config('test.customer_a', (select id::text from customers), true);
select lives_ok($$insert into vehicles(shop_id, customer_id, make) values (current_setting('test.shop_a')::uuid, current_setting('test.customer_a')::uuid, 'RLS A')$$, 'owner creates own vehicle');
select set_config('test.vehicle_a', (select id::text from vehicles), true);
select is((select count(*) from customers), 1::bigint, 'owner reads own customer');
select is((select count(*) from vehicles), 1::bigint, 'owner reads own vehicle');
select lives_ok($$update customers set phone = '555-0100'$$, 'owner updates own customer');
select lives_ok($$update vehicles set mileage = 100$$, 'owner updates own vehicle');
select is((select phone from customers), '555-0100', 'customer update persists in database');
select is((select mileage from vehicles), 100, 'vehicle update persists in database');

select set_config('request.jwt.claim.sub', current_setting('test.user_b'), true);
select set_config('test.shop_b', public.create_initial_shop('RLS test shop B')::text, true);
select lives_ok($$insert into customers(shop_id, first_name, last_name) values (current_setting('test.shop_b')::uuid, 'RLS', 'B')$$, 'second owner creates own customer');
select set_config('test.customer_b', (select id::text from customers), true);
select lives_ok($$insert into vehicles(shop_id, customer_id) values (current_setting('test.shop_b')::uuid, current_setting('test.customer_b')::uuid)$$, 'second owner creates own vehicle');
select set_config('test.vehicle_b', (select id::text from vehicles), true);
select is((select count(*) from shops where id = current_setting('test.shop_a')::uuid), 0::bigint, 'shop B cannot read shop A');
select is((select count(*) from customers where id = current_setting('test.customer_a')::uuid), 0::bigint, 'shop B cannot read customer A');
select is((select count(*) from vehicles where id = current_setting('test.vehicle_a')::uuid), 0::bigint, 'shop B cannot read vehicle A');
select is((select count(*) from shop_members), 1::bigint, 'membership policy exposes only own memberships');

select set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);
select is((select count(*) from customers where id = current_setting('test.customer_b')::uuid), 0::bigint, 'shop A cannot read customer B');
select is((select count(*) from vehicles where id = current_setting('test.vehicle_b')::uuid), 0::bigint, 'shop A cannot read vehicle B');
select throws_ok($$insert into customers(shop_id, first_name, last_name) values (current_setting('test.shop_b')::uuid, 'Intruder', 'Denied')$$, '42501', null, 'cross-shop customer insertion denied');
select throws_ok($$insert into vehicles(shop_id, customer_id) values (current_setting('test.shop_b')::uuid, current_setting('test.customer_b')::uuid)$$, '42501', null, 'cross-shop vehicle insertion denied');
select throws_ok($$insert into vehicles(shop_id, customer_id) values (current_setting('test.shop_a')::uuid, current_setting('test.customer_b')::uuid)$$, '23503', null, 'composite FK denies cross-shop customer link');
select throws_ok($$update vehicles set customer_id = current_setting('test.customer_b')::uuid$$, '23503', null, 'composite FK denies cross-shop reassignment');
select throws_ok($$update customers set shop_id = current_setting('test.shop_b')::uuid$$, '42501', null, 'customer shop is immutable to client');
select throws_ok($$update vehicles set shop_id = current_setting('test.shop_b')::uuid$$, '42501', null, 'vehicle shop is immutable to client');
with changed as (update customers set notes = 'intrusion' where id = current_setting('test.customer_b')::uuid returning id) select is((select count(*) from changed), 0::bigint, 'cross-shop customer update affects no rows');
with changed as (update vehicles set notes = 'intrusion' where id = current_setting('test.vehicle_b')::uuid returning id) select is((select count(*) from changed), 0::bigint, 'cross-shop vehicle update affects no rows');
select throws_ok($$delete from customers$$, '42501', null, 'customer deletion denied');
select throws_ok($$delete from vehicles$$, '42501', null, 'vehicle deletion denied');

reset role;
update shop_members set role = 'technician' where user_id = current_setting('test.user_a')::uuid;
set local role authenticated;
select is((select count(*) from customers), 1::bigint, 'technician can read own shop customers');
select is((select count(*) from vehicles), 1::bigint, 'technician can read own shop vehicles');
select throws_ok($$insert into customers(shop_id, first_name, last_name) values (current_setting('test.shop_a')::uuid, 'Denied', 'Tech')$$, '42501', null, 'technician cannot create customer');
select throws_ok($$insert into vehicles(shop_id, customer_id) values (current_setting('test.shop_a')::uuid, current_setting('test.customer_a')::uuid)$$, '42501', null, 'technician cannot create vehicle');
with changed as (update customers set notes = 'tech' returning id) select is((select count(*) from changed), 0::bigint, 'technician cannot update customers');
with changed as (update vehicles set notes = 'tech' returning id) select is((select count(*) from changed), 0::bigint, 'technician cannot update vehicles');
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.user_a'), 'user_metadata', json_build_object('role', 'owner'))::text, true);
select throws_ok($$insert into customers(shop_id, first_name, last_name) values (current_setting('test.shop_a')::uuid, 'Denied', 'Metadata')$$, '42501', null, 'editable metadata cannot elevate technician');

reset role;
update shop_members set role = 'manager' where user_id = current_setting('test.user_a')::uuid;
set local role authenticated;
select lives_ok($$insert into customers(shop_id, first_name, last_name) values (current_setting('test.shop_a')::uuid, 'RLS', 'Manager')$$, 'manager creates customers');
select lives_ok($$insert into vehicles(shop_id, customer_id) values (current_setting('test.shop_a')::uuid, current_setting('test.customer_a')::uuid)$$, 'manager creates vehicles');
select lives_ok($$update customers set notes = 'manager'$$, 'manager updates customers');
select lives_ok($$update vehicles set notes = 'manager'$$, 'manager updates vehicles');
select is((select notes from customers where id = current_setting('test.customer_a')::uuid), 'manager', 'manager update took effect');
reset role;
update shop_members set role = 'service_advisor' where user_id = current_setting('test.user_a')::uuid;
set local role authenticated;
select lives_ok($$insert into customers(shop_id, first_name, last_name) values (current_setting('test.shop_a')::uuid, 'RLS', 'Advisor')$$, 'service advisor creates customers');
select lives_ok($$insert into vehicles(shop_id, customer_id) values (current_setting('test.shop_a')::uuid, current_setting('test.customer_a')::uuid)$$, 'service advisor creates vehicles');
select lives_ok($$update customers set notes = 'advisor'$$, 'service advisor updates customers');
select lives_ok($$update vehicles set notes = 'advisor'$$, 'service advisor updates vehicles');
select is((select notes from vehicles where id = current_setting('test.vehicle_a')::uuid), 'advisor', 'advisor update took effect');

select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
select throws_ok($$select public.create_initial_shop('No identity')$$, '42501', null, 'bootstrap requires auth.uid even with authenticated role');
select is((select count(*) from customers), 0::bigint, 'missing identity cannot read customers');
select is((select count(*) from vehicles), 0::bigint, 'missing identity cannot read vehicles');
set local role anon;
select throws_ok($$select * from shops$$, '42501', null, 'anonymous shop reads denied');
select throws_ok($$select * from shop_members$$, '42501', null, 'anonymous membership reads denied');
select throws_ok($$select * from customers$$, '42501', null, 'anonymous customer reads denied');
select throws_ok($$select * from vehicles$$, '42501', null, 'anonymous vehicle reads denied');
select throws_ok($$select public.create_initial_shop('Anonymous')$$, '42501', null, 'anonymous bootstrap denied');

reset role;
delete from auth.users where id = current_setting('test.user_a')::uuid;
select is((select count(*) from shops where id = current_setting('test.shop_a')::uuid), 1::bigint, 'deleting auth user preserves shop');
select is((select count(*) from shop_members where user_id = current_setting('test.user_a')::uuid), 0::bigint, 'deleting auth user removes membership');
select * from finish();
rollback;
