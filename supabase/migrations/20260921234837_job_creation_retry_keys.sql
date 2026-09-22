-- A form supplies one random UUID across retries. Primary keys reject duplicate
-- inserts; the existing shop/role policies and relationship triggers still apply.
-- IDs remain immutable after creation; no UPDATE grant is added.
grant insert (id) on public.appointments, public.work_orders to authenticated;
