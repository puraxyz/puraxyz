import { redirect } from "next/navigation";

export default function StatusRedirect() {
  redirect("/monitor/providers");
}
