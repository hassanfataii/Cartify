export function toId(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if (v.$oid) return v.$oid;          
    if (v._id) return toId(v._id);      
    if (v.toHexString) return v.toHexString(); 
  }
  return String(v);
}
