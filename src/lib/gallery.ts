import { supabaseUrl } from "./supabase";

/** Gallery paths are Storage object names; paths starting with "/" are files shipped with the site. */
export const galleryUrl = (path: string) =>
  path.startsWith("/") ? path : `${supabaseUrl}/storage/v1/object/public/gallery/${path}`;
