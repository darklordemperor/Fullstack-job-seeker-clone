-- PostgreSQL 17 compatible; Flyway runs this migration transactionally.
-- Existing invitations become sequential rounds; rescheduling keeps the same round.
alter table interviews add column round_number integer;
with numbered as (
    select id, row_number() over (partition by application_id order by created_at, id) as round
    from interviews
)
update interviews i set round_number=n.round from numbered n where n.id=i.id;
alter table interviews alter column round_number set not null;
alter table interviews add constraint interviews_round_positive check (round_number > 0);
alter table interviews add constraint interviews_application_round_unique unique(application_id, round_number);
alter table interviews drop constraint interviews_status_check;
alter table interviews add constraint interviews_status_check check (status in ('PROPOSED','CONFIRMED','DECLINED','CANCELLED','COMPLETED','NO_SHOW'));
alter table interviews drop constraint interviews_check;
alter table interviews add constraint interviews_selected_status_check check ((status in ('CONFIRMED','COMPLETED','NO_SHOW')) = (selected_slot_id is not null));

create table interview_revisions (
    interview_id uuid not null references interviews(id) on delete cascade,
    version integer not null check (version >= 0),
    event varchar(20) not null check (event in ('BASELINE','PROPOSED','RESCHEDULED','CONFIRMED','DECLINED','CANCELLED','COMPLETED','NO_SHOW')),
    occurred_at timestamptz not null,
    snapshot jsonb not null check (jsonb_typeof(snapshot)='object'),
    primary key(interview_id,version)
);
-- Preserve only known state. Do not fabricate prior versions or actor identity.
insert into interview_revisions(interview_id,version,event,occurred_at,snapshot)
select i.id,i.version,'BASELINE',i.updated_at,
    jsonb_build_object('status',i.status,'mode',i.mode,'location',i.location,'timezone',i.timezone,'selectedSlotId',i.selected_slot_id,
        'slots',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'startsAt',s.starts_at,'endsAt',s.ends_at) order by s.starts_at,s.id)
                           from interview_slots s where s.interview_id=i.id),'[]'::jsonb))
from interviews i;
