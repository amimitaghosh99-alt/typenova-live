-- Create direct_messages table
create table public.direct_messages (
    id uuid default gen_random_uuid() primary key,
    sender_id uuid references auth.users(id) not null,
    receiver_id uuid references auth.users(id) not null,
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    read boolean default false not null
);

-- Set up Row Level Security (RLS)
alter table public.direct_messages enable row level security;

-- Policy: Users can read messages where they are the sender or receiver
create policy "Users can read their own messages"
    on public.direct_messages for select
    using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Policy: Users can insert messages where they are the sender
create policy "Users can insert messages"
    on public.direct_messages for insert
    with check (auth.uid() = sender_id);

-- Policy: Users can update the 'read' status of messages sent to them
create policy "Users can update read status of received messages"
    on public.direct_messages for update
    using (auth.uid() = receiver_id);

-- Create indexes for faster queries
create index idx_direct_messages_sender_id on public.direct_messages(sender_id);
create index idx_direct_messages_receiver_id on public.direct_messages(receiver_id);
create index idx_direct_messages_created_at on public.direct_messages(created_at);
