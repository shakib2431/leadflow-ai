import { supabase } from "./supabase";

export async function addTimelineEvent(
  leadId: string,
  type: string,
  title: string,
  description: string
) {
  await supabase
    .from("lead_timeline")
    .insert([
      {
        lead_id: leadId,
        event_type: type,
        event_title: title,
        event_description: description,
      },
    ]);
}