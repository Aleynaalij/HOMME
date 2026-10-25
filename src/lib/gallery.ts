import { supabaseUrl } from "./supabase";

export const galleryUrl = (path: string) => `${supabaseUrl}/storage/v1/object/public/gallery/${path}`;
