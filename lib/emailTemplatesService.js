// lib/emailTemplatesService.js
import { supabase } from "./supabaseClient";

const table = () => supabase.schema("mplan").from("email_templates");

export async function listTemplates() {
  const { data, error } = await table()
    .select("*")
    .order("updated_at", { ascending: false });
  return { data, error };
}

export async function getTemplate(template_key) {
  const { data, error } = await table()
    .select("*")
    .eq("template_key", template_key)
    .single();
  return { data, error };
}

export async function upsertTemplate(payload) {
  const { data, error } = await table()
    .upsert(payload, { onConflict: "template_key" })
    .select()
    .single();
  return { data, error };
}

export async function deleteTemplate(template_key) {
  const { error } = await table().delete().eq("template_key", template_key);
  return { error };
}

export function renderTemplate(str = "", payload = {}) {
  return String(str).replace(/\{\{(\w+)\}\}/g, (_, k) =>
    payload[k] != null ? String(payload[k]) : ""
  );
}
