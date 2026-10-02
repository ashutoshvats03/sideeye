// Auth.js route handlers. `handlers` exposes GET/POST for the framework to mount.
//
// Path depth: this file is sideeye/app/api/auth/[...nextauth]/route.js, so four levels up
// is sideeye/. Three (../../../) resolves to sideeye/app/lib and fails to resolve.
import { handlers } from "../../../../lib/auth.js";

export const { GET, POST } = handlers;
